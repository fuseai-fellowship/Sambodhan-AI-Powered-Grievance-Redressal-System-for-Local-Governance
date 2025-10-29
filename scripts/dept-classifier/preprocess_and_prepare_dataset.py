
import re
import pandas as pd
from datasets import Dataset, DatasetDict
from sklearn.model_selection import train_test_split


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




# Main Function

def preprocess_pipeline(
    df: pd.DataFrame, 
    label_column: str = 'department',
    train_size: float = 0.8, 
    val_size: float = 0.1, 
    test_size: float = 0.1
) -> DatasetDict:
    """
    Run the full cleaning, encoding, and splitting pipeline.
    """
    df_clean = clean_and_encode_dataset(df, label_column=label_column)
    hf_dataset = split_dataset(df_clean, train_size=train_size, val_size=val_size, test_size=test_size)
    return hf_dataset



# Example Usage

if __name__ == "__main__":
    # Load dataset
    df = pd.read_csv('grievances.csv')  # assumes columns ['grievance','department','urgency']
    
    # Choose label column: 'department' or 'urgency'
    label_column = 'department'
    
    hf_dataset = preprocess_pipeline(df, label_column=label_column)
    
    print(hf_dataset)
