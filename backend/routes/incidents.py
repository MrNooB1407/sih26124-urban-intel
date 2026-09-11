from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db, Incident, IncidentType, Severity
from backend.schemas import IncidentCreate, IncidentPublic, IncidentFull
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/", response_model=IncidentFull)
async def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    """Ingest a new incident from Deck-AI. Broadcasts via WebSocket."""
    db_incident = Incident(**incident_in.model_dump())
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    # Broadcast new incident to all connected dashboard clients
    incident_data = IncidentFull.model_validate(db_incident).model_dump(mode="json")
    await manager.broadcast("new_incident", incident_data)

    # If accident, also fire accident_alert
    if db_incident.type == IncidentType.ACCIDENT:
        alert_data = {
            "incident_id": db_incident.id,
            "plate_number": db_incident.plate_number,
            "contact_number": db_incident.contact_number,
            "lat": db_incident.lat,
            "lng": db_incident.lng,
            "timestamp": db_incident.timestamp.isoformat() if db_incident.timestamp else None,
        }
        await manager.broadcast("accident_alert", alert_data)

    return db_incident


@router.get("/")
async def get_incidents(
    type: Optional[IncidentType] = None,
    severity: Optional[Severity] = None,
    role: str = Query("citizen"),
    db: Session = Depends(get_db),
):
    """List incidents. Role controls which fields are returned."""
    query = db.query(Incident)
    if type:
        query = query.filter(Incident.type == type)
    if severity:
        query = query.filter(Incident.severity == severity)

    incidents = query.order_by(Incident.timestamp.desc()).limit(100).all()

    if role == "authority":
        return [IncidentFull.model_validate(i).model_dump(mode="json") for i in incidents]
    else:
        return [IncidentPublic.model_validate(i).model_dump(mode="json") for i in incidents]


@router.get("/{incident_id}")
async def get_incident(
    incident_id: int,
    role: str = Query("citizen"),
    db: Session = Depends(get_db),
):
    """Get a single incident by ID."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if role == "authority":
        return IncidentFull.model_validate(incident).model_dump(mode="json")
    else:
        return IncidentPublic.model_validate(incident).model_dump(mode="json")
