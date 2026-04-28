from pathlib import Path


def test_docker_compose_defines_backend_and_frontend_services():
    compose = Path("../docker-compose.yml").read_text()

    assert "backend:" in compose
    assert "frontend:" in compose
    assert "./backend" in compose
    assert "./frontend" in compose
    assert "8000:8000" in compose
    assert "3000:3000" in compose
