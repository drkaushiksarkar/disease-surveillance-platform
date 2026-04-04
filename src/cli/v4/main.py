"""CLI entry point and command routing."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Optional

logger = logging.getLogger(__name__)


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser for main."""
    parser = argparse.ArgumentParser(
        description="CLI entry point and command routing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--config", "-c",
        type=str,
        default=None,
        help="Path to configuration file",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Output file path (default: stdout)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "csv", "table"],
        default="json",
        help="Output format",
    )
    return parser


def configure_logging(verbose: bool = False) -> None:
    """Set up logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run(args: Optional[list[str]] = None) -> int:
    """Execute the main command."""
    parser = create_parser()
    parsed = parser.parse_args(args)
    configure_logging(parsed.verbose)

    logger.info("Starting main")

    if parsed.dry_run:
        logger.info("Running in dry-run mode")

    try:
        result = execute_command(parsed)
        output = format_output(result, parsed.format)

        if parsed.output:
            with open(parsed.output, "w") as f:
                f.write(output)
            logger.info("Output written to %s", parsed.output)
        else:
            print(output)

        return 0
    except Exception as exc:
        logger.error("Command failed: %s", exc)
        return 1


def execute_command(args: argparse.Namespace) -> dict:
    """Execute the main command logic."""
    return {
        "command": "main",
        "status": "completed",
        "dry_run": args.dry_run,
    }


def format_output(data: dict, fmt: str) -> str:
    """Format output data."""
    if fmt == "json":
        return json.dumps(data, indent=2, default=str)
    elif fmt == "csv":
        if not data:
            return ""
        headers = list(data.keys())
        values = [str(data.get(h, "")) for h in headers]
        return ",".join(headers) + "\n" + ",".join(values)
    elif fmt == "table":
        lines = []
        max_key = max(len(str(k)) for k in data.keys()) if data else 0
        for k, v in data.items():
            lines.append(f"{str(k):<{max_key}}  {v}")
        return "\n".join(lines)
    return str(data)


if __name__ == "__main__":
    sys.exit(run())
