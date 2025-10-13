# -------------------------------
# 1️⃣ Base Python image
# -------------------------------
FROM python:3.12-slim

WORKDIR /app

# -------------------------------
# 2️⃣ Copy project files
# -------------------------------
COPY . /app

# -------------------------------
# 3️⃣ Create writable cache for HF models
# -------------------------------
RUN mkdir -p /app/model_cache && chmod -R 777 /app/model_cache

ENV HF_HOME=/app/model_cache
ENV HF_DATASETS_CACHE=/app/model_cache
ENV HF_METRICS_CACHE=/app/model_cache

# -------------------------------
# 4️⃣ Install dependencies
# -------------------------------
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# -------------------------------
# 5️⃣ Preload model to cache (optional, speeds up first request)
# -------------------------------
RUN python -c "from predict_dept_model import DepartmentPredictor; DepartmentPredictor.load_model()"

# -------------------------------
# 6️⃣ Expose port
# -------------------------------
EXPOSE 7860

# -------------------------------
# 7️⃣ Start FastAPI
# -------------------------------
# Uses Hugging Face Spaces PORT if available, otherwise default 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
