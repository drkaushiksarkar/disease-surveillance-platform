"""Configuration for iterate v5."""
import os
from dataclasses import dataclass


@dataclass
class IterateConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 50
    retries: int = 3
    batch_size: int = 500

    @classmethod
    def from_env(cls, prefix: str = "ITERATE") -> "IterateConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "50")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "500")),
        )
