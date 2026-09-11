"""Generate a synthetic road driving video for demo purposes."""
import cv2
import numpy as np
import os

def generate_synthetic_road_video(output_path=None, num_frames=900, fps=30):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_road.mp4")
    
    width, height = 640, 360
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    horizon = int(height * 0.45)
    
    for i in range(num_frames):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Sky - gradient
        for y in range(horizon):
            ratio = y / horizon
            frame[y, :] = (int(180 + 30 * ratio), int(200 - 20 * ratio), int(220 - 30 * ratio))
        
        # Grass
        frame[horizon:, :] = (34, 120, 34)
        
        # Road surface (trapezoid)
        road_poly = np.array([
            [int(width * 0.42), horizon],
            [int(width * 0.58), horizon],
            [int(width * 0.92), height],
            [int(width * 0.08), height]
        ], np.int32)
        cv2.fillPoly(frame, [road_poly], (65, 65, 65))
        
        # Road edge lines
        cv2.line(frame, (int(width * 0.42), horizon), (int(width * 0.08), height), (220, 220, 220), 3)
        cv2.line(frame, (int(width * 0.58), horizon), (int(width * 0.92), height), (220, 220, 220), 3)
        
        # Moving center dashes
        offset = (i * 6) % 50
        for y in range(horizon, height, 35):
            cur_y = y + offset
            if cur_y >= height - 5:
                continue
            progress = (cur_y - horizon) / (height - horizon)
            cx = int(width * 0.5)
            dash_len = int(8 + progress * 20)
            thickness = max(1, int(progress * 5))
            cv2.line(frame, (cx, cur_y), (cx, min(height-1, cur_y + dash_len)), (255, 255, 255), thickness)
        
        # Periodic pothole (dark ellipse on road)
        pothole_cycle = (i * 3) % 200
        if 50 < pothole_cycle < 130:
            py = horizon + int((pothole_cycle - 50) / 80 * (height - horizon))
            if py < height - 10:
                scale = (py - horizon) / (height - horizon)
                px = int(width * 0.55 + scale * 40)
                axes = (max(3, int(22 * scale)), max(2, int(10 * scale)))
                cv2.ellipse(frame, (px, py), axes, 0, 0, 360, (30, 30, 30), -1)
                cv2.ellipse(frame, (px, py), (int(axes[0]*0.6), int(axes[1]*0.6)), 0, 0, 360, (15, 15, 15), -1)
        
        # Occasional vehicle shape (rectangle)
        vehicle_cycle = (i * 2 + 100) % 300
        if vehicle_cycle < 120:
            vy = horizon + int(vehicle_cycle / 120 * (height - horizon) * 0.8)
            if vy < height - 20:
                scale = (vy - horizon) / (height - horizon)
                vx = int(width * 0.35 - scale * 30)
                vw = max(5, int(30 * scale))
                vh = max(3, int(20 * scale))
                cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), (50, 50, 180), -1)
                # Wheels
                cv2.circle(frame, (vx + 3, vy + vh), max(1, int(3*scale)), (20, 20, 20), -1)
                cv2.circle(frame, (vx + vw - 3, vy + vh), max(1, int(3*scale)), (20, 20, 20), -1)
        
        # Note: noise generation skipped for compatibility
        
        out.write(frame)
    
    out.release()
    print(f"Generated {output_path} ({num_frames} frames, {num_frames/fps:.1f}s)")

if __name__ == "__main__":
    generate_synthetic_road_video()
