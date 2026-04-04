"""Tests for circuit breaker pattern implementation."""

import time
import pytest
from unittest.mock import MagicMock

from src.resilience.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerRegistry,
    CircuitOpenError,
    CircuitState,
)


class TestCircuitBreaker:
    def setup_method(self):
        self.config = CircuitBreakerConfig(
            failure_threshold=3,
            success_threshold=2,
            timeout_seconds=1.0,
        )
        self.cb = CircuitBreaker("test", self.config)

    def test_initial_state_is_closed(self):
        assert self.cb.state == CircuitState.CLOSED

    def test_successful_call_passes_through(self):
        result = self.cb.call(lambda: 42)
        assert result == 42
        assert self.cb.stats.successful_calls == 1
        assert self.cb.stats.total_calls == 1

    def test_failed_call_increments_failure_count(self):
        with pytest.raises(ValueError):
            self.cb.call(self._failing_func)
        assert self.cb.stats.failed_calls == 1
        assert self.cb.stats.consecutive_failures == 1

    def test_opens_after_threshold_failures(self):
        for _ in range(3):
            with pytest.raises(ValueError):
                self.cb.call(self._failing_func)
        assert self.cb.state == CircuitState.OPEN

    def test_rejects_calls_when_open(self):
        self._trip_breaker()
        with pytest.raises(CircuitOpenError):
            self.cb.call(lambda: 42)
        assert self.cb.stats.rejected_calls == 1

    def test_transitions_to_half_open_after_timeout(self):
        self._trip_breaker()
        time.sleep(1.1)
        assert self.cb.state == CircuitState.HALF_OPEN

    def test_closes_after_success_threshold_in_half_open(self):
        self._trip_breaker()
        time.sleep(1.1)
        self.cb.call(lambda: "ok")
        self.cb.call(lambda: "ok")
        assert self.cb.state == CircuitState.CLOSED

    def test_reopens_on_failure_in_half_open(self):
        config = CircuitBreakerConfig(
            failure_threshold=1,
            timeout_seconds=0.1,
            half_open_max_calls=2,
        )
        cb = CircuitBreaker("test2", config)
        with pytest.raises(ValueError):
            cb.call(self._failing_func)
        time.sleep(0.15)
        with pytest.raises(ValueError):
            cb.call(self._failing_func)
        assert cb.state == CircuitState.OPEN

    def test_excluded_exceptions_count_as_success(self):
        config = CircuitBreakerConfig(
            failure_threshold=1,
            excluded_exceptions=(KeyError,),
        )
        cb = CircuitBreaker("test3", config)
        with pytest.raises(KeyError):
            cb.call(self._key_error_func)
        assert cb.state == CircuitState.CLOSED
        assert cb.stats.successful_calls == 1

    def test_reset_clears_state(self):
        self._trip_breaker()
        self.cb.reset()
        assert self.cb.state == CircuitState.CLOSED
        assert self.cb.stats.total_calls == 0

    def test_stats_snapshot_is_independent(self):
        self.cb.call(lambda: 1)
        stats = self.cb.stats
        self.cb.call(lambda: 2)
        assert stats.total_calls == 1

    def _trip_breaker(self):
        for _ in range(self.config.failure_threshold):
            with pytest.raises(ValueError):
                self.cb.call(self._failing_func)

    @staticmethod
    def _failing_func():
        raise ValueError("simulated failure")

    @staticmethod
    def _key_error_func():
        raise KeyError("missing key")


class TestCircuitBreakerRegistry:
    def test_get_or_create_returns_same_instance(self):
        reg = CircuitBreakerRegistry()
        cb1 = reg.get_or_create("svc-a")
        cb2 = reg.get_or_create("svc-a")
        assert cb1 is cb2

    def test_get_returns_none_for_unknown(self):
        reg = CircuitBreakerRegistry()
        assert reg.get("nonexistent") is None

    def test_reset_all_resets_every_breaker(self):
        reg = CircuitBreakerRegistry()
        cb1 = reg.get_or_create("svc-a", CircuitBreakerConfig(failure_threshold=1))
        cb2 = reg.get_or_create("svc-b", CircuitBreakerConfig(failure_threshold=1))
        with pytest.raises(ValueError):
            cb1.call(lambda: (_ for _ in ()).throw(ValueError("fail")))
        reg.reset_all()
        assert cb1.state == CircuitState.CLOSED
        assert cb2.state == CircuitState.CLOSED

    def test_get_all_stats(self):
        reg = CircuitBreakerRegistry()
        reg.get_or_create("svc-a")
        reg.get_or_create("svc-b")
        stats = reg.get_all_stats()
        assert "svc-a" in stats
        assert "svc-b" in stats
