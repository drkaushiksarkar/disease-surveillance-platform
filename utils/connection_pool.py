"""Database connection pool with health checking and automatic recycling."""

from __future__ import annotations

import logging
import queue
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Generator, Optional, Protocol

logger = logging.getLogger(__name__)


class Connection(Protocol):
    def execute(self, query: str, params: Optional[tuple] = None) -> Any: ...
    def close(self) -> None: ...
    def ping(self) -> bool: ...


@dataclass
class PoolConfig:
    min_size: int = 2
    max_size: int = 10
    max_idle_seconds: float = 300.0
    max_lifetime_seconds: float = 3600.0
    acquire_timeout_seconds: float = 30.0
    health_check_interval: float = 60.0
    validation_query: str = "SELECT 1"


@dataclass
class PooledConnection:
    connection: Any
    created_at: float
    last_used_at: float
    last_checked_at: float
    use_count: int = 0
    is_healthy: bool = True


class ConnectionPool:
    """Thread-safe connection pool with automatic lifecycle management."""

    def __init__(
        self,
        factory: callable,
        config: Optional[PoolConfig] = None,
    ):
        self._factory = factory
        self._config = config or PoolConfig()
        self._pool: queue.Queue[PooledConnection] = queue.Queue(
            maxsize=self._config.max_size
        )
        self._all_connections: list[PooledConnection] = []
        self._lock = threading.Lock()
        self._size = 0
        self._closed = False
        self._stats = PoolStats()
        self._init_pool()

    def _init_pool(self) -> None:
        for _ in range(self._config.min_size):
            conn = self._create_connection()
            if conn:
                self._pool.put(conn)

    def _create_connection(self) -> Optional[PooledConnection]:
        with self._lock:
            if self._size >= self._config.max_size:
                return None
            self._size += 1

        try:
            now = time.monotonic()
            raw_conn = self._factory()
            pooled = PooledConnection(
                connection=raw_conn,
                created_at=now,
                last_used_at=now,
                last_checked_at=now,
            )
            with self._lock:
                self._all_connections.append(pooled)
            self._stats.connections_created += 1
            return pooled
        except Exception:
            with self._lock:
                self._size -= 1
            self._stats.connection_errors += 1
            logger.exception("Failed to create connection")
            return None

    @contextmanager
    def acquire(self) -> Generator[Any, None, None]:
        if self._closed:
            raise PoolClosedError("Connection pool is closed")

        conn = self._acquire_connection()
        try:
            yield conn.connection
            conn.last_used_at = time.monotonic()
            conn.use_count += 1
            self._stats.total_acquisitions += 1
        except Exception:
            conn.is_healthy = False
            raise
        finally:
            self._release_connection(conn)

    def _acquire_connection(self) -> PooledConnection:
        try:
            conn = self._pool.get(
                timeout=self._config.acquire_timeout_seconds
            )
            if self._is_valid(conn):
                return conn
            self._destroy_connection(conn)
        except queue.Empty:
            pass

        new_conn = self._create_connection()
        if new_conn:
            return new_conn

        try:
            conn = self._pool.get(timeout=self._config.acquire_timeout_seconds)
            return conn
        except queue.Empty:
            self._stats.timeout_errors += 1
            raise PoolExhaustedError(
                f"Could not acquire connection within "
                f"{self._config.acquire_timeout_seconds}s"
            )

    def _release_connection(self, conn: PooledConnection) -> None:
        if self._closed or not conn.is_healthy:
            self._destroy_connection(conn)
            return

        if self._is_expired(conn):
            self._destroy_connection(conn)
            if self._size < self._config.min_size:
                new_conn = self._create_connection()
                if new_conn:
                    self._pool.put(new_conn)
            return

        try:
            self._pool.put_nowait(conn)
        except queue.Full:
            self._destroy_connection(conn)

    def _is_valid(self, conn: PooledConnection) -> bool:
        if not conn.is_healthy:
            return False
        if self._is_expired(conn):
            return False
        now = time.monotonic()
        if now - conn.last_checked_at > self._config.health_check_interval:
            try:
                if hasattr(conn.connection, "ping"):
                    healthy = conn.connection.ping()
                    conn.last_checked_at = now
                    conn.is_healthy = healthy
                    return healthy
            except Exception:
                conn.is_healthy = False
                return False
        return True

    def _is_expired(self, conn: PooledConnection) -> bool:
        now = time.monotonic()
        age = now - conn.created_at
        idle = now - conn.last_used_at
        return (
            age > self._config.max_lifetime_seconds
            or idle > self._config.max_idle_seconds
        )

    def _destroy_connection(self, conn: PooledConnection) -> None:
        try:
            conn.connection.close()
        except Exception:
            logger.debug("Error closing connection", exc_info=True)
        with self._lock:
            self._size -= 1
            if conn in self._all_connections:
                self._all_connections.remove(conn)
        self._stats.connections_destroyed += 1

    def close(self) -> None:
        self._closed = True
        while not self._pool.empty():
            try:
                conn = self._pool.get_nowait()
                self._destroy_connection(conn)
            except queue.Empty:
                break

    @property
    def stats(self) -> "PoolStats":
        return self._stats

    @property
    def size(self) -> int:
        return self._size

    @property
    def available(self) -> int:
        return self._pool.qsize()


@dataclass
class PoolStats:
    connections_created: int = 0
    connections_destroyed: int = 0
    total_acquisitions: int = 0
    connection_errors: int = 0
    timeout_errors: int = 0


class PoolClosedError(Exception):
    pass


class PoolExhaustedError(Exception):
    pass
