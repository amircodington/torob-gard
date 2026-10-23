FROM python:3.13-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends gdal-bin libgdal-dev libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
# venv lives outside /app so the ./api:/app bind mount does not hide it
ENV UV_PROJECT_ENVIRONMENT=/opt/venv PATH=/opt/venv/bin:$PATH
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen
COPY . .
# Production: Liara (and any single-container host) runs this. Dev compose overrides it with runserver.
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD python manage.py migrate --noinput && python manage.py collectstatic --noinput -v0 \
    && exec gunicorn torobgard.wsgi -b 0.0.0.0:${PORT:-8000} -w ${API_WORKERS:-3} --access-logfile -
