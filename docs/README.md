# Sambodhan: Documentation Index

This folder contains project-level documentation for the Sambodhan AI grievance redressal system. Below you'll find a short summary of each document in this `docs/` directory and quick links to open them. Use this page as the canonical index for architecture, APIs, dataset schema, and deployment guides.

## Quick links

- [System architecture and retraining flow](./architecture.md)
- [Department classifier: API, deployment and notes](./department_classifier.md)
- [Grievance dataset schema & label mappings](./grievance_dataset_schema.md)
- [Prepare Dataset (pipeline & HF Space) — deployment guide](./prepare_dataset.md)
- [Retraining pipeline & model retraining architecture](./retraining_classifier.md)
- [Urgency classifier: API, deployment and notes](./urgency_classifier.md)

## Summaries


### docs/architecture.md
High-level system architecture and component overview. Good starting point for contributors who need to understand how services, Spaces, datasets and model training pieces fit together.

Path: `docs/architecture.md`

### docs/department_classifier.md
Comprehensive guide for the Department classification service (FastAPI). Contains API endpoint details, example requests, deployment and caching recommendations, Docker layout, monitoring, and production considerations for the department classifier HF Space.

Path: `docs/department_classifier.md`

### docs/grievance_dataset_schema.md
Schema definition for grievance records including column descriptions, allowed label values, super-department mapping, and the urgency taxonomy. This is the authoritative mapping used by dataset preparation scripts and model training.

Path: `docs/grievance_dataset_schema.md`

### docs/prepare_dataset.md
An end-to-end deployment and developer guide for the Prepare Dataset Hugging Face Space. Describes the pipeline that fetches reviewed misclassifications from the database, balances and preprocesses data, pushes versioned datasets to the HF Hub, and integrates with Weights & Biases for monitoring.

Path: `docs/prepare_dataset.md`

### docs/retraining_classifier.md
Detailed architecture and runbook for automated retraining — covering retrain Spaces, decision gates (ΔF1), WandB logging, Docker configuration, and deployment strategies for retraining both urgency and department models.

Path: `docs/retraining_classifier.md`

### docs/urgency_classifier.md
Complete guide for the Urgency classification FastAPI service. Mirrors the department classifier doc but focused on urgency labels, inference examples, deployment recommendations and health checks.

Path: `docs/urgency_classifier.md`

## How to use this docs folder

1. Start with `architecture.md` to get the big picture.
2. Read `grievance_dataset_schema.md` if you're working on data or labels.
3. For model or deployment work, open `department_classifier.md`, `urgency_classifier.md`, `prepare_dataset.md`, and `retraining_classifier.md` depending on the task.
4. Use `api.md` for the minimal endpoint contract when wiring frontends or testing inference.


Last updated: 2025-10-30
