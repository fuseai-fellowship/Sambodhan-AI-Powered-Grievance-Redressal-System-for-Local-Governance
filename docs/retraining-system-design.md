# Continuous Learning System for Sambodhan AI

## Architecture for Model Retraining with Hugging Face Inference API & Feedback Loop

This document outlines a production-ready system for continuously improving the Urgency and Department classification models using real-world feedback from the `misclassified_complaints` table, leveraging **Hugging Face Inference API** and **AutoTrain** for GPU-free model retraining.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Technology Stack](#technology-stack)
4. [Hugging Face Integration Strategy](#hugging-face-integration-strategy)
5. [Implementation Strategy](#implementation-strategy)
6. [Deployment with Docker](#deployment-with-docker)
7. [Quick Start Guide](#quick-start-guide)
8. [Performance & Cost Analysis](#performance--cost-analysis)

---

## System Overview

### Goals

- **Continuous Learning**: Automatically retrain models when sufficient misclassification data is collected
- **GPU-Free**: Use Hugging Face Inference API and AutoTrain (cloud-based training)
- **Scalable**: Handle high volumes of feedback using Kafka message queue
- **Fault-Tolerant**: Use Redis for state management and caching
- **Non-Blocking**: Retraining happens asynchronously without affecting API performance
- **Cost-Effective**: Use HF Inference API for predictions, AutoTrain for retraining

### Data Flow

```
User Reports Misclassification
         ↓
   FastAPI Endpoint
         ↓
  PostgreSQL (misclassified_complaints)
         ↓
   Kafka Producer (Event)
         ↓
   Kafka Topic (feedback-events)
         ↓
   Aggregation Service (Consumer)
         ↓
   Redis (Feedback Count & Status)
         ↓
  Threshold Check (50+ misclassifications)
         ↓
   Prepare Training Dataset
         ↓
  Upload to Hugging Face Dataset Hub
         ↓
  Trigger Hugging Face AutoTrain
         ↓
  Monitor Training Job (HF API)
         ↓
  Update Model Endpoint in Config
         ↓
  Update Redis Cache & Notify API
```

---

## Architecture Components

### 1. Feedback Collection API

- Endpoint to report misclassifications
- Validates and stores feedback in PostgreSQL
- Publishes event to Kafka

### 2. Kafka Message Queue

**Topics:**

- `feedback-events`: Misclassification reports
- `retraining-triggers`: When threshold is met
- `model-updates`: Model deployment notifications
- `training-status`: Training progress from HF

### 3. Redis Cache

**Use Cases:**

- Store misclassification counters
- Cache HF Inference API responses
- Store current model IDs/endpoints
- Implement distributed locks for retraining
- Store HF training job IDs and status

### 4. Retraining Worker

- Background service that consumes Kafka events
- Fetches misclassification data from PostgreSQL
- Prepares training dataset in HF format
- Uploads dataset to HF Dataset Hub
- Triggers HF AutoTrain API
- Monitors training job status
- Updates model endpoints when complete

### 5. Hugging Face Integration

- **Inference API**: For real-time predictions (no local model needed)
- **Dataset Hub**: Store training/feedback data
- **AutoTrain**: Automated model retraining on HF infrastructure
- **Model Hub**: Version control and hosting
- **Spaces**: Optional UI for monitoring

### 6. Model Configuration Service

- Manages active model IDs
- Switches between model versions
- A/B testing support
- Rollback capability

---

## Technology Stack

### Core Services

- Python 3.11+
- FastAPI (API)
- PostgreSQL (Database)
- Kafka (Message Queue)
- Redis (Cache & State Management)

### Hugging Face Services

- Inference API (for predictions)
- AutoTrain API (for retraining)
- Dataset Hub (data storage)
- Model Hub (model versioning)
- huggingface_hub Python SDK

### Data Processing

- pandas (data manipulation)
- datasets (HF datasets library)
- scikit-learn (data splitting, metrics)

### Containerization

- Docker & Docker Compose
- Multi-stage builds

### Monitoring

- Prometheus (Metrics)
- Grafana (Visualization)
- HF Space (Training dashboard - optional)

---

## Hugging Face Integration Strategy

### Your Current Setup

- **Existing Model**: XLM-RoBERTa based urgency classifier on Hugging Face Model Hub
- **Model ID**: `your-username/sambodhan-urgency-classifier` (or similar)

### New Architecture: Zero Local GPU Required

#### Phase 1: Use Hugging Face Inference API

Instead of loading models locally, use HF's hosted inference. This eliminates the need for local model files, GPU/CPU requirements, and provides automatic scaling.

**Benefits:**

- No model loading time
- No GPU/CPU requirements
- Automatic scaling
- Always uses latest model version
- Free tier: 30,000 requests/month

#### Phase 2: Automated Retraining with AutoTrain

When misclassifications reach threshold, automatically retrain using HF AutoTrain.

**Workflow:**

1. Upload training data to HF Dataset Hub
2. Trigger AutoTrain job via API or UI
3. Monitor job status
4. Update model endpoint when complete

**Benefits:**

- Training happens on HF's GPUs (free tier available)
- No local infrastructure needed
- Automatic hyperparameter tuning
- Model versioning built-in

---

## Implementation Strategy

### Retraining Triggers

Models retrain when:

1. **Threshold-based**: ≥50 new misclassifications
2. **Time-based**: Every 2 weeks (cron job)
3. **Performance-based**: Validation accuracy drops below threshold
4. **Manual**: Admin triggers retraining via API

### HF AutoTrain Pipeline

**Complete Workflow:**

1. Fetch misclassified_complaints with correct labels
2. Combine with existing training data
3. Format as HF Dataset (CSV/JSON)
4. Upload to HF Dataset Hub
5. Trigger AutoTrain job via API or UI
6. Monitor training status
7. Validate new model
8. Update Inference API endpoint
9. Test with sample predictions
10. Deploy to production (switch model ID)

---

## Deployment with Docker

### Required Services

**Infrastructure Stack:**

- PostgreSQL 15 (Database)
- Redis 7 (Cache & State)
- Zookeeper (Kafka dependency)
- Kafka (Message Queue)
- FastAPI Backend
- Retraining Worker
- Prometheus (Monitoring)
- Grafana (Visualization)

### Volume Management

- `postgres_data`: Database persistence
- `redis_data`: Cache persistence
- `model_storage`: Model artifacts (optional)
- `training_data`: Training datasets
- `prometheus_data`: Metrics storage
- `grafana_data`: Dashboard configs

### Environment Ports

- PostgreSQL: 5432
- Redis: 6379
- Zookeeper: 2181
- Kafka: 9092 (internal), 9094 (external)
- FastAPI: 8000
- Prometheus: 9090
- Grafana: 3000

---

## Quick Start Guide

### Prerequisites

1. **Hugging Face Account**: https://huggingface.co/join
2. **HF API Token**: https://huggingface.co/settings/tokens (Write access required)
3. **Upload Initial Model**: Your existing `sambodhan-urgency-classifier`

### Environment Setup

**Required Environment Variables:**

```
# Database
DATABASE_URL=postgresql://user:password@host:5432/sambodhan_db

# Hugging Face
HF_TOKEN=hf_your_token_here
HF_USERNAME=your-hf-username
HF_URGENCY_MODEL_ID=your-username/sambodhan-urgency-classifier
HF_DEPARTMENT_MODEL_ID=your-username/sambodhan-department-classifier

# Kafka & Redis
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
REDIS_URL=redis://redis:6379/0

# Retraining Config
RETRAINING_THRESHOLD=50
```

### Deployment Steps

**1. Start All Services:**

```bash
docker-compose up -d
```

**2. Verify Service Health:**

```bash
docker-compose ps
```

**3. Check Logs:**

```bash
docker-compose logs -f retraining-worker
```

**4. Test Kafka:**

```bash
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Testing Workflow

#### 1. Test HF Inference API

- **Endpoint**: `POST /predict_urgency`
- **Input**: Complaint text + optional probabilities flag
- **Output**: Urgency prediction with confidence
- **Expected Response**: JSON with urgency level and confidence score

#### 2. Report Misclassification

- **Endpoint**: `POST /feedback/report-misclassification`
- **Data**: complaint_id, predicted values, correct values, reporter_id
- **Result**: Stored in database + Kafka event published
- **Side Effect**: Increments Redis counter

#### 3. Check Retraining Status

- **Endpoint**: `GET /feedback/retraining-status`
- **Returns**: Current training status, pending feedback count, threshold
- **Purpose**: Monitor system health and readiness for retraining

#### 4. Trigger Manual Retraining

- **Endpoint**: `POST /admin/trigger-retraining`
- **Automatic**: Triggers when threshold reached (50+ misclassifications)
- **Manual**: Admin can force retraining via API

### Monitoring Training on Hugging Face

**After retraining is triggered:**

**Step 1: Check Dataset**

- Visit HF Dataset Hub: `https://huggingface.co/datasets/{your-username}/sambodhan-{model}-feedback-{date}`
- Verify data upload was successful
- Review train/validation split

**Step 2: Start AutoTrain**

- Go to https://huggingface.co/spaces/autotrain-projects/autotrain-advanced
- Select your uploaded dataset
- Choose "Text Classification" task
- Set output model name
- Configure hyperparameters (optional)
- Click "Train"

**Step 3: Monitor Progress**

- Training takes 15-45 minutes depending on dataset size
- Check HF notifications for completion
- Review training metrics and losses

**Step 4: Update Configuration**

- Once complete, update model ID in environment variables
- OR let system auto-detect new model
- Test with sample predictions
- Monitor accuracy improvements

---

## Performance & Cost Analysis

### Hugging Face Inference API

| Metric             | Value                                   |
| ------------------ | --------------------------------------- |
| **Latency**        | 200-500ms (cold start), 50-150ms (warm) |
| **Throughput**     | Up to 1000 req/sec (Pro tier)           |
| **Accuracy**       | Same as local XLM-RoBERTa               |
| **Cost**           | Free: 30k req/month, Paid: $9/100k req  |
| **Infrastructure** | Zero - fully managed                    |
| **Maintenance**    | Zero - automatic updates                |

### Training with HF AutoTrain

| Aspect                    | Details                       |
| ------------------------- | ----------------------------- |
| **Training Time**         | 15-45 minutes (on HF GPUs)    |
| **Cost per Training**     | $1-5 (using free GPU credits) |
| **Quality**               | Production-ready, optimized   |
| **Manual Effort**         | Minimal (mostly automated)    |
| **Hyperparameter Tuning** | Automatic optimization        |
| **Model Versioning**      | Built-in via HF Hub           |

### Monthly Cost Estimate

**For typical startup usage (10,000 requests/month, 2 retraining runs):**

```
Inference API:                    FREE (under 30k limit)
Dataset Storage (public):         FREE
Model Storage (public):           FREE
Training (2x per month):          $2-10
Monitoring (Grafana Cloud):       FREE tier
Docker Infrastructure (local):    $0

Total Monthly Cost:               $0-10/month
```

### Comparison: HF vs Local GPU

| Aspect                  | HF Solution      | Local GPU                            |
| ----------------------- | ---------------- | ------------------------------------ |
| **Infrastructure Cost** | $0-10/month      | $500-2000/month                      |
| **Setup Time**          | 1 hour           | 1-2 days                             |
| **Maintenance**         | Minimal          | High                                 |
| **Scalability**         | Automatic        | Manual                               |
| **Model Quality**       | Production-grade | Depends on expertise                 |
| **Training Time**       | 15-45 min        | 30-60 min                            |
| **Deployment**          | Instant (API)    | Complex (containers, load balancers) |
| **Monitoring**          | Built-in         | Custom setup required                |
| **Security**            | SOC 2 certified  | Self-managed                         |

---

## Key Advantages

### Why Choose HF-Based Architecture?

1. Zero GPU required: everything runs on HF's infrastructure
2. Cost-effective: free tier covers most startups (up to 30k requests/month)
3. Fast deployment: model updates via API endpoint switch
4. Version control: built-in model versioning on HF Hub
5. Scalable inference: automatic scaling with HF Inference API
6. Community: access to pre-trained models and datasets
7. Monitoring: usage analytics available out of the box
8. Compliance: SOC 2 Type II certified infrastructure

### When to Use This Approach

**Best suited for:**

- Startups and small teams
- Proof of concept / MVP development
- Limited budget (<$100/month for ML)
- No ML infrastructure team
- Quick iteration needed
- Moderate traffic (<100k requests/month)
- Multilingual models (XLM-RoBERTa)
- Rapid prototyping

**Consider alternatives if:**

- Very high traffic (>1M requests/month) → Self-hosted may be cheaper at scale
- Strict data privacy requirements → Consider HF Enterprise or self-host
- Sub-50ms latency required → Need edge deployment
- Offline inference needed → Deploy quantized models locally
- Custom training infrastructure → Build in-house ML platform

---

## Future Enhancements

### Phase 1 (Current)

- Basic feedback collection
- Threshold-based retraining
- HF Inference API integration
- Manual AutoTrain trigger

### Phase 2 (Next 3 months)

- **A/B Testing**: Deploy multiple model versions simultaneously
- **Active Learning**: Prioritize uncertain predictions for human review
- **Confidence Thresholds**: Auto-flag low-confidence predictions
- **Performance Monitoring**: Track accuracy over time

### Phase 3 (6-12 months)

- **Ensemble Models**: Combine multiple classifiers for better accuracy
- **AutoML Integration**: Automated hyperparameter tuning with Optuna
- **Real-time Retraining**: Continuous learning with streaming data
- **Multi-language Support**: Extend to additional languages

### Phase 4 (Long-term)

- **Federated Learning**: Train on distributed data (if needed)
- **Model Compression**: Deploy optimized ONNX/TFLite versions
- **Edge Deployment**: Mobile and offline capabilities
- **Custom Embeddings**: Fine-tune for Nepali language specifics

---

## Monitoring & Metrics

### Key Performance Indicators (KPIs)

**Model Performance:**

- Accuracy, Precision, Recall, F1-score per class
- Confusion matrix visualization
- Drift detection (input distribution changes)

**System Health:**

- API response time (p50, p95, p99)
- Error rate per endpoint
- Kafka lag and throughput
- Redis hit/miss rate

**Business Metrics:**

- Misclassification rate
- User feedback volume
- Time to retrain (from trigger to deployment)
- Model improvement over time

### Alerting Rules

**Critical Alerts:**

- API downtime > 1 minute
- Model accuracy drop > 10%
- Retraining failures
- Kafka consumer lag > 1000 messages

**Warning Alerts:**

- API latency > 1 second
- Redis memory usage > 80%
- Misclassification rate increase
- Low confidence predictions spike

---

## 📚 Additional Resources

### Official Documentation

- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/)
- [Hugging Face AutoTrain](https://huggingface.co/docs/autotrain/)
- [Kafka Python Client](https://kafka-python.readthedocs.io/)
- [Redis Python Client](https://redis-py.readthedocs.io/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Tutorials & Guides

- [XLM-RoBERTa Fine-tuning Guide](https://huggingface.co/docs/transformers/model_doc/xlm-roberta)
- [Continuous Learning Patterns](https://www.oreilly.com/library/view/building-machine-learning/9781492053187/)
- [MLOps Best Practices](https://ml-ops.org/)

### Community & Support

- [Hugging Face Forums](https://discuss.huggingface.co/)
- [FastAPI Discord](https://discord.gg/VQjSZaeJmf)
- [Kafka Users Mailing List](https://kafka.apache.org/contact)

---

## Implementation Timeline

### 1: Foundation

- Set up HF account and API tokens
- Configure environment variables
- Deploy Docker Compose stack
- Test HF Inference API integration

### 2: Core Features

- Implement feedback collection API
- Set up Kafka producers and consumers
- Configure Redis caching
- Create monitoring dashboards

### 3: Retraining Pipeline

- Develop dataset preparation scripts
- Implement HF Dataset Hub upload
- Configure AutoTrain workflow
- Test end-to-end retraining

### 4: Testing & Launch

- Load testing and performance tuning
- Security audit and hardening
- Documentation and training
- Production deployment

**Total Implementation Time**: 2-4 weeks for full production system

---

This plan is ready to implement for continuous learning without GPU requirements.

---

## Notes

- Backup of original document with code examples: `retraining-system-design-backup.md`
- This version focuses on architectural concepts and workflows
- Implementation code available in project repository
