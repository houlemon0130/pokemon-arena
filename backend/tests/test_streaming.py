import json

import pytest

from app.pipeline.streaming import call_llm, stream_llm


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeStreamResponse:
    def raise_for_status(self):
        return None

    async def aiter_lines(self):
        yield 'data: {"choices":[{"delta":{"content":"你"}}]}'
        yield 'data: {"choices":[{"delta":{"content":"好"}}]}'
        yield "data: [DONE]"


class _FakeStreamContext:
    async def __aenter__(self):
        return _FakeStreamResponse()

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        self.requests = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json=None, headers=None):
        self.requests.append((url, json, headers))
        return _FakeResponse({"choices": [{"message": {"content": '{"move":"ember"}'}}]})

    def stream(self, method, url, json=None, headers=None):
        self.requests.append((url, json, headers))
        return _FakeStreamContext()


@pytest.mark.asyncio
async def test_call_llm_returns_json(monkeypatch):
    monkeypatch.setenv("BAILIAN_API_KEY", "test-key")
    monkeypatch.setattr("app.pipeline.streaming.httpx.AsyncClient", _FakeAsyncClient)

    result = await call_llm([{"role": "user", "content": "hi"}])

    assert result == {"move": "ember"}


@pytest.mark.asyncio
async def test_stream_llm_yields_content(monkeypatch):
    monkeypatch.setenv("BAILIAN_API_KEY", "test-key")
    monkeypatch.setattr("app.pipeline.streaming.httpx.AsyncClient", _FakeAsyncClient)

    chunks = [chunk async for chunk in stream_llm([{"role": "user", "content": "hi"}])]

    assert chunks == ["你", "好"]
