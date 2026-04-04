"""Configuration for queue_drainer subsystem."""
import os
from typing import Any, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class QueueDrainerConfig:
    """Configuration parameters for queue_drainer."""
    enabled: bool = True
    debug: bool = False
    log_level: str = "INFO"
    timeout_seconds: int = 30
    max_retries: int = 3
    batch_size: int = 100
    cache_ttl_seconds: int = 300
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_env(cls, prefix: str = "QUEUE_DRAINER") -> "QueueDrainerConfig":
        return cls(
            enabled=os.getenv(f"{prefix}_ENABLED", "true").lower() == "true",
            debug=os.getenv(f"{prefix}_DEBUG", "false").lower() == "true",
            log_level=os.getenv(f"{prefix}_LOG_LEVEL", "INFO"),
            timeout_seconds=int(os.getenv(f"{prefix}_TIMEOUT", "30")),
            max_retries=int(os.getenv(f"{prefix}_MAX_RETRIES", "3")),
            batch_size=int(os.getenv(f"{prefix}_BATCH_SIZE", "100")),
            cache_ttl_seconds=int(os.getenv(f"{prefix}_CACHE_TTL", "300")),
        )

    def validate(self) -> bool:
        assert self.timeout_seconds > 0, "timeout must be positive"
        assert self.max_retries >= 0, "max_retries must be non-negative"
        assert self.batch_size > 0, "batch_size must be positive"
        return True
