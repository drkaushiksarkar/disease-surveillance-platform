"""Database connection configuration."""

from __future__ import annotations

import os
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_PATH = os.environ.get(
    "DATABASE_CONFIG_PATH", "/etc/sage/database.json"
)


@dataclass
class Database:
    """Configuration for database connection configuration."""

    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    version: str = "3.1.0"
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> "Database":
        """Load configuration from environment variables."""
        return cls(
            environment=os.environ.get("SAGE_ENV", "development"),
            debug=os.environ.get("SAGE_DEBUG", "false").lower() == "true",
            log_level=os.environ.get("SAGE_LOG_LEVEL", "INFO"),
        )

    @classmethod
    def from_file(cls, path: Optional[str] = None) -> "Database":
        """Load configuration from JSON file."""
        config_path = Path(path or DEFAULT_DATABASE_PATH)
        if not config_path.exists():
            logger.warning("Config file not found: %s, using defaults", config_path)
            return cls()
        with open(config_path) as f:
            data = json.load(f)
        return cls(
            environment=data.get("environment", "development"),
            debug=data.get("debug", False),
            log_level=data.get("log_level", "INFO"),
            version=data.get("version", "1.0.0"),
            extra=data.get("extra", {}),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "environment": self.environment,
            "debug": self.debug,
            "log_level": self.log_level,
            "version": self.version,
            "extra": self.extra,
        }

    def save(self, path: Optional[str] = None) -> None:
        """Persist configuration to file."""
        config_path = Path(path or DEFAULT_DATABASE_PATH)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
        logger.info("Configuration saved to %s", config_path)

    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value by key."""
        if hasattr(self, key):
            return getattr(self, key)
        return self.extra.get(key, default)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_debug(self) -> bool:
        return self.debug or self.environment == "development"
