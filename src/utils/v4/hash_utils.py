"""Hashing and fingerprinting for deduplication."""

from __future__ import annotations

import logging
from typing import Any, Optional, Sequence, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def process_hash_utils(data: Any, **options) -> Any:
    """Primary processing function for hash utils."""
    if data is None:
        raise ValueError("Input data cannot be None")

    if isinstance(data, str):
        return _process_string(data, **options)
    if isinstance(data, (list, tuple)):
        return _process_sequence(data, **options)
    if isinstance(data, dict):
        return _process_mapping(data, **options)
    return data


def _process_string(value: str, strip: bool = True, lower: bool = False, **kwargs) -> str:
    """Process string value."""
    result = value
    if strip:
        result = result.strip()
    if lower:
        result = result.lower()
    return result


def _process_sequence(items: Sequence, filter_none: bool = True, **kwargs) -> list:
    """Process sequence of items."""
    result = list(items)
    if filter_none:
        result = [item for item in result if item is not None]
    return result


def _process_mapping(data: dict, remove_empty: bool = True, **kwargs) -> dict:
    """Process dictionary data."""
    result = dict(data)
    if remove_empty:
        result = {k: v for k, v in result.items() if v is not None and v != ""}
    return result


def chunk(items: Sequence[T], size: int) -> list[list[T]]:
    """Split sequence into chunks of given size."""
    if size <= 0:
        raise ValueError("Chunk size must be positive")
    return [list(items[i:i + size]) for i in range(0, len(items), size)]


def flatten(nested: Sequence) -> list:
    """Flatten nested sequences into a single list."""
    result = []
    for item in nested:
        if isinstance(item, (list, tuple)):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result


def deduplicate(items: Sequence[T], key=None) -> list[T]:
    """Remove duplicates while preserving order."""
    seen = set()
    result = []
    for item in items:
        k = key(item) if key else item
        if k not in seen:
            seen.add(k)
            result.append(item)
    return result


def safe_get(data: dict, *keys: str, default: Any = None) -> Any:
    """Safely navigate nested dictionary."""
    current = data
    for k in keys:
        if isinstance(current, dict):
            current = current.get(k)
        else:
            return default
        if current is None:
            return default
    return current


class HashUtilsProcessor:
    """Stateful processor for hash utils operations."""

    def __init__(self, config: Optional[dict] = None):
        self._config = config or {}
        self._processed_count = 0
        self._error_count = 0

    def process(self, data: Any) -> Any:
        """Process data through the pipeline."""
        try:
            result = process_hash_utils(data, **self._config)
            self._processed_count += 1
            return result
        except Exception as exc:
            self._error_count += 1
            logger.error("Processing error: %s", exc)
            raise

    @property
    def stats(self) -> dict[str, int]:
        return {
            "processed": self._processed_count,
            "errors": self._error_count,
        }
