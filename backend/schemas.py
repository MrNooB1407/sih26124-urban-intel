from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend.database import IncidentType, Severity, DensityLevel

# --- Incident Schemas ---
class IncidentCreate(BaseModel):
    type: IncidentType
    lat: float
    lng: float
    bus_id: Optional[str] = None
    accuracy: float
    severity: Severity = Severity.MEDIUM
    image_path: Optional[str] = None
    plate_number: Optional[str] = None
    contact_number: Optional[str] = None
    plate_confidence: Optional[float] = None
    current_speed: Optional[float] = None
    speed_limit: Optional[float] = None
    current_lane: Optional[str] = None
    expected_lane: Optional[str] = None

class IncidentPublic(BaseModel):
    """Citizen view — no bus_id, no contact info."""
    id: int
    type: IncidentType
    lat: float
    lng: float
    timestamp: datetime
    accuracy: float
    severity: Severity
    image_path: Optional[str] = None
    current_speed: Optional[float] = None
    speed_limit: Optional[float] = None
    current_lane: Optional[str] = None
    expected_lane: Optional[str] = None
    
    model_config = {"from_attributes": True}

class IncidentFull(IncidentPublic):
    """Authority view — includes bus_id and contact info."""
    bus_id: Optional[str] = None
    plate_number: Optional[str] = None
    contact_number: Optional[str] = None
    plate_confidence: Optional[float] = None

# --- Bus Position Schemas ---
class BusPositionCreate(BaseModel):
    bus_id: str
    lat: float
    lng: float
    speed: float = 0.0
    route_name: Optional[str] = None

class BusPositionResponse(BaseModel):
    bus_id: str
    lat: float
    lng: float
    speed: float
    route_name: Optional[str] = None
    timestamp: datetime
    
    model_config = {"from_attributes": True}

# --- Traffic Zone Schemas ---
class TrafficZoneUpdate(BaseModel):
    route_name: str
    segment_index: int
    density_level: DensityLevel
    vehicle_count: int = 0

class TrafficZoneResponse(BaseModel):
    route_name: str
    segment_index: int
    density_level: DensityLevel
    vehicle_count: int
    timestamp: datetime
    
    model_config = {"from_attributes": True}

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    role: str  # "citizen" or "authority"

class LoginResponse(BaseModel):
    token: str
    role: str
    username: str

