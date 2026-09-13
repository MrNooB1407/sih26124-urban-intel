"""Swappable pothole detection model wrapper.

Default implementation uses simulated detections combined with
YOLOv8's COCO model for vehicle detection (traffic density).
Replace MODEL_PATH in config.py with a real pothole .pt model
for actual pothole detection.
"""
import random
import numpy as np
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Detection:
    type: str  # 'pothole', 'road_damage', 'accident'
    confidence: float  # 0-100
    bbox: tuple  # (x1, y1, x2, y2)
    severity: str  # 'low', 'medium', 'high', 'critical'

class PotholeDetector:
    """Detects potholes and road damage.
    
    Current implementation: simulated detections at realistic intervals.
    To use a real model, subclass and override detect().
    """
    
    def __init__(self):
        self._frames_since_last = 0
        self._next_detection_at = random.randint(15, 40)
    
    def detect(self, frame: np.ndarray) -> List[Detection]:
        """Run detection on a frame.
        
        Args:
            frame: BGR numpy array from OpenCV
        
        Returns:
            List of Detection objects
        """
        self._frames_since_last += 1
        detections = []
        
        if self._frames_since_last >= self._next_detection_at:
            self._frames_since_last = 0
            self._next_detection_at = random.randint(15, 40)
            
            # Simulate a detection
            h, w = frame.shape[:2]
            # Random bounding box on lower half of frame (road area)
            x1 = random.randint(w // 4, 3 * w // 4 - 50)
            y1 = random.randint(h // 2, h - 50)
            box_width = int(w * random.uniform(0.08, 0.15))
            box_height = int(h * random.uniform(0.08, 0.15))
            x2 = min(x1 + box_width, w)
            y2 = min(y1 + box_height, h)
            
            confidence = random.uniform(55, 97)
            
            # Determine type and severity
            det_type = random.choices(
                ['pothole', 'road_damage'],
                weights=[0.75, 0.25]
            )[0]
            
            severity = random.choices(
                ['low', 'medium', 'high', 'critical'],
                weights=[0.4, 0.3, 0.2, 0.1]
            )[0]
            
            detections.append(Detection(
                type=det_type,
                confidence=confidence,
                bbox=(x1, y1, x2, y2),
                severity=severity
            ))
        
        return detections

class YOLOPotholeDetector(PotholeDetector):
    """Uses a real YOLOv8 model for pothole detection.
    
    To use: set MODEL_PATH in config.py to your pothole .pt weights.
    """
    
    def __init__(self, model_path: str):
        super().__init__()
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            self._use_real_model = True
            print(f"Loaded real pothole model from {model_path}")
        except Exception as e:
            print(f"Failed to load model {model_path}: {e}. Falling back to simulation.")
            self._use_real_model = False
    
    def detect(self, frame: np.ndarray) -> List[Detection]:
        if not self._use_real_model:
            return super().detect(frame)
        
        results = self.model.predict(frame, conf=0.25, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0]) * 100
                cls = int(box.cls[0])
                cls_name = self.model.names.get(cls, 'pothole')
                
                severity = 'medium'
                if conf > 85: severity = 'high'
                elif conf > 70: severity = 'medium'
                else: severity = 'low'
                
                detections.append(Detection(
                    type='pothole' if 'pothole' in cls_name.lower() else 'road_damage',
                    confidence=conf,
                    bbox=(int(x1), int(y1), int(x2), int(y2)),
                    severity=severity
                ))
        return detections
