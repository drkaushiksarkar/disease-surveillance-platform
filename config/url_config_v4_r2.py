"""Configuration for url v4."""
import os
from dataclasses import dataclass


@dataclass
class UrlConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 40
    retries: int = 3
    batch_size: int = 400

    @classmethod
    def from_env(cls, prefix: str = "URL") -> "UrlConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "40")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "400")),
        )
