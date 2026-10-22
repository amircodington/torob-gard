FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
# venv lives outside /app so the ./agent:/app bind mount does not hide it
ENV UV_PROJECT_ENVIRONMENT=/opt/venv PATH=/opt/venv/bin:$PATH
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen
CMD uvicorn torobgard_agent.main:app --host 0.0.0.0 --port 8001 --reload
