from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    age: Optional[int] = None
    dob: Optional[str] = None
    dept: Optional[str] = None
    clg_mail: Optional[EmailStr] = None
    blood_group: Optional[str] = None
    mobile_no: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None # Optional for citizens, required for staff/admin
    zone_id: Optional[int] = None  # Zone selection for registration

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    role: str
    qr_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class ScanRequest(BaseModel):
    qr_id: str
    zone_name: str = "Main Entrance"

class ZoneBase(BaseModel):
    name: str
    capacity: int
    current_count: int = 0

    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class ZoneUpdate(BaseModel):
    name: str
    capacity: int
    current_count: int = 0

    class Config:
        from_attributes = True
