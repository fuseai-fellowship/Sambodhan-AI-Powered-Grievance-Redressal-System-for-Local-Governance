

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import (
    AutoTokenizer, DataCollatorWithPadding,
    AutoModelForSequenceClassification, TrainingArguments,
    Trainer, EarlyStoppingCallback
)
from sklearn.metrics import (
    accuracy_score, f1_score,
    precision_score, recall_score,
    classification_report, confusion_matrix
)
from huggingface_hub import login
import seaborn as sns
import matplotlib.pyplot as plt

class FocalLossMultiClass(nn.Module):
    """Implementation of Focal Loss for multi-class classification."""

    def __init__(self, gamma: float = 2.0, alpha: float = 0.25, reduction: str = 'mean'):
        """
        Args:
            gamma (float): Focusing parameter. Default=2.0
            alpha (float): Weighting factor for class imbalance. Default=0.25
            reduction (str): 'mean', 'sum', or 'none'. Default='mean'
        """
        super().__init__()
        self.gamma = gamma
        self.alpha = alpha
        self.reduction = reduction

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce_loss = F.cross_entropy(logits, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        return focal_loss


class FocalLossTrainer(Trainer):
    """Custom Hugging Face Trainer using Focal Loss."""

    def __init__(self, class_weights: torch.Tensor = None, *args, **kwargs):
        """
        Args:
            class_weights (torch.Tensor, optional): Tensor for weighting classes in loss.
        """
        super().__init__(*args, **kwargs)
        # self.class_weights = class_weights.to(self.model.device)  # optional

    def compute_loss(self, model: nn.Module, inputs: dict, return_outputs: bool = False, **kwargs) -> torch.Tensor:
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        loss_fct = FocalLossMultiClass()
        loss = loss_fct(logits, labels)
        return (loss, outputs) if return_outputs else loss


class GrievanceClassifier:
    """Grievance classification model wrapper with training, evaluation, and HF Hub integration."""

    def __init__(
        self,
        model_checkpoint: str,
        num_labels: int,
        id2label: dict,
        label2id: dict, 
        hf_token: str


    ):
        """
        Args:
            hf_token(str): HF-token for Login on HF Hub
            model_checkpoint (str): HF model checkpoint, e.g., 'xlm-roberta-base'
            num_labels (int): Number of classes for classification
            id2label (dict): Mapping from label IDs to string labels
            label2id (dict): Mapping from string labels to label IDs
        """
        self.model_checkpoint = model_checkpoint
        self.num_labels = num_labels
        self.id2label = id2label
        self.label2id = label2id

        # Login
        login(hf_token)

        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_checkpoint, use_fast=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_checkpoint,
            num_labels=num_labels,
            id2label=id2label,
            label2id=label2id
        )

    def tokenize_dataset(self, dataset, text_column: str = "grievance", remove_columns: bool = True, batched: bool = True):
        """
        Tokenize a HF Dataset or DatasetDict using the class tokenizer.

        Args:
            dataset: HF Dataset or DatasetDict to tokenize
            text_column (str): Name of the column containing the text. Default="grievance"
            remove_columns (bool): Whether to remove the original text column after tokenization. Default=True
            batched (bool): Whether to batch examples during tokenization. Default=True

        Returns:
            tokenized_dataset: Tokenized HF Dataset or DatasetDict
        """
        # function to tokenize a batch of examples
        def tokenize_function(examples):
            return self.tokenizer(examples[text_column], truncation=True)

        tokenized_dataset = dataset.map(tokenize_function, batched=batched)

        if remove_columns and text_column in tokenized_dataset.column_names:
            tokenized_dataset = tokenized_dataset.remove_columns([text_column])
        
        return tokenized_dataset

    @staticmethod
    def compute_metrics(eval_pred: tuple) -> dict:
        """
        Compute classification metrics.

        Args:
            eval_pred (tuple): (logits, labels) from trainer.predict

        Returns:
            dict: Accuracy, F1 (macro & weighted), precision, recall
        """
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_score(labels, predictions),
            "f1_macro": f1_score(labels, predictions, average="macro", zero_division=0),
            "f1_weighted": f1_score(labels, predictions, average="weighted", zero_division=0),
            "precision_macro": precision_score(labels, predictions, average="macro", zero_division=0),
            "recall_macro": recall_score(labels, predictions, average="macro", zero_division=0),
            "precision_weighted": precision_score(labels, predictions, average="weighted", zero_division=0),
            "recall_weighted": recall_score(labels, predictions, average="weighted", zero_division=0)
        }

    def train(
        self,
        train_dataset,
        eval_dataset,
        output_dir: str | None = None,
        hf_training_args: dict | None = None,
        early_stopping_patience: int = 2,
        early_stopping_threshold: float=0.001
    ):
        """
        Train the model using HF Trainer with Focal Loss.

        Args:
            train_dataset: HF Dataset or DatasetDict for training
            eval_dataset: HF Dataset or DatasetDict for validation
            output_dir (str, optional): Directory to save checkpoints
            hf_training_args (dict, optional): Dictionary of HuggingFace TrainingArguments to override defaults
            early_stopping_patience (int): Patience for early stopping
        """
        # Early stopping callback
        early_stopping_callback = EarlyStoppingCallback(
            early_stopping_patience=early_stopping_patience,
            early_stopping_threshold=0.001
        )

        # Tokenize datasets
        train_dataset = self.tokenize_dataset(train_dataset)
        eval_dataset = self.tokenize_dataset(eval_dataset)

        # Default training arguments with no logging and no step-wise saving
        default_args = {
            "num_train_epochs": 3,
            "per_device_train_batch_size": 16,
            "per_device_eval_batch_size": 32,
            "learning_rate": 2e-5,
            "weight_decay": 0.01,
            "eval_strategy": "steps",
            "eval_steps": 50,
            "logging_steps": 50,
            "load_best_model_at_end": True,
            "metric_for_best_model": "f1_macro",
            "greater_is_better": True,
            "fp16": True,
            "push_to_hub": False,
            "hub_model_id": None,
            "report_to": "none",
            "logging_dir": "./logs",
            "gradient_accumulation_steps": 1
        }
        # Merge user-provided overrides
        if hf_training_args:
            default_args.update(hf_training_args)

        # Initialize TrainingArguments
        training_args = TrainingArguments(**default_args)

        # Initialize trainer
        self.trainer = FocalLossTrainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            compute_metrics=self.compute_metrics,
            callbacks=[early_stopping_callback],
            data_collator=DataCollatorWithPadding(tokenizer=self.tokenizer),
            processing_class=self.tokenizer
        )

        # Start training
        self.trainer.train()




    def evaluate(self, test_dataset):
        """
        Evaluate model on test dataset, print classification report,
        and visualize the confusion matrix.

        Args:
            test_dataset: HF Dataset for testing

        Returns:
            predictions: TrainerPrediction object containing logits and labels
        """

        test_dataset = self.tokenize_dataset(test_dataset)
        # get predictions from trainer
        predictions = self.trainer.predict(test_dataset)
        y_true = predictions.label_ids
        y_pred = np.argmax(predictions.predictions, axis=-1)

        # print classification metrics
        print("\nClassification Report:\n")
        print(classification_report(y_true, y_pred, target_names=self.id2label.values()))

        # compute confusion matrix
        cm = confusion_matrix(y_true, y_pred)

        # plot confusion matrix
        plt.figure(figsize=(8, 8))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=self.id2label.values(),
            yticklabels=self.id2label.values()
        )
        plt.xlabel('Predicted Labels')
        plt.ylabel('True Labels')
        plt.title('Confusion Matrix')
        plt.show()

        return predictions, cm




    def push_model_to_hub(self, 
    hub_model_id: str | None = None,
    use_trainer: bool = False, 
    commit_message: str = "Push model and tokenizer to Hugging Face Hub" 
     ):
        """
        Push model (and optionally trainer and tokenizer) to Hugging Face Hub.

        Args:
            hub_model_id (str): Repository ID on HF Hub.
            use_trainer (bool): If True, use trainer.push_to_hub(). 
                                Otherwise, push model and tokenizer manually.
            commit_message: str = Custom commit message for the Hub push.         
        """


        if hub_model_id is None:
            raise ValueError("You must provide a hub_model_id.")

        if use_trainer:
            if hasattr(self, 'trainer') and self.trainer is not None:
                self.trainer.push_to_hub(commit_message=commit_message)
                print(f"Trainer (with model + tokenizer) pushed to {hub_model_id}")
            else:
                raise AttributeError("Trainer not found in this class. Set self.trainer before using use_trainer=True.")
        else:
            self.model.push_to_hub(hub_model_id)
            self.tokenizer.push_to_hub(hub_model_id)
            print(f"Model and tokenizer successfully pushed to {hub_model_id}")

