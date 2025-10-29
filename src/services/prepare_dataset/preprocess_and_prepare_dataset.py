import re
import pandas as pd
from datasets import Dataset, DatasetDict
from sklearn.model_selection import train_test_split
from huggingface_hub import HfApi, create_repo
from datetime import datetime, UTC
import os
import json




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



# Text Cleaning Function

def clean_text(text: str) -> str:
    """Clean grievance text by removing URLs, HTML tags, extra whitespace."""
    text = re.sub(r'https?://\S+|www\.\S+', '', text)  # Remove URLs
    text = re.sub(r'<.*?>', '', text)  # Remove HTML tags
    text = re.sub(r'\n', ' ', text)  # Replace newlines with space
    text = re.sub(r'\s+', ' ', text).strip()  # Reduce multiple spaces
    return text



# Dataset Cleaning & Encoding

def clean_and_encode_dataset(df: pd.DataFrame, label_column: str = 'department') -> pd.DataFrame:
    """
    Clean the text and encode the label.
    
    Args:
        df: pandas DataFrame with columns ['grievance', 'department', 'urgency']
        label_column: 'department' or 'urgency'
    
    Returns:
        Cleaned DataFrame with columns ['grievance', 'label']
    """
    if label_column not in ['department', 'urgency']:
        raise ValueError("label_column must be either 'department' or 'urgency'")

    df = df.copy()
    df['grievance'] = df['grievance'].apply(clean_text)

    if label_column == 'department':
        df['label'] = df['department'].map(department2id)
    else:
        df['label'] = df['urgency'].map(urgency2id)

    # Keep only relevant columns
    df = df[['grievance', 'label']].dropna()
    return df



# Train-Test-Validation Split

def split_dataset(df: pd.DataFrame,train_size:float = 0.8, test_size: float = 0.1, val_size: float = 0.1, random_state: int = 42) -> DatasetDict:
    """
    Split the dataframe into train, test, and validation Hugging Face datasets.
    
    Returns:
        DatasetDict with keys: train, test, eval
    """
    # Initial train + temp split
    total = train_size + val_size + test_size
    if not (0.99 < total < 1.01):
        raise ValueError("train_size + val_size + test_size must sum to 1.0")

    # first split into train + temp (temp will become val+test)
    temp_ratio = val_size + test_size
    train_df, temp_df = train_test_split(
        df, test_size=temp_ratio, random_state=random_state, stratify=df['label']
    )

    # split temp into val and test
    relative_val_size = val_size / temp_ratio
    val_df, test_df = train_test_split(
        temp_df, test_size=(1 - relative_val_size), random_state=random_state, stratify=temp_df['label']
    )

    # convert to HF Dataset
    dataset_dict = DatasetDict({
        'train': Dataset.from_pandas(train_df.reset_index(drop=True)),
        'eval': Dataset.from_pandas(val_df.reset_index(drop=True)),
        'test': Dataset.from_pandas(test_df.reset_index(drop=True))
    })
    return dataset_dict


# upload readme.md file
def upload_hf_readme(hf_token: str, metadata: dict):
    """
    Uploads or updates a dynamic README.md file in the Hugging Face dataset repository
    with proper YAML metadata for dataset cards.

    Args:
        hf_token (str): Hugging Face write access token.
        metadata (dict): Metadata dictionary containing:
            {
                "dataset_name": "mr-kush/misclassified-department",
                "version_tag": "v20251017_045551",
                "label_column": "department",
                "created_at": "2025-10-17T04:55:55.542906",
                "commit_message": "Dataset update (department) - 20251017_045551",
                "num_samples": 2426,
                "splits": {"train": 1940, "eval": 243, "test": 243},
                "author": "mr-kush",
                "description": "Processed and versioned dataset for department classification."
            }
    """

    api = HfApi()
    label_column = metadata.get("label_column", "department")
    dataset_name = metadata.get("dataset_name", "unknown-dataset")
    version_tag = metadata.get("version_tag", "v_unknown")
    created_at = metadata.get("created_at", "unknown")
    num_samples = metadata.get("num_samples", 0)
    splits = metadata.get("splits", {})
    author = metadata.get("author", "unknown")
    description = metadata.get("description", "No description provided.")

    # Determine task and type dynamically
    if label_column.lower() == "department":
        task_category = "text-classification"
        task_id = "multi-class-classification"
        task_description = "- Department classification"
        label_mapping = department2id

    elif label_column.lower() == "urgency":
        task_category = "text-classification"
        task_id = "multi-class-classification"
        task_description = "- Urgency classification"
        label_mapping = urgency2id

    # Split information
    split_info = "\n".join([f"- **{k.capitalize()}**: {v} samples" for k, v in splits.items()]) if splits else "N/A"

    # Professional label mapping table
    if label_mapping:
        label_map_str = "| Label | ID |\n|:------|:--:|\n" + "\n".join([f"| {k} | {v} |" for k, v in label_mapping.items()])
    else:
        label_map_str = "_No label mapping available._"


    # Construct YAML metadata (Hugging Face dataset card standard)
    yaml_header = f"""---
datasets:
- {dataset_name}
language:
- en
- ne
task_categories:
- {task_category}
task_ids:
- {task_id}
license: apache-2.0
size_categories:
- 1K<n<10K
pretty_name: Sambodhan Grievance Dataset ({label_column.capitalize()})
---

"""

    # Construct the README content
    readme_content = yaml_header + f"""# Dataset: `{dataset_name}`

{description}

---

## Version Information
- **Version Tag:** `{version_tag}`
- **Created At:** {created_at}
- **Label Column:** `{label_column}`
- **Total Samples:** {num_samples}

### Label Mapping
{label_map_str}

## Dataset Splits
{split_info}

## Task Description
This dataset contains preprocessed citizen grievance texts for classification tasks:
{task_description}

## Author
- **Maintainer:** `{author}`

## Pipeline Information
This dataset is automatically generated and versioned by the **Sambodhan AI Data Pipeline**.
It ensures:
- Continuous version tracking  
- Consistent preprocessing standards  
- Reproducibility for fine-tuning and evaluation  

---

_Last updated automatically by the pipeline on {created_at}._
"""

    # Upload README.md file to the dataset repository
    api.upload_file(
        path_or_fileobj=readme_content.encode("utf-8"),
        path_in_repo="README.md",
        repo_id=dataset_name,
        repo_type="dataset",
        token=hf_token,
        commit_message=f"Update README.md ({version_tag})"
    )

    print(f"README.md successfully uploaded for {dataset_name} ({version_tag})")


# Main Function

def preprocess_and_push_dataset(df: pd.DataFrame, 
hf_token,
  hf_dataset_dir,
  label_column: str = 'department',
  train_size: float = 0.8, 
  val_size: float = 0.1, 
  test_size: float = 0.1
  ) -> DatasetDict:
    """
   Complete pipeline: clean text, encode labels, split dataset, and upload to Hugging Face Hub.
    
    Args:
        df: pandas DataFrame with columns ['grievance', 'department', 'urgency']
        hf_token: HuggingFace Write Access Token
        hf_dataset_dir: HuggingFace Dataset Directory Link (mr-kush/misclassified-department)
        label_column: 'department' or 'urgency'
    
    Returns:
        Cleaned DataFrame with columns ['grievance', 'label']

    """

    #  STEP 1: Preprocess 
    df_clean = clean_and_encode_dataset(df, label_column=label_column)
    hf_dataset = split_dataset(df_clean,
     train_size=train_size,
      val_size=val_size, 
      test_size=test_size) # returns DatasetDict {'train':..., 'test':...}

    #  STEP 2: Prepare version identifier 
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    version_tag = f"v{timestamp}"

    #  STEP 3: Create/ensure repo exists 
    api = HfApi()
    create_repo(
        repo_id=hf_dataset_dir,
        token=hf_token,
        repo_type="dataset",
        private=False,
        exist_ok=True
    )

    #  STEP 4: Commit message with timestamp 
    commit_message = f"Dataset update ({label_column}) - {timestamp}"

    #  STEP 5: Push dataset to HF (creates a new commit) 
    try:
        hf_dataset.push_to_hub(
            hf_dataset_dir,
            token=hf_token,
            commit_message=commit_message
        )
        print(f"[INFO]  Dataset successfully pushed to Hugging Face Hub: {hf_dataset_dir}")
    except Exception as e:
        print(f"[ERROR]  Failed to push dataset: {e}")
        raise e


    #  STEP 6: Create Metadata File 
    metadata = {
        "dataset_name": hf_dataset_dir,
        "version_tag": version_tag,
        "label_column": label_column,
        "created_at": datetime.now(UTC).isoformat(),
        "commit_message": commit_message,
        "num_samples": len(df_clean),
        "splits": {k: len(v) for k, v in hf_dataset.items()},
        "author": "mr-kush",
        "description": f"Processed and versioned dataset for {label_column} classification."
    }


    metadata_path = "dataset_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)
    print(f"[INFO]  Metadata file created: {metadata_path}")

    #  STEP 7: Upload Metadata JSON to the Same HF Repo 
    try:
        api.upload_file(
            path_or_fileobj=metadata_path,
            path_in_repo="dataset_metadata.json",
            repo_id=hf_dataset_dir,
            repo_type="dataset",
            token=hf_token,
            commit_message=f"Add metadata for version {version_tag}"
        )
        print(f"[INFO]  Metadata uploaded to HF Hub")
    except Exception as e:
        print(f"[WARN]  Failed to upload metadata: {e}")


    #  STEP 8: Clean Up Local Metadata File 
    if os.path.exists(metadata_path):
        os.remove(metadata_path)

    # Step 9: Upload the Readme.md
    upload_hf_readme(hf_token, metadata)


    #  STEP 10: Tag the commit with timestamp version 
    try:
        api.create_tag(
            repo_id=hf_dataset_dir,
            repo_type="dataset",
            tag=version_tag,
            token=hf_token
        )
        print(f"[INFO]  Version tag created: {version_tag}")
    except Exception as e:
        print(f"[WARN]  Failed to tag version: {e}")

    #  STEP 11: Return DatasetDict for local use 
    return hf_dataset







# Example Usage

# if __name__ == "__main__":
#     # Load dataset
#     df = pd.read_csv('grievances.csv')  # assumes columns ['grievance','department','urgency']
    
#     # Choose label column: 'department' or 'urgency'
#     label_column = 'department'
    
#     hf_dataset = preprocess_pipeline(df,  hf_token='kkk', hf_dataset_dir='kkk',label_column=label_column)
    
#     print(hf_dataset)
