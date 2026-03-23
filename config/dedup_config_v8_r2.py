"""Configuration for dedup v8."""
import os
from dataclasses import dataclass


@dataclass
class DedupConfig:
    enabled: bool = True
    debug: bool = False
    timeout: int = 80
    retries: int = 3
    batch_size: int = 800

    @classmethod
    def from_env(cls, prefix: str = "DEDUP") -> "DedupConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            timeout=int(os.getenv(f"{prefix}_TIMEOUT", "80")),
            retries=int(os.getenv(f"{prefix}_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "800")),
        )
