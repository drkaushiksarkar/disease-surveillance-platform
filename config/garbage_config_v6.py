"""Configuration for garbage v6."""
import os
from dataclasses import dataclass


@dataclass
class GarbageConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 60
    retries: int = 3
    batch_size: int = 600

    @classmethod
    def from_env(cls, prefix: str = "GARBAGE") -> "GarbageConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "60")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "600")),
        )
