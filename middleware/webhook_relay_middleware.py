"""Middleware for webhook_relay request processing."""
import logging
import time
from typing import Any, Callable, Dict, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class WebhookRelayMiddleware:
    """Middleware that handles webhook_relay processing in the request pipeline."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._metrics = {"total": 0, "errors": 0, "avg_ms": 0.0}

    def __call__(self, handler: Callable) -> Callable:
        @wraps(handler)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.monotonic()
            self._metrics["total"] += 1
            try:
                result = handler(*args, **kwargs)
                return result
            except Exception as e:
                self._metrics["errors"] += 1
                logger.error("webhook_relay middleware error: %s", e)
                raise
            finally:
                elapsed = (time.monotonic() - start) * 1000
                self._update_avg(elapsed)

        return wrapper

    def _update_avg(self, elapsed_ms: float) -> None:
        total = self._metrics["total"]
        old_avg = self._metrics["avg_ms"]
        self._metrics["avg_ms"] = old_avg + (elapsed_ms - old_avg) / total

    @property
    def metrics(self) -> Dict[str, Any]:
        return dict(self._metrics)


def rate_limit(max_per_second: int = 10):
    tokens = max_per_second
    last_refill = time.monotonic()

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            nonlocal tokens, last_refill
            now = time.monotonic()
            tokens = min(max_per_second, tokens + (now - last_refill) * max_per_second)
            last_refill = now
            if tokens < 1:
                raise RuntimeError("Rate limit exceeded")
            tokens -= 1
            return func(*args, **kwargs)
        return wrapper
    return decorator
