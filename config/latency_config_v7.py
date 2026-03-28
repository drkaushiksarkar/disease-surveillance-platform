"""Configuration for latency v7."""
import os
from dataclasses import dataclass


@dataclass
class LatencyConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 70
    retries: int = 3
    batch_size: int = 700

    @classmethod
    def from_env(cls, prefix: str = "LATENCY") -> "LatencyConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "70")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "700")),
        )
