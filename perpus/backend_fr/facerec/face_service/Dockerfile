FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt

COPY . .

EXPOSE 5000

ENV WORKERS=3
CMD ["sh", "-c", "gunicorn -w ${WORKERS:-3} -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:5000 --timeout 60"]
