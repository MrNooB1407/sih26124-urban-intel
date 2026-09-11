from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.database import get_db, TrafficZone
from backend.schemas import TrafficZoneUpdate, TrafficZoneResponse
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/traffic", tags=["traffic"])


from fastapi.concurrency import run_in_threadpool

@router.post("/zones", response_model=TrafficZoneResponse)
async def update_traffic_zone(zone_in: TrafficZoneUpdate, db: Session = Depends(get_db)):
    """Upsert a traffic zone density level for a route segment."""
    def db_op():
        db_zone = db.query(TrafficZone).filter(
            TrafficZone.route_name == zone_in.route_name,
            TrafficZone.segment_index == zone_in.segment_index,
        ).first()

        if db_zone:
            for key, value in zone_in.model_dump().items():
                setattr(db_zone, key, value)
            db_zone.timestamp = datetime.utcnow()
        else:
            db_zone = TrafficZone(**zone_in.model_dump())
        db.add(db_zone)
        db.commit()
        db.refresh(db_zone)
        return db_zone
        
    db_zone = await run_in_threadpool(db_op)

    zone_data = TrafficZoneResponse.model_validate(db_zone).model_dump(mode="json")
    await manager.broadcast("traffic_update", zone_data)

    return db_zone


@router.get("/zones", response_model=List[TrafficZoneResponse])
async def get_traffic_zones(
    route_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all traffic zones, optionally filtered by route name."""
    query = db.query(TrafficZone)
    if route_name:
        query = query.filter(TrafficZone.route_name == route_name)
    return query.all()
