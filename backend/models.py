from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CITIZEN = "citizen"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True) # Only for staff/admin
    role = Column(String, default=UserRole.CITIZEN)
    
    # Registration details
    age = Column(Integer)
    dob = Column(String)
    dept = Column(String)
    clg_mail = Column(String)
    blood_group = Column(String)
    mobile_no = Column(String)
    qr_id = Column(String, unique=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    entries = relationship("Entry", back_populates="user")
    zone = relationship("Zone", foreign_keys=[zone_id])

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    capacity = Column(Integer)
    current_count = Column(Integer, default=0)

    entries = relationship("Entry", back_populates="zone")

class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    zone_id = Column(Integer, ForeignKey("zones.id"))
    entry_time = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="entries")
    zone = relationship("Zone", back_populates="entries")
