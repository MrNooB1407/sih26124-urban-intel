"""Bus Simulator — simulates 1-3 buses traversing routes."""
import sys
import os
import time
import asyncio
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulator.routes_data import ROUTES, interpolate_position, get_segment_index
from simulator.video_player import VideoPlayer

try:
    import httpx
    USE_HTTPX = True
except ImportError:
    import urllib.request
    import json as json_module
    USE_HTTPX = False


import threading
import queue
import httpx

api_queue = queue.Queue()

def api_worker():
    while True:
        task = api_queue.get()
        if task is None:
            break
        url, data = task
        
        try:
            r = httpx.post(url, json=data, timeout=3.0)
            r.raise_for_status()
        except Exception as e:
            pass # Silently drop bus positions on failure to avoid spam, we rely on incident queue for logs
        
        api_queue.task_done()

worker_thread = threading.Thread(target=api_worker, daemon=True)
worker_thread.start()

def post_bus_position(bus_id, lat, lng, speed, route_name, backend_url):
    """Send bus position update to background queue."""
    data = {
        "bus_id": bus_id,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "speed": round(speed, 1),
        "route_name": route_name,
    }
    api_queue.put((f"{backend_url}/api/buses/position", data))


def run_bus(bus_id, route_name, video_path, speed_multiplier=10, backend_url="http://localhost:8000"):
    """Run a single bus simulation."""
    route = ROUTES.get(route_name)
    if not route:
        print(f"[{bus_id}] Route '{route_name}' not found!")
        return
    
    waypoints = route["waypoints"]
    print(f"[{bus_id}] Starting on route '{route_name}' ({len(waypoints)} waypoints)")
    print(f"[{bus_id}] Speed multiplier: {speed_multiplier}x")
    
    # Initialize video player
    player = VideoPlayer(video_path)
    print(f"[{bus_id}] Video: {video_path} ({player.total_frames} frames, {player.fps} fps)")
    
    # Initialize Deck-AI detector
    # Import here to avoid circular imports and allow detector to load models
    from importlib import import_module
    deck_ai = import_module('deck-ai.detector')
    detector = deck_ai.DeckAIDetector()
    
    # Calculate timing
    frame_delay = 1.0 / (player.fps * speed_multiplier)
    total_duration = player.total_frames / player.fps / speed_multiplier
    print(f"[{bus_id}] Estimated duration: {total_duration:.1f}s")
    
    start_time = time.time()
    frames_processed = 0
    direction = 1
    last_frame = -1
    
    while True:
        frame = player.get_frame()
        if frame is None:
            break
        
        if player.current_frame < last_frame:
            direction *= -1
        last_frame = player.current_frame
        
        raw_progress = player.progress()
        progress = raw_progress if direction == 1 else 1.0 - raw_progress
        
        # Interpolate GPS position
        lat, lng = interpolate_position(waypoints, progress)
        segment_idx = get_segment_index(waypoints, progress)
        
        # Estimate speed (km/h) - simulated, occasionally goes over 40 limit
        base_speed = 20 + 30 * abs(0.5 - progress)  # Varies 20-35 km/h
        # Add random bursts of speed for overspeeding demo
        import random
        if random.random() < 0.05:
            speed = base_speed + random.uniform(15, 30)
        else:
            speed = base_speed + random.uniform(-5, 5)
        
        # Send position update every 150 frames to prevent backend flood
        if frames_processed % 150 == 0:
            post_bus_position(bus_id, lat, lng, speed, route_name, backend_url)
            elapsed = time.time() - start_time
            print(f"  [{bus_id}] Progress: {progress*100:.1f}% | GPS: ({lat:.4f}, {lng:.4f}) | Elapsed: {elapsed:.1f}s")
        
        # Process frame through Deck-AI
        detector.process_frame(frame, lat, lng, bus_id, route_name, segment_idx, speed)
        
        frames_processed += 1
        
        # Rate limiting
        time.sleep(frame_delay)
    
    player.release()
    print(f"[{bus_id}] Finished. Processed {frames_processed} frames.")


def main():
    parser = argparse.ArgumentParser(description='Bus Simulator')
    parser.add_argument('--buses', type=int, default=1, choices=[1, 2, 3],
                        help='Number of buses to simulate (1-3)')
    parser.add_argument('--speed', type=float, default=10.0,
                        help='Playback speed multiplier (default: 10)')
    parser.add_argument('--video', type=str, default=None,
                        help='Path to road video file')
    parser.add_argument('--backend', type=str, default='http://localhost:8000',
                        help='Backend API URL')
    args = parser.parse_args()
    
    # Default video path
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    video_path = args.video or os.path.join(project_root, 'simulator', 'sample_videos', 'sample_road.mp4')
    
    if not os.path.exists(video_path):
        print(f"Video not found at {video_path}")
        print("Generating sample video...")
        from simulator.sample_videos.generate_sample import generate_synthetic_road_video
        generate_synthetic_road_video(video_path)
    
    # Route assignments for each bus
    route_names = list(ROUTES.keys())
    bus_configs = [
        ("BUS-101", route_names[0 % len(route_names)]),
        ("BUS-102", route_names[1 % len(route_names)]),
        ("BUS-103", route_names[2 % len(route_names)]),
    ]
    
    if args.buses == 1:
        bus_id, route = bus_configs[0]
        run_bus(bus_id, route, video_path, args.speed, args.backend)
    else:
        # Run multiple buses sequentially (use threading for parallel)
        import threading
        threads = []
        for i in range(args.buses):
            bus_id, route = bus_configs[i]
            t = threading.Thread(
                target=run_bus,
                args=(bus_id, route, video_path, args.speed, args.backend),
                daemon=True
            )
            threads.append(t)
            t.start()
            time.sleep(1)  # Stagger starts
        
        for t in threads:
            t.join()


if __name__ == '__main__':
    main()
