#model_piepline.py

import os
import json
from datetime import datetime, UTC, timezone, timedelta
from huggingface_hub import HfApi
from huggingface_hub.utils import HfHubHTTPError
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import wandb
from wandb import AlertLevel
import matplotlib.pyplot as plt
import seaborn as sns
import requests

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



# function to tokenize a batch of examples
def tokenize_function(examples, tokenizer, text_column: str):
    """Helper function for tokenization (pickle-safe for HF caching)."""
    return tokenizer(examples[text_column], truncation=True)

def sanitize_training_args(training_args):
    """Convert TrainingArguments to JSON-serializable dictionary."""
    if not training_args:
        return {}
    args_dict = training_args.to_dict()
    clean_dict = {}
    for k, v in args_dict.items():
        try:
            json.dumps({k: v})
            clean_dict[k] = v
        except TypeError:
            clean_dict[k] = str(v)  # fallback: convert to string
    return clean_dict





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
        hf_token: str,
        wandb_api_key: str,
        wandb_project_name: str, 
    ):
        """
        Args:
            hf_token(str): HF-token for HF Hub Write Acess
            model_checkpoint (str): HF model checkpoint, e.g., 'xlm-roberta-base'
            num_labels (int): Number of classes for classification
            id2label (dict): Mapping from label IDs to string labels
            label2id (dict): Mapping from string labels to label IDs
            wandb_api_key (str) : WandB Access API key 
            wandb_project_name (str): WandB project name for experiment tracking
        """
        self.model_checkpoint = model_checkpoint
        self.num_labels = num_labels
        self.id2label = id2label
        self.label2id = label2id
        self.hf_token = hf_token
        self.api = HfApi()
        
        # Login wandb
        wandb.login(key=wandb_api_key)
        self.wandb_project_name = wandb_project_name
        


 

        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_checkpoint,
         use_fast=True, 
         token= self.hf_token)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_checkpoint,
            num_labels=num_labels,
            id2label=id2label,
            label2id=label2id, 
            token= self.hf_token
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


        tokenized_dataset = dataset.map(
            lambda examples: tokenize_function(examples, self.tokenizer, text_column),
            batched=batched
        )

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
            wandb_project_name (str): WandB project name for experiment tracking
            output_dir (str, optional): Directory to save checkpoints
            hf_training_args (dict, optional): Dictionary of HuggingFace TrainingArguments to override defaults
            early_stopping_patience (int): Patience for early stopping
        """
        # Early stopping callback
        early_stopping_callback = EarlyStoppingCallback(
            early_stopping_patience=early_stopping_patience,
            early_stopping_threshold=early_stopping_threshold
        )
        


        # Tokenize datasets
        train_dataset = self.tokenize_dataset(train_dataset)
        eval_dataset = self.tokenize_dataset(eval_dataset)

        # Default training arguments with no logging and no step-wise saving
        self.default_args = {
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
            "report_to": ["wandb"],
            "logging_dir": "./logs",
            "gradient_accumulation_steps": 1
        }
        
        
        
        # Merge user-provided overrides
        if hf_training_args:
            self.default_args.update(hf_training_args)
            # initalizing hub id
            self.hub_model_id= self.default_args.get('hub_model_id')

        # Initialize TrainingArguments
        self.training_args = TrainingArguments(**self.default_args)
        
        # sanitize training arg for metadata file:
        self.sanitize_training_args = (sanitize_training_args(getattr(self, 
                                                              "training_args",
                                                              None))
                                if hasattr(self, "training_args")
                                else {}
                                )


        # Initialize trainer
        self.trainer = FocalLossTrainer(
            model=self.model,
            args=self.training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            compute_metrics=self.compute_metrics,
            callbacks=[early_stopping_callback],
            data_collator=DataCollatorWithPadding(tokenizer=self.tokenizer),
            processing_class=self.tokenizer
        )

        # Start training
        self.trainer.train()

    def log_wandb_eval_metrics(
        self,
        y_true,
        y_pred,
        classification_report_dict,
        confusion_matrix_array,
        label_names,
        prefix="final_eval"
    ):
        """Logs classification metrics and confusion matrix to Weights & Biases."""
        try:
            # 1️ Create classification report as W&B Table
            # Prepare rows
            rows = [
                [label,
                round(metrics["precision"], 4),
                round(metrics["recall"], 4),
                round(metrics["f1-score"], 4),
                int(metrics["support"])]
                for label, metrics in classification_report_dict.items()
                if isinstance(metrics, dict) and all(k in metrics for k in ["precision", "recall", "f1-score", "support"])
            ]

            # Create table using columns + data argument
            table = wandb.Table(columns=["Class", "Precision", "Recall", "F1-score", "Support"], data=rows)
            
            # 2️ Plot confusion matrix
            fig, ax = plt.subplots(figsize=(6, 6))
            sns.heatmap(confusion_matrix_array, annot=True, fmt="d", cmap="Blues",
                        xticklabels=label_names, yticklabels=label_names, ax=ax)
            ax.set_xlabel("Predicted Label")
            ax.set_ylabel("True Label")
            ax.set_title("Confusion Matrix")
            plt.tight_layout()
            cm_image = wandb.Image(fig)
            plt.close(fig)

            # 3️ Log both to W&B
            wandb.log({
                f"{prefix}/classification_report_table": table, 
                f"{prefix}/confusion_matrix": cm_image
            }, commit=True)

        except Exception as e:
            print(f"[W&B Logging Error] {type(e).__name__}: {e}", flush=True)


    def _query_deployed_model(self, 
                              texts: list[str],
                              api_endpoint: str,
                              timeout: int = 8) -> list[int]:
        """
        Query a deployed model API and return predicted label IDs.

        Args:
            texts (list[str]): List of raw text inputs.
            api_endpoint (str): POST /predict endpoint URL.
            timeout (int): Request timeout in seconds.

        Returns:
            List[int]: Predicted label IDs (-1 if prediction failed or unknown).
        """

        pred_ids = []
        for txt in texts:
            try:
                resp = requests.post(api_endpoint, json={"text": txt}, timeout=timeout)
                if resp.status_code == 200:
                    data = resp.json()
                    label_str = data.get("label")
                    # Map string label to ID
                    pred_id = self.label2id.get(label_str, None)
                    if pred_id is None:
                        try:
                            pred_id = int(label_str)
                        except Exception:
                            pred_id = -1
                    pred_ids.append(pred_id if pred_id is not None else -1)
                else:
                    pred_ids.append(-1)
            except Exception:
                pred_ids.append(-1)

        return pred_ids


    def evaluate(
        self,
        test_dataset,
        api_endpoint: str | None = None,
        threshold: float = 0.00,
        deployed_sample_size: int = 300
    ):
        """
        Pure evaluation function: tokenizes test data, predicts labels, computes metrics,
        optionally compares against deployed model, and returns outcomes.

        Args:
            test_dataset: Hugging Face Dataset for testing.
            api_endpoint (str, optional): Deployed model /predict API endpoint.
            threshold (float): Minimum F1 macro improvement over deployed model for decision.
            deployed_sample_size (int): Number of samples to query deployed model for F1 comparison.

        Returns:
            dict: {
                "predictions": np.ndarray,
                "y_true": np.ndarray,
                "confusion_matrix": np.ndarray,
                "classification_report": dict,
                "f1_macro": float,
                "deployed_f1_macro": float | None,
                "decision": "accepted" | "rejected"
            }
        """

        # 1️ Tokenize test dataset
        test_dataset_tokenized = self.tokenize_dataset(test_dataset)

        # 2️ Run model predictions
        predictions = self.trainer.predict(test_dataset_tokenized)
        y_true = predictions.label_ids
        y_pred = np.argmax(predictions.predictions, axis=-1)

        # 3️ Compute classification report and confusion matrix
        classification_report_dict = classification_report(
            y_true,
            y_pred,
            target_names=list(self.id2label.values()),
            output_dict=True
        )
        labels = list(self.id2label.keys())
        cm = confusion_matrix(y_true, y_pred, labels=labels)

        # 4️ Compute current model F1 macro
        current_trained_f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)

        # 5️ Optionally compare with deployed model F1
        deployed_f1_macro = None
        if api_endpoint:
            raw_test = test_dataset.shuffle(seed=42)
            n = min(deployed_sample_size, len(raw_test))
            texts = raw_test["grievance"][:n]
            true_labels = raw_test["label"][:n] if "label" in raw_test.column_names else raw_test["labels"][:n]

            deployed_preds_ids = self._query_deployed_model(texts, api_endpoint)

            # Filter out failed predictions (-1)
            paired_true, paired_pred = [], []
            for t, p in zip(true_labels, deployed_preds_ids):
                if p != -1:
                    paired_true.append(int(t))
                    paired_pred.append(int(p))

            if paired_true:
                deployed_f1_macro = f1_score(paired_true, paired_pred, average="macro", zero_division=0)
            else:
                deployed_f1_macro = 0.0

        # 6️ Decision logic
        deployed_f1_to_compare = deployed_f1_macro if deployed_f1_macro is not None else 0.0
        decision = "accepted" if current_trained_f1_macro > deployed_f1_to_compare + threshold else "rejected"

        # 7️  Return all evaluation outcomes
        return {
            "predictions": y_pred,
            "y_true": y_true,
            "confusion_matrix": cm,
            "classification_report": classification_report_dict,
            "current_trained_f1_macro": current_trained_f1_macro,
            "deployed_f1_macro": deployed_f1_macro,
            "decision": decision
        }

    def push_model_to_hub(
            self,
            hub_model_id: str | None = None,
            use_trainer: bool = False,
            commit_message: str = "Push model and tokenizer to Hugging Face Hub",
        ):
            """
            Push the model and tokenizer (or trainer) to the Hugging Face Hub with proper
            version tagging, metadata logging, and safe cleanup.

            Args:
                hub_model_id (str): Repository ID on Hugging Face Hub.
                use_trainer (bool): Whether to use trainer.push_to_hub().
                commit_message (str): Custom commit message.
            """
            # version tag
            timestamp= datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            self.version_tag = f"v{timestamp}"

            if hub_model_id is None:
                hub_model_id = getattr(self.training_args, "hub_model_id", None)
                if hub_model_id is None:
                    raise ValueError("You must provide a hub_model_id or define it in TrainingArguments.")

            self.commit_message = f"{commit_message} ({self.version_tag})"
            metadata_path = "model_metadata.json"


            try:
                print("Starting model push to Hugging Face Hub...", flush=True)

                # Step 1: Push model and tokenizer (or trainer)
                if use_trainer and hasattr(self, "trainer") and self.trainer is not None:
                    self.trainer.push_to_hub(commit_message=self.commit_message, token=self.hf_token)
                else:
                    self.model.push_to_hub(
                        hub_model_id,
                        commit_message=self.commit_message,
                        token=self.hf_token,
                    )
                    self.tokenizer.push_to_hub(
                        hub_model_id,
                        commit_message=self.commit_message, 
                        token=self.hf_token,
                    )

                # pushing the log files 
                # self.push_latest_tensorboard_log(logs_dir='logs', 
                # hf_model_repo=self.hub_model_id, 
                # hf_token= self.hf_token
                # )
                
                

                # Step 2: Generate model metadata
                metadata = {
                    "model_name": hub_model_id,
                    "self.version_tag": self.version_tag,
                    "commit_message": commit_message,
                    "timestamp_utc": timestamp,
                    "author": "mr-kush",
                    "training_args": self.sanitize_training_args,
                    "eval_metrics": getattr(self, "classification_report", {}),
                }

                with open(metadata_path, "w") as f:
                    json.dump(metadata, f, indent=4)

                # Step 3: Upload metadata to the Hub
                self.api.upload_file(
                    path_or_fileobj=metadata_path,
                    path_in_repo="model_metadata.json",
                    repo_id=hub_model_id,
                    repo_type="model",
                    token=self.hf_token,
                    commit_message= f"Upload model_metadata.json ({self.version_tag})"
                )

                # Step 4: Create version tag
                self.api.create_tag(
                    repo_id=hub_model_id,
                    repo_type="model",
                    tag=self.version_tag,
                    token=self.hf_token,
                )

                print(f"Model successfully pushed and tagged as {self.version_tag} on {hub_model_id}", flush=True)
                
                
                

            except Exception as e:
                print(f"Push failed: {e}", flush=True)

            finally:
                # Step 5: Clean up temporary metadata file
                if os.path.exists(metadata_path):
                    try:
                        os.remove(metadata_path)
                        print("Temporary file model_metadata.json removed successfully.", flush=True)
                    except Exception as cleanup_error:
                        print(f"Warning: Could not delete model_metadata.json ({cleanup_error})", flush=True)

    def train_pipeline(
        self,
        train_dataset,
        eval_dataset,
        test_dataset,
        dataset_metadata: dict, 
        space_repo_id: str | None = None,
        hf_training_args: dict | None = None,
        api_endpoint: str | None = None,
        early_stopping_patience: int = 2,
        early_stopping_threshold: float = 0.001,
        deployed_sample_size: int = 300,
        decision_threshold: float = 0.001
    ):
        """
        Complete training, evaluation, decision-making, and optional auto-deployment pipeline.

        Args:
            train_dataset: Hugging Face Dataset for training.
            eval_dataset: Hugging Face Dataset for validation.
            test_dataset: Hugging Face Dataset for testing.
            dataset_metadata: Metadata about Data for Logging 
            hf_training_args (dict, optional): Hugging Face TrainingArguments overrides.
            api_endpoint (str, optional): Endpoint of deployed model to compare F1.
            space_repo_id (str): HF Space Repo Id. 
            early_stopping_patience (int): Patience for early stopping callback.
            early_stopping_threshold (float): Threshold for early stopping.
            deployed_sample_size (int): Sample size to query deployed model for comparison.
            decision_threshold (float): Minimum F1 improvement for auto-deploy.
        Returns:
            dict: Contains evaluation metrics, decision, and deployed F1 (if applicable).
        """
        self.space_repo_id= space_repo_id
        self.dataset_metadata = dataset_metadata
        
        # 1. Initialize W&B run
        wandb.init(
            project=self.wandb_project_name,
            name=f"train_pipeline_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}",
            config={
                "model_checkpoint": self.model_checkpoint,
                "num_labels": self.num_labels,
                "dataset_metadata": self.dataset_metadata
            }
        )

        # 2. Train the model
        self.train(
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            hf_training_args=hf_training_args,
            early_stopping_patience=early_stopping_patience,
            early_stopping_threshold=early_stopping_threshold
        )
        
        #  Log sanitized training args to W&B config
        wandb.config.update(self.sanitize_training_args)

        # 3. Evaluate model on test dataset (no logging inside evaluate)
        eval_results = self.evaluate(
            test_dataset=test_dataset,
            api_endpoint=api_endpoint,
            threshold=decision_threshold,
            deployed_sample_size=deployed_sample_size
        )
        


        # 4. Extract outputs
        y_true = eval_results["y_true"]
        y_pred = eval_results["predictions"]
        cm = eval_results["confusion_matrix"]
        classification_report = eval_results["classification_report"]
        current_trained_f1_macro = eval_results["current_trained_f1_macro"]
        deployed_f1_macro = eval_results.get("deployed_f1_macro", None)
        decision = eval_results["decision"]

        # 5. Log evaluation metrics to W&B
        self.log_wandb_eval_metrics(
            y_true=y_true,
            y_pred=y_pred,
            classification_report_dict=classification_report,
            confusion_matrix_array=cm,
            label_names=list(self.id2label.values()),
            prefix="train_pipeline_eval"
        )

        # 6. Decision logic for auto-deployment
        deployed_f1_to_compare = deployed_f1_macro if deployed_f1_macro is not None else 0.0
        decision = "accepted" if current_trained_f1_macro > deployed_f1_to_compare + decision_threshold else "rejected"

        # 7. Log decision and F1 metrics to W&B
        wandb.log({
            "current_trained_model_f1_macro": current_trained_f1_macro,
            "deployed_model_f1_macro": deployed_f1_to_compare,
            "decision": decision,
            "timestamp": datetime.now(UTC).isoformat()
        })

        # 8. Tag run and summarize
        wandb.run.tags = ["train_pipeline", decision]
        wandb.run.summary["accepted"] = (decision == "accepted")


        # 9. Auto-deploy if decision accepted
        if decision == "accepted":
            try:
                # 9.1: push model to hub 
                self.push_model_to_hub(
                    hub_model_id=self.hub_model_id,
                    use_trainer=True,
                    commit_message=f"Auto-deploy: ΔF1 >= {decision_threshold:.4f}"
                )
                
                # 9.2: restart th space
                self.restart_space(
                    space_repo_id=self.space_repo_id
                    )
                
                
            except Exception as e:
                wandb.log({"push_error": str(e)})
                raise RuntimeError(f"Warning: push to hub failed: {e}")

        # 10a. Send summary alert before finishing the run
        wandb.alert(
            title=f"Run Summary: {self.hub_model_id} ",
            text=(
                f"Decision: {decision}\n"
                f"Current Trained F1 Macro: {current_trained_f1_macro}\n"
                f"Deployed F1 Macro: {deployed_f1_macro}"
            ),
            level=AlertLevel.INFO,
            wait_duration=timedelta(minutes=1)  # optional delay before sending
        )


        # 10.b Finish W&B run cleanly
        wandb.join()
        wandb.finish()

        # 11. Return outcomes
        return {
            "decision": decision,
            "current_trained_f1_macro": current_trained_f1_macro, 
            "deployed_f1": deployed_f1_macro,
            "classification_report": classification_report,
            "confusion_matrix": cm,
            "y_true": y_true,
            "y_pred": y_pred
        }





    def restart_space(self, 
                      space_repo_id: str
                      ):
        """
        Restarts the Hugging Face Space programmatically.
        
        Args:
            space_repo_id (str): HF Space Repo Id 

        Raises:
            ValueError: If 'repo_id' or 'token' is empty.
            RuntimeError: If the restart operation fails.
        """
        if not self.space_repo_id: 
            self.space_repo_id = space_repo_id
        
        if not self.space_repo_id or not self.hf_token:
            raise ValueError("Failed to Restart Space: Both 'repo_id' and 'token' must be provided.")

        try:
            self.api.restart_space(repo_id=self.space_repo_id,token=self.hf_token)
            print(f"Successfully restarted Space: {self.space_repo_id}", flush=True)
        except HfHubHTTPError as e:
            raise RuntimeError(f"Failed to restart Space '{self.space_repo_id}': {e}")
        except Exception as e:
            raise RuntimeError(f"An unexpected error occurred: {e}")

 
    # # def push_latest_tensorboard_log(self, logs_dir: str,
    #                                     hf_model_repo: str,
    #                                     hf_token: str,
    #                                     runs_dir: str = "runs"):
    #         """
    #         Upload the latest TensorBoard event file from a logs directory
    #         to a Hugging Face model repo under a TensorBoard-style folder.

    #         Folder and file host IDs will match, e.g.:
    #         runs/Sep26_05-06-52_0646998ee581/events.out.tfevents.<timestamp>.0646998ee581.<pid>.0
    #         """

    #         # Step 1: List all event files
    #         event_files = [
    #             f for f in os.listdir(logs_dir)
    #             if f.startswith("events.out.tfevents")
    #         ]

    #         if not event_files:
    #             print(f"No TensorBoard event files found in {logs_dir}.")
    #             return

    #         # Step 2: Find latest by modification time
    #         latest_file = max(event_files, key=lambda f: os.path.getmtime(os.path.join(logs_dir, f)))
    #         latest_file_path = os.path.join(logs_dir, latest_file)

    #         # Step 3: Extract hostname part (index 4)
    #         parts = latest_file.split('.')
    #         if len(parts) >= 5:
    #             host_id = parts[4]  # e.g., '0646998ee581'
    #         else:
    #             # fallback: use system hostname
    #             host_id = socket.gethostname()[:12]

    #         # Step 4: Create TensorBoard-like folder name
    #         timestamp = datetime.now(UTC).strftime("%b%d_%H-%M-%S")
    #         new_folder_name = f"{timestamp}_{host_id}"

    #         # Step 5: Construct path in HF repo
    #         hf_upload_path = f"{runs_dir}/{new_folder_name}/{latest_file}"

    #         # Step 6: Upload to Hugging Face Hub
    #         self.api.upload_file(
    #             path_or_fileobj=latest_file_path,
    #             path_in_repo=hf_upload_path,
    #             repo_id=hf_model_repo,
    #             repo_type="model",
    #             token=hf_token,
    #             commit_message=f"Upload latest TensorBoard log: {latest_file}"
    #         )

    #         print(f"Uploaded '{latest_file}' → '{hf_model_repo}/{hf_upload_path}'")
            
    #         # Step 7: Delete local event file 
    #         try:
    #             os.remove(latest_file_path)
    #             print(f"Cleared local file: {latest_file_path}")
    #         except Exception as e:
    #             print(f"Could not delete file '{latest_file_path}': {e}")

