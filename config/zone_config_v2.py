"""Configuration for zone v2."""
import os
from dataclasses import dataclass


@dataclass
class ZoneConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 20
    retries: int = 3
    batch_size: int = 200

    @classmethod
    def from_env(cls, prefix: str = "ZONE") -> "ZoneConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "20")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "200")),
        )
