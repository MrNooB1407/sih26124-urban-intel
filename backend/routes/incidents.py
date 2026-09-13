from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db, Incident, IncidentType, Severity
from backend.schemas import IncidentCreate, IncidentPublic, IncidentFull
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


from fastapi.concurrency import run_in_threadpool

@router.post("/", response_model=IncidentFull)
async def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    """Ingest a new incident from Deck-AI. Broadcasts via WebSocket."""
    
    def db_op():
        db_incident = Incident(**incident_in.model_dump())
        db.add(db_incident)
        db.commit()
        db.refresh(db_incident)
        return db_incident
        
    db_incident = await run_in_threadpool(db_op)

    # Broadcast new incident to all connected dashboard clients
    incident_data = IncidentFull.model_validate(db_incident).model_dump(mode="json")
    await manager.broadcast("new_incident", incident_data)

    # Fire specific alerts based on severity and type
    if db_incident.type == IncidentType.ACCIDENT or db_incident.severity in [Severity.CRITICAL, Severity.HIGH]:
        alert_data = {
            "incident_id": db_incident.id,
            "type": db_incident.type.value,
            "severity": db_incident.severity.value,
            "plate_number": db_incident.plate_number,
            "contact_number": db_incident.contact_number,
            "bus_id": db_incident.bus_id,
            "current_speed": db_incident.current_speed,
            "speed_limit": db_incident.speed_limit,
            "lat": db_incident.lat,
            "lng": db_incident.lng,
            "timestamp": db_incident.timestamp.isoformat() if db_incident.timestamp else None,
        }
        await manager.broadcast("accident_alert", alert_data) # Keep using the same WS event name for frontend compatibility

    return db_incident


from datetime import datetime
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func

@router.get("/analytics")
async def get_analytics(
    start_timestamp: Optional[datetime] = None,
    end_timestamp: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Aggregated historical analytics."""
    def fetch_analytics():
        query = db.query(
            Incident.type,
            Incident.severity,
            func.strftime('%Y-%m-%dT%H:00:00Z', Incident.timestamp).label('time_bucket'),
            func.count(Incident.id).label('count')
        )
        if start_timestamp:
            query = query.filter(Incident.timestamp >= start_timestamp)
        if end_timestamp:
            query = query.filter(Incident.timestamp <= end_timestamp)
            
        query = query.group_by(
            Incident.type, 
            Incident.severity, 
            func.strftime('%Y-%m-%dT%H:00:00Z', Incident.timestamp)
        )
        
        results = query.all()
        return [
            {
                "type": r.type.value if hasattr(r.type, 'value') else r.type,
                "severity": r.severity.value if hasattr(r.severity, 'value') else r.severity,
                "timestamp": r.time_bucket,
                "count": r.count
            }
            for r in results
        ]
        
    return await run_in_threadpool(fetch_analytics)

@router.get("/")
async def get_incidents(
    type: Optional[IncidentType] = None,
    severity: Optional[Severity] = None,
    start_timestamp: Optional[datetime] = None,
    end_timestamp: Optional[datetime] = None,
    role: str = Query("citizen"),
    db: Session = Depends(get_db),
):
    """List incidents. Role controls which fields are returned."""
    def fetch_and_serialize():
        query = db.query(Incident)
        if type:
            query = query.filter(Incident.type == type)
        if severity:
            query = query.filter(Incident.severity == severity)
        if start_timestamp:
            query = query.filter(Incident.timestamp >= start_timestamp)
        if end_timestamp:
            query = query.filter(Incident.timestamp <= end_timestamp)
    
        query = query.order_by(Incident.timestamp.desc())
        if not start_timestamp and not end_timestamp:
            query = query.limit(100)
        incidents = query.all()
    
        if role == "authority":
            return [IncidentFull.model_validate(i).model_dump(mode="json") for i in incidents]
        else:
            return [IncidentPublic.model_validate(i).model_dump(mode="json") for i in incidents]
            
    return await run_in_threadpool(fetch_and_serialize)


from datetime import timedelta

@router.get("/hotspots")
async def get_hotspots(db: Session = Depends(get_db)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent = db.query(Incident).filter(Incident.timestamp >= thirty_days_ago).all()
    
    grid = {}
    for inc in recent:
        cell = (round(inc.lat, 3), round(inc.lng, 3))
        grid[cell] = grid.get(cell, 0) + 1
        
    hotspots = [{"lat": k[0], "lng": k[1], "count": v} for k, v in grid.items() if v >= 3]
    return hotspots

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


