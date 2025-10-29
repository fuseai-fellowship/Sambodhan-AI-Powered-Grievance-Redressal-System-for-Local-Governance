# configs.py
import os


# Label Mappings

department2id = {
    'Municipal Governance & Community Services': 0,
    'Education, Health & Social Welfare': 1,
    'Infrastructure, Utilities & Natural Resources': 2,
    'Security & Law Enforcement': 3
}

id2department = {v: k for k, v in department2id.items()}

urgency2id = {'NORMAL': 0, 'URGENT': 1, 'HIGHLY URGENT': 2}


id2urgency = {v: k for k, v in urgency2id.items()}



class BaseConfig:
    """Base class for common config methods"""
    
    # Hugging Face
    hf_token: str = os.getenv("HF_TOKEN", None)
    model_checkpoint: str = os.getenv("MODEL_CHECKPOINT", "xlm-roberta-base")
    dataset_repo_id: str = os.getenv("DATASET_REPO_ID", None)
    hub_model_id: str = os.getenv("HUB_MODEL_ID", None)
    api_endpoint: str = os.getenv("API_ENDPOINT", None)
    space_repo_id: str = os.getenv("SPACE_REPO_ID", None)
    retrain_space_id: str= os.getenv("RETRAIN_SPACE_ID", None)

    # Weights & Biases
    wandb_api_key: str = os.getenv("WANDB_API_KEY", None)
    wandb_project_name: str = os.getenv("WANDB_PROJECT_NAME", "sam-urgency-classifier")

    # Training hyperparameters
    early_stopping_patience: int = int(os.getenv("EARLY_STOPPING_PATIENCE", 1))
    deployed_sample_size: int = int(os.getenv("DEPLOYED_SAMPLE_SIZE", 300))
    decision_threshold: float = float(os.getenv("DECISION_THRESHOLD", 0.001))
    
    
    def validate_required(self, required_fields):
        """Ensure required fields are set; raise error if missing"""
        missing = [f for f in required_fields if not getattr(self, f)]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {missing}")


class DepartmentConfig(BaseConfig):
    """Configuration for Department model using HF Spaces secrets"""
    # label
    label: str = "department"
    # labels ids
    id2label: dict = id2department
    label2id: dict = department2id

class UrgencyConfig(BaseConfig):
    """Configuration for Urgency model using HF Spaces secrets"""
    # label
    label: str = "urgency"
    # labels ids
    id2label: dict = id2urgency
    label2id: dict = urgency2id


def get_config() -> BaseConfig:
    """
    Dynamically return DepartmentConfig or UrgencyConfig
    based on LABEL environment variable.
    Also validates required secrets.
    """
    label = os.getenv("LABEL", "department").lower()

    if label == "department":
        config = DepartmentConfig()
        required_fields = [
            "hf_token",
            "dataset_repo_id",
            "hub_model_id",
            "api_endpoint",
            "space_repo_id",
            "wandb_api_key",
            "retrain_space_id"
        ]
    elif label == "urgency":
        config = UrgencyConfig()
        required_fields = [
            "hf_token",
            "dataset_repo_id",
            "hub_model_id",
            "api_endpoint",
            "space_repo_id",
            "wandb_api_key", 
            "retrain_space_id"
        ]
    else:
        raise ValueError(f"Unsupported LABEL '{label}' in environment variables.")

    # Validate required secrets
    config.validate_required(required_fields)
    # Strip trailing whitespace/newlines from all string attributes on the config
    for attr in dir(config):
        if attr.startswith("_"):
            continue
        try:
            val = getattr(config, attr)
        except Exception:
            continue
        if isinstance(val, str):
            new_val = val.rstrip()
            try:
                if new_val != val:
                    setattr(config, attr, new_val)
            except Exception as E:
                # ignore read-only attributes
                raise ValueError(f"Error Env Vars: {E}")

    return config


# Example usage
if __name__ == "__main__":
    cfg = get_config()
    print(f"Loaded config for: {cfg.label}")
    print("HF Token:", cfg.hf_token)
    print("Dataset Repo ID:", cfg.dataset_repo_id)
