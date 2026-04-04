"""Webhook handler with signature verification, retry queue, and delivery tracking."""
from __future__ import annotations
import hashlib, hmac, json, logging, time, uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

class DeliveryStatus(Enum):
    PENDING = "pending"; DELIVERED = "delivered"; FAILED = "failed"; RETRYING = "retrying"

@dataclass
class WebhookEndpoint:
    url: str; secret: str; events: list[str] = field(default_factory=lambda: ["*"])
    active: bool = True; max_retries: int = 3; timeout_seconds: float = 10.0

@dataclass
class WebhookDelivery:
    delivery_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    endpoint_url: str = ""; event_type: str = ""
    payload: dict[str, Any] = field(default_factory=dict)
    status: DeliveryStatus = DeliveryStatus.PENDING
    attempts: int = 0; last_attempt: Optional[str] = None
    response_code: Optional[int] = None; error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

class WebhookManager:
    def __init__(self) -> None:
        self._endpoints: dict[str, WebhookEndpoint] = {}
        self._deliveries: list[WebhookDelivery] = []
        self._retry_queue: deque[WebhookDelivery] = deque()
        self._delivered = 0; self._failed = 0

    def register(self, name: str, endpoint: WebhookEndpoint) -> None:
        self._endpoints[name] = endpoint

    def unregister(self, name: str) -> bool:
        return self._endpoints.pop(name, None) is not None

    def _sign_payload(self, payload: bytes, secret: str) -> str:
        return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    def dispatch(self, event_type: str, payload: dict[str, Any]) -> list[WebhookDelivery]:
        deliveries = []
        for name, ep in self._endpoints.items():
            if not ep.active: continue
            if "*" not in ep.events and event_type not in ep.events: continue
            delivery = WebhookDelivery(endpoint_url=ep.url, event_type=event_type, payload=payload)
            self._deliver(delivery, ep)
            self._deliveries.append(delivery); deliveries.append(delivery)
        return deliveries

    def _deliver(self, delivery: WebhookDelivery, endpoint: WebhookEndpoint) -> None:
        delivery.attempts += 1; delivery.last_attempt = datetime.utcnow().isoformat()
        body = json.dumps({"event": delivery.event_type, "payload": delivery.payload,
            "delivery_id": delivery.delivery_id, "timestamp": delivery.created_at}).encode()
        signature = self._sign_payload(body, endpoint.secret)
        try:
            req = Request(endpoint.url, data=body, method="POST",
                headers={"Content-Type": "application/json", "X-Webhook-Signature": signature,
                         "X-Webhook-Event": delivery.event_type, "X-Delivery-ID": delivery.delivery_id})
            with urlopen(req, timeout=endpoint.timeout_seconds) as resp:
                delivery.response_code = resp.status
                if 200 <= resp.status < 300:
                    delivery.status = DeliveryStatus.DELIVERED; self._delivered += 1
                else:
                    self._schedule_retry(delivery, endpoint)
        except (URLError, TimeoutError) as e:
            delivery.error = str(e)
            self._schedule_retry(delivery, endpoint)

    def _schedule_retry(self, delivery: WebhookDelivery, endpoint: WebhookEndpoint) -> None:
        if delivery.attempts < endpoint.max_retries:
            delivery.status = DeliveryStatus.RETRYING; self._retry_queue.append(delivery)
        else:
            delivery.status = DeliveryStatus.FAILED; self._failed += 1

    def process_retries(self) -> int:
        processed = 0
        while self._retry_queue:
            delivery = self._retry_queue.popleft()
            ep = next((e for e in self._endpoints.values() if e.url == delivery.endpoint_url), None)
            if ep: self._deliver(delivery, ep); processed += 1
        return processed

    @property
    def stats(self) -> dict[str, Any]:
        return {"endpoints": len(self._endpoints), "total_deliveries": len(self._deliveries),
            "delivered": self._delivered, "failed": self._failed, "retry_queue": len(self._retry_queue)}
