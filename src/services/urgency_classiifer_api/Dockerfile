FROM python:3.12-slim

WORKDIR /app
COPY . /app

# use dedicated cache dir
ENV HF_HOME=/app/hf_cache
ENV HF_DATASETS_CACHE=/app/hf_cache
ENV HF_METRICS_CACHE=/app/hf_cache
ENV MODEL_REPO=sambodhan/sambodhan_urgency_classifier

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# make sure cache dir is writable
RUN mkdir -p /app/hf_cache && chmod -R 777 /app/hf_cache


EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
