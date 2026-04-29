from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_requirements_match_plan_dependencies():
    expected = [
        "fastapi",
        "uvicorn[standard]",
        "pydantic",
        "httpx",
        "websockets",
        "python-dotenv",
        "pytest",
        "pytest-asyncio",
    ]

    with open("requirements.txt") as f:
        requirements = [line.strip() for line in f if line.strip()]

    assert requirements == expected
