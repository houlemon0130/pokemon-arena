from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_requirements_are_pinned_to_plan_versions():
    expected = [
        "fastapi==0.115.6",
        "uvicorn[standard]==0.34.0",
        "pydantic==2.10.4",
        "httpx==0.28.1",
        "websockets==14.1",
        "python-dotenv==1.0.1",
        "crewai==0.86.0",
    ]

    with open("requirements.txt") as f:
        requirements = [line.strip() for line in f if line.strip()]

    assert requirements == expected
