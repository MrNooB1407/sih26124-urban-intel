from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import random
import datetime
import os
import struct
import zlib
import json

from backend.database import get_db, Incident, BusPosition, TrafficZone, IncidentType, Severity, DensityLevel

router = APIRouter(prefix="/api", tags=["seed"])

# Project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_png(filepath, r, g, b, size=100):
    """Create a tiny solid-color PNG without PIL."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw_data = b''
    for _ in range(size):
        raw_data += b'\x00' + bytes([r, g, b]) * size
    idat = chunk(b'IDAT', zlib.compress(raw_data))
    iend = chunk(b'IEND', b'')

    with open(filepath, 'wb') as f:
        f.write(header + ihdr + idat + iend)


def load_mock_plates():
    """Load mock vehicle plates from data/mock_plates.json."""
    plates_path = os.path.join(PROJECT_ROOT, "data", "mock_plates.json")
    try:
        with open(plates_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback if file not found
        return [
            {"plate": "TS 09 AB 3456", "owner": "Rajesh Kumar", "contact": "+91-9876543210"},
            {"plate": "TS 07 CD 7890", "owner": "Priya Sharma", "contact": "+91-9123456780"},
            {"plate": "TS 11 EF 1234", "owner": "Anand Reddy", "contact": "+91-9988776655"},
        ]


@router.post("/seed")
async def seed_data(db: Session = Depends(get_db)):
    """Clear and re-seed the database with realistic mock data."""
    # Clear existing data
    db.query(Incident).delete()
    db.query(BusPosition).delete()
    db.query(TrafficZone).delete()
    db.commit()

    # Hyderabad route: Secunderabad -> HITEC City
    waypoints = [
        (17.4334, 78.5016), (17.4428, 78.4872), (17.4442, 78.4776), (17.4455, 78.4682),
        (17.4412, 78.4556), (17.4265, 78.4528), (17.4248, 78.4485), (17.4194, 78.4452),
        (17.4230, 78.4320), (17.4290, 78.4110), (17.4338, 78.4005), (17.4395, 78.3905),
        (17.4504, 78.3808), (17.4415, 78.3802), (17.4312, 78.3705), (17.4372, 78.3444)
    ]

    snapshots_dir = os.path.join(PROJECT_ROOT, "data", "snapshots")
    os.makedirs(snapshots_dir, exist_ok=True)

    # Define incident distribution
    incident_types = (
        [IncidentType.POTHOLE] * 10 +
        [IncidentType.ROAD_DAMAGE] * 4 +
        [IncidentType.CONGESTION] * 3 +
        [IncidentType.ACCIDENT] * 3
    )
    random.shuffle(incident_types)

    severities = (
        [Severity.LOW] * 8 +
        [Severity.MEDIUM] * 6 +
        [Severity.HIGH] * 4 +
        [Severity.CRITICAL] * 2
    )
    random.shuffle(severities)

    # Colors for snapshot images by type
    colors = {
        IncidentType.ACCIDENT: (255, 50, 50),
        IncidentType.POTHOLE: (255, 165, 0),
        IncidentType.ROAD_DAMAGE: (255, 220, 50),
        IncidentType.CONGESTION: (50, 100, 255),
    }

    # Load mock plates for accident incidents
    mock_plates = load_mock_plates()
    plate_iter = iter(random.sample(mock_plates, min(3, len(mock_plates))))

    now = datetime.datetime.utcnow()
    bus_ids = ["BUS-101", "BUS-102", "BUS-103"]

    incidents_created = 0
    for i in range(20):
        base_wp = waypoints[i % len(waypoints)]
        lat = base_wp[0] + random.uniform(-0.001, 0.001)
        lng = base_wp[1] + random.uniform(-0.001, 0.001)

        itype = incident_types[i]
        isev = severities[i]

        # Random timestamp in last 60 minutes
        ts = now - datetime.timedelta(minutes=random.randint(0, 60))
        acc = round(random.uniform(62.0, 97.0), 1)

        inc = Incident(
            type=itype,
            severity=isev,
            lat=round(lat, 6),
            lng=round(lng, 6),
            timestamp=ts,
            accuracy=acc,
            bus_id=random.choice(bus_ids),
        )

        # For accidents, attach plate and contact from mock registry
        if itype == IncidentType.ACCIDENT:
            try:
                plate_entry = next(plate_iter)
            except StopIteration:
                plate_entry = random.choice(mock_plates)
            inc.plate_number = plate_entry["plate"]
            inc.contact_number = plate_entry["contact"]

        db.add(inc)
        db.commit()
        db.refresh(inc)
        incidents_created += 1

        # Create snapshot image
        c = colors.get(itype, (128, 128, 128))
        filename = f"incident_{inc.id}_{itype.value}.png"
        filepath = os.path.join(snapshots_dir, filename)
        create_png(filepath, c[0], c[1], c[2])

        # Update image_path to the static-served URL
        inc.image_path = f"/static/snapshots/{filename}"
        db.commit()

    # --- Seed Bus Positions ---
    buses_created = 0
    for idx, bus_id in enumerate(bus_ids):
        wp = waypoints[idx * 5 % len(waypoints)]
        bus = BusPosition(
            bus_id=bus_id,
            lat=wp[0],
            lng=wp[1],
            speed=round(random.uniform(15.0, 40.0), 1),
            route_name="Secunderabad-HITEC",
            timestamp=now,
        )
        db.add(bus)
        buses_created += 1
    db.commit()

    # --- Seed Traffic Zones ---
    density_choices = [DensityLevel.NORMAL, DensityLevel.NORMAL, DensityLevel.MODERATE,
                       DensityLevel.MODERATE, DensityLevel.HIGH, DensityLevel.NORMAL,
                       DensityLevel.MODERATE, DensityLevel.HIGH]
    zones_created = 0
    for i in range(8):
        zone = TrafficZone(
            route_name="Secunderabad-HITEC",
            segment_index=i,
            density_level=density_choices[i],
            vehicle_count=random.randint(1, 15),
            timestamp=now,
        )
        db.add(zone)
        zones_created += 1
    db.commit()

    return {
        "message": f"Seeded {incidents_created} incidents, {buses_created} bus positions, {zones_created} traffic zones"
    }
