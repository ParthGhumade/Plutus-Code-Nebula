#!/usr/bin/env python3
"""
Plutus - Parallel Execution Script
Starts both the FastAPI backend and Next.js frontend simultaneously.
"""

import subprocess
import sys
import os
import signal
import time
import platform
from pathlib import Path

# Configuration
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
FRONTEND_DIR = "plutus-frontend"

# Process storage for cleanup
processes = []


def print_banner():
    """Print startup banner."""
    print("=" * 60)
    print("  PLUTUS - AI-Powered Stock Trading Agent")
    print("=" * 60)
    print(f"  Backend:  http://localhost:{BACKEND_PORT}")
    print(f"  Frontend: http://localhost:{FRONTEND_PORT}")
    print(f"  API Docs: http://localhost:{BACKEND_PORT}/docs")
    print("=" * 60)
    print("  Press Ctrl+C to stop all services")
    print("=" * 60)
    print()


def cleanup(signum=None, frame=None):
    """Cleanup function to terminate all processes."""
    print("\n\nShutting down services...")
    for proc in processes:
        try:
            if proc.poll() is None:  # Process is still running
                if platform.system() == "Windows":
                    proc.terminate()
                else:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                proc.wait(timeout=5)
        except Exception as e:
            print(f"Error stopping process: {e}")
            try:
                proc.kill()
            except:
                pass
    print("All services stopped.")
    sys.exit(0)


def start_backend():
    """Start the FastAPI backend server."""
    print("[Backend] Starting FastAPI server...")
    
    # Check if server.py exists
    if not Path("server.py").exists():
        print("[Backend] ERROR: server.py not found!")
        return None
    
    try:
        if platform.system() == "Windows":
            proc = subprocess.Popen(
                [sys.executable, "server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            proc = subprocess.Popen(
                [sys.executable, "server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid
            )
        processes.append(proc)
        print(f"[Backend] Started (PID: {proc.pid})")
        return proc
    except Exception as e:
        print(f"[Backend] ERROR: {e}")
        return None


def start_frontend():
    """Start the Next.js frontend development server."""
    print("[Frontend] Starting Next.js dev server...")
    
    frontend_path = Path(FRONTEND_DIR)
    if not frontend_path.exists():
        print(f"[Frontend] ERROR: {FRONTEND_DIR} directory not found!")
        return None
    
    # Check for node_modules
    if not (frontend_path / "node_modules").exists():
        print("[Frontend] Installing dependencies (npm install)...")
        try:
            if platform.system() == "Windows":
                install_proc = subprocess.run(
                    ["npm", "install"],
                    cwd=FRONTEND_DIR,
                    shell=True,
                    capture_output=True,
                    text=True
                )
            else:
                install_proc = subprocess.run(
                    ["npm", "install"],
                    cwd=FRONTEND_DIR,
                    capture_output=True,
                    text=True
                )
            if install_proc.returncode != 0:
                print(f"[Frontend] npm install failed: {install_proc.stderr}")
                return None
        except Exception as e:
            print(f"[Frontend] ERROR installing dependencies: {e}")
            return None
    
    try:
        if platform.system() == "Windows":
            proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid
            )
        processes.append(proc)
        print(f"[Frontend] Started (PID: {proc.pid})")
        return proc
    except Exception as e:
        print(f"[Frontend] ERROR: {e}")
        return None


def stream_output(proc, prefix):
    """Stream process output with prefix."""
    try:
        while proc.poll() is None:
            line = proc.stdout.readline()
            if line:
                try:
                    text = line.decode('utf-8', errors='replace').rstrip()
                    if text:
                        print(f"{prefix} {text}")
                except:
                    pass
    except:
        pass


def monitor_processes():
    """Monitor running processes and stream output."""
    import threading
    
    for i, proc in enumerate(processes):
        prefix = "[Backend] " if i == 0 else "[Frontend]"
        thread = threading.Thread(target=stream_output, args=(proc, prefix), daemon=True)
        thread.start()
    
    # Wait for processes
    try:
        while True:
            all_dead = all(proc.poll() is not None for proc in processes)
            if all_dead:
                print("\nAll processes have stopped.")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        cleanup()


def check_requirements():
    """Check if required dependencies are available."""
    issues = []
    
    # Check Python packages
    try:
        import uvicorn
        import fastapi
    except ImportError as e:
        issues.append(f"Missing Python package: {e.name}. Run: pip install -r requirements.txt")
    
    # Check Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True, shell=True)
        if result.returncode != 0:
            issues.append("Node.js not found. Please install Node.js.")
    except:
        issues.append("Node.js not found. Please install Node.js.")
    
    # Check npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        if result.returncode != 0:
            issues.append("npm not found. Please install npm.")
    except:
        issues.append("npm not found. Please install npm.")
    
    if issues:
        print("=" * 60)
        print("DEPENDENCY ISSUES DETECTED:")
        print("=" * 60)
        for issue in issues:
            print(f"  - {issue}")
        print("=" * 60)
        return False
    
    return True


def main():
    """Main entry point."""
    # Register signal handlers
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    print_banner()
    
    # Check requirements
    if not check_requirements():
        print("\nPlease fix the above issues and try again.")
        sys.exit(1)
    
    # Start services
    backend = start_backend()
    if not backend:
        print("\nFailed to start backend. Exiting.")
        sys.exit(1)
    
    # Give backend a moment to start
    time.sleep(2)
    
    frontend = start_frontend()
    if not frontend:
        print("\nFailed to start frontend. Stopping backend...")
        cleanup()
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("  All services started successfully!")
    print("  Open http://localhost:3000 in your browser")
    print("=" * 60 + "\n")
    
    # Monitor processes
    monitor_processes()


if __name__ == "__main__":
    main()

