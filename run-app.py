#!/usr/bin/env python3
import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "t", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "f", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError("Expected true/false")


def resolve_ffmpeg_executable() -> str | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg and Path(ffmpeg).exists():
        return ffmpeg

    candidates = []
    local_app_data = os.environ.get("LOCALAPPDATA")
    program_files = os.environ.get("ProgramFiles")
    chocolatey = os.environ.get("ChocolateyInstall")
    home = str(Path.home())

    def add(root: str | None, child: str) -> None:
        if root:
            candidates.append(str(Path(root) / child))

    add(local_app_data, r"Microsoft\WinGet\Links\ffmpeg.exe")
    add(program_files, r"ffmpeg\bin\ffmpeg.exe")
    add(program_files, r"FFmpeg\bin\ffmpeg.exe")
    add(chocolatey, r"bin\ffmpeg.exe")
    add("/usr/local/bin", "ffmpeg")
    add("/usr/bin", "ffmpeg")
    add(home, ".local/bin/ffmpeg")
    add(home, "homebrew/bin/ffmpeg")

    for candidate in candidates:
        if Path(candidate).exists():
            return candidate

    return None


def ensure_ffmpeg_executable() -> str | None:
    resolved = resolve_ffmpeg_executable()
    if resolved:
        return resolved

    if os.name != "nt" or shutil.which("winget") is None:
        return None

    print("ffmpeg was not found. Trying to install via winget...")
    try:
        subprocess.run(
            [
                "winget",
                "install",
                "--id",
                "Gyan.FFmpeg",
                "--accept-package-agreements",
                "--accept-source-agreements",
                "--silent",
            ],
            check=False,
        )
    except Exception as exc:
        print(f"Warning: winget install ffmpeg failed: {exc}")

    return resolve_ffmpeg_executable()


def get_preferred_ipv4() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except OSError:
        pass

    try:
        for _, _, _, _, sockaddr in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = sockaddr[0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except OSError:
        pass

    return None


def terminate_process(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return

    try:
        if os.name == "nt":
            process.terminate()
            process.wait(timeout=5)
        else:
            process.send_signal(signal.SIGTERM)
            process.wait(timeout=5)
    except Exception:
        try:
            process.kill()
        except Exception:
            pass


def run() -> int:
    parser = argparse.ArgumentParser(description="Run Gallery backend and frontend")
    parser.add_argument("--mode", choices=["machine", "network"], default="machine")
    parser.add_argument("--open-url", type=parse_bool, default=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    backend_path = root / "GalleryApp" / "backend"
    frontend_path = root / "GalleryApp" / "frontend"

    if not backend_path.exists():
        raise FileNotFoundError(f"Backend folder not found: {backend_path}")
    if not frontend_path.exists():
        raise FileNotFoundError(f"Frontend folder not found: {frontend_path}")

    ffmpeg_path = ensure_ffmpeg_executable()
    if ffmpeg_path:
        os.environ["FFMPEG_PATH"] = ffmpeg_path
        ffmpeg_dir = str(Path(ffmpeg_path).parent)
        current_path = os.environ.get("PATH", "")
        path_separator = ";" if os.name == "nt" else ":"
        path_items = current_path.split(path_separator) if current_path else []
        if ffmpeg_dir not in path_items:
            os.environ["PATH"] = f"{ffmpeg_dir}{path_separator}{current_path}" if current_path else ffmpeg_dir
        print(f"ffmpeg: {ffmpeg_path}")
    else:
        print("Warning: ffmpeg is not available. Video preview for mp4/gif will not work.")
        if os.name == "nt":
            print("Install command: winget install --id Gyan.FFmpeg")

    local_ip = get_preferred_ipv4()
    if args.mode == "network" and not local_ip:
        raise RuntimeError("Cannot detect local IPv4 address for network mode.")

    if args.mode == "machine":
        backend_bind_url = "http://localhost:5000"
        backend_public_url = "http://localhost:5000"
        frontend_host = "localhost"
        frontend_public_url = "http://localhost:5173"
        mode_label = "Local Machine"
    else:
        backend_bind_url = "http://0.0.0.0:5000"
        backend_public_url = f"http://{local_ip}:5000"
        frontend_host = "0.0.0.0"
        frontend_public_url = f"http://{local_ip}:5173"
        mode_label = "Local Network"

    print(f"Run mode: {mode_label}")
    print(f"Frontend URL: {frontend_public_url}")
    print(f"Backend URL:  {backend_public_url}")
    print(f"Open URL in browser: {'true' if args.open_url else 'false'}")
    if args.mode == "network":
        print("How to connect from another device in your LAN:")
        print(f"1. Open {frontend_public_url} in a browser.")
        print("2. Ensure firewall allows incoming TCP connections on ports 5173 and 5000.")

    print("Restoring backend dependencies...")
    subprocess.run(["dotnet", "restore", str(backend_path)], check=True, cwd=root)

    if not (frontend_path / "node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], check=True, cwd=frontend_path)

    print(f"Starting backend at {backend_bind_url} ...")
    backend_process = subprocess.Popen(
        ["dotnet", "run", "--urls", backend_bind_url],
        cwd=backend_path,
    )

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    print(f"Starting frontend at {frontend_public_url} ...")
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", frontend_host, "--port", "5173"],
        cwd=frontend_path,
    )

    time.sleep(4)
    if args.open_url:
        webbrowser.open(frontend_public_url)

    print(f"App is running in '{mode_label}' mode. Press Ctrl+C to stop both processes.")

    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                raise RuntimeError("Backend process stopped.")
            if frontend_process.poll() is not None:
                raise RuntimeError("Frontend process stopped.")
    finally:
        terminate_process(frontend_process)
        terminate_process(backend_process)


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        raise SystemExit(130)
