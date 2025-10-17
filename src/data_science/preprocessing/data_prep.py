"""Data preparation for Sambodhan urgency classifier."""
import pandas as pd
import numpy as np
import re
from sklearn.model_selection import train_test_split

LABEL_MAP = {'NORMAL': 0, 'URGENT': 1, 'HIGHLY URGENT': 2}
ID2LABEL = {0: 'NORMAL', 1: 'URGENT', 2: 'HIGHLY URGENT'}

def clean_nepali_text(text):
    """Clean text while preserving Devanagari."""
    if pd.isna(text):
        return ""
    text = str(text)
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'\S+@\S+', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^A-Za-z0-9\u0900-\u097F\s.,!?;:()\"\'-]', '', text)
    return text.strip()

def load_and_prepare_data(csv_path, test_size=0.3, val_size=0.5, random_state=42):
    """Load CSV and create train/val/test splits."""
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows")
    
    df['clean_text'] = df['grievance'].apply(clean_nepali_text)
    df = df[df['clean_text'].str.len() > 10].reset_index(drop=True)
    df['label'] = df['urgency'].map(LABEL_MAP)
    
    train_df, temp_df = train_test_split(df, test_size=test_size, stratify=df['label'], random_state=random_state)
    val_df, test_df = train_test_split(temp_df, test_size=val_size, stratify=temp_df['label'], random_state=random_state)
    
    print(f"Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    return train_df, val_df, test_df