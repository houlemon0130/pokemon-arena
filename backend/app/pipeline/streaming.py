import json
import os
from typing import AsyncGenerator

import httpx

BAILIAN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
BAILIAN_MODEL = "deepseek-v4-pro"


async def stream_llm(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> AsyncGenerator[str, None]:
    api_key = os.environ["BAILIAN_API_KEY"]
    payload = {
        "model": BAILIAN_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            BAILIAN_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield delta["content"]
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


async def call_llm(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 500,
    json_mode: bool = True,
) -> dict:
    api_key = os.environ["BAILIAN_API_KEY"]
    payload = {
        "model": BAILIAN_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            BAILIAN_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        if json_mode:
            return json.loads(content)
        return {"content": content}
