import os
import time
import wandb
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from huggingface_hub import HfApi
from preprocess_and_prepare_dataset import preprocess_and_push_dataset
from prepare_pd_df import fetch_misclassified_dataframe


#  LOAD ENVIRONMENT 
load_dotenv()


def prepare_datasets():
    """
    Fetch misclassified data, preprocess, and push datasets to Hugging Face.
    Tracks all steps and metrics in Weights & Biases (W&B).
    """

    #  CONFIGURATION 
    hf_token = os.getenv("HF_TOKEN")
    dept_dataset_dir = os.getenv("DEPARTMENT_DATASET")
    urgency_dataset_dir = os.getenv("URGENCY_DATASET")
    DB_URL = os.getenv("POSTGRES_URL")
    PREPARE_DATASET_SPACE_ID = os.getenv("PREPARE_DATASET_SPACE_ID")
    WANDB_API_KEY = os.getenv('WANDB_API_KEY') 
    WANDB_PROJECT_NAME = os.getenv('WANDB_PROJECT_NAME', "sambodhan-dataset-pipeline")
    MIN_DATASET_LEN= os.getenv('MIN_DATASET_LEN', 1000)

    # Validate environment variables
    required_env = {
        "HF_TOKEN": hf_token,
        "DEPARTMENT_DATASET": dept_dataset_dir,
        "URGENCY_DATASET": urgency_dataset_dir,
        "POSTGRES_URL": DB_URL,
        "WANDB_API_KEY": WANDB_API_KEY,
    }
    missing_vars = [k for k, v in required_env.items() if not v]
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {missing_vars}")

    #  INIT W&B 
    wandb.login(key=WANDB_API_KEY)
    run = wandb.init(
        project=WANDB_PROJECT_NAME,
        job_type="prepare_dataset",
        config={
            "database_url": DB_URL,
            "department_dataset": dept_dataset_dir,
            "urgency_dataset": urgency_dataset_dir,
            "hf_space_id": PREPARE_DATASET_SPACE_ID,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        },
        tags=["dataset-prep", "hf-space", "auto-sync"],
        settings=wandb.Settings(start_method="thread"),
    )

    wandb.log({"status": "starting_pipeline"})
    wandb.termlog("Starting dataset preparation pipeline...")

    #  DATABASE CONNECTION 
    try:
        engine = create_engine(DB_URL, pool_pre_ping=True)
        wandb.termlog("Created SQLAlchemy engine. Validating connection...")

        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                with engine.connect() as conn:
                    conn.exec_driver_sql("SELECT 1")
                wandb.termlog("Database connection successful.")
                wandb.log({"db_connection_status": "success"})
                break
            except SQLAlchemyError as e:
                if attempt == max_attempts:
                    wandb.termlog("Database connection failed after multiple attempts.")
                    wandb.log({"db_connection_status": "failed"})
                    raise
                wait = 2 ** attempt
                wandb.termlog(f"Attempt {attempt} failed: {e}. Retrying in {wait}s...")
                time.sleep(wait)

    except Exception as e:
        wandb.alert(
            title="Database Connection Failed",
            text=str(e),
            level=wandb.AlertLevel.ERROR,
        )
        wandb.finish(exit_code=1)
        raise

    #  DATASET PROCESSING 
    dataset_mapping = {
        "department": dept_dataset_dir,
        "urgency": urgency_dataset_dir,
    }

    for label, dataset_dir in dataset_mapping.items():
        try:
            wandb.termlog(f"Fetching misclassified data for '{label}'...")
            df = fetch_misclassified_dataframe(
                label_column=label,
                engine=engine,
                correct_ratio=0.5,
            )
            record_count = len(df)
            wandb.log({f"{label}_records_fetched": record_count})
            wandb.termlog(f"Retrieved {record_count} records for '{label}'.")

            # Check dataset length before pushing
            if record_count < int(MIN_DATASET_LEN):
                msg = f"Skipped pushing '{label}' dataset — insufficient data ({record_count} < {MIN_DATASET_LEN})."
                wandb.termlog(msg)
                wandb.log({f"{label}_push_status": "skipped_insufficient_data"})

                # Optional: raise controlled exception (won’t stop outer loop)
                raise ValueError(msg)

            #  If sufficient data, proceed
            wandb.termlog(f"Preprocessing and pushing '{label}' dataset to HF Hub...")
            dataset = preprocess_and_push_dataset(
                df=df,
                hf_token=hf_token,
                hf_dataset_dir=dataset_dir,
                label_column=label,
            )

            wandb.termlog(f"Successfully pushed '{label}' dataset.")
            wandb.log({f"{label}_push_status": "success"})
            wandb.alert(
                title=f"{label.capitalize()} Dataset Updated",
                text=f"Successfully pushed dataset to {dataset_dir}",
                level=wandb.AlertLevel.INFO,
            )

  
        except ValueError as ve:
            # Controlled skip — no crash, just log warning
            wandb.alert(
                title=f"{label.capitalize()} Dataset Skipped",
                text=str(ve),
                level=wandb.AlertLevel.WARN,
            )
            wandb.termlog(f"[SKIPPED] {ve}")
            continue  # skip to next label safely

        except Exception as e:
            # Real errors
            wandb.alert(
                title=f"{label.capitalize()} Dataset Preparation Failed",
                text=str(e),
                level=wandb.AlertLevel.ERROR,
            )
            wandb.log({f"{label}_push_status": "failed"})
            wandb.termlog(f"Error processing '{label}' dataset: {e}")
            raise


    #  PAUSE HUGGING FACE SPACE 
    if PREPARE_DATASET_SPACE_ID:
        try:
            wandb.termlog("⏸ Attempting to pause Hugging Face Space...")
            api = HfApi()
            api.pause_space(repo_id=PREPARE_DATASET_SPACE_ID, token=hf_token)
            wandb.log({"hf_space_pause": "success"})
            wandb.termlog("Hugging Face Space paused successfully.")
        except Exception as e:
            wandb.termlog(f"Failed to pause HF Space: {e}")
            wandb.log({"hf_space_pause": "failed"})
            wandb.alert(
                title="HF Space Pause Failed",
                text=str(e),
                level=wandb.AlertLevel.WARN,
            )

    #  COMPLETE 
    wandb.log({"status": "completed"})
    wandb.termlog("Dataset preparation completed successfully!")
    run.finish(exit_code=0)


#  ENTRY POINT 
if __name__ == "__main__":
    try:
        prepare_datasets()
    except Exception as e:
        wandb.termlog(f" Pipeline failed due to an error: {e}")
        wandb.finish(exit_code=1)
        raise
