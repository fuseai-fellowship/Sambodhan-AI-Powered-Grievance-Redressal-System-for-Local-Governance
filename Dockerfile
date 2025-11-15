FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
  build-essential \
  libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY ./src/backend /app
COPY ./src/backend/data/location_id.json /app/data/location_id.json

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]