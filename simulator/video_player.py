"""Frame-by-frame video player using OpenCV."""
import cv2
import os

class VideoPlayer:
    def __init__(self, video_path):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
        self.current_frame = 0
    
    def get_frame(self):
        """Read next frame. Loops back to start if at end."""
        ret, frame = self.cap.read()
        if not ret:
            # Loop
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            self.current_frame = 0
        if ret:
            self.current_frame += 1
        return frame if ret else None
    
    def progress(self):
        """Return 0-1 progress through the video."""
        if self.total_frames <= 0:
            return 0
        return min(self.current_frame / self.total_frames, 1.0)
    
    def release(self):
        self.cap.release()
