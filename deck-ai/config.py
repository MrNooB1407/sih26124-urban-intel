"""Deck-AI configuration."""
import os

# Detection confidence threshold (0-100)
# Only forward detections above this % to the central server
CONFIDENCE_THRESHOLD = 60.0

# YOLOv8 model path — swap to a custom pothole model here
# Default: yolov8n.pt (COCO pretrained, auto-downloaded by ultralytics)
MODEL_PATH = "yolov8n.pt"

# Process every Nth frame (skip others for performance)
FRAME_SKIP = 5

# Probability of triggering an accident event per processed frame
# ~1 accident per 500 processed frames
ACCIDENT_PROBABILITY = 0.002

# Backend API URL
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

# Traffic density thresholds (vehicle counts)
TRAFFIC_NORMAL_MAX = 3
TRAFFIC_MODERATE_MAX = 7
# Above MODERATE_MAX → high

# Simulated pothole detection interval (in processed frames)
# Generate a mock pothole detection every N processed frames on average
POTHOLE_INTERVAL_MIN = 15
POTHOLE_INTERVAL_MAX = 40

# Project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Snapshots directory
SNAPSHOTS_DIR = os.path.join(PROJECT_ROOT, "data", "snapshots")
