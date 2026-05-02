import uuid
import json
import base64
import io
import os
from typing import List, cast, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import qrcode
import qrcode.constants
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from database import SessionLocal, engine, Base
import models
import schemas
import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Crowd Management System")

# Configure CORS based on environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    # Restrict CORS in production
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
else:
    # Allow all in development
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Ensure main entrance zone exists
        zone = db.query(models.Zone).filter(models.Zone.name == "Main Entrance").first()
        if not zone:
            db.add(models.Zone(name="Main Entrance", capacity=100))
            db.commit()

        # Create default admin if none exists
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin:
            default_admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
            default_admin = models.User(
                name="Admin User",
                email="admin@crowdflow.com",
                hashed_password=auth.get_password_hash(default_admin_password),
                role="admin",
                qr_id="ADMIN-" + str(uuid.uuid4())[:8]
            )
            db.add(default_admin)
            db.commit()
            print("Default admin created: admin@crowdflow.com (check DEFAULT_ADMIN_PASSWORD env variable)")
    finally:
        db.close()


@app.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if user is None or user.hashed_password is None or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


@app.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    unique_qr_id = str(uuid.uuid4())
    hashed = auth.get_password_hash(user.password) if user.password else None
    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed,
        role="citizen",
        age=user.age,
        dob=user.dob,
        dept=user.dept,
        clg_mail=user.clg_mail,
        blood_group=user.blood_group,
        mobile_no=user.mobile_no,
        qr_id=unique_qr_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # generate QR (optimized for speed)
    qr = qrcode.QRCode(version=1, box_size=6, border=1, error_correction=qrcode.constants.ERROR_CORRECT_L)
    qr.add_data(unique_qr_id)
    qr.make(fit=True)
    img = cast(Any, qr.make_image(fill_color="black", back_color="white")).convert('RGB')
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    buf.seek(0)
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    out = schemas.UserOut.from_orm(new_user)
    return {"user": out, "qr_code": f"data:image/png;base64,{img_b64}"}


@app.get("/me", response_model=schemas.UserOut)
def read_current_user(user_data: dict = Depends(auth.get_current_user_data), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/scan")
async def scan_qr(scan_data: schemas.ScanRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_staff_role)):
    user = db.query(models.User).filter(models.User.qr_id == scan_data.qr_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid QR Code")
    zone = db.query(models.Zone).filter(models.Zone.name == scan_data.zone_name).first()
    if zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    # Check if user already entered this zone
    existing_entry = db.query(models.Entry).filter(
        models.Entry.user_id == user.id,
        models.Entry.zone_id == zone.id
    ).first()
    if existing_entry:
        raise HTTPException(status_code=400, detail=f"{user.name} has already entered {zone.name}")
        
    # Check capacity before adding entry
    current_count = cast(int, zone.current_count) if zone.current_count is not None else 0
    capacity = cast(int, zone.capacity)
    if current_count >= capacity:
        raise HTTPException(status_code=403, detail="maximum crowd allowed")
    entry = models.Entry(user_id=user.id, zone_id=zone.id)
    db.add(entry)
    db.flush()
    # increment using concrete Python ints to satisfy static type checkers
    zone.current_count = cast(Any, current_count + 1)
    db.flush()
    db.commit()
    
    remaining = capacity - (current_count + 1)
    alert_msg = None
    if remaining == 0:
        alert_msg = "maximum crowd allowed"
    elif remaining <= 5:
        alert_msg = f"Remaining {remaining} slots are available"

    broadcast_data = {
        "type": "entry",
        "user": {"name": user.name, "email": user.email, "dept": user.dept},
        "zone": {"name": zone.name, "current_count": zone.current_count, "capacity": zone.capacity}
    }
    await manager.broadcast(json.dumps(broadcast_data))
    return {"message": "Entry allowed", "user": user.name, "zone": zone.name, "alert": alert_msg}


@app.get("/zones")
def list_zones(db: Session = Depends(get_db)):
    zones = db.query(models.Zone).all()
    return zones


@app.post("/zones")
def create_zone(zone: schemas.ZoneBase, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    existing = db.query(models.Zone).filter(models.Zone.name == zone.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zone already exists")
    new_zone = models.Zone(name=zone.name, capacity=zone.capacity, current_count=zone.current_count)
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    return new_zone


@app.put("/zones/{zone_id}")
def update_zone(zone_id: int, zone: schemas.ZoneUpdate, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    existing_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not existing_zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    duplicate = db.query(models.Zone).filter(models.Zone.name == zone.name, models.Zone.id != zone_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Zone already exists")

    if zone.capacity < zone.current_count:
        raise HTTPException(status_code=400, detail="Capacity cannot be less than current count")

    existing_zone.name = cast(Any, zone.name)
    existing_zone.capacity = cast(Any, zone.capacity)
    existing_zone.current_count = cast(Any, zone.current_count)
    db.commit()
    db.refresh(existing_zone)
    return existing_zone


@app.delete("/zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    existing_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not existing_zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    if cast(str, existing_zone.name) == "Main Entrance":
        raise HTTPException(status_code=400, detail="Main Entrance zone cannot be deleted")

    db.delete(existing_zone)
    db.commit()
    return {"message": "Zone deleted"}


@app.get("/admin/dashboard_data")
def dashboard_data(db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    total_registered = db.query(models.User).filter(models.User.role == "citizen").count()
    total_entered = db.query(models.Entry.user_id).distinct().count()
    total_not_entered = total_registered - total_entered
    zones = db.query(models.Zone).all()

    citizens_raw = db.query(models.User).filter(models.User.role == "citizen").all()
    latest_entries = db.query(models.Entry).order_by(models.Entry.entry_time.desc()).all()
    zone_by_user = {}
    for entry in latest_entries:
        if entry.user_id not in zone_by_user:
            zone = db.query(models.Zone).filter(models.Zone.id == entry.zone_id).first()
            zone_by_user[entry.user_id] = zone.name if zone else None

    citizens = []
    for user in citizens_raw:
        citizens.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "dept": user.dept,
                "age": user.age,
                "has_entered": user.id in zone_by_user,
                "zone_entered": zone_by_user.get(user.id),
            }
        )

    return {
        "stats": {
            "total_registered": total_registered,
            "total_entered": total_entered,
            "total_not_entered": total_not_entered,
        },
        "zones": zones,
        "citizens": citizens
    }


@app.get("/admin/staff")
def list_staff(db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    staff = db.query(models.User).filter(models.User.role == "staff").all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in staff
    ]


@app.post("/admin/staff")
def create_staff(user: schemas.StaffCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        # Update existing user and ensure they have staff role
        existing.name = user.name
        existing.hashed_password = auth.get_password_hash(user.password)
        existing.role = "staff"
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "name": existing.name,
            "email": existing.email,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
            "message": "Staff access updated successfully"
        }
    new_staff = models.User(
        name=user.name,
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
        role="staff",
        qr_id="STAFF-" + str(uuid.uuid4())[:8],
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return {
        "id": new_staff.id,
        "name": new_staff.name,
        "email": new_staff.email,
        "created_at": new_staff.created_at.isoformat() if new_staff.created_at else None,
    }


@app.delete("/admin/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db), current_user: dict = Depends(auth.check_admin_role)):
    staff = db.query(models.User).filter(models.User.id == staff_id, models.User.role == "staff").first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    db.delete(staff)
    db.commit()
    return {"message": "Staff member deleted"}


@app.get("/")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
