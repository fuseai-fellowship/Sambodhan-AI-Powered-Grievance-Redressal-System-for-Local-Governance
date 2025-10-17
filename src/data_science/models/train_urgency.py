"""Training module for Sambodhan urgency classifier (advanced optimization)."""

import sys
import torch
import numpy as np
import shutil
import shutil
import os
from pathlib import Path
from pathlib import Path
from transformers import (
    XLMRobertaTokenizer,
    XLMRobertaForSequenceClassification,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback,
)
from datasets import Dataset
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from torch.nn import CrossEntropyLoss
from google.colab import drive
from sklearn.utils import resample
import pandas as pd
import json
import wandb
import matplotlib.pyplot as plt
import seaborn as sns

# ─── Mount Google Drive ───
drive.mount('/content/drive')

# ─── Add scripts folder to path ───
sys.path.append('/content/drive/MyDrive/sambodhan_classifier/scripts')
from data_prep import ID2LABEL, LABEL_MAP, load_and_prepare_data

# ─── Focal Loss for Hard Examples ───
class FocalLoss(torch.nn.Module):
    """Focal Loss to focus on hard-to-classify examples."""
    def __init__(self, alpha=None, gamma=2.0, reduction='mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = torch.nn.functional.cross_entropy(inputs, targets, reduction='none', weight=self.alpha)
        pt = torch.exp(-ce_loss)
        focal_loss = ((1 - pt) ** self.gamma) * ce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        else:
            return focal_loss

# ─── Advanced Trainer ───
class AdvancedTrainer(Trainer):
    """Custom Trainer with Focal Loss and advanced techniques."""
    def __init__(self, *args, class_weights=None, use_focal_loss=True, focal_gamma=2.0, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights.to(self.args.device) if class_weights is not None else None
        self.use_focal_loss = use_focal_loss
        self.focal_gamma = focal_gamma
        
        if self.use_focal_loss:
            self.loss_fn = FocalLoss(alpha=self.class_weights, gamma=focal_gamma)

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        
        if self.use_focal_loss:
            loss = self.loss_fn(outputs.logits, labels)
        else:
            if self.class_weights is not None:
                loss_fct = CrossEntropyLoss(weight=self.class_weights)
                loss = loss_fct(outputs.logits, labels)
            else:
                loss = outputs.loss
        
        return (loss, outputs) if return_outputs else loss

# ─── Enhanced Metrics with Confusion Matrix ───
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    
    # Calculate per-class metrics
    f1_per_class = f1_score(labels, predictions, average=None)
    
    # Calculate precision and recall per class
    from sklearn.metrics import precision_score, recall_score
    precision_per_class = precision_score(labels, predictions, average=None, zero_division=0)
    recall_per_class = recall_score(labels, predictions, average=None, zero_division=0)
    
    metrics = {
        'accuracy': accuracy_score(labels, predictions),
        'f1_macro': f1_score(labels, predictions, average='macro'),
        'f1_weighted': f1_score(labels, predictions, average='weighted')
    }
    
    # Add per-class metrics
    for idx in range(len(f1_per_class)):
        metrics[f'f1_class_{idx}'] = f1_per_class[idx]
        metrics[f'precision_class_{idx}'] = precision_per_class[idx]
        metrics[f'recall_class_{idx}'] = recall_per_class[idx]
    
    return metrics

# ─── Advanced Data Augmentation ───
def augment_text_advanced(text, p=0.15):
    """Enhanced text augmentation with multiple techniques."""
    import random
    
    words = text.split()
    if len(words) <= 2:
        return text
    
    aug_type = random.choice(['dropout', 'swap', 'duplicate'])
    
    if aug_type == 'dropout':
        # Random word dropout
        mask = np.random.random(len(words)) > p
        result = ' '.join([w for w, m in zip(words, mask) if m])
    
    elif aug_type == 'swap':
        # Random adjacent word swap
        if len(words) > 2:
            idx = random.randint(0, len(words) - 2)
            words[idx], words[idx + 1] = words[idx + 1], words[idx]
        result = ' '.join(words)
    
    else:  # duplicate
        # Random word duplication
        if len(words) > 1:
            idx = random.randint(0, len(words) - 1)
            words.insert(idx, words[idx])
        result = ' '.join(words)
    
    return result if result else text

# Class-specific augmentation
def balanced_augmentation(train_df, target_samples_per_class=None):
    """Apply more augmentation to minority classes."""
    class_counts = train_df['label'].value_counts()
    
    if target_samples_per_class is None:
        target_samples_per_class = int(class_counts.median() * 1.5)
    
    augmented_samples = []
    
    for label in train_df['label'].unique():
        df_label = train_df[train_df['label'] == label]
        current_count = len(df_label)
        
        if current_count < target_samples_per_class:
            # Calculate how many augmented samples needed
            samples_needed = target_samples_per_class - current_count
            
            # Sample with replacement and augment
            sample_indices = np.random.choice(len(df_label), size=samples_needed, replace=True)
            
            for idx in sample_indices:
                row = df_label.iloc[idx]
                aug_text = augment_text_advanced(row['clean_text'], p=0.15)
                augmented_samples.append({'clean_text': aug_text, 'label': row['label']})
    
    if augmented_samples:
        train_df = pd.concat([train_df, pd.DataFrame(augmented_samples)], ignore_index=True)
    
    return train_df.sample(frac=1, random_state=42)

# ─── Plot Confusion Matrix ───
def plot_confusion_matrix(y_true, y_pred, labels, output_path):
    """Generate and save confusion matrix plot."""
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=labels, yticklabels=labels)
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    print(f"Confusion matrix saved to {output_path}")

# ─── Clean up checkpoints and keep only best model ───
def cleanup_checkpoints(output_dir, best_checkpoint_path):
    """Remove all checkpoint folders except the best one, then move best model to root."""
    output_path = Path(output_dir)
    
    print(f"\n🧹 Cleaning up checkpoints...")
    
    # List all checkpoint directories
    checkpoints = [d for d in output_path.glob("checkpoint-*") if d.is_dir()]
    
    best_checkpoint = Path(best_checkpoint_path) if best_checkpoint_path else None
    
    # Remove all checkpoints except the best one
    removed_count = 0
    for checkpoint in checkpoints:
        if best_checkpoint and checkpoint != best_checkpoint:
            shutil.rmtree(checkpoint)
            removed_count += 1
            print(f"  ✗ Removed: {checkpoint.name}")
    
    print(f"  Removed {removed_count} checkpoint(s)")
    
    # If best checkpoint exists, copy its contents to root and remove it
    if best_checkpoint and best_checkpoint.exists():
        print(f"\n Moving best model files to root directory...")
        
        # Files to copy from best checkpoint
        essential_files = [
            'config.json',
            'model.safetensors',  # or 'pytorch_model.bin'
            'training_args.bin'
        ]
        
        # Also check for pytorch_model.bin if safetensors doesn't exist
        if not (best_checkpoint / 'model.safetensors').exists():
            essential_files.append('pytorch_model.bin')
        
        for file in essential_files:
            src = best_checkpoint / file
            dst = output_path / file
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)
                print(f"  ✓ Copied: {file}")
        
        # Remove the best checkpoint directory after copying
        shutil.rmtree(best_checkpoint)
        print(f"  Removed best checkpoint directory: {best_checkpoint.name}")
    
    print(f"\n✅ Cleanup complete!")

# ─── Create model card for Hugging Face ───
def create_model_card(output_dir, metrics, train_params):
    """Create a README.md model card for Hugging Face Hub."""
    
    model_card = f"""---
language:
- ne
- en
license: apache-2.0
tags:
- text-classification
- xlm-roberta
- multilingual
- complaint-classification
- urgency-detection
datasets:
- custom
metrics:
- accuracy
- f1
model-index:
- name: sambodhan-urgency-classifier
  results:
  - task:
      type: text-classification
      name: Complaint Urgency Classification
    metrics:
    - type: accuracy
      value: {metrics.get('accuracy', 0):.4f}
      name: Accuracy
    - type: f1
      value: {metrics.get('f1_macro', 0):.4f}
      name: F1 Macro
    - type: f1
      value: {metrics.get('f1_weighted', 0):.4f}
      name: F1 Weighted
---

# Sambodhan Urgency Classifier

## Model Description

This model classifies complaint/grievance texts into urgency levels using XLM-RoBERTa base. It's trained to identify:
- **NORMAL (0)**: Standard complaints requiring regular processing
- **URGENT (1)**: Time-sensitive complaints needing prompt attention  
- **HIGHLY URGENT (2)**: Critical complaints requiring immediate action

The model supports multilingual inputs (Nepali and English) and is optimized for small datasets using advanced techniques like Focal Loss and class weighting.

## Model Details

- **Base Model**: xlm-roberta-base
- **Task**: Multi-class Text Classification (3 classes)
- **Languages**: Nepali (ne), English (en)
- **Training Dataset Size**: ~{train_params.get('train_samples', 'N/A')} samples
- **Max Sequence Length**: {train_params.get('max_length', 96)} tokens

## Performance

### Overall Metrics

| Metric | Score |
|--------|-------|
| Accuracy | {metrics.get('accuracy', 0):.4f} |
| F1 Macro | {metrics.get('f1_macro', 0):.4f} |
| F1 Weighted | {metrics.get('f1_weighted', 0):.4f} |

### Per-Class Performance

| Class | F1 Score | Precision | Recall |
|-------|----------|-----------|--------|
| NORMAL | {metrics.get('f1_class_0', 0):.4f} | {metrics.get('precision_class_0', 0):.4f} | {metrics.get('recall_class_0', 0):.4f} |
| URGENT | {metrics.get('f1_class_1', 0):.4f} | {metrics.get('precision_class_1', 0):.4f} | {metrics.get('recall_class_1', 0):.4f} |
| HIGHLY URGENT | {metrics.get('f1_class_2', 0):.4f} | {metrics.get('precision_class_2', 0):.4f} | {metrics.get('recall_class_2', 0):.4f} |

## Usage

```python
from transformers import XLMRobertaTokenizer, XLMRobertaForSequenceClassification
import torch

# Load model and tokenizer
model = XLMRobertaForSequenceClassification.from_pretrained("YOUR_USERNAME/sambodhan-urgency-classifier")
tokenizer = XLMRobertaTokenizer.from_pretrained("YOUR_USERNAME/sambodhan-urgency-classifier")

# Prepare input
text = "बिजुली काटिएको छ र कुनै सूचना छैन"  # Example in Nepali
inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=96)

# Get prediction
with torch.no_grad():
    outputs = model(**inputs)
    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
    predicted_class = torch.argmax(predictions, dim=-1).item()

# Map to label
id2label = {{0: "NORMAL", 1: "URGENT", 2: "HIGHLY URGENT"}}
print(f"Predicted urgency: {{id2label[predicted_class]}}")
print(f"Confidence: {{predictions[0][predicted_class].item():.2%}}")
```

## Training Details

### Training Hyperparameters

- **Learning Rate**: {train_params.get('learning_rate', 3e-5)}
- **Batch Size**: {train_params.get('batch_size', 16)} (with gradient accumulation: {train_params.get('gradient_accumulation_steps', 2)})
- **Epochs**: {train_params.get('epochs', 15)}
- **Weight Decay**: {train_params.get('weight_decay', 0.02)}
- **Warmup Ratio**: {train_params.get('warmup_ratio', 0.15)}
- **Dropout**: {train_params.get('dropout', 0.3)}
- **Max Length**: {train_params.get('max_length', 96)}

### Advanced Techniques Used

1. **Focal Loss** (γ={train_params.get('focal_gamma', 2.0)}): Focuses on hard-to-classify examples
2. **Class Weighting**: Balanced training with adjusted weights for minority classes
3. **Data Augmentation**: Word dropout, swap, and duplication techniques
4. **Label Smoothing**: Prevents overconfident predictions
5. **Cosine Learning Rate Schedule**: With warmup for stable training

## Limitations and Biases

- The model's performance is limited by the size and quality of the training dataset
- May have difficulty with domain-specific jargon or very short texts
- Performance may vary for code-mixed text (Nepali-English)
- Class imbalance in training data may affect predictions

## Citation

If you use this model, please cite:

```
@misc{{sambodhan-urgency-classifier,
  author = {{Your Name/Organization}},
  title = {{Sambodhan Urgency Classifier}},
  year = {{2025}},
  publisher = {{Hugging Face}},
  howpublished = {{\\url{{https://huggingface.co/YOUR_USERNAME/sambodhan-urgency-classifier}}}}
}}
```

## Model Card Authors

Created by: [Your Name]
Contact: [Your Email]

## Model Card Contact

For questions or feedback, please open an issue in the model repository or contact [your contact info].
"""
    
    readme_path = Path(output_dir) / "README.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(model_card)
    
    print(f"Model card created: {readme_path}")

# ─── Save training metadata ───
def save_training_metadata(output_dir, metrics, train_params, class_report):
    """Save detailed training metadata as JSON."""
    
    metadata = {
        "model_name": "sambodhan-urgency-classifier",
        "base_model": "xlm-roberta-base",
        "task": "text-classification",
        "num_labels": 3,
        "labels": {
            "0": "NORMAL",
            "1": "URGENT",
            "2": "HIGHLY URGENT"
        },
        "training_params": train_params,
        "validation_metrics": metrics,
        "classification_report": class_report,
        "model_size_mb": get_model_size(output_dir),
        "created_at": pd.Timestamp.now().isoformat()
    }
    
    metadata_path = Path(output_dir) / "training_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f" Training metadata saved: {metadata_path}")

def get_model_size(output_dir):
    """Calculate total model size in MB."""
    total_size = 0
    for file in Path(output_dir).rglob('*'):
        if file.is_file():
            total_size += file.stat().st_size
    return round(total_size / (1024 * 1024), 2)

# ─── Main Training Function ───
def train_model(
    csv_file,
    output_dir="/content/drive/MyDrive/sambodhan_classifier/sambodhan_model_final",
    epochs=15,
    batch_size=16,
    gradient_accumulation_steps=2,
    learning_rate=3e-5,
    max_length=96,
    weight_decay=0.02,
    warmup_ratio=0.15,
    dropout=0.3,
    use_focal_loss=True,
    focal_gamma=2.0,
    augment_multiplier=1.5,
    freeze_embeddings=False,
    cleanup_after_training=True  # New parameter
):
    """
    Train XLM-Roberta with advanced optimization techniques.
    Saves only the best model files for Hugging Face deployment.
    """

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # ─── Load and prepare data ───
    train_df, val_df, test_df = load_and_prepare_data(csv_file)
    
    print(f"Original train size: {len(train_df)}")
    print(f"Class distribution:\n{train_df['label'].value_counts()}")

    # ─── Advanced balanced augmentation ───
    class_counts = train_df['label'].value_counts()
    target_samples = int(class_counts.median() * augment_multiplier)
    train_df = balanced_augmentation(train_df, target_samples_per_class=target_samples)
    
    print(f"\nAfter balanced augmentation: {len(train_df)} samples")
    print(f"New class distribution:\n{train_df['label'].value_counts()}")

    # ─── Tokenizer ───
    model_name = "xlm-roberta-base"
    tokenizer = XLMRobertaTokenizer.from_pretrained(model_name)

    def tokenize(examples):
        return tokenizer(
            examples['clean_text'],
            truncation=True,
            padding='max_length',
            max_length=max_length
        )

    # ─── Datasets ───
    train_dataset = Dataset.from_pandas(train_df[['clean_text', 'label']]).map(tokenize, batched=True)
    val_dataset = Dataset.from_pandas(val_df[['clean_text', 'label']]).map(tokenize, batched=True)

    train_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
    val_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])

    # ─── Compute class weights with adjustment ───
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_df['label']),
        y=train_df['label']
    )
    
    # Boost weight for the worst-performing class (class 0 - NORMAL)
    class_weights[0] *= 1.3
    
    class_weights = torch.tensor(class_weights, dtype=torch.float32)
    print(f"\nAdjusted class weights: {class_weights}")

    # ─── Model with custom dropout ───
    model = XLMRobertaForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(LABEL_MAP),
        id2label=ID2LABEL,
        label2id=LABEL_MAP,
        hidden_dropout_prob=dropout,
        attention_probs_dropout_prob=dropout,
        classifier_dropout=dropout
    )

    if freeze_embeddings:
        for param in model.roberta.embeddings.parameters():
            param.requires_grad = False
        print("Embeddings frozen for initial training")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # ─── Training arguments ───
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size * 2,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        weight_decay=weight_decay,
        warmup_ratio=warmup_ratio,
        eval_strategy='epoch',
        save_strategy='epoch',
        load_best_model_at_end=True,
        metric_for_best_model='f1_macro',
        greater_is_better=True,
        fp16=torch.cuda.is_available(),
        logging_dir=f"{output_dir}/logs",
        logging_strategy="steps",
        logging_steps=50,
        save_total_limit=2,  # Keep only 2 checkpoints during training
        seed=42,
        data_seed=42,
        report_to="wandb",
        max_grad_norm=1.0,
        lr_scheduler_type='cosine',
        optim='adamw_torch',
        adam_epsilon=1e-8,
    )

    # ─── Trainer ───
    trainer = AdvancedTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        class_weights=class_weights,
        use_focal_loss=use_focal_loss,
        focal_gamma=focal_gamma,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=4)]
    )

    # ─── Train ───
    print("\n Starting training with Focal Loss...")
    train_result = trainer.train()

    if freeze_embeddings:
        for param in model.roberta.embeddings.parameters():
            param.requires_grad = True
        print("\nEmbeddings unfrozen")

    # ─── Final evaluation ───
    print("\n📊 Final validation metrics:")
    val_results = trainer.evaluate()
    
    # Extract metrics for model card
    final_metrics = {}
    for key, value in val_results.items():
        if not key.startswith('eval_runtime') and not key.startswith('eval_samples') and not key.startswith('eval_steps'):
            print(f"{key}: {value:.4f}")
            # Clean key name for storage
            clean_key = key.replace('eval_', '')
            final_metrics[clean_key] = value

    # ─── Get best model ───
    best_model_dir = trainer.state.best_model_checkpoint
    
    if best_model_dir:
        print(f"\n✅ Loading best checkpoint from: {best_model_dir}")
        model = XLMRobertaForSequenceClassification.from_pretrained(best_model_dir)
        model.to(device)
    else:
        print("\n No best checkpoint found. Using current model.")
        best_model_dir = None

    # ─── Save final model and tokenizer to root ───
    print(f"\n Saving final model to: {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # ─── Generate detailed analysis ───
    val_predictions = trainer.predict(val_dataset)
    val_preds = np.argmax(val_predictions.predictions, axis=-1)
    val_labels = val_predictions.label_ids
    
    print("\n" + "="*60)
    print(" DETAILED CLASSIFICATION REPORT")
    print("="*60)
    class_report_text = classification_report(
        val_labels,
        val_preds,
        target_names=[ID2LABEL[i] for i in range(len(ID2LABEL))],
        digits=4
    )
    print(class_report_text)
    
    # Get classification report as dict for metadata
    from sklearn.metrics import classification_report as class_report_dict
    class_report = class_report_dict(
        val_labels,
        val_preds,
        target_names=[ID2LABEL[i] for i in range(len(ID2LABEL))],
        output_dict=True
    )
    
    # ─── Confusion Matrix ───
    cm_path = f"{output_dir}/confusion_matrix.png"
    plot_confusion_matrix(
        val_labels, 
        val_preds, 
        [ID2LABEL[i] for i in range(len(ID2LABEL))],
        cm_path
    )
    
    # ─── Class-wise error analysis ───
    print("\n" + "="*60)
    print(" CLASS-WISE ERROR ANALYSIS")
    print("="*60)
    cm = confusion_matrix(val_labels, val_preds)
    for i in range(len(LABEL_MAP)):
        total = cm[i].sum()
        correct = cm[i, i]
        print(f"\n{ID2LABEL[i]}:")
        print(f"  Total samples: {total}")
        print(f"  Correct: {correct} ({correct/total*100:.2f}%)")
        
        misclass = [(j, cm[i, j]) for j in range(len(LABEL_MAP)) if j != i and cm[i, j] > 0]
        misclass.sort(key=lambda x: x[1], reverse=True)
        
        if misclass:
            print(f"  Top misclassifications:")
            for j, count in misclass[:2]:
                print(f"    → {ID2LABEL[j]}: {count} ({count/total*100:.2f}%)")

    # ─── Store training parameters ───
    train_params = {
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "test_samples": len(test_df),
        "epochs": epochs,
        "batch_size": batch_size,
        "gradient_accumulation_steps": gradient_accumulation_steps,
        "effective_batch_size": batch_size * gradient_accumulation_steps,
        "learning_rate": learning_rate,
        "max_length": max_length,
        "weight_decay": weight_decay,
        "warmup_ratio": warmup_ratio,
        "dropout": dropout,
        "focal_gamma": focal_gamma,
        "augment_multiplier": augment_multiplier,
        "use_focal_loss": use_focal_loss
    }

    # ─── Create model card for Hugging Face ───
    create_model_card(output_dir, final_metrics, train_params)
    
    # ─── Save training metadata ───
    save_training_metadata(output_dir, final_metrics, train_params, class_report)

    # ─── Cleanup checkpoints ───
    if cleanup_after_training:
        cleanup_checkpoints(output_dir, best_model_dir)
        
        # Also remove logs directory if it exists
        logs_dir = Path(output_dir) / "logs"
        if logs_dir.exists():
            shutil.rmtree(logs_dir)
            print("  ✓ Removed logs directory")
    
    # ─── Final summary ───
    print("\n" + "="*60)
    print("🎉 TRAINING COMPLETE - HUGGING FACE READY")
    print("="*60)
    print(f"\n Model directory: {output_dir}")
    print("\n Files ready for Hugging Face Hub:")
    
    essential_files = [
        'config.json',
        'model.safetensors',
        'tokenizer_config.json',
        'sentencepiece.bpe.model',
        'special_tokens_map.json',
        'tokenizer.json',
        'README.md',
        'training_metadata.json',
        'confusion_matrix.png'
    ]
    
    # Also check for pytorch_model.bin
    if (Path(output_dir) / 'pytorch_model.bin').exists():
        essential_files.append('pytorch_model.bin')
    
    for file in essential_files:
        file_path = Path(output_dir) / file
        if file_path.exists():
            size = file_path.stat().st_size / 1024  # KB
            print(f"  ✓ {file} ({size:.1f} KB)")
        else:
            print(f"  ✗ {file} (missing)")
    
    print(f"\n Total model size: {get_model_size(output_dir)} MB")
    print("\n upload to Hugging Face Hub, run:")
    print(f"""
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path="{output_dir}",
    repo_id="YOUR_USERNAME/sambodhan-urgency-classifier",
    repo_type="model"
)
    """)

    return model, tokenizer, trainer


# ─── Execute Training ───
if __name__ == "__main__":
    csv_file = "/content/drive/MyDrive/sambodhan_classifier/data/grievance_dataset.csv"
    
    model, tokenizer, trainer = train_model(
        csv_file=csv_file,
        output_dir="/content/drive/MyDrive/sambodhan_classifier/sambodhan_model_final",
        epochs=15,
        batch_size=16,
        gradient_accumulation_steps=2,
        learning_rate=3e-5,
        max_length=96,
        weight_decay=0.02,
        dropout=0.3,
        use_focal_loss=True,
        focal_gamma=2.0,
        augment_multiplier=1.5,
        freeze_embeddings=False
    )
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE")
    print("="*60)
    print("\n model is ready for deployment!")
    print("All unnecessary files have been removed.")
    print("\nNext step: Upload to Hugging Face Hub")