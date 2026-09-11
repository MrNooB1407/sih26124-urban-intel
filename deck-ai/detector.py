"""Deck-AI Detection Orchestrator.

Processes video frames from the bus simulator, runs detection models,
and pushes incidents to the central backend server.
"""
import os
import cv2
import time
import random
import struct
import zlib
from datetime import datetime

try:
    import httpx
    USE_HTTPX = True
except ImportError:
    import urllib.request
    import json as json_module
    USE_HTTPX = False

from .config import (
    CONFIDENCE_THRESHOLD, FRAME_SKIP, ACCIDENT_PROBABILITY,
    BACKEND_URL, SNAPSHOTS_DIR, PROJECT_ROOT
)
from .pothole_model import PotholeDetector
from .traffic_estimator import TrafficEstimator
from .plate_recognizer import PlateRecognizer

os.makedirs(SNAPSHOTS_DIR, exist_ok=True)


def create_png_from_crop(filepath, frame, bbox):
    """Save a cropped region from a frame as a PNG file."""
    x1, y1, x2, y2 = bbox
    h, w = frame.shape[:2]
    x1 = max(0, min(x1, w))
    y1 = max(0, min(y1, h))
    x2 = max(0, min(x2, w))
    y2 = max(0, min(y2, h))
    crop = frame[y1:y2, x1:x2]
    if crop.size > 0:
        cv2.imwrite(filepath, crop)
    else:
        # Fallback: save a solid color placeholder
        _create_placeholder_png(filepath, 255, 165, 0)


def _create_placeholder_png(filepath, r, g, b, size=100):
    """Create a solid-color PNG without PIL."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw = b''
    for _ in range(size):
        raw += b'\x00' + bytes([r, g, b]) * size
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(filepath, 'wb') as f:
        f.write(header + ihdr + idat + iend)


def _post_json(url, data):
    """POST JSON to a URL using httpx or urllib."""
    if USE_HTTPX:
        import httpx
        try:
            r = httpx.post(url, json=data, timeout=5.0)
            return r.json()
        except Exception as e:
            print(f"  [!] POST {url} failed: {e}")
            return None
    else:
        try:
            payload = json_module.dumps(data).encode('utf-8')
            req = urllib.request.Request(
                url, data=payload,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json_module.loads(resp.read())
        except Exception as e:
            print(f"  [!] POST {url} failed: {e}")
            return None


class DeckAIDetector:
    """Main orchestrator for Deck-AI edge detection."""
    
    def __init__(self):
        self.pothole_detector = PotholeDetector()
        self.traffic_estimator = TrafficEstimator()
        self.plate_recognizer = PlateRecognizer()
        self.frame_count = 0
        self.last_traffic_update = 0
    
    def process_frame(self, frame, gps_lat, gps_lng, bus_id, route_name, segment_index):
        """Process a single video frame.
        
        Args:
            frame: BGR numpy array
            gps_lat: current latitude
            gps_lng: current longitude
            bus_id: bus identifier string
            route_name: name of the route
            segment_index: current segment on the route
        """
        self.frame_count += 1
        
        # Skip frames for performance
        if self.frame_count % FRAME_SKIP != 0:
            return
        
        # --- Pothole / Road Damage Detection ---
        detections = self.pothole_detector.detect(frame)
        for det in detections:
            if det.confidence < CONFIDENCE_THRESHOLD:
                continue
            
            # Save snapshot
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"det_{bus_id}_{timestamp}_{random.randint(1000,9999)}.png"
            filepath = os.path.join(SNAPSHOTS_DIR, filename)
            create_png_from_crop(filepath, frame, det.bbox)
            
            # POST incident to backend
            incident_data = {
                "type": det.type,
                "lat": round(gps_lat + random.uniform(-0.0005, 0.0005), 6),
                "lng": round(gps_lng + random.uniform(-0.0005, 0.0005), 6),
                "bus_id": bus_id,
                "accuracy": round(det.confidence, 1),
                "severity": det.severity,
                "image_path": f"/static/snapshots/{filename}",
            }
            
            print(f"  [{bus_id}] Detection: {det.type} ({det.confidence:.1f}%) @ ({gps_lat:.4f}, {gps_lng:.4f})")
            _post_json(f"{BACKEND_URL}/api/incidents/", incident_data)
        
        # --- Random Accident Trigger ---
        if random.random() < ACCIDENT_PROBABILITY:
            plate_info = self.plate_recognizer.recognize(frame)
            if plate_info:
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                filename = f"accident_{bus_id}_{timestamp}.png"
                filepath = os.path.join(SNAPSHOTS_DIR, filename)
                # Save full frame for accident
                cv2.imwrite(filepath, frame) if frame is not None else _create_placeholder_png(filepath, 255, 0, 0)
                
                accident_data = {
                    "type": "accident",
                    "lat": round(gps_lat, 6),
                    "lng": round(gps_lng, 6),
                    "bus_id": bus_id,
                    "accuracy": round(random.uniform(80, 98), 1),
                    "severity": "critical",
                    "image_path": f"/static/snapshots/{filename}",
                    "plate_number": plate_info["plate_number"],
                    "contact_number": plate_info["contact_number"],
                }
                
                print(f"  \033[91m[{bus_id}] ACCIDENT DETECTED! Plate: {plate_info['plate_number']}\033[0m")
                _post_json(f"{BACKEND_URL}/api/incidents/", accident_data)
        
        # --- Traffic Density Update (every 30 processed frames) ---
        if self.frame_count - self.last_traffic_update >= 30 * FRAME_SKIP:
            self.last_traffic_update = self.frame_count
            density_level, vehicle_count = self.traffic_estimator.estimate(frame)
            
            traffic_data = {
                "route_name": route_name,
                "segment_index": segment_index,
                "density_level": density_level,
                "vehicle_count": vehicle_count,
            }
            
            print(f"  [{bus_id}] Traffic: {density_level} ({vehicle_count} vehicles) segment {segment_index}")
            _post_json(f"{BACKEND_URL}/api/traffic/zones", traffic_data)
