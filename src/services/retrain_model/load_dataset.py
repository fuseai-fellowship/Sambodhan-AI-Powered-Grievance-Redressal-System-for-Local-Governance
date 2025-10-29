#load_dataset.py

from datasets import load_dataset
from huggingface_hub import HfApi, DatasetInfo
from typing import Dict, Any


def load_dataset_from_hub(model_repo: str, hf_token: str) -> Dict[str, Any]:
    """
    Load a dataset from the Hugging Face Hub and return its metadata.

    This function securely loads a dataset from the Hugging Face Hub using a token,
    and also fetches metadata such as version (revision), split sizes, and other info.

    Parameters
    ----------
    model_repo : str
        The name or path of the dataset repository on the Hugging Face Hub.
        Example: "username/dataset_name".
    hf_token : str
        Your Hugging Face access token with permission to read the dataset.

    Returns
    -------
    result : dict
        {
            "dataset": datasets.DatasetDict or datasets.Dataset,
            "metadata": {
                "repo_id": str,
                "sha": str,
                "splits": {"train": int, "test": int, "validation": int, ...},
                "card_data": dict
            }
        }

    Raises
    ------
    ValueError
        If the dataset cannot be found or loaded.
    """
    try:
        #  Load dataset securely 
        dataset = load_dataset(model_repo, token=hf_token)

        #  Initialize Hugging Face API client 
        api = HfApi()

        #  Fetch dataset metadata from the Hub 
        ds_info: DatasetInfo = api.dataset_info(repo_id=model_repo, token=hf_token)

        # Extract useful details
        sha = ds_info.sha or "unknown"
        card_data = ds_info.card_data or {}

        #  Get latest tag (if exists) 
        latest_tag = None
        try:
            repo_refs = api.list_repo_refs(repo_id=model_repo, repo_type="dataset")
            if repo_refs.tags:
                latest_tag = repo_refs.tags[0].name  # e.g., "v1.0", "stable"
            else:
                latest_tag = "no-tag"
        except Exception:
            latest_tag = "no-tag"

        # Compute split sizes from loaded dataset
        splits = {split: len(dataset[split]) for split in dataset.keys()} if isinstance(dataset, dict) else {"default": len(dataset)}

        # compute size
        size = sum(splits.values())

        

        metadata = {
            "dataset_repo_id": model_repo,
            "dataset_version_tag": latest_tag,
            "dataset_size": size,
            "dataset_splits": splits,
        }

        return {"dataset": dataset, "metadata": metadata}

    except Exception as e:
        raise ValueError(f"Failed to load dataset '{model_repo}' from Hugging Face Hub: {e}")