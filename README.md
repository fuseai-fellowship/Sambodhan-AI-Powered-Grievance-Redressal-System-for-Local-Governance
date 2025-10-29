# Sambodhan-AI-Powered-Grievance-Redressal-System-for-Local-Governance



## Overview

Sambodhan is an AI-based system designed to streamline citizen grievance submission, classification, prioritization, and tracking for local governance. It supports multiple submission channels (mobile app, website) and provides real-time tracking, sentiment analysis, and departmental routing.

---

## Features
- Multi-channel grievance submission ( app, website)
- Automated grievance classification and departmental routing
- Urgency and sentiment detection
- Admin dashboard for analytics and grievance tracking

---

## Repository Structure

```
├── docs/                     # Project documentation
│   ├── architecture.md       # System architecture and design
│   ├── api.md                # API specifications and endpoints
│   └── README.md             # General project documentation
├── data/                     # All project data
│   ├── raw/                  # Original/raw datasets
│   │   ├── csv/              # CSV data files
│   │   └── sql/              # SQL dumps
│   ├── processed/            # Cleaned / preprocessed data
│   └── external/             # External or third-party datasets
├── notebooks/                # Jupyter notebooks for exploration & experimentation
├── src/                      # Source code
│   ├── __init__.py
│   ├── backend/              # Core backend application
│   │   ├── app/              # FastAPI app entrypoint & routers
│   │   ├── models/           # Database / ORM models
│   │   ├── database/         # DB connections and migrations
│   │   └── utils/            # Backend utility functions
│   ├── frontend/             # Frontend application (Next.js / React)
│   │   ├── components/       # UI components
│   │   ├── pages/            # Frontend pages/routes
│   │   └── assets/           # Static assets (images, css, js)
│   ├── data_science/         # ML/NLP pipelines and experiments
│   │   ├── preprocessing/    # Data cleaning and feature engineering
│   │   ├── models/           # Training scripts / model definitions
│   │   ├── evaluation/       # Model evaluation metrics & plots
│   │   └── utils/            # ML utility functions
│   └── services/             # Standalone classifier microservices
│       ├── department-classifier/  # Department classification API
│       └── urgency-classifier/     # Urgency classification API
├── tests/                    # Automated tests
│   ├── backend/              # Backend tests
│   ├── frontend/             # Frontend tests
│   └── data_science/         # ML/NLP pipeline tests
├── scripts/                  # Utility scripts for automation
│   ├── export/               # Scripts to export or preprocess data
│   └── dept_classifier/      # Scripts for model training and dataset-prep
├── requirements.txt          # Python dependencies
├── environment.yml           # Conda environment specification
├── Dockerfile                # Dockerfile for main backend
├── docker-compose.yml        # Docker compose setup for multiple services
├── .gitignore                # Git ignore rules
└── README.md                 # Project overview

```

## Grievance Dataset Schema:

| Column Name   | Data Type      | Description                                                                                             | Example / Allowed Values                                                                                                 |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **id**        | Integer/String | Unique identifier for each grievance record.                                                            | 1001                                                                                                                     |
| **grievance** | String         | Text of the citizen grievance describing the issue.                                                     | "Street lights not working in Ward 5."                                                                                   |
| **dept**      | String         | The department or super-department responsible for addressing the grievance.                            | Allowed values:<br>- Municipal Governance & Community Services<br>- Education, Health & Social Welfare <br>- Infrastructure, Utilities & Natural Resources<br>- Security & Law Enforcement |
| **urgency**   | String         | The urgency category of the grievance, based on predefined labels: `normal`, `urgent`, `highly urgent`. | "urgent"                                                                                                                 |

> Detail Dataset Report: [Grievance Dataset Schema](docs/grievance_dataset_schema.md)


---

## Department Classification Model

A production-ready transformer-based text classification system for routing citizen grievances to appropriate municipal departments. Deployed as a containerized FastAPI service on HuggingFace Spaces.

### Resources

| Resource | Link | Description |
|----------|------|-------------|
| **Model Repository** | [sambodhan_department_classifier](https://huggingface.co/sambodhan/sambodhan_department_classifier) | Pre-trained model weights and configuration |
| **Live API** | [API Documentation](https://sambodhan-department-classifier.hf.space/docs) | Interactive Swagger UI for testing endpoints |
| **Deployment & Usage** |[Dept Classifier Docs](docs/department_classifier.md) |Refer to this documentation for detailed API usage, deployment instructions,source code,  and customization options.|

### Quick Start
```bash
# Test the live API
curl -X POST "https://sambodhan-department-classifier.hf.space/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "Where can I get a new water connection?"}'
```

### Model Performance

**Classification Report:**

![Classification Report](./results/dept_classifier/dept-classification-report.png)

**Confusion Matrix:**

![Confusion Matrix](./results/dept_classifier/dept-classifier-confusion-matrix.png)

### Technical Specifications

- **Architecture**: Transformer-based sequence classification
- **Framework**: HuggingFace Transformers + PyTorch
- **API**: FastAPI with Pydantic validation
- **Deployment**: Docker container on HuggingFace Spaces
- **Features**: Batch inference, confidence scoring, automatic text preprocessing

---


###  Continuous Learning & Model Retraining

Sambodhan AI uses a **continuous learning system** that automatically improves its **Urgency** and **Department** classification models based on real-world feedback.

####  Overview

* **Trigger-based retraining**: Each retraining job runs when the **Retrain Space** on Hugging Face is restarted (manually or via API).
* **Automated pipeline**: Loads the latest dataset, trains with **Focal Loss**, evaluates model performance, and decides whether to deploy the new version.
* **Safe deployment**: New model is deployed **only if** it outperforms the currently deployed model (based on F1 macro).
* **Cost-efficient**: Uses **Dockerized Hugging Face Spaces** that automatically **pause after training** to save resources.
* **Tracking & comparison**: All experiments are tracked in **Weights & Biases**, including training metrics, confusion matrices, and deployment decisions.

####  Architecture Components

| Component           | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| **Inference Space** | Serves real-time predictions (always running)  |
| **Retrain Space**   | Handles automated retraining (on-demand)       |
| **Dataset Hub**     | Stores version-controlled training data        |
| **Model Hub**       | Versioned models with metadata and tags        |
| **WandB**           | Experiment tracking and performance comparison |

####  Retraining Workflow

```mermaid
flowchart TD
    A["Trigger Retrain</br>(Restart Space)"] --> B["Load Config & Dataset"]
    B --> C["Load model & Init W&B"]
    C --> D["Train Model with Focal Loss & Early Stopping"]
    D --> E["Evaluate & Compare F1 (ΔF1)"]
    E -->|Better| F["Push to HF Hub + Restart Inference Space"]
    E -->|Worse| G["Reject Model"]
    F --> H["Pause Retrain Space<br> (Free Compute)<br> Log in WandB "]
    G --> H
```
> Fig: Classifier Retraining Piepline

#### Detailed Documentation

For complete setup instructions, environment configuration, and architecture diagrams, see: **[→ docs/retraining_classifier.md ](docs/retraining_classifier.md)**

---



