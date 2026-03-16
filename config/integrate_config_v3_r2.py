"""Configuration for integrate v3."""
import os
from dataclasses import dataclass


@dataclass
class IntegrateConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 30
    retries: int = 3
    batch_size: int = 300

    @classmethod
    def from_env(cls, prefix: str = "INTEGRATE") -> "IntegrateConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "30")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "300")),
        )
