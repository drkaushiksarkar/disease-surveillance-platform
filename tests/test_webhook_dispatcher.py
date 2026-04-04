"""Tests for webhook handler."""
import pytest

class TestWebhookManager:
    def test_register_endpoint(self):
        from webhooks.handler import WebhookManager, WebhookEndpoint
        wm = WebhookManager()
        wm.register("test", WebhookEndpoint(url="https://example.com/hook", secret="s3cret"))
        assert wm.stats["endpoints"] == 1
    def test_unregister(self):
        from webhooks.handler import WebhookManager, WebhookEndpoint
        wm = WebhookManager()
        wm.register("test", WebhookEndpoint(url="https://example.com", secret="s"))
        assert wm.unregister("test"); assert not wm.unregister("missing")
    def test_event_filtering(self):
        from webhooks.handler import WebhookManager, WebhookEndpoint
        wm = WebhookManager()
        wm.register("alerts", WebhookEndpoint(url="https://example.com", secret="s", events=["alert.created"]))
        deliveries = wm.dispatch("user.updated", {"id": 1})
        assert len(deliveries) == 0
    def test_signature_generation(self):
        from webhooks.handler import WebhookManager
        wm = WebhookManager()
        sig = wm._sign_payload(b'test payload', "secret")
        assert len(sig) == 64; assert sig == wm._sign_payload(b'test payload', "secret")
    def test_stats(self):
        from webhooks.handler import WebhookManager
        wm = WebhookManager()
        s = wm.stats; assert s["endpoints"] == 0; assert s["total_deliveries"] == 0
