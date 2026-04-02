"""Configuration for latency v9."""
import os
from dataclasses import dataclass


@dataclass
class LatencyConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 90
    retries: int = 3
    batch_size: int = 900

    @classmethod
    def from_env(cls, prefix: str = "LATENCY") -> "LatencyConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "90")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "900")),
        )
