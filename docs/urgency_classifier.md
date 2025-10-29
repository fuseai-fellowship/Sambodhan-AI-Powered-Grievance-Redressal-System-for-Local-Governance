# Sambodhan Urgency Classifier API



Production-ready FastAPI service for classifying citizen grievances by urgency using transformer-based models. Deployed on HuggingFace Spaces with Docker containerization.

## Overview

This API provides real-time text classification with confidence scoring across urgency levels. Built for high-throughput municipal grievance processing with robust error handling and validation.

**Key Features:**

* Transformer-based sequence classification
* Batch and single-text inference support
* Automatic text preprocessing and sanitization
* Type-safe request/response validation with Pydantic
* Container-optimized model caching
* Health monitoring and version tracking


## Table of Contents

- [Overview](#overview)
- [API Reference](#api-reference)
    - [GET /](#get-)
    - [POST /predict_urgency](#post-predict_urgency)
    - [Request Examples](#request-examples)
- [Deployment Guide](#deployment-guide)
    - [Prerequisites](#prerequisites)
    - [Repository Structure](#repository-structure)
    - [Setup Instructions](#setup-instructions)
        - [1. Clone Repository](#1-clone-repository)
        - [2. Configure Model Repository](#2-configure-model-repository)
        - [3. Local Development (Optional)](#3-local-development-optional)
        - [4. Deploy to HuggingFace Spaces](#4-deploy-to-huggingface-spaces)
        - [5. Configure Space Settings](#5-configure-space-settings)
    - [Production Considerations](#production-considerations)
        - [Caching Strategy](#caching-strategy)
        - [Error Handling](#error-handling)
        - [Input Validation](#input-validation)
- [Customization](#customization)
    - [Modify Classification Schema](#modify-classification-schema)
    - [Change Model Architecture](#change-model-architecture)
    - [Add Authentication](#add-authentication)
    - [Rate Limiting](#rate-limiting)
- [Technical Stack](#technical-stack)
    - [Core Dependencies](#core-dependencies)
    - [Model Requirements](#model-requirements)
    - [Performance Optimization](#performance-optimization)
- [Monitoring and Debugging](#monitoring-and-debugging)
    - [Access Logs](#access-logs)
    - [Local Debugging](#local-debugging)
    - [Health Checks](#health-checks)
- [Contributing](#contributing)
    - [Code Standards](#code-standards)
- [License](#license)
- [Citation](#citation)
- [Support](#support)
- [Architecture](#architecture)


## API Reference

### Endpoints

#### `GET /`

Health check endpoint with model version information.

**Response:**

```json
{
    "message": "Sambodhan Urgency Classifier API is running.",
    "status": "Active",
    "model_version": "v1.0.0"
}
```

#### `POST /predict_urgency`

Classify single or multiple texts into urgency levels.

**Request Body:**

```json
{
    "text": "The water supply has been cut off for 3 days."
}
```

**Batch Request:**

```json
{
    "text": [
        "The water supply has been cut off for 3 days.",
        "Streetlight on my street is not working, please fix urgently."
    ]
}
```

**Response:**

```json
{
    "label": "HIGHLY URGENT",
    "confidence": 0.9282,
    "scores": {
        "NORMAL": 0.0463,
        "URGENT": 0.0254,
        "HIGHLY URGENT": 0.9282
    }
}
```

**Batch Response:**

```json
[
    {
        "label": "HIGHLY URGENT",
        "confidence": 0.9542,
        "scores": {...}
    },
    {
        "label": "URGENT",
        "confidence": 0.8921,
        "scores": {...}
    }
]
```

### Request Examples

```bash
# Single text prediction
curl -X POST "https://sambodhan-urgency-classifier-space.hf.space/predict_urgency" \
    -H "Content-Type: application/json" \
    -d '{"text": "The water supply has been cut off for 3 days."}'

# Batch prediction
curl -X POST "https://sambodhan-urgency-classifier-space.hf.space/predict_urgency" \
    -H "Content-Type: application/json" \
    -d '{"text": ["Water supply cut", "Streetlight broken"]}'
```

## Deployment Guide

### Prerequisites

* HuggingFace account with Spaces access
* Git installed locally
* HuggingFace model repository (sequence classification)
* Docker knowledge (optional but recommended)

### Repository Structure

```
urgency-classifier-space/
├── app.py                      # FastAPI application and route definitions
├── predict_urgency_model.py    # Model loading and inference logic
├── response_schema.py          # Pydantic models for request/response validation
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container configuration with cache optimization
└── README.md                   # Documentation
```

### Setup Instructions

#### 1. Clone Repository

```bash
git clone https://huggingface.co/spaces/sambodhan/urgency_classifier_space
cd urgency_classifier_space
```

#### 2. Configure Model Repository

Update the `MODEL_REPO` environment variable in `Dockerfile`:

```dockerfile
ENV MODEL_REPO=your-username/your-model-repository
```

Alternatively, set via Space secrets for production deployments.

#### 3. Local Development (Optional)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
export MODEL_REPO=your-username/your-model-repository
uvicorn app:app --reload --port 7860
```

#### 4. Deploy to HuggingFace Spaces

```bash
# Create new Space on HuggingFace with Docker SDK
# Then push your code:

git remote add space https://huggingface.co/spaces/your-username/your-space-name
git add .
git commit -m "Initial deployment"
git push space main
```

#### 5. Configure Space Settings

Navigate to your Space settings on HuggingFace:

* **SDK**: Docker
* **Hardware**: CPU Basic (CPU 2vCPU, 16GB RAM) or upgrade for GPU acceleration
* **Environment Variables** (if not using Dockerfile):

    * `MODEL_REPO`: Your HuggingFace model path
    * `HF_TOKEN`: (Optional) For private model access
    * `PORT`: Default 7860

### Production Considerations

#### Caching Strategy

The Dockerfile implements aggressive caching to minimize cold start times:

```dockerfile
ENV HF_HOME=/app/model_cache
ENV HF_DATASETS_CACHE=/app/model_cache
ENV HF_METRICS_CACHE=/app/model_cache

RUN mkdir -p /app/model_cache && chmod -R 777 /app/model_cache
```

Models are downloaded during container build with `force_download=True` ensuring latest versions.

#### Error Handling

All endpoints implement structured error responses:

```python
try:
        prediction = predictor.predict(input_data.text)
        return prediction
except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
```

#### Input Validation

Text preprocessing pipeline removes:

* URLs and hyperlinks
* HTML tags
* Excessive whitespace
* Special characters (configurable)

Validation enforces:

* Non-empty string inputs
* Type safety (str only)
* UTF-8 encoding

## Customization

### Modify Classification Schema

Edit `response_schema.py` to adjust input validation or output structure:

```python
class UrgencyClassificationOutput(BaseModel):
        label: str = Field(..., description="Top predicted urgency label")
        confidence: float = Field(..., ge=0, le=1, description="Confidence score")
        scores: Dict[str, float] = Field(..., description="All label confidence scores")
        metadata: Optional[Dict] = None  # Add custom fields
```

### Change Model Architecture

Update `predict_urgency_model.py` for different model types:

```python
from transformers import AutoModelForTokenClassification  # NER models
from transformers import AutoModelForSeq2SeqLM            # Seq2Seq models
```

### Add Authentication

Implement token-based authentication:

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if credentials.credentials != os.getenv("API_TOKEN"):
                raise HTTPException(status_code=401, detail="Invalid authentication")
        return credentials.credentials

@app.post("/predict_urgency")
async def predict_urgency(
        input_data: TextInput,
        token: str = Depends(verify_token)
):
        # Protected endpoint logic
        ...
```

### Rate Limiting

Add rate limiting with middleware:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/predict_urgency")
@limiter.limit("10/minute")
async def predict_urgency(request: Request, input_data: TextInput):
        ...
```

## Technical Stack

### Core Dependencies

```txt
fastapi==0.109.0              # Web framework
uvicorn[standard]==0.27.0     # ASGI server
transformers==4.36.0          # HuggingFace models
torch==2.1.0                  # Deep learning framework
pydantic==2.5.0               # Data validation
huggingface-hub==0.20.0       # Model hub integration
```

### Model Requirements

Compatible models must:

* Implement `AutoModelForSequenceClassification` interface
* Include `config.json` with label mappings
* Support HuggingFace `pipeline` API
* Be accessible via HuggingFace Hub (public or with token)

### Performance Optimization

**Inference Optimization:**

* Batch processing support (up to 32 samples recommended)
* GPU acceleration with CUDA (set `device=0`)
* Model quantization options (int8, float16)

**Container Optimization:**

* Multi-stage Docker builds (if needed)
* Layer caching for dependencies
* Slim base image (python:3.12-slim)

## Monitoring and Debugging

### Access Logs

View real-time logs in HuggingFace Spaces:

```
Space Dashboard → Logs Tab
```

Monitor:

* Request latency
* Model inference time
* Error rates and exceptions
* Cache hit rates

### Local Debugging

```bash
# Enable debug mode
export DEBUG=1
uvicorn app:app --reload --log-level debug

# Test with verbose output
curl -v -X POST "http://localhost:7860/predict_urgency" \
    -H "Content-Type: application/json" \
    -d '{"text": "test input"}'
```

### Health Checks

Implement custom health checks:

```python
@app.get("/health")
async def health_check():
        try:
                # Test model inference
                test_result = predictor.predict("health check")
                return {
                        "status": "healthy",
                        "model_loaded": True,
                        "inference_test": "passed"
                }
        except Exception as e:
                raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")
```

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Implement changes with tests
4. Update documentation
5. Submit pull request with clear description

### Code Standards

* Follow PEP 8 style guidelines
* Type hints for all function signatures
* Docstrings for public methods
* Unit tests for core functionality

## License

MIT License - see LICENSE file for details.

## Citation

If you use this API in your research or production systems, please cite:

```bibtex
@software{sambodhan_urgency_classifier,
    title = {Sambodhan Urgency Classifier API},
    author = {Sambodhan Team},
    year = {2025},
    url = {https://huggingface.co/spaces/sambodhan/urgency_classifier_space}
}
```

## Support

For issues, questions, or feature requests:

* Open an issue on HuggingFace Space discussions
* Review documentation at `/docs` endpoint (FastAPI auto-generated)
* Check logs for debugging information

---

**Architecture**: FastAPI • Transformers • Docker • HuggingFace Spaces

---
