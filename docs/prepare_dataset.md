# Prepare Dataset Space - Deployment Guide

This documnetation helps you deploy your own instance of the **Prepare Dataset Space** on Hugging Face. This automated pipeline fetches misclassified grievances from your database, prepares training datasets, and pushes them to Hugging Face Hub for model retraining.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Pipeline Workflow](#pipeline-workflow)
4. [Technology Stack](#technology-stack)
5. [Implementation Details](#implementation-details)
6. [Deployment Architecture](#deployment-architecture)
7. [Quick Start Guide](#quick-start-guide)
8. [Monitoring & Metrics](#monitoring--metrics)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

### Goals

- **Automated Data Preparation**: Fetch, balance, and preprocess grievance data
- **Database Integration**: Direct PostgreSQL connection for misclassified records
- **Balanced Sampling**: Combines misclassified (100%) + correct samples (50% ratio)
- **Version Control**: Automatic dataset versioning with timestamp-based tags
- **Cost-Effective**: Runs on-demand, auto-pauses after completion
- **Experiment Tracking**: Full integration with Weights & Biases for monitoring

### Current Architecture

Your implementation uses a **dedicated HF Space for dataset preparation** that:
- Runs on-demand when triggered
- Fetches reviewed misclassifications from PostgreSQL
- Balances data with correct samples
- Automatically pushes versioned datasets to HF Hub
- Pauses itself after completion to save costs

---

```mermaid
flowchart TD
    %% Styling
    classDef processStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:1px,font-size:14px
    classDef decisionStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px,font-size:14px
    classDef infraStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,font-size:14px
    
    %% Nodes
    SpaceRestart["<b>TRIGGER</b><br/>HF Space Restarts<br/>Automated pipeline begins"]
    class SpaceRestart infraStyle
    
    LoadConfig["<b>LOAD CONFIGURATION</b><br/>Validate environment variables<br/>Set DB connection & HF tokens<br/>Configure dataset paths"]
    class LoadConfig processStyle
    
    DBConnect["<b>DATABASE CONNECTION</b><br/>Connect to PostgreSQL<br/>Retry logic (3 attempts)<br/>Validate connection"]
    class DBConnect processStyle
    
    FetchData["<b>FETCH DATA</b><br/>Query misclassified records<br/>Sample correct records (50%)<br/>Combine & validate"]
    class FetchData processStyle
    
    CheckSize{"<b>SIZE CHECK</b><br/>Records ≥<br/>MIN_DATASET_LEN?"}
    class CheckSize decisionStyle
    
    Preprocess["<b>PREPROCESS</b><br/>Clean text (URLs, HTML, whitespace)<br/>Encode labels to IDs<br/>Create train/eval/test splits"]
    class Preprocess processStyle
    
    PushHub["<b>PUSH TO HUB</b><br/>Upload dataset to HF<br/>Create version tag<br/>Generate README & metadata"]
    class PushHub processStyle
    
    Skip["<b>SKIP</b><br/>Log insufficient data<br/>Continue to next label"]
    class Skip processStyle
    
    PauseSpace["<b>SHUTDOWN</b><br/>Pause Space<br/>Free resources<br/>Pipeline complete"]
    class PauseSpace infraStyle
    
    %% Flow
    SpaceRestart --> LoadConfig
    LoadConfig --> DBConnect
    DBConnect --> FetchData
    FetchData --> CheckSize
    CheckSize -->|Yes| Preprocess
    CheckSize -->|No| Skip
    Preprocess --> PushHub
    Skip --> PauseSpace
    PushHub --> PauseSpace
```

> Fig: Dataset Preparation Pipeline

---

## Architecture Components

### 1. PostgreSQL Database
- **Purpose**: Store grievances and misclassification feedback
- **Tables**: 
  - `complaints` - All grievances with predictions
  - `misclassified_complaints` - Reviewed corrections
- **Query Logic**: Fetch reviewed misclassifications + sample correct records

### 2. Prepare Dataset Space
- **Purpose**: Automated dataset preparation pipeline
- **Trigger**: Manual restart or API call
- **Runtime**: Docker container with Python 3.12
- **State**: Paused when idle, active only during processing
- **Output**: Versioned datasets pushed to HF Hub

### 3. HF Dataset Hub
- **Purpose**: Version-controlled training data storage
- **Format**: HuggingFace Dataset with train/eval/test splits
- **Metadata**: Version tags, split sizes, label mappings, timestamps

### 4. Weights & Biases
- **Purpose**: Pipeline monitoring and data quality tracking
- **Logged Data**:
  - Database connection status
  - Records fetched per label
  - Dataset push status (success/failed/skipped)
  - Pipeline alerts and errors

---

## Pipeline Workflow

### Complete End-to-End Process

#### **1. TRIGGER**
- User or scheduler initiates Space restart
- HF Space receives signal
- Docker container begins building

#### **2. LOAD CONFIGURATION**
- Validate all environment variables
- Check HF_TOKEN, POSTGRES_URL, WANDB_API_KEY
- Configure dataset repository paths
- Set minimum dataset size threshold

#### **3. DATABASE CONNECTION**
- Create SQLAlchemy engine with connection pooling
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
- Validate connection with `SELECT 1` query
- Log connection status to WandB

#### **4. FETCH DATA** (for each label: department, urgency)
- Query misclassified records:
  ```sql
  SELECT c.message, mc.correct_department, mc.correct_urgency
  FROM misclassified_complaints mc
  JOIN complaints c ON c.id = mc.complaint_id
  WHERE mc.reviewed = TRUE
    AND mc.correct_X IS NOT NULL
    AND mc.model_predicted_X IS DISTINCT FROM mc.correct_X
  ```
- Sample correct records (50% of misclassified count):
  ```sql
  SELECT c.message, c.department, c.urgency
  FROM complaints c
  WHERE c.id NOT IN (SELECT complaint_id FROM misclassified_complaints)
  ```
- Combine both datasets
- Log record counts to WandB

#### **5. SIZE CHECK**
- Compare: `record_count >= MIN_DATASET_LEN` (default: 1000)
- **If insufficient**: Skip push, log warning, continue to next label
- **If sufficient**: Proceed to preprocessing

#### **6. PREPROCESS**
- Clean text:
  - Remove URLs: `https://...` → ``
  - Remove HTML tags: `<div>` → ``
  - Normalize whitespace: `  ` → ` `
- Encode labels:
  - Department → {0, 1, 2, 3}
  - Urgency → {0, 1, 2}
- Create splits:
  - **Train**: 80%
  - **Eval**: 10%
  - **Test**: 10%
  - Stratified by label

#### **7. PUSH TO HUB**
- Generate version tag: `v{YYYYMMDD}_{HHMMSS}`
- Push DatasetDict to HF Hub
- Upload `dataset_metadata.json`:
  ```json
  {
    "dataset_name": "username/dataset",
    "version_tag": "v20251029_143052",
    "label_column": "department",
    "num_samples": 1523,
    "splits": {"train": 1218, "eval": 152, "test": 153}
  }
  ```
- Generate README.md with label mappings and metadata
- Create Git tag on HF Hub
- Log success to WandB

#### **8. SHUTDOWN**
- Finish WandB run
- Pause Space (free resources)
- Log completion status
- Pipeline complete

---

## Technology Stack

### Dataset Preparation Pipeline

**Core Framework:**
- Python 3.12
- SQLAlchemy (PostgreSQL ORM)
- Pandas (data manipulation)
- Hugging Face Datasets
- scikit-learn (train/test split)

**Key Files:**
- `prepare_dataset_pipeline.py` - Main orchestrator
- `prepare_pd_df.py` - Database query logic
- `preprocess_and_prepare_dataset.py` - Preprocessing & HF Hub push
- `Dockerfile` - Container configuration
- `requirements.txt` - Python dependencies

**Docker Setup:**
- Base: `python:3.12-slim`
- Non-root user for security
- Cached HF artifacts in `/home/user/app/hf_cache`

### Configuration System

**Environment Variables:**
```bash
# Hugging Face
HF_TOKEN=<write_access_token>
DEPARTMENT_DATASET=<username>/sambodhan-department-dataset
URGENCY_DATASET=<username>/sambodhan-urgency-dataset

# Database
POSTGRES_URL=postgresql://user:pass@host:port/database

# Weights & Biases
WANDB_API_KEY=<wandb_key>
WANDB_PROJECT_NAME=sambodhan-dataset-pipeline

# Optional
PREPARE_DATASET_SPACE_ID=<username>/prepare-dataset
MIN_DATASET_LEN=1000
```

**Label Mappings:**

**Department Classification:**
```python
department2id = {
    'Municipal Governance & Community Services': 0,
    'Education, Health & Social Welfare': 1,
    'Infrastructure, Utilities & Natural Resources': 2,
    'Security & Law Enforcement': 3
}
```

**Urgency Classification:**
```python
urgency2id = {
    'NORMAL': 0,
    'URGENT': 1,
    'HIGHLY URGENT': 2
}
```

### Data Sampling Strategy

**Balanced Dataset Creation:**
- **Misclassified**: 100% (all reviewed records where prediction ≠ correct)
- **Correct**: 50% of misclassified count (randomly sampled)
- **Example**: 1000 misclassified + 500 correct = 1500 total

**Train/Eval/Test Split:**
- **Train**: 80% (stratified by label)
- **Eval**: 10% (stratified by label)
- **Test**: 10% (stratified by label)

---

## Implementation Details

### Key Functions

#### **fetch_misclassified_dataframe()** (`prepare_pd_df.py`)

**Purpose:** Fetch and balance dataset from PostgreSQL

**Parameters:**
- `label_column`: 'department' or 'urgency'
- `engine`: SQLAlchemy engine
- `correct_ratio`: Fraction of correct samples (default: 0.5)
- `random_state`: Random seed for reproducibility (default: 42)

**Returns:** DataFrame with columns `['grievance', 'department', 'urgency']`

**Logic:**
1. Query all misclassified records (reviewed = TRUE)
2. Calculate correct sample size: `n_correct = n_misclassified * 0.5`
3. Sample correct records from complaints not in misclassified table
4. Combine and return

#### **clean_and_encode_dataset()** (`preprocess_and_prepare_dataset.py`)

**Purpose:** Clean text and encode labels

**Text Cleaning:**
```python
def clean_text(text: str) -> str:
    text = re.sub(r'https?://\S+|www\.\S+', '', text)  # URLs
    text = re.sub(r'<.*?>', '', text)  # HTML tags
    text = re.sub(r'\n', ' ', text)  # Newlines
    text = re.sub(r'\s+', ' ', text).strip()  # Whitespace
    return text
```

**Label Encoding:**
- Map department/urgency strings to integer IDs
- Drop rows with null labels
- Return DataFrame: `['grievance', 'label']`

#### **split_dataset()** (`preprocess_and_prepare_dataset.py`)

**Purpose:** Create train/eval/test splits

**Implementation:**
```python
def split_dataset(df, train_size=0.8, val_size=0.1, test_size=0.1):
    # First split: train + temp
    train_df, temp_df = train_test_split(
        df, test_size=(val_size + test_size),
        stratify=df['label'], random_state=42
    )
    
    # Second split: val + test
    val_df, test_df = train_test_split(
        temp_df, test_size=(test_size / (val_size + test_size)),
        stratify=temp_df['label'], random_state=42
    )
    
    return DatasetDict({
        'train': Dataset.from_pandas(train_df),
        'eval': Dataset.from_pandas(val_df),
        'test': Dataset.from_pandas(test_df)
    })
```

#### **preprocess_and_push_dataset()** (`preprocess_and_prepare_dataset.py`)

**Purpose:** Complete preprocessing and HF Hub upload

**Workflow:**
1. Clean and encode dataset
2. Create train/eval/test splits
3. Generate version tag (timestamp-based)
4. Push to HF Hub with commit message
5. Upload `dataset_metadata.json`
6. Generate and upload README.md
7. Create Git tag
8. Return DatasetDict

---

## Deployment Architecture

### HF Space Structure

```
prepare_dataset/
├── prepare_dataset_pipeline.py      # Main orchestrator
├── prepare_pd_df.py                 # Database queries
├── preprocess_and_prepare_dataset.py # Preprocessing & push
├── requirements.txt
├── Dockerfile
└── README.md
```

### Docker Configuration

**Dockerfile:**
```dockerfile
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH="/home/user/.local/bin:$PATH"

WORKDIR /home/user/app

COPY --chown=user requirements.txt /home/user/app/requirements.txt

RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

ENV HF_HOME=/home/user/app/hf_cache \
    HF_DATASETS_CACHE=/home/user/app/hf_cache \
    HF_METRICS_CACHE=/home/user/app/hf_cache

RUN mkdir -p /home/user/app/hf_cache && chmod -R 777 /home/user/app/hf_cache

COPY --chown=user . /home/user/app

CMD ["python", "prepare_dataset_pipeline.py"]
```

**Key Features:**
- Non-root user for security
- Cached HF artifacts
- Slim base image
- PostgreSQL driver (psycopg2-binary)

### Version Control Strategy

**Dataset Versioning:**
- Format: `v{YYYYMMDD}_{HHMMSS}`
- Example: `v20251029_143052`
- Stored as Git tags on HF Hub
- Immutable once created

**Metadata Tracking:**
```json
{
  "dataset_name": "username/sambodhan-department-dataset",
  "version_tag": "v20251029_143052",
  "label_column": "department",
  "created_at": "2025-10-29T14:30:52.123456",
  "num_samples": 1523,
  "splits": {
    "train": 1218,
    "eval": 152,
    "test": 153
  },
  "author": "mr-kush",
  "description": "Processed and versioned dataset for department classification."
}
```

---

## Quick Start Guide

### Prerequisites

1. **Hugging Face Account**: https://huggingface.co/join
2. **HF Write Token**: Settings → Access Tokens → New token (write)
3. **WandB Account**: https://wandb.ai/signup
4. **WandB API Key**: Settings → API keys
5. **PostgreSQL Database**: With schema described in Architecture Components

### Step 1: Create Dataset Repositories

Create two empty dataset repositories on HF Hub:

1. Go to https://huggingface.co/new-dataset
2. Create `your-username/sambodhan-department-dataset`
3. Create `your-username/sambodhan-urgency-dataset`
4. Select "Public" or "Private" visibility

### Step 2: Clone the Space

```bash
# Clone the prepare dataset space
git clone https://huggingface.co/spaces/sambodhan/prepare_dataset

# Navigate to directory
cd prepare_dataset
```

### Step 3: Initialize as Your Own Space

```bash
# Remove original git remote
git remote remove origin

# Create your new Space on HF (via web interface first)
# Go to https://huggingface.co/new-space
# Choose "Docker" SDK, select "CPU basic"

# Then link it:
git remote add origin https://huggingface.co/spaces/your-username/prepare-dataset

# Configure git
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### Step 4: Set Environment Variables

Go to your Space settings on Hugging Face and add these **Secrets**:

```env
# Hugging Face Configuration
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx

# Dataset Repositories (create these first!)
DEPARTMENT_DATASET=your-username/sambodhan-department-dataset
URGENCY_DATASET=your-username/sambodhan-urgency-dataset

# Database Connection
POSTGRES_URL=postgresql://user:pass@host:5432/dbname

# Weights & Biases
WANDB_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WANDB_PROJECT_NAME=sambodhan-dataset-pipeline

# Optional: This Space's own ID (for auto-pause)
PREPARE_DATASET_SPACE_ID=your-username/prepare-dataset

# Optional: Minimum dataset size (default: 1000)
MIN_DATASET_LEN=1000
```

### Step 5: Push to Hub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial setup: Configure dataset preparation space"

# Push to your Space
git push origin main
```

### Step 6: Trigger Pipeline

**Option A: Manual Restart (via UI)**
1. Go to your Space URL
2. Click "Restart Space" button
3. Monitor logs in real-time

**Option B: Programmatic Restart**
```python
from huggingface_hub import HfApi

api = HfApi()
api.restart_space(
    repo_id="your-username/prepare-dataset",
    token="your_hf_token"
)
```

### Step 7: Verify Datasets

**Check HF Dataset Hub:**
1. Visit `https://huggingface.co/datasets/your-username/sambodhan-department-dataset`
2. Verify version tag exists (e.g., `v20251029_143052`)
3. Check `dataset_metadata.json` file
4. Review generated README.md

**Check WandB:**
1. Go to `https://wandb.ai/your-username/sambodhan-dataset-pipeline`
2. View latest run
3. Check metrics: `department_records_fetched`, `urgency_records_fetched`
4. Verify push status: `success` or `skipped_insufficient_data`

---

## Monitoring & Metrics

### Weights & Biases Dashboard

**Logged Metrics:**
- `db_connection_status`: Database connection result
- `department_records_fetched`: Number of department samples
- `urgency_records_fetched`: Number of urgency samples
- `department_push_status`: Upload status (success/failed/skipped)
- `urgency_push_status`: Upload status
- `hf_space_pause`: Auto-pause result

**Alerts:**
- 🔴 **ERROR**: Database connection failed
- 🔴 **ERROR**: Dataset preparation failed
- 🟡 **WARN**: Dataset skipped (insufficient data)
- 🟢 **INFO**: Dataset updated successfully
- 🟡 **WARN**: HF Space pause failed

**Dashboard Views:**
- Pipeline run history
- Dataset size trends over time
- Success/failure rate
- Average processing time

### Space Logs

**Successful Run Example:**
```
Starting dataset preparation pipeline...
Created SQLAlchemy engine. Validating connection...
Database connection successful.
Fetching misclassified data for 'department'...
Retrieved 1523 records for 'department'.
Preprocessing and pushing 'department' dataset to HF Hub...
[INFO] Dataset successfully pushed to Hugging Face Hub: username/dept-dataset
README.md successfully uploaded for username/dept-dataset (v20251029_143052)
[INFO] Version tag created: v20251029_143052
Successfully pushed 'department' dataset.
Fetching misclassified data for 'urgency'...
Retrieved 980 records for 'urgency'.
Preprocessing and pushing 'urgency' dataset to HF Hub...
[INFO] Dataset successfully pushed to Hugging Face Hub: username/urgency-dataset
Successfully pushed 'urgency' dataset.
⏸ Attempting to pause Hugging Face Space...
Hugging Face Space paused successfully.
Dataset preparation completed successfully!
```

**Skipped Dataset Example:**
```
Fetching misclassified data for 'urgency'...
Retrieved 450 records for 'urgency'.
Skipped pushing 'urgency' dataset — insufficient data (450 < 1000).
[SKIPPED] Skipped pushing 'urgency' dataset...
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Fails**

**Error:**
```
Database connection failed after multiple attempts.
```

**Solutions:**
- ✅ Verify `POSTGRES_URL` format: `postgresql://user:pass@host:port/db`
- ✅ Check database server is accessible from HF servers
- ✅ Whitelist Hugging Face IP ranges in firewall
- ✅ Test connection locally:
  ```python
  from sqlalchemy import create_engine
  engine = create_engine("your_postgres_url")
  with engine.connect() as conn:
      conn.exec_driver_sql("SELECT 1")
  ```

**2. Dataset Push Fails**

**Error:**
```
[ERROR] Failed to push dataset: 401 Client Error: Unauthorized
```

**Solutions:**
- ✅ Verify `HF_TOKEN` has **write** permissions
- ✅ Confirm dataset repository exists
- ✅ Check repository name matches environment variable
- ✅ Ensure token is not expired

**3. WandB Login Fails**

**Error:**
```
wandb: ERROR API key is invalid
```

**Solutions:**
- ✅ Verify `WANDB_API_KEY` is correct
- ✅ Get new key from https://wandb.ai/settings
- ✅ Check WandB service status

**4. Insufficient Data**

**Warning:**
```
Skipped pushing 'department' dataset — insufficient data (450 < 1000).
```

**Solutions:**
- ✅ Lower `MIN_DATASET_LEN` threshold
- ✅ Collect more reviewed misclassifications
- ✅ Adjust `correct_ratio` in code:
  ```python
  df = fetch_misclassified_dataframe(
      label_column=label,
      engine=engine,
      correct_ratio=0.3  # Use 30% instead of 50%
  )
  ```

**5. Space Won't Pause**

**Warning:**
```
Failed to pause HF Space: Space not found
```

**Solutions:**
- ✅ Verify `PREPARE_DATASET_SPACE_ID` format: `username/space-name`
- ✅ Ensure token has Space management permissions
- ✅ This is non-critical - pipeline still completes

---

## Integration with Retraining Pipeline

### Automatic Workflow

```mermaid
graph LR
    A[Prepare Dataset Space] -->|Push Dataset| B[HF Dataset Hub]
    B -->|Trigger Manually| C[Retrain Space]
    C -->|Evaluate & Deploy| D[Inference Space]
    D -->|Collect Feedback| E[PostgreSQL DB]
    E -->|Fetch Misclassified| A
```

### Triggering Retraining After Dataset Update

```python
from huggingface_hub import HfApi

api = HfApi()

# After dataset preparation completes, trigger retraining
api.restart_space(
    repo_id="your-username/urgency-classifier-retraining",
    token=HF_TOKEN
)

api.restart_space(
    repo_id="your-username/department-classifier-retraining",
    token=HF_TOKEN
)
```

### End-to-End Monitoring

**WandB Projects Structure:**
- `sambodhan-dataset-pipeline` - Dataset preparation runs
- `sambodhan-urgency-classifier` - Urgency model training
- `sambodhan-department-classifier` - Department model training

---

## Security Considerations

### Token Management
- Use HF tokens with minimum required permissions
- Rotate tokens regularly (quarterly)
- Never commit tokens to git
- Use HF Spaces secrets exclusively

### Database Security
- Use read-only database user if possible
- Never commit `POSTGRES_URL` to git
- Whitelist only necessary IP ranges
- Use SSL/TLS for database connections
- Rotate database passwords quarterly

### Data Privacy
- Ensure grievance data complies with privacy policies
- Use private repositories for sensitive data
- Implement data anonymization if needed
- Regular security audits of database access

---

## Conclusion

This implementation provides a **robust, automated, and scalable** solution for continuous dataset preparation. The key advantages are:

1. **Automated**: Direct database integration with retry logic
2. **Balanced**: Smart sampling strategy (misclassified + correct)
3. **Versioned**: Timestamp-based tags for full traceability
4. **Quality Tracked**: WandB integration for monitoring
5. **Cost-Effective**: Auto-pause saves compute costs

This architecture seamlessly integrates with the retraining pipeline to enable continuous model improvement.

### Project Links
- **Hugging Face Org**: https://huggingface.co/sambodhan
- **Template Space**: https://huggingface.co/spaces/sambodhan/prepare_dataset

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Author**: Based on implementation by mr-kush  
**Status**: Production-Ready ✅