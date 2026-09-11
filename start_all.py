"""
start_all.py — One-command launcher for the Urban Intelligence Platform.

Starts backend, frontend dev server, seeds mock data, and launches the bus simulator.
Usage: python start_all.py [--buses N] [--speed X]
"""
import subprocess
import sys
import os
import time
import signal
import argparse

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
VENV_PYTHON = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")

# Fallback to system python if venv not found
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

processes = []


def cleanup(signum=None, frame=None):
    """Kill all child processes."""
    print("\n🛑 Shutting down all services...")
    for name, proc in processes:
        if proc.poll() is None:
            print(f"  Stopping {name}...")
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    print("✅ All services stopped.")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="Urban Intelligence Platform Launcher")
    parser.add_argument("--buses", type=int, default=3, choices=[1, 2, 3],
                        help="Number of simulated buses (default: 3)")
    parser.add_argument("--speed", type=float, default=10.0,
                        help="Playback speed multiplier (default: 10)")
    parser.add_argument("--no-frontend", action="store_true",
                        help="Skip starting the frontend dev server")
    parser.add_argument("--no-simulator", action="store_true",
                        help="Skip starting the bus simulator")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("=" * 60)
    print("🚌  Urban Intelligence Platform — Starting All Services")
    print("=" * 60)

    # 1. Start Backend
    print("\n📡 Starting backend server on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "backend.main:app",
         "--host", "0.0.0.0", "--port", "8000"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    processes.append(("Backend", backend_proc))
    time.sleep(3)

    if backend_proc.poll() is not None:
        print("❌ Backend failed to start!")
        cleanup()
        return

    print("✅ Backend started.")

    # 2. Seed mock data
    print("\n🌱 Seeding demo data...")
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://localhost:8000/api/seed",
            method="POST",
            data=b""
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            import json
            result = json.loads(resp.read())
            print(f"✅ {result['message']}")
    except Exception as e:
        print(f"⚠️  Seeding failed: {e}")

    # 3. Start Frontend (if Node.js available)
    if not args.no_frontend:
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        try:
            # Check if node_modules exists
            if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
                print("\n📦 Installing frontend dependencies...")
                subprocess.run(
                    [npm_cmd, "install"],
                    cwd=frontend_dir,
                    check=True,
                    timeout=120,
                )

            print("\n🖥️  Starting frontend on http://localhost:3000 ...")
            frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            processes.append(("Frontend", frontend_proc))
            time.sleep(3)
            print("✅ Frontend started.")
        except FileNotFoundError:
            print("⚠️  Node.js/npm not found. Skipping frontend.")
            print("   Install Node.js and run: cd frontend && npm install && npm run dev")
        except Exception as e:
            print(f"⚠️  Frontend failed: {e}")

    # 4. Generate sample video if needed
    video_path = os.path.join(PROJECT_ROOT, "simulator", "sample_videos", "sample_road.mp4")
    if not os.path.exists(video_path):
        print("\n🎬 Generating sample road video...")
        subprocess.run(
            [VENV_PYTHON, os.path.join(PROJECT_ROOT, "simulator", "sample_videos", "generate_sample.py")],
            cwd=PROJECT_ROOT,
            timeout=60,
        )

    # 5. Start Simulator
    if not args.no_simulator:
        print(f"\n🚌 Starting bus simulator ({args.buses} buses, {args.speed}x speed)...")
        time.sleep(2)
        sim_proc = subprocess.Popen(
            [VENV_PYTHON, "-m", "simulator.bus_simulator",
             "--buses", str(args.buses),
             "--speed", str(args.speed),
             "--backend", "http://localhost:8000"],
            cwd=PROJECT_ROOT,
        )
        processes.append(("Simulator", sim_proc))
        print("✅ Simulator started.")

    # Summary
    print("\n" + "=" * 60)
    print("🚀 All services running!")
    print("   Backend:    http://localhost:8000")
    print("   Dashboard:  http://localhost:3000")
    print("   API Docs:   http://localhost:8000/docs")
    print("=" * 60)
    print("Press Ctrl+C to stop all services.\n")

    # Wait for any process to exit
    try:
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"⚠️  {name} exited with code {proc.returncode}")
            time.sleep(2)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
