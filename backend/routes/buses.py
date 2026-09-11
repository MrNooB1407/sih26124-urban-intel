from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from backend.database import get_db, BusPosition
from backend.schemas import BusPositionCreate, BusPositionResponse
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/buses", tags=["buses"])


from fastapi.concurrency import run_in_threadpool

@router.post("/position", response_model=BusPositionResponse)
async def update_bus_position(position_in: BusPositionCreate, db: Session = Depends(get_db)):
    """Upsert bus position. If bus_id exists, update; otherwise create."""
    def db_op():
        db_position = db.query(BusPosition).filter(BusPosition.bus_id == position_in.bus_id).first()
    
        if db_position:
            for key, value in position_in.model_dump().items():
                setattr(db_position, key, value)
            db_position.timestamp = datetime.utcnow()
        else:
            db_position = BusPosition(**position_in.model_dump())
        db.add(db_position)
        db.commit()
        db.refresh(db_position)
        return db_position
        
    db_position = await run_in_threadpool(db_op)

    # Broadcast position update
    pos_data = BusPositionResponse.model_validate(db_position).model_dump(mode="json")
    await manager.broadcast("bus_position", pos_data)

    return db_position


@router.get("/", response_model=List[BusPositionResponse])
async def get_bus_positions(db: Session = Depends(get_db)):
    """Return current positions of all buses."""
    positions = db.query(BusPosition).all()
    return positions
