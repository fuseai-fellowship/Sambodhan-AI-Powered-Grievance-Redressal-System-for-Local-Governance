# Orchestrator: Continuous Learning CI/CD

**Orchestrator: Continuous Learning CI/CD** is a  practical guide so any team can copy this repo and set up their own automated dataset→retrain pipeline.

This document explains *what* the orchestrator does, *why* each piece is needed, and *how* to set it up step-by-step (env, secrets, GH Actions, run/testing, troubleshooting).

---

## Table of contents

- [Orchestrator: Continuous Learning CI/CD](#orchestrator-continuous-learning-cicd)
- [Quick overview](#quick-overview)
- [Why this structure?](#why-this-structure)
- [Architecture (in depth)](#architecture-in-depth)
- [Components & responsibilities](#components--responsibilities)
- [Repo layout (what each file/folder is for)](#repo-layout-what-each-filefolder-is-for)
- [Getting started (step-by-step)](#getting-started-step-by-step)
    - [1. Prepare tokens and secrets](#1-prepare-tokens-and-secrets)
    - [2. Add GitHub secrets (recommended: use `gh` or web UI)](#2-add-github-secrets-recommended-use-gh-or-web-ui)
    - [3. Local development and testing](#3-local-development-and-testing)
    - [4. GitHub Actions](#4-github-actions)
    - [5. HF Spaces and dataset metadata](#5-hf-spaces-and-dataset-metadata)
    - [6. Retrain Spaces](#6-retrain-spaces)
- [How observability and logs look (what to expect)](#how-observability-and--logs-look-what-to-expect)
- [Testing & validation checklist](#testing--validation-checklist)
- [Troubleshooting (common failure modes)](#troubleshooting-common-failure-modes)
- [Operational playbook](#operational-playbook)
- [Recommended best practices](#recommended-best-practices)

---

## Quick overview 

The orchestrator is a small, tested Python service run by **GitHub Actions** that:

1. reads misclassification counts from your DB,
2. triggers dataset preparation on HF Space only when counts exceed thresholds,
3. polls HF Hub metadata until a new version is available, and
4. triggers retraining HF Spaces for only the updated labels : all with clear logging and dry-run support.

---

## Why this structure?

* **Cost-efficient**: avoid expensive dataset prep / training unless there’s enough data.
* **Safe**: retraining only on freshly uploaded datasets (version-aware).
* **Auditable**: step-by-step logs in GitHub Actions + optional W&B entries.
* **Modular**: supports multiple labels (department / urgency) independently.

--- 

## Architecture (in depth)

```mermaid
graph TD
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
--- 

**Components & responsibilities**

* **GitHub Actions** : runs orchestrator on schedule or manual trigger (`workflow_dispatch`).
* **orchestrator.py** : reads DB counts, decides, restarts HF Spaces, polls HF Hub metadata, triggers retrain spaces. Supports `DRY_RUN`.
* **Prepare Dataset HF Space** : prepares dataset and *pushes* `dataset_metadata.json` (with `version_tag`, `num_samples`, `created_at`).
* **HF Hub dataset repo** : single source of truth for latest dataset metadata.
* **Retrain HF Spaces (per label)** : containerized training that evaluates & deploys (if metric improved).
* **PostgreSQL** : stores grievances, misclassification reviews (source of counts).
* **Weights & Biases (optional)** : experiment and dataset logging, summary emails.

---

## Repo layout (what each file/folder is for)

```
├── orchestrator/             # All CI/CD orchestration logic
│   ├── orchestrator.py       # Main orchestrator script (decision engine)
│   ├── .env_examples         # Example environment variables file (DO NOT commit real secrets)
│   ├── requirements.txt      # Orchestrator-specific dependencies
│   └── __init__.py           # package marker (optional)
├── .github/
│   └── workflows/
│       └── orchestrator.yml  # GitHub Actions workflow to run the orchestrator

```

**File purposes (brief)**

* **`orchestrator/orchestrator.py`** : core program. *What it does*: reads `DATABASE_URL`, computes `misclassified_count` (SQL COUNT), computes `dataset_len = mis_count + sampled_correct`, compares with `THRESHOLD_*`, restarts `PREPARE_DATASET_REPO` via `huggingface_hub.HfApi.restart_space`, polls HF Hub `dataset_metadata.json` with `HEADERS={"Authorization":f"Bearer {HF_TOKEN}"}` until `num_samples >= dataset_len` and `version_tag != last_version`, then restarts retrain space for that label. Uses `DRY_RUN` mode and grouped logging for GitHub Actions.

* **`orchestrator/.env_examples`** : sample env vars (HF token names, repo IDs, thresholds, poll interval/timeout, DB URL, DRY_RUN). Copy to `.env` for local dev (gitignore it).
* **`orchestrator/requirements.txt`** : minimal Python libs required (SQLAlchemy, requests, huggingface_hub, python-dotenv, psycopg2-binary). Use this file in GH Actions or virtualenv.
* **`.github/workflows/orchestrator.yml`** : the scheduled/manual workflow. Exposes mapping from GitHub Secrets to orchestrator env vars and installs dependencies before running orchestrator.

---

## Getting started (step-by-step)

Follow these steps to set up your own orchestrator from the repo.

### 1. Prepare tokens and  secrets

* Create a Hugging Face token with permissions:

  * `read` for datasets metadata
  * `write` + `space:restart` to restart HF Spaces
* Have your DB connection details ready (Postgres recommended).
* Optional: W&B API key for dataset/experiment logs and summary emails.



### 2. Add GitHub secrets (recommended: use `gh` or web UI)

Secret names the orchestrator expects:

```.env_examples```
```
# Hugging Face Token (keep this secret; set via CI secrets)
# Format example: hf_xxxxxxxxxxxxxxxxxxxxx
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx

# HF Space repository IDs (owner/name)
# Example: owner/project_prepare_dataset
PREPARE_DATASET_REPO=owner/project_prepare_dataset
RETRAIN_DEPT_REPO=owner/project_retrain_dept
RETRAIN_URGENCY_REPO=owner/project_retrain_urgency

# HF Hub metadata JSON URLs (full URL to dataset metadata)
# Example: https://huggingface.co/datasets/.../resolve/main/dataset_metadata.json
HF_HUB_METADATA_DEPT=https://huggingface.co/datasets/owner/project_department/resolve/main/dataset_metadata.json
HF_HUB_METADATA_URGENCY=https://huggingface.co/datasets/owner/project_urgency/resolve/main/dataset_metadata.json

# Database (SQLAlchemy URL)
# Format example: postgresql+psycopg2://username:password@hostname:port/database_name
DATABASE_URL=postgresql+psycopg2://demo_user:demo_pass@db.example.com:5432/project_db

# Thresholds to trigger dataset prep (integer percentage)
# Example: 40
THRESHOLD_DEPARTMENT=40
THRESHOLD_URGENCY=30

# Polling settings (seconds)
# Examples: POLL_INTERVAL=60, POL_TIMEOUT=1800
POLL_INTERVAL=60
POLL_TIMEOUT=1800

# Optional flags (true/false)
# Set DRY_RUN=true to test without triggering HF Spaces
DRY_RUN=false

```

**Tip**: Add via GitHub UI (Settings → Secrets → Actions) or script via `gh secret set`.

### 3. Local development and testing

* Copy `.env_examples` → `.env` and fill values (do **not** commit `.env`).
* Create a virtualenv and install dependencies:

  ```bash
  python -m venv .venv
  source .venv/bin/activate
  pip install -r orchestrator/requirements.txt
  ```
* Run in dry-run first:

  ```bash
  DRY_RUN=true python orchestrator/orchestrator.py
  ```

  * You should see computed counts and the actions it *would* take without restarting spaces.



### 4. GitHub Actions

* Ensure `.github/workflows/orchestrator.yml` is present (the repo includes one). It uses `workflow_dispatch` and `schedule` triggers.
* The workflow maps secrets to env variables and runs:

  * checkout
  * setup-python
  * `pip install -r orchestrator/requirements.txt`
  * `python orchestrator/orchestrator.py`
* Run the workflow manually (Actions → Sambodhan Orchestrator → Run workflow) to test with real secrets.



### 5. HF Spaces and dataset metadata

* The Prepare Dataset Space must push a `dataset_metadata.json` file to the dataset repo root (path expected by the orchestrator). The file should contain:

  ```json
  {
    "dataset_name": "owner/misclassified_urgency_dataset",
    "version_tag": "v20251030_115250",
    "num_samples": 1600,
    "splits": {"train":1280,"eval":160,"test":160},
    "created_at": "2025-10-30T11:53:01.110260+00:00"
  }
  ```
* Orchestrator polls the HF Hub metadata URL (authenticated) until `num_samples >= required_len` and `version_tag` changed.



### 6. Retrain Spaces

* Ensure retrain HF Spaces are configured to:

  * Read the dataset version passed via env var or rely on HF Hub to fetch `latest` (recommended to accept `DATASET_VERSION` or detect latest tag).
  * Train, evaluate, log to W&B, and (if accepted) push model + metadata and restart inference space (their internal logic is unchanged).
* Orchestrator restarts retrain spaces only after metadata confirms dataset upload.

---

## How observability and  logs look (what to expect)

* **GitHub Actions logs** (grouped per label using `::group::`):

  * Dataset counts (misclassified, sampled correct, total)
  * Threshold decision (skipped or prepare triggered)
  * Prepare space restart confirmation
  * Polling updates: `current_len=X required_len=Y version=...`
  * Retrain restart confirmation
  * Final orchestration summary (JSON-like)

* **WANDB (optional)**:

  * Prepare Space logs dataset stats to a dataset project
  * Retrain Space logs full training run + deployment decision

* **Audit DB table (optional)**: keep `orchestrator_runs` table with run metadata for historical analysis.

---

## Testing and validation checklist

Before enabling the scheduled workflow for production:

1.  Run orchestrator locally in `DRY_RUN=true`.
2.  Create a test HF dataset repo (private/staging) and ensure Prepare Space writes `dataset_metadata.json`.
3.  Run orchestrator in staging with `DRY_RUN=false` and verify it restarts Prepare Space (logs confirm).
4.  Simulate metadata update on HF Hub (push new metadata) and verify orchestrator detects it and restarts retrain space.
5.  Confirm retrain space runs, logs to W&B, and (if accepts) deploys model.
6.  Validate inference Space after a successful deploy (sanity test requests).
7.  Add alerts for polling timeouts or failed restarts (email/Slack).

---

## Troubleshooting (common failure modes)

* **Prepare Space completes but `dataset_metadata.json` not visible**

  * Check HF token permissions in Prepare Space.
  * Confirm metadata file path and naming: `resolve/main/dataset_metadata.json`.
  * Inspect Prepare Space logs for push errors.

* **Poll timeout**

  * Increase `POLL_TIMEOUT` if dataset generation is slow.
  * Inspect network errors between GH Actions runner and HF Hub (rare).

* **Retrain space fails to start**

  * Inspect retrain HF Space logs (Docker build errors, missing deps).
  * Confirm retrain repo ID and HF token.

* **Duplicate retrain triggers / race**

  * Ensure orchestrator stores `last_version` before triggering Prepare Space, and use `version_tag` comparison to prevent retraining on the same version.
  * Optionally serialize runs with a simple lock table.

---

## Operational playbook

* **To run immediately**: GitHub Actions → Sambodhan Orchestrator → Run workflow (manual).
* **To test changes**: set `DRY_RUN=true` in repo secrets temporarily.
* **If dataset didn’t publish**: open Prepare Space logs → fix dataset push → re-run orchestrator.
* **If retrain failed**: open Retrain Space logs and W&B run.

---

## Recommended best practices

* **Use separate HF tokens** for spaces (least privilege): Prepare Space token only needs dataset repo write; orchestrator token needs `space:restart`.
* **Per-label thresholds** (department / urgency) : tune individually.
* **Persist orchestrator run history** for auditing and debugging.
* **Use short-lived tokens** and rotate regularly.
* **Test end-to-end in staging** before enabling production cron.
