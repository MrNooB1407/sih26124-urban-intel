"""Mocked license plate recognition for accident/hit-and-run flow."""
import random
import json
import os


class PlateRecognizer:
    """Simulates OCR plate recognition and registry lookup."""

    def __init__(self):
        self.registry = self._load_registry()

    def _load_registry(self):
        """Load mock vehicle registry from data/mock_plates.json."""
        plates_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data", "mock_plates.json"
        )
        try:
            with open(plates_path, "r") as f:
                data = json.load(f)
                return {entry["plate"]: entry for entry in data}
        except FileNotFoundError:
            print(f"Warning: {plates_path} not found, using inline fallback")
            return {
                "TS 09 AB 3456": {"plate": "TS 09 AB 3456", "owner": "Rajesh Kumar", "contact": "+91-9876543210"},
                "TS 07 CD 7890": {"plate": "TS 07 CD 7890", "owner": "Priya Sharma", "contact": "+91-9123456780"},
            }

    def recognize(self, frame=None):
        """'Recognize' a license plate from a frame.

        In reality: picks a random plate from the registry.

        Returns:
            dict with keys: plate_number, owner, contact_number
            or None if 'recognition failed'
        """
        # Simulate ~90% success rate
        if random.random() < 0.1:
            return None

        plate_key = random.choice(list(self.registry.keys()))
        entry = self.registry[plate_key]

        # Generate deterministic prototype confidence
        import hashlib
        plate_str = entry["plate"]
        hash_val = int(hashlib.md5(plate_str.encode()).hexdigest(), 16)
        confidence = 80.0 + (hash_val % 199) / 10.0

        return {
            "plate_number": plate_str,
            "owner": entry["owner"],
            "contact_number": entry["contact"],
            "plate_confidence": round(confidence, 1)
        }

