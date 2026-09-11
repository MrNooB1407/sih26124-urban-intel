# Database file: data/urban_intel.db (relative to project root)
# Use SQLAlchemy 2.0 style with DeclarativeBase

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from datetime import datetime
import enum
import os

# Ensure data directory exists
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "urban_intel.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# Enums
class IncidentType(str, enum.Enum):
    POTHOLE = "pothole"
    ROAD_DAMAGE = "road_damage"
    ACCIDENT = "accident"
    CONGESTION = "congestion"

class Severity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DensityLevel(str, enum.Enum):
    NORMAL = "normal"
    MODERATE = "moderate"
    HIGH = "high"

# Models
class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(SQLEnum(IncidentType), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    bus_id = Column(String, nullable=True)
    accuracy = Column(Float, nullable=False)  # 0-100 percent
    image_path = Column(String, nullable=True)
    severity = Column(SQLEnum(Severity), default=Severity.MEDIUM)
    plate_number = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)

class BusPosition(Base):
    __tablename__ = "bus_positions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    bus_id = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    speed = Column(Float, default=0.0)
    route_name = Column(String, nullable=True)

class TrafficZone(Base):
    __tablename__ = "traffic_zones"
    id = Column(Integer, primary_key=True, autoincrement=True)
    route_name = Column(String, nullable=False)
    segment_index = Column(Integer, nullable=False)
    density_level = Column(SQLEnum(DensityLevel), default=DensityLevel.NORMAL)
    vehicle_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
