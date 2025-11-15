<p align="center">
  <img width="200" height="150" src="https://github.com/user-attachments/assets/d09bce75-6ed4-4f7e-ab52-419212e3920e" alt="Sambodhan Logo" height="80"/>
</p>


# Sambodhan: AI-Powered Grievance Redressal System for Local Governance

<p align="center">
  <b>Streamline citizen complaints, automate classification, and empower local governance with AI.</b><br>
</p>

## Overview

Sambodhan is a full-stack AI-powered platform for citizen grievance management in local governance. It enables multi-channel complaint submission, automated classification (department & urgency), real-time analytics, and continuous model improvement. Built with Next.js (frontend), FastAPI (backend), and state-of-the-art NLP models, Sambodhan is designed for scalability, transparency, and actionable insights.

---

### Table of Contents

- [Features](#features)
- [Quickstart](#quickstart)
- [Repository Structure](#repository-structure)
- [Grievance Dataset Schema](#grievance-dataset-schema)
- [Model Overview](#model-overview)
  - [System Architecture](#system-architecture)
  - [Department Classification Model](#1-department-classification-model)
  - [Urgency Classification Model](#2-urgency-classification-model)
- [Continuous Learning System for Sambodhan AI](#continuous-learning-system-for-sambodhan-ai)
- [Frontend Features](#frontend-features)
- [Backend Features](#backend-features)
- [Analytics & Admin Dashboard](#analytics--admin-dashboard)
- [Chatbot System](#chatbot-system)
- [API Client Usage](#api-client-usage)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Features

- Multi-channel grievance submission (web, mobile)
- Automated department classification (AI/NLP)
- Urgency and sentiment detection
- Real-time analytics dashboard (citizen & admin views)
- Admin dashboard for grievance tracking and management
- Secure authentication (JWT, context-based)
- RESTful API (FastAPI)
- Continuous learning: automated retraining & dataset prep
- Dockerized deployment (frontend, backend, orchestrator)
- CI/CD with GitHub Actions
- Modular codebase: Next.js, FastAPI, Hugging Face, PyTorch

---

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for containerized deployment)

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/fuseai-fellowship/Sambodhan-AI-Powered-Grievance-Redressal-System-for-Local-Governance.git
cd Sambodhan-AI-Powered-Grievance-Redressal-System-for-Local-Governance
```

#### 2. Setup Python backend

```bash
python -m venv env
source env/bin/activate  # or .\env\Scripts\activate on Windows
pip install -r requirements.txt
cd src/backend/app
uvicorn main:app --reload
```

#### 3. Setup Next.js frontend

```bash
cd frontend-next
npm install
npm run dev
```

#### 4. Docker Compose (all services)

```bash
docker-compose up --build
```

#### 5. Environment Variables

- Copy `.env.example` to `.env` in both `frontend-next` and backend folders, and fill in required values (see docs).

---

## Repository Structure

```
├── docs/                     # Project documentation
│   ├── architecture.md       # System architecture, components and high-level diagrams
│   ├── department_classifier.md # Department classifier API, deployment and customization guide
│   ├── grievance_dataset_schema.md # Grievance dataset schema, labels and mappings
│   ├── prepare_dataset.md    # Prepare-dataset HF Space: pipeline, deployment and usage
│   ├── README.md             # Docs index (this file summarizes and links the other docs)
│   ├── retraining_classifier.md # Retraining pipeline architecture, decision gates and runbook
│   └── urgency_classifier.md # Urgency classifier API, deployment and examples
├── data/                     # All project data
│   ├── raw/                  # Original/raw datasets
│   │   ├── csv/              # CSV data files
│   │   └── sql/              # SQL dumps
│   ├── processed/            # Cleaned / preprocessed data
│   └── external/             # External or third-party datasets
├── notebooks/                # Jupyter notebooks for exploration & experimentation
├── orchestrator/             # All CI/CD orchestration logic
│   ├── orchestrator.py       # Main orchestrator script
│   ├── .env_examples         # Example environment variables file
│   ├── requirements.txt      # Orchestrator-specific dependencies
│   └── __init__.py           # makes it a Python package
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
│       ├── department_classifier_api/  # Department classification API
│       ├── prepare_dataset # prepare dataset pipeline
│       ├── retrain_model # retrain model pipeline
│       └── urgency_classifier_api/     # Urgency classification API
├── tests/                    # Automated tests
│   ├── backend/              # Backend tests
│   ├── frontend/             # Frontend tests
│   └── data_science/         # ML/NLP pipeline tests
├── scripts/                  # Utility scripts for automation
│   └── export/               # Scripts to export or preprocess data
├── requirements.txt          # Python dependencies
├── environment.yml           # Conda environment specification
├── Dockerfile                # Dockerfile for main backend
├── docker-compose.yml        # Docker compose setup for multiple services
├── .gitignore                # Git ignore rules
└── README.md                 # Project overview

```

## Grievance Dataset Schema

| Column Name   | Data Type      | Description                                                                                             | Example / Allowed Values                                                                                                                                                                   |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **id**        | Integer/String | Unique identifier for each grievance record.                                                            | 1001                                                                                                                                                                                       |
| **grievance** | String         | Text of the citizen grievance describing the issue.                                                     | "Street lights not working in Ward 5."                                                                                                                                                     |
| **dept**      | String         | The department or super-department responsible for addressing the grievance.                            | Allowed values:<br>- Municipal Governance & Community Services<br>- Education, Health & Social Welfare <br>- Infrastructure, Utilities & Natural Resources<br>- Security & Law Enforcement |
| **urgency**   | String         | The urgency category of the grievance, based on predefined labels: `normal`, `urgent`, `highly urgent`. | "urgent"                                                                                                                                                                                   |

> Detail Dataset Report: [Grievance Dataset Schema](docs/grievance_dataset_schema.md)

---

## Model Overview

### System Architecture

- **Frontend:** Next.js (React, TypeScript)
- **Backend:** FastAPI (Python, RESTful API)
- **ML Models:** Transformer-based text classification (`xlm-roberta-base`)
- **Frameworks:** Hugging Face Transformers, PyTorch
- **Deployment:** Docker, Hugging Face Spaces, GitHub Actions
- **Database:** PostgreSQL (for feedback, analytics, retraining)
- **Core Features:** Batch inference, confidence scoring, automated text preprocessing

---

### 1. Department Classification Model

A production-ready transformer model that classifies citizen grievances into appropriate municipal departments. Deployed as a containerized FastAPI service on Hugging Face Spaces.

#### Resources

| Resource             | Link                                                                                                | Description                                |
| -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Model Repository** | [sambodhan_department_classifier](https://huggingface.co/sambodhan/sambodhan_department_classifier) | Pre-trained weights and configuration      |
| **Live API**         | [Swagger UI](https://sambodhan-department-classifier.hf.space/docs)                                 | Interactive API documentation              |
| **Documentation**    | [Department Classifier Docs](docs/department_classifier.md)                                         | Deployment, usage, and customization guide |

#### Quick Start

```bash
curl -X POST "https://sambodhan-department-classifier.hf.space/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "Where can I get a new water connection?"}'
```

#### Model Evaluation

**Classification Report**
![Classification Report](./results/dept_classifier/dept-classification-report.png)

**Confusion Matrix**
![Confusion Matrix](./results/dept_classifier/dept-classifier-confusion-matrix.png)

---

### 2. Urgency Classification Model

A transformer-based classifier that determines the urgency level of citizen grievances. Deployed as a containerized FastAPI service on Hugging Face Spaces.

#### Resources

| Resource             | Link                                                                                          | Description                                |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Model Repository** | [sambodhan_urgency_classifier](https://huggingface.co/sambodhan/sambodhan_urgency_classifier) | Pre-trained weights and configuration      |
| **Live API**         | [Swagger UI](https://sambodhan-urgency-classifier-space.hf.space/docs)                        | Interactive API documentation              |
| **Documentation**    | [Urgency Classifier Docs](docs/urgency_classifier.md)                                         | Deployment, usage, and customization guide |

#### Quick Start

```bash
curl -X POST "https://sambodhan-urgency-classifier.hf.space/predict_urgency" \
  -H "Content-Type: application/json" \
  -d '{"text": "The water supply in my area has been cut off for 3 days."}'
```

### Model Performance

**Classification Report**
![Classification Report](./results/urgency_classifier/classification_report.png)

**Confusion Matrix**
![Confusion Matrix](./results/urgency_classifier/confusion_matrix.png)


---

## Continuous Learning System for Sambodhan AI

Sambodhan’s **Continuous Learning System** orchestrates automated dataset preparation and model retraining, ensuring its **Urgency** and **Department** classification models continuously learn from real-world feedback with minimal manual intervention.

This system consists of three core components:

1. **Dataset Preparation Pipeline**
2. **Model Retraining Pipeline**
3. **Orchestrator: Continuous Learning CI/CD**

This system leverages **Hugging Face Spaces**, **GitHub Actions CI/CD**, **PostgreSQL**, and **Weights & Biases** for a fully traceable, resource-efficient, and performance-driven pipeline.

---

### Workflow

```mermaid
graph LR
    A[Prepare Dataset Space] -->|Push Dataset| B[HF Dataset Hub]
    B -->|Trigger | C[Retrain Space]
    C -->|Evaluate & Deploy| D[Inference Space]
    D -->|Collect Feedback| E[PostgreSQL DB]
    E -->|Fetch Misclassified</br>Trigger| A
```

> Fig: Continuous Learning Workflow


---

### 1. Dataset Preparation Pipeline

The **Dataset Preparation Pipeline** automatically gathers, cleans, and publishes new training data for retraining cycles.

#### Key Highlights

- **Event-driven execution** – triggered whenever the **Prepare Dataset Space** restarts (manual or API).
- **Database integration** – fetches **misclassified grievances** and balances them with correctly predicted samples.
- **Data preprocessing** – handles cleaning, encoding, and dataset splitting.
- **Version control** – pushes versioned datasets to the **Hugging Face Dataset Hub** with timestamped tags.
- **Experiment tracking** – logs dataset statistics and push status in **W&B**.
- **Resource-efficient** – the Space auto-pauses after completion to conserve compute.
- **Notify User** - Send Run Summary Email to Admin

#### Components

| Component                 | Role                                            |
| ------------------------- | ----------------------------------------------- |
| **Prepare Dataset Space** | Automates data collection and preprocessing     |
| **PostgreSQL Database**   | Stores grievances and feedback samples          |
| **HF Dataset Hub**        | Hosts version-controlled training datasets      |
| **Weights & Biases**      | Logs dataset updates and metadata, Notify Admin |

#### Workflow

```mermaid
graph LR
    A["<b>TRIGGER</b><br>Restart Automated Prepare Dataset Pipeline"] --> B["Fetch Misclassified + Correct Data<br>(From SQL Database)"]
    B --> C{"<b>SIZE CHECK</b><br>Records ≥ MIN_DATASET_LEN?"}
    C -->|Yes| D["Preprocess & Split Dataset"]
    C -->|No| F["Skip & Log Insufficient Data"]
    D --> G["Push Versioned Dataset to HF Hub"]
    G --> H["Log Results to W&B, </br> Sends Mail, and<br> Auto-Pause Space"]
    F --> H

```

> Fig: Dataset Preparation Pipeline

**Detailed Guide:** See **[→ docs/prepare_dataset.md ](docs/prepare_dataset.md)**
for setup, configuration, and deployment instructions.

---

### 2. Model Retraining Pipeline

The **Retraining Pipeline** ensures Sambodhan’s models continuously improve based on the latest prepared datasets.

#### Key Highlights

- **Automated execution** – runs whenever the **Retrain Space** restarts (manual or API).
- **End-to-end training** – loads the latest dataset, trains using **Focal Loss**, evaluates, and compares results.
- **Performance-based deployment** – deploys a new model **only if** it outperforms the current one (by F1-macro).
- **Containerized runtime** – uses **Dockerized Hugging Face Spaces** that automatically pause after training.
- **Full traceability** – logs metrics, confusion matrices, and deployment decisions to **W&B**.
- **Notify User** - Send Run Summary Email to Admin

#### Components

| Component            | Role                                                      |
| -------------------- | --------------------------------------------------------- |
| **Inference Space**  | Hosts and serves the production model                     |
| **Retrain Space**    | Handles training and evaluation runs                      |
| **Dataset Hub**      | Stores version-controlled training data                   |
| **Model Hub**        | Publishes retrained model versions                        |
| **Weights & Biases** | Tracks experiments,Notify Admin, results, and comparisons |

#### Workflow

```mermaid
graph LR
    A["Trigger Retrain<br>(Restart Space)"] --> B["Load Config & Latest Dataset"]
    B --> C["Initialize Model & W&B Run"]
    C --> D["Train with Focal Loss + Early Stopping"]
    D --> E{"Evaluate & Compare F1 (ΔF1)"}
    E -->|Improved| F["Push to HF Hub + Restart Inference Space"]
    E -->|Not Improved| G["Reject Model"]
    F --> H["Log Results to W&B, </br> Sends Mail, and<br> Auto-Pause Space"]
    G --> H
```

> Fig: Model Retraining Pipeline

**Detailed Guide:**
For complete setup instructions, environment configuration, and architecture diagrams, see: **[→ docs/retraining_classifier.md ](docs/retraining_classifier.md)**

---

### 3. Orchestrator: Continuous Learning CI/CD

The **Orchestrator** coordinates dataset preparation and model retraining using **GitHub Actions**.

#### Key Highlights

- **Threshold-based execution** – only triggers dataset preparation if misclassified counts exceed configured thresholds.
- **Version-aware retraining** – waits for new datasets to appear on **HF Hub** before retraining.
- **Independent label handling** – handles **department** and **urgency** pipelines separately.
- **Step-by-step logging** – GitHub Actions logs show dataset length, threshold evaluation, dataset prep triggers, polling, and retraining.
- **Automated scheduling** – orchestrator runs at regular intervals using GitHub Actions cron jobs.

#### Workflow

```mermaid
graph LR
    Start["START<br/>Orchestrator triggered (manual or scheduled)"] --> DBConnect["Connect to DB<br/>Fetch misclassified counts"]
    DBConnect --> ComputeLen["Compute dataset_len per label"]
    ComputeLen --> CheckThreshold{"dataset_len >= threshold?"}
    CheckThreshold -->|Yes| TriggerPrep["Restart Dataset Prep Space<br/>for labels above threshold"]
    CheckThreshold -->|No| SkipLabel["Skip label<br/>Log info"] --> CheckThreshold
    TriggerPrep --> PollDataset["Poll HF Hub metadata<br/>Wait for new dataset version"]
    PollDataset -->|Success| RestartRetrain["Restart retrain HF Space<br/>for updated labels"]
    PollDataset -->|Error / Timeout| PollError["Polling error / timeout<br/>Log warning / retry / abort"]
    RestartRetrain --> End["END<br/>Orchestration complete"]
    PollError --> End
```

> Fig: Continuous Learning Orchestration Pipeline

**Detailed Guide:**
For complete setup instructions, environment configuration, and architecture diagrams, see: **[→ docs/orchestrator.md ](docs/orchestrator.md)**

---

## Frontend Features

- Built with Next.js (React, TypeScript)
- Citizen dashboard: submit grievances, view status, analytics
- Admin dashboard: manage grievances, view metrics, department/urgency insights
- Authentication: login, protected routes, context-based auth
- Data visualizations: charts for response time, location hotspots, quality metrics
- Modular UI components for forms, tables, charts
- API client for backend communication (Axios)
- **Integrated Chatbot for citizen support and FAQ**

---

## Backend Features

- FastAPI RESTful API
- Modular routers: complaints, location, orchestrator, etc.
- Environment variable loading via `.env` (secure config)
- Department and urgency classification endpoints
- Database integration (PostgreSQL)
- Automated feedback loop for continuous learning
- Dockerized for scalable deployment
- **Chatbot endpoint for conversational support**

---

## Analytics & Admin Dashboard

- Real-time metrics: grievance volume, response time, department/urgency distribution
- Location-based insights: hotspot mapping
- Quality metrics: resolution rates, feedback analysis
- Admin tools: manage, assign, and track grievances
- Data export and reporting

---

## Chatbot System

Sambodhan includes an AI-powered chatbot to assist citizens in submitting grievances, answering FAQs, and providing guidance.

### Features

- Natural language understanding for English language
- FAQ and helpdesk support
- Grievance submission via chat
- Department and urgency prediction via chat
- Integrated with backend ML models

---

## API Client Usage

The frontend uses a reusable API client (`src/lib/api-client.ts`) for all backend communication. Example usage:

```typescript
import apiClient from "../lib/api-client";

// Submit a grievance
apiClient
  .post("/complaints", { ...data })
  .then((response) => {
    /* handle success */
  })
  .catch((error) => {
    /* handle error */
  });
```

---

## Testing

- Backend: Pytest-based tests in `tests/backend`
- Frontend: Jest/React Testing Library in `tests/frontend`
- ML pipelines: notebook-based and script-based tests in `tests/data_science`

Run backend tests:

```bash
pytest tests/backend
```

Run frontend tests:

```bash
cd frontend-next
npm test
```

---

## Contributing

We welcome contributions! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

1. Fork the repo and create your branch.
2. Make changes with clear commit messages.
3. Ensure all tests pass.
4. Submit a pull request with a detailed description.

---
