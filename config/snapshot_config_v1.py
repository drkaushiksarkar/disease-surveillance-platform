"""Configuration for snapshot v1."""
import os
from dataclasses import dataclass


@dataclass
class SnapshotConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 10
    retries: int = 3
    batch_size: int = 100

    @classmethod
    def from_env(cls, prefix: str = "SNAPSHOT") -> "SnapshotConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "10")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "100")),
        )
