# Production Dockerfile for DDAS Backend
FROM python:3.10-slim AS builder

WORKDIR /app

# Install system build dependencies and libmagic
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runtime image
FROM python:3.10-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Create non-root user and storage directory
RUN useradd -m -u 1000 ddasuser && \
    mkdir -p /app/storage && \
    chown -R ddasuser:ddasuser /app

COPY --chown=ddasuser:ddasuser . .

USER ddasuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV STORAGE_DIR=/app/storage

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
