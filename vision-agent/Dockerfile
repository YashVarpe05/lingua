FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY agent.py ./

EXPOSE 8000

CMD ["uv", "run", "agent.py", "serve", "--host", "0.0.0.0", "--port", "8000"]
