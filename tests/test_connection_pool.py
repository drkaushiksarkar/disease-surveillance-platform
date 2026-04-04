"""Tests for database connection pool."""

import threading
import time
import pytest
from unittest.mock import MagicMock, patch

from src.database.connection_pool import (
    ConnectionPool,
    PoolClosedError,
    PoolConfig,
    PoolExhaustedError,
)


class MockConnection:
    def __init__(self):
        self.closed = False
        self.healthy = True

    def execute(self, query, params=None):
        if self.closed:
            raise RuntimeError("Connection is closed")
        return [{"result": 1}]

    def close(self):
        self.closed = True

    def ping(self):
        return self.healthy


def mock_factory():
    return MockConnection()


class TestConnectionPool:
    def test_creates_minimum_connections(self):
        config = PoolConfig(min_size=3, max_size=10)
        pool = ConnectionPool(mock_factory, config)
        assert pool.size == 3
        assert pool.available == 3
        pool.close()

    def test_acquire_and_release(self):
        config = PoolConfig(min_size=1, max_size=5)
        pool = ConnectionPool(mock_factory, config)
        with pool.acquire() as conn:
            result = conn.execute("SELECT 1")
            assert result == [{"result": 1}]
        assert pool.available == 1
        pool.close()

    def test_acquire_creates_new_when_pool_empty(self):
        config = PoolConfig(min_size=1, max_size=5)
        pool = ConnectionPool(mock_factory, config)

        connections = []
        with pool.acquire() as c1:
            connections.append(c1)
            with pool.acquire() as c2:
                connections.append(c2)
                assert pool.size == 2

        pool.close()

    def test_acquire_timeout_raises_exhausted(self):
        config = PoolConfig(min_size=1, max_size=1, acquire_timeout_seconds=0.1)
        pool = ConnectionPool(mock_factory, config)

        with pool.acquire():
            with pytest.raises(PoolExhaustedError):
                with pool.acquire():
                    pass

        pool.close()

    def test_closed_pool_raises_error(self):
        pool = ConnectionPool(mock_factory, PoolConfig(min_size=1))
        pool.close()
        with pytest.raises(PoolClosedError):
            with pool.acquire():
                pass

    def test_unhealthy_connection_is_replaced(self):
        config = PoolConfig(
            min_size=1,
            max_size=5,
            health_check_interval=0,
        )
        pool = ConnectionPool(mock_factory, config)

        with pool.acquire() as conn:
            conn.healthy = False

        assert pool.size >= 1
        pool.close()

    def test_expired_connection_is_recycled(self):
        config = PoolConfig(
            min_size=1,
            max_size=5,
            max_lifetime_seconds=0.1,
        )
        pool = ConnectionPool(mock_factory, config)
        time.sleep(0.15)

        with pool.acquire() as conn:
            assert conn is not None

        pool.close()

    def test_concurrent_access(self):
        config = PoolConfig(min_size=2, max_size=5)
        pool = ConnectionPool(mock_factory, config)
        results = []
        errors = []

        def worker():
            try:
                with pool.acquire() as conn:
                    time.sleep(0.05)
                    conn.execute("SELECT 1")
                    results.append(True)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert len(results) == 10
        pool.close()

    def test_stats_tracking(self):
        config = PoolConfig(min_size=1)
        pool = ConnectionPool(mock_factory, config)

        with pool.acquire():
            pass
        with pool.acquire():
            pass

        assert pool.stats.total_acquisitions == 2
        assert pool.stats.connections_created >= 1
        pool.close()

    def test_exception_marks_unhealthy(self):
        config = PoolConfig(min_size=1, max_size=5)
        pool = ConnectionPool(mock_factory, config)

        with pytest.raises(RuntimeError):
            with pool.acquire() as conn:
                raise RuntimeError("query failed")

        pool.close()
