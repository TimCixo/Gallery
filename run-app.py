#!/usr/bin/env python3
import argparse
import re
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

if os.name == "nt":
    import ctypes
    import msvcrt


PREFIXED_LOG_PATTERN = re.compile(r"^(?P<timestamp>\d{2}:\d{2}:\d{2}) \[(?P<source>[^\]]+)\] (?P<message>.*)$")
ANSI_ESCAPE_PATTERN = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")
LOG_SOURCE_WIDTH = len("frontend")
ANSI_RESET = "\033[0m"
ANSI_RED = "\033[31m"
ANSI_YELLOW = "\033[33m"
ANSI_GREEN = "\033[32m"
ANSI_BLUE = "\033[34m"
ANSI_BRIGHT_GREEN = "\033[92m"
ANSI_BRIGHT_BLUE = "\033[94m"
ANSI_CYAN = "\033[36m"
ANSI_MAGENTA = "\033[35m"
ANSI_BRIGHT_WHITE = "\033[97m"
ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
COLOR_OUTPUT_ENABLED = True


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "t", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "f", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError("Expected true/false")


def enable_console_colors() -> bool:
    if os.name != "nt":
        return True

    kernel32 = ctypes.windll.kernel32
    stdout_handle = kernel32.GetStdHandle(-11)
    if stdout_handle == 0 or stdout_handle == -1:
        return False

    mode = ctypes.c_uint()
    if kernel32.GetConsoleMode(stdout_handle, ctypes.byref(mode)) == 0:
        return False

    new_mode = mode.value | ENABLE_VIRTUAL_TERMINAL_PROCESSING
    if kernel32.SetConsoleMode(stdout_handle, new_mode) == 0:
        return False

    return True


def detect_log_prefix_color(source: str, message: str) -> str | None:
    normalized_message = message.lower()
    if "error" in normalized_message or "ошиб" in normalized_message:
        return ANSI_RED
    if "warning" in normalized_message or "warn" in normalized_message or "предупреж" in normalized_message:
        return ANSI_YELLOW
    if source == "startup":
        return ANSI_GREEN
    if source == "input":
        return ANSI_BRIGHT_GREEN
    if source == "frontend":
        return ANSI_CYAN
    if source == "backend":
        return ANSI_BRIGHT_BLUE
    return None


def format_source_label(source: str, message: str, use_color: bool = True) -> str:
    label = f"[{source:<{LOG_SOURCE_WIDTH}}]"
    color = detect_log_prefix_color(source, message)
    if not use_color or color is None or not COLOR_OUTPUT_ENABLED:
        return label
    return f"{color}{label}{ANSI_RESET}"


def colorize_text(text: str, color: str | None) -> str:
    if not COLOR_OUTPUT_ENABLED or color is None or not text:
        return text
    return f"{color}{text}{ANSI_RESET}"


def build_primary_art_component_mask(art_lines: list[str]) -> set[tuple[int, int]]:
    points = {
        (row_index, column_index)
        for row_index, line in enumerate(art_lines)
        for column_index, character in enumerate(line)
        if character != " "
    }
    if not points:
        return set()

    components: list[set[tuple[int, int]]] = []
    visited: set[tuple[int, int]] = set()
    neighbors = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ]

    for point in points:
        if point in visited:
            continue

        component: set[tuple[int, int]] = set()
        stack = [point]
        visited.add(point)
        while stack:
            row_index, column_index = stack.pop()
            component.add((row_index, column_index))
            for row_offset, column_offset in neighbors:
                neighbor = (row_index + row_offset, column_index + column_offset)
                if neighbor in points and neighbor not in visited:
                    visited.add(neighbor)
                    stack.append(neighbor)
        components.append(component)

    components.sort(key=len, reverse=True)
    return components[0]


def colorize_art_lines(art_lines: list[str], primary_color: str, secondary_color: str) -> list[str]:
    if not COLOR_OUTPUT_ENABLED:
        return art_lines

    primary_component = build_primary_art_component_mask(art_lines)
    colored_lines: list[str] = []
    for row_index, line in enumerate(art_lines):
        parts: list[str] = []
        for column_index, character in enumerate(line):
            if character == " ":
                parts.append(character)
                continue

            color = primary_color if (row_index, column_index) in primary_component else secondary_color
            parts.append(colorize_text(character, color))
        colored_lines.append("".join(parts))
    return colored_lines


def format_log_message(source: str, message: str) -> str:
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"{timestamp} {format_source_label(source, message)} {message}"


def log(source: str, message: str) -> None:
    print(format_log_message(source, message), flush=True)


def normalize_prefixed_log_line(line: str) -> str:
    match = PREFIXED_LOG_PATTERN.match(line)
    if match is None:
        return line

    timestamp = match.group("timestamp")
    source = match.group("source").strip()
    message = match.group("message")
    return f"{timestamp} {format_source_label(source, message)} {message}"


def clean_output_line(line: str) -> str:
    return ANSI_ESCAPE_PATTERN.sub("", line).strip()


def stream_process_output(stream: object, source: str) -> None:
    if stream is None:
        return

    previous_line: str | None = None
    duplicate_count = 0

    def flush_previous() -> None:
        nonlocal previous_line, duplicate_count
        if previous_line is None:
            return

        if PREFIXED_LOG_PATTERN.match(previous_line):
            print(normalize_prefixed_log_line(previous_line), flush=True)
        else:
            log(source, previous_line)

        if duplicate_count > 0:
            log(source, f"(previous line repeated {duplicate_count} more times)")

        previous_line = None
        duplicate_count = 0

    try:
        for raw_line in stream:
            line = clean_output_line(raw_line.rstrip("\r\n"))
            if not line:
                continue

            if line == previous_line:
                duplicate_count += 1
                continue

            flush_previous()
            previous_line = line
        flush_previous()
    finally:
        close = getattr(stream, "close", None)
        if callable(close):
            close()


def run_logged_command(command: list[str], cwd: Path, source: str) -> None:
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    try:
        stream_process_output(process.stdout, source)
        return_code = process.wait()
        if return_code != 0:
            raise subprocess.CalledProcessError(return_code, command)
    finally:
        if process.poll() is None:
            process.kill()


def start_logged_process(command: list[str], cwd: Path, source: str) -> tuple[subprocess.Popen[str], threading.Thread]:
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    reader_thread = threading.Thread(
        target=stream_process_output,
        args=(process.stdout, source),
        daemon=True,
    )
    reader_thread.start()
    return process, reader_thread


def clear_console() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def reset_console_cursor_to_line_start() -> None:
    print("\r", end="", flush=True)


def print_shortcuts() -> None:
    log("startup", "Shortcuts")
    log("startup", "  r + enter: restart frontend")
    log("startup", "  u + enter: show URLs")
    log("startup", "  o + enter: open frontend in browser")
    log("startup", "  c + enter: clear console")
    log("startup", "  q + enter: quit")
    log("startup", "  h + enter: show this help")


def print_runtime_configuration(
    mode_label: str,
    frontend_public_url: str,
    backend_public_url: str,
    open_url_in_browser: bool,
    is_network_mode: bool,
) -> None:
    log("startup", "runtime.config")
    log("startup", f"  mode={mode_label}")
    log("startup", f"  frontend.url={frontend_public_url}")
    log("startup", f"  backend.url={backend_public_url}")
    log("startup", f"  browser.open={'true' if open_url_in_browser else 'false'}")
    if is_network_mode:
        log("startup", "  network.hint=open frontend.url from another LAN device")
        log("startup", "  network.firewall=tcp/5173,tcp/5000 must allow inbound access")


def build_runtime_banner(
    mode_label: str,
    frontend_public_url: str,
    backend_public_url: str,
    open_url_in_browser: bool,
    ffmpeg_path: str | None,
    is_network_mode: bool,
) -> str:
    art_lines = [
        r"                                        ",
        r"                                        ",
        r"       @%%%%%%%%%%%%%%%%%%%@@           ",
        r"     %%%@%%%%%%%%%%%%%%%%%%%%%@         ",
        r"    %%@%                   @%%%@        ",
        r"    %%@                      %%%        ",
        r"    %%%              %%%%    %%% %%%    ",
        r"     @               %%%@    %%% %%%    ",
        r"    %%@                      %%% %%%    ",
        r"    %%% @%%%%%@@             %%@ %%%    ",
        r"    %%% %%@@@@%%@%  @%%%@@       %%%    ",
        r"    %%%       %%%%%%%%%%%@@@ @%% %%%    ",
        r"    %%%         @@%%@   @%%%@%%% %%%    ",
        r"    %%%       @%%%@       @%%%%% %%%    ",
        r"    %%%%     @%%@@          @%%% %%@    ",
        r"    %%%%%     %           @@%%@@@@%%    ",
        r"     %@%%%%%%%%%%%%%%%%%%%%%%% %%%@@    ",
        r"       @@@@@@@@@@@@@@@@@@%%@  %%%%@     ",
        r"               @%%%%%%%%%%%%%%%%%       ",
        r"               %%%%%%%%%%%%%%@          ",
        r"                                        ",
        r"                                        ",
    ]
    title = "gallery@runtime"
    info_entries = [
        ("Status", "READY"),
        ("Mode", mode_label),
        ("Frontend", frontend_public_url),
        ("Backend", backend_public_url),
        ("Browser", "true" if open_url_in_browser else "false"),
        ("FFmpeg", ffmpeg_path or "unavailable"),
        ("Scope", "lan" if is_network_mode else "localhost"),
    ]
    key_width = max(len(key) for key, _ in info_entries)
    info_width = max(
        len(title),
        max(len(f"{key}: {value}") for key, value in info_entries),
    )
    separator = "-" * info_width
    art_color = ANSI_GREEN
    header_color = ANSI_GREEN
    key_color = ANSI_GREEN
    value_color = ANSI_BRIGHT_WHITE
    formatted_info_lines = []
    for key, value in info_entries:
        key_label = f"{key + ':':<{key_width + 1}}"
        formatted_info_lines.append(
            f"{colorize_text(key_label, key_color)} {colorize_text(value, value_color)}"
        )
    info_lines = [
        colorize_text(title, header_color),
        colorize_text(separator, header_color),
        *formatted_info_lines,
    ]
    width = max(len(line) for line in art_lines)
    padded_art_lines = colorize_art_lines(
        [line.ljust(width) for line in art_lines],
        primary_color=art_color,
        secondary_color=ANSI_BRIGHT_WHITE,
    )
    info_top_padding = 2
    padded_info_lines = ([""] * info_top_padding) + [line.ljust(info_width) for line in info_lines]
    total_lines = max(len(padded_art_lines), len(padded_info_lines))
    rows: list[str] = []
    for index in range(total_lines):
        art = padded_art_lines[index] if index < len(padded_art_lines) else " " * width
        info = padded_info_lines[index] if index < len(padded_info_lines) else ""
        rows.append(f"{art}   {info}".rstrip())
    return "\n".join(rows)


def print_runtime_banner(
    mode_label: str,
    frontend_public_url: str,
    backend_public_url: str,
    open_url_in_browser: bool,
    ffmpeg_path: str | None,
    is_network_mode: bool,
) -> None:
    print(build_runtime_banner(
        mode_label=mode_label,
        frontend_public_url=frontend_public_url,
        backend_public_url=backend_public_url,
        open_url_in_browser=open_url_in_browser,
        ffmpeg_path=ffmpeg_path,
        is_network_mode=is_network_mode,
    ), flush=True)


def start_frontend_process(
    frontend_path: Path,
    frontend_host: str,
    frontend_public_url: str,
) -> subprocess.Popen[str]:
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    log("startup", f"Starting frontend at {frontend_public_url} ...")
    frontend_process, _frontend_output_thread = start_logged_process(
        [npm_cmd, "run", "dev", "--", "--host", frontend_host, "--port", "5173"],
        cwd=frontend_path,
        source="frontend",
    )
    return frontend_process


def restart_frontend_process(
    process_holder: dict[str, subprocess.Popen[str] | None],
    process_lock: threading.Lock,
    frontend_path: Path,
    frontend_host: str,
    frontend_public_url: str,
) -> None:
    with process_lock:
        frontend_process = process_holder.get("frontend")
        if frontend_process is not None:
            terminate_process(frontend_process)
        process_holder["frontend"] = start_frontend_process(
            frontend_path=frontend_path,
            frontend_host=frontend_host,
            frontend_public_url=frontend_public_url,
        )


def handle_launcher_command(
    command: str,
    process_holder: dict[str, subprocess.Popen[str] | None],
    process_lock: threading.Lock,
    frontend_path: Path,
    frontend_host: str,
    frontend_public_url: str,
    backend_public_url: str,
    open_url_in_browser: bool,
    shutdown_requested: threading.Event,
) -> None:
    normalized = command.strip().lower()
    log("input", normalized if normalized else "(empty)")

    if not normalized:
        return
    if normalized == "h":
        print_shortcuts()
        return
    if normalized == "u":
        print_runtime_configuration(
            mode_label="Current Session",
            frontend_public_url=frontend_public_url,
            backend_public_url=backend_public_url,
            open_url_in_browser=open_url_in_browser,
            is_network_mode=frontend_public_url != "http://localhost:5173",
        )
        return
    if normalized == "o":
        webbrowser.open(frontend_public_url)
        log("startup", f"Opened {frontend_public_url} in browser.")
        return
    if normalized == "c":
        clear_console()
        log("startup", "Console cleared.")
        return
    if normalized == "q":
        log("startup", "Quit requested.")
        shutdown_requested.set()
        return
    if normalized == "r":
        log("startup", "Restarting frontend...")
        restart_frontend_process(
            process_holder=process_holder,
            process_lock=process_lock,
            frontend_path=frontend_path,
            frontend_host=frontend_host,
            frontend_public_url=frontend_public_url,
        )
        return

    log("startup", f"Unknown command: {normalized}. Press h + enter to show help.")


def read_launcher_commands(
    process_holder: dict[str, subprocess.Popen[str] | None],
    process_lock: threading.Lock,
    frontend_path: Path,
    frontend_host: str,
    frontend_public_url: str,
    backend_public_url: str,
    open_url_in_browser: bool,
    shutdown_requested: threading.Event,
) -> None:
    if os.name == "nt":
        buffer = ""
        while not shutdown_requested.is_set():
            char = msvcrt.getwch()
            if char == "\003":
                shutdown_requested.set()
                return
            if char in {"\x00", "\xe0"}:
                msvcrt.getwch()
                continue
            if char == "\b":
                if buffer:
                    buffer = buffer[:-1]
                    print("\b \b", end="", flush=True)
                continue
            if char in {"\r", "\n"}:
                line = buffer
                buffer = ""
                reset_console_cursor_to_line_start()
                handle_launcher_command(
                    command=line,
                    process_holder=process_holder,
                    process_lock=process_lock,
                    frontend_path=frontend_path,
                    frontend_host=frontend_host,
                    frontend_public_url=frontend_public_url,
                    backend_public_url=backend_public_url,
                    open_url_in_browser=open_url_in_browser,
                    shutdown_requested=shutdown_requested,
                )
                continue

            buffer += char
            print(char, end="", flush=True)
        return

    while not shutdown_requested.is_set():
        line = sys.stdin.readline()
        if not line:
            shutdown_requested.set()
            return
        handle_launcher_command(
            command=line.rstrip("\r\n"),
            process_holder=process_holder,
            process_lock=process_lock,
            frontend_path=frontend_path,
            frontend_host=frontend_host,
            frontend_public_url=frontend_public_url,
            backend_public_url=backend_public_url,
            open_url_in_browser=open_url_in_browser,
            shutdown_requested=shutdown_requested,
        )


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

    log("startup", "ffmpeg was not found. Trying to install via winget...")
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
        log("startup", f"Warning: winget install ffmpeg failed: {exc}")

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
    global COLOR_OUTPUT_ENABLED
    parser = argparse.ArgumentParser(description="Run Gallery backend and frontend")
    parser.add_argument("--mode", choices=["machine", "network"], default="machine")
    parser.add_argument("--open-url", type=parse_bool, default=True)
    args = parser.parse_args()

    COLOR_OUTPUT_ENABLED = enable_console_colors()

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
        log("startup", f"ffmpeg: {ffmpeg_path}")
    else:
        log("startup", "Warning: ffmpeg is not available. Video preview for mp4/gif will not work.")
        if os.name == "nt":
            log("startup", "Install command: winget install --id Gyan.FFmpeg")

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

    print_runtime_configuration(
        mode_label=mode_label,
        frontend_public_url=frontend_public_url,
        backend_public_url=backend_public_url,
        open_url_in_browser=args.open_url,
        is_network_mode=args.mode == "network",
    )

    log("startup", "Restoring backend dependencies...")
    run_logged_command(["dotnet", "restore", str(backend_path)], cwd=root, source="backend")

    if not (frontend_path / "node_modules").exists():
        log("startup", "Installing frontend dependencies...")
        run_logged_command(["npm", "install"], cwd=frontend_path, source="frontend")

    log("startup", f"Starting backend at {backend_bind_url} ...")
    backend_process, _backend_output_thread = start_logged_process(
        ["dotnet", "run", "--urls", backend_bind_url],
        cwd=backend_path,
        source="backend",
    )

    process_lock = threading.Lock()
    process_holder: dict[str, subprocess.Popen[str] | None] = {
        "backend": backend_process,
        "frontend": start_frontend_process(
            frontend_path=frontend_path,
            frontend_host=frontend_host,
            frontend_public_url=frontend_public_url,
        ),
    }
    shutdown_requested = threading.Event()
    command_thread = threading.Thread(
        target=read_launcher_commands,
        args=(
            process_holder,
            process_lock,
            frontend_path,
            frontend_host,
            frontend_public_url,
            backend_public_url,
            args.open_url,
            shutdown_requested,
        ),
        daemon=True,
    )
    command_thread.start()

    time.sleep(4)
    if args.open_url:
        webbrowser.open(frontend_public_url)

    log("startup", f"App is running in '{mode_label}' mode. Press Ctrl+C to stop both processes.")
    print_runtime_banner(
        mode_label=mode_label,
        frontend_public_url=frontend_public_url,
        backend_public_url=backend_public_url,
        open_url_in_browser=args.open_url,
        ffmpeg_path=ffmpeg_path,
        is_network_mode=args.mode == "network",
    )

    try:
        while True:
            time.sleep(1)
            if shutdown_requested.is_set():
                break

            with process_lock:
                backend_process = process_holder["backend"]
                frontend_process = process_holder["frontend"]

            if backend_process is not None and backend_process.poll() is not None:
                raise RuntimeError("Backend process stopped.")
            if frontend_process is not None and frontend_process.poll() is not None:
                raise RuntimeError("Frontend process stopped.")
    finally:
        with process_lock:
            terminate_process(process_holder.get("frontend"))
            terminate_process(process_holder.get("backend"))


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        raise SystemExit(130)
