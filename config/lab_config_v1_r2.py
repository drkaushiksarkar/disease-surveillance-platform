"""Configuration for lab v1."""
import os
from dataclasses import dataclass


@dataclass
class LabConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 10
    retries: int = 3
    batch_size: int = 100

    @classmethod
    def from_env(cls, prefix: str = "LAB") -> "LabConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "10")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "100")),
        )
