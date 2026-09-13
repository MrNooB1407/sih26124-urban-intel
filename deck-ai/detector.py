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
    BACKEND_URL, SNAPSHOTS_DIR, PROJECT_ROOT, SPEED_LIMIT, LANE_VIOLATION_PROBABILITY
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

import threading
import queue
import time
import httpx

# Background API Worker for non-blocking HTTP POSTs with retries
api_queue = queue.Queue()

def api_worker():
    while True:
        task = api_queue.get()
        if task is None:
            break
        url, data = task
        
        item_desc = "Data"
        if "type" in data:
            item_desc = f"Incident {data.get('type').upper()} ({data.get('bus_id', 'Unknown')})"
        elif "route_name" in data:
            item_desc = "Traffic Zone Data"
            
        max_retries = 3
        backoff = 0.5
        
        for attempt in range(max_retries):
            try:
                r = httpx.post(url, json=data, timeout=5.0)
                r.raise_for_status()
                if attempt > 0:
                    print(f"  [SUCCESS]: [API] {item_desc} created after retry")
                else:
                    print(f"  [SUCCESS]: [API] {item_desc} created")
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"  [RETRY]: [API] {item_desc} failed ({e}). Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    print(f"  [FAILURE]: [API] {item_desc} creation failed after {max_retries} attempts: {e}")
        
        api_queue.task_done()

# Start background worker
worker_thread = threading.Thread(target=api_worker, daemon=True)
worker_thread.start()

def _post_json(url, data):
    """Queue JSON for background HTTP POST."""
    api_queue.put((url, data))


class DeckAIDetector:
    """Main orchestrator for Deck-AI edge detection."""
    
    def __init__(self):
        self.pothole_detector = PotholeDetector()
        self.traffic_estimator = TrafficEstimator()
        self.plate_recognizer = PlateRecognizer()
        self.frame_count = 0
        self.last_traffic_update = 0
        self.overspeeding_cooldowns = {}
        self.lane_violation_cooldowns = {}
    
    def process_frame(self, frame, gps_lat, gps_lng, bus_id, route_name, segment_index, speed):
        """Process a single video frame.
        
        Args:
            frame: BGR numpy array
            gps_lat: current latitude
            gps_lng: current longitude
            bus_id: bus identifier string
            route_name: name of the route
            segment_index: current segment on the route
            speed: current speed in km/h
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
                    "plate_confidence": plate_info.get("plate_confidence")
                }
                
                print(f"  \033[91m[{bus_id}] ACCIDENT DETECTED! Plate: {plate_info['plate_number']}\033[0m")
                _post_json(f"{BACKEND_URL}/api/incidents/", accident_data)
        
        # --- Overspeeding Detection ---
        if speed > SPEED_LIMIT:
            # Check cooldown (prevent spamming overspeeding events every frame)
            # Send max 1 alert per 150 processed frames (approx every 25 seconds)
            if self.frame_count - self.overspeeding_cooldowns.get(bus_id, -150) >= 150:
                self.overspeeding_cooldowns[bus_id] = self.frame_count
                
                excess = speed - SPEED_LIMIT
                severity = "medium"
                if excess >= 25: severity = "critical"
                elif excess >= 15: severity = "high"
                
                plate_info = self.plate_recognizer.recognize(frame)
                
                overspeeding_data = {
                    "type": "overspeeding",
                    "lat": round(gps_lat, 6),
                    "lng": round(gps_lng, 6),
                    "bus_id": bus_id,
                    "accuracy": 100.0,
                    "severity": severity,
                    "current_speed": round(speed, 1),
                    "speed_limit": SPEED_LIMIT,
                    "plate_number": plate_info["plate_number"] if plate_info else None,
                    "contact_number": plate_info["contact_number"] if plate_info else None,
                    "plate_confidence": plate_info.get("plate_confidence") if plate_info else None
                }
                print(f"  [{bus_id}] \033[93mOVERSPEEDING ({speed:.1f} > {SPEED_LIMIT})\033[0m")
                _post_json(f"{BACKEND_URL}/api/incidents/", overspeeding_data)

        # --- Lane Violation Detection ---
        if random.random() < LANE_VIOLATION_PROBABILITY:
            if self.frame_count - self.lane_violation_cooldowns.get(bus_id, -300) >= 300:
                self.lane_violation_cooldowns[bus_id] = self.frame_count
                
                expected_lane = "Bus Lane"
                current_lane = random.choice(["Lane 1", "Lane 2", "Lane 3"])
                
                # Assign severity based on type
                if current_lane == "Lane 3": severity = "critical"
                elif current_lane == "Lane 2": severity = "high"
                else: severity = "medium"
                
                plate_info = self.plate_recognizer.recognize(frame)
                
                lane_data = {
                    "type": "lane_violation",
                    "lat": round(gps_lat, 6),
                    "lng": round(gps_lng, 6),
                    "bus_id": bus_id,
                    "accuracy": round(random.uniform(75, 99), 1),
                    "severity": severity,
                    "current_lane": current_lane,
                    "expected_lane": expected_lane,
                    "plate_number": plate_info["plate_number"] if plate_info else None,
                    "contact_number": plate_info["contact_number"] if plate_info else None,
                    "plate_confidence": plate_info.get("plate_confidence") if plate_info else None
                }
                print(f"  [{bus_id}] \033[95mLANE VIOLATION (in {current_lane})\033[0m")
                _post_json(f"{BACKEND_URL}/api/incidents/", lane_data)
        
        # --- Traffic Density Update (every 150 processed frames) ---
        if self.frame_count - self.last_traffic_update >= 150 * FRAME_SKIP:
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
