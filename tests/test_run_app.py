import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


RUN_APP_PATH = Path(__file__).resolve().parents[1] / "run-app.py"
SPEC = importlib.util.spec_from_file_location("run_app", RUN_APP_PATH)
RUN_APP = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(RUN_APP)


class FormatLogMessageTests(unittest.TestCase):
    def test_prefixes_use_fixed_width(self) -> None:
        startup_label = RUN_APP.format_source_label("startup", "ready", use_color=False)
        backend_label = RUN_APP.format_source_label("backend", "ready", use_color=False)
        frontend_label = RUN_APP.format_source_label("frontend", "ready", use_color=False)
        input_label = RUN_APP.format_source_label("input", "ready", use_color=False)

        self.assertEqual(startup_label, "[startup ]")
        self.assertEqual(backend_label, "[backend ]")
        self.assertEqual(frontend_label, "[frontend]")
        self.assertEqual(input_label, "[input   ]")

    def test_normalize_prefixed_log_line_uses_fixed_width(self) -> None:
        with patch.object(RUN_APP, "format_source_label", lambda source, message, use_color=True: f"[{source:<8}]"):
            normalized = RUN_APP.normalize_prefixed_log_line("14:31:00 [startup] Backend startup started.")
        self.assertEqual(normalized, "14:31:00 [startup ] Backend startup started.")

    def test_startup_and_input_prefixes_are_colored(self) -> None:
        startup_label = RUN_APP.format_source_label("startup", "ready")
        input_label = RUN_APP.format_source_label("input", "h")

        self.assertEqual(startup_label, f"{RUN_APP.ANSI_GREEN}[startup ]{RUN_APP.ANSI_RESET}")
        self.assertEqual(input_label, f"{RUN_APP.ANSI_BRIGHT_GREEN}[input   ]{RUN_APP.ANSI_RESET}")

    def test_warning_and_error_override_source_color(self) -> None:
        warning_label = RUN_APP.format_source_label("backend", "warning NU1902")
        error_label = RUN_APP.format_source_label("frontend", "error failed to compile")

        self.assertEqual(warning_label, f"{RUN_APP.ANSI_YELLOW}[backend ]{RUN_APP.ANSI_RESET}")
        self.assertEqual(error_label, f"{RUN_APP.ANSI_RED}[frontend]{RUN_APP.ANSI_RESET}")

    def test_frontend_and_backend_prefixes_have_distinct_colors(self) -> None:
        frontend_label = RUN_APP.format_source_label("frontend", "ready")
        backend_label = RUN_APP.format_source_label("backend", "ready")

        self.assertEqual(frontend_label, f"{RUN_APP.ANSI_CYAN}[frontend]{RUN_APP.ANSI_RESET}")
        self.assertEqual(backend_label, f"{RUN_APP.ANSI_BRIGHT_BLUE}[backend ]{RUN_APP.ANSI_RESET}")

    def test_color_output_can_be_disabled(self) -> None:
        with patch.object(RUN_APP, "COLOR_OUTPUT_ENABLED", False):
            startup_label = RUN_APP.format_source_label("startup", "ready")
            warning_label = RUN_APP.format_source_label("backend", "warning NU1902")

        self.assertEqual(startup_label, "[startup ]")
        self.assertEqual(warning_label, "[backend ]")

    def test_runtime_configuration_uses_technical_format(self) -> None:
        captured_logs: list[tuple[str, str]] = []

        def capture_log(source: str, message: str) -> None:
            captured_logs.append((source, message))

        with patch.object(RUN_APP, "log", capture_log):
            RUN_APP.print_runtime_configuration(
                mode_label="Local Network",
                frontend_public_url="http://192.168.0.100:5173",
                backend_public_url="http://192.168.0.100:5000",
                open_url_in_browser=False,
                is_network_mode=True,
            )

        self.assertEqual(
            captured_logs,
            [
                ("startup", "runtime.config"),
                ("startup", "  mode=Local Network"),
                ("startup", "  frontend.url=http://192.168.0.100:5173"),
                ("startup", "  backend.url=http://192.168.0.100:5000"),
                ("startup", "  browser.open=false"),
                ("startup", "  network.hint=open frontend.url from another LAN device"),
                ("startup", "  network.firewall=tcp/5173,tcp/5000 must allow inbound access"),
            ],
        )

    def test_runtime_banner_includes_required_runtime_fields(self) -> None:
        with patch.object(RUN_APP, "COLOR_OUTPUT_ENABLED", False):
            banner = RUN_APP.build_runtime_banner(
                mode_label="Local Network",
                frontend_public_url="http://192.168.0.100:5173",
                backend_public_url="http://192.168.0.100:5000",
                open_url_in_browser=False,
                ffmpeg_path="C:\\ffmpeg\\bin\\ffmpeg.exe",
                is_network_mode=True,
            )

        self.assertIn("gallery@runtime", banner)
        self.assertIn("---------------", banner)
        self.assertIn("Status:   READY", banner)
        self.assertIn("Mode:     Local Network", banner)
        self.assertIn("Frontend: http://192.168.0.100:5173", banner)
        self.assertIn("Backend:  http://192.168.0.100:5000", banner)
        self.assertIn("Browser:  false", banner)
        self.assertIn("FFmpeg:   C:\\ffmpeg\\bin\\ffmpeg.exe", banner)
        self.assertIn("Scope:    lan", banner)

    def test_runtime_banner_uses_color_when_enabled(self) -> None:
        with patch.object(RUN_APP, "COLOR_OUTPUT_ENABLED", True):
            banner = RUN_APP.build_runtime_banner(
                mode_label="Local Machine",
                frontend_public_url="http://localhost:5173",
                backend_public_url="http://localhost:5000",
                open_url_in_browser=True,
                ffmpeg_path=None,
                is_network_mode=False,
            )

        self.assertIn(RUN_APP.ANSI_GREEN, banner)
        self.assertIn(RUN_APP.ANSI_BRIGHT_WHITE, banner)

    def test_colorize_art_lines_uses_primary_and_secondary_components(self) -> None:
        with patch.object(RUN_APP, "COLOR_OUTPUT_ENABLED", True):
            colored_lines = RUN_APP.colorize_art_lines(
                [
                    " @@@ ",
                    " @ @ ",
                    "     ",
                    "  %  ",
                ],
                primary_color=RUN_APP.ANSI_GREEN,
                secondary_color=RUN_APP.ANSI_BRIGHT_WHITE,
            )

        self.assertIn(f"{RUN_APP.ANSI_GREEN}@{RUN_APP.ANSI_RESET}", colored_lines[0])
        self.assertIn(f"{RUN_APP.ANSI_BRIGHT_WHITE}%{RUN_APP.ANSI_RESET}", colored_lines[3])


if __name__ == "__main__":
    unittest.main()
