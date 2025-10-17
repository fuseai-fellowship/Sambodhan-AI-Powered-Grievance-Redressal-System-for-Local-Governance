"""
Professional Evaluation Module for Sambodhan XLM-RoBERTa Urgency Classifier
----------------------------------------------------------------------------

Features:
- Step-wise metrics logging (every 20 samples)
- Runtime & samples/sec tracking
- TensorBoard-ready curves for Hugging Face "train metrics" tab
- Multi-run timestamped directories
- Professional gradient-themed plots
"""

import os
import sys
import time
import torch
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from tqdm import tqdm
from datetime import datetime
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score, precision_score, recall_score
from transformers import pipeline
from torch.utils.tensorboard import SummaryWriter
from typing import Optional
from huggingface_hub import HfApi, upload_folder

plt.style.use("seaborn-v0_8-darkgrid")
sns.set_palette("rocket")

STEP_LOG_INTERVAL = 20

def evaluate_model(
    test_df,
    model_path: str,
    output_dir: str,
    hf_repo: Optional[str] = None,
    hf_token: Optional[str] = None,
    dataset_name: str = "Sambodhan Urgency Dataset",
):
    start_time = time.time()
    timestamp = datetime.now().strftime("%b%d_%H-%M-%S")
    run_name = f"eval_{timestamp}"
    run_dir = os.path.join(output_dir, f"runs/{run_name}")
    os.makedirs(run_dir, exist_ok=True)

    writer = SummaryWriter(log_dir=run_dir)
    device = 0 if torch.cuda.is_available() else -1

    print(f" Loading model from: {model_path}")
    classifier = pipeline("text-classification", model=model_path, device=device)

    label_map = {0: "NORMAL", 1: "URGENT", 2: "HIGHLY URGENT"}
    inv_label_map = {v: k for k, v in label_map.items()}

    preds, probs, y_true_list, y_pred_list = [], [], [], []
    step_metrics = {"accuracy": [], "macro_f1": [], "precision": [], "recall": []}
    step_indices = []

    print(f" Evaluating {len(test_df)} samples using {'GPU' if device==0 else 'CPU'}...")

    # ========================== INFERENCE & STEP-WISE LOGGING ==========================
    for step, text in enumerate(tqdm(test_df["clean_text"], desc="Inference", ncols=90)):
        res = classifier(text, truncation=True)[0]
        label_id = inv_label_map.get(res["label"], 0)

        preds.append(label_id)
        probs.append(res["score"])
        y_true_list.append(test_df["label"].iloc[step])
        y_pred_list.append(label_id)

        # Log per-sample confidence
        writer.add_scalar("eval/confidence", res["score"], step)

        # Step-wise logging every STEP_LOG_INTERVAL
        if (step + 1) % STEP_LOG_INTERVAL == 0 or (step + 1) == len(test_df):
            y_t = np.array(y_true_list)
            y_p = np.array(y_pred_list)
            acc = accuracy_score(y_t, y_p)
            macro_f1 = f1_score(y_t, y_p, average="macro")
            prec = precision_score(y_t, y_p, average="macro")
            rec = recall_score(y_t, y_p, average="macro")

            # Save for plotting
            step_metrics["accuracy"].append(acc)
            step_metrics["macro_f1"].append(macro_f1)
            step_metrics["precision"].append(prec)
            step_metrics["recall"].append(rec)
            step_indices.append(step + 1)

            # TensorBoard
            writer.add_scalar("eval/stepwise/accuracy", acc, step + 1)
            writer.add_scalar("eval/stepwise/macro_f1", macro_f1, step + 1)
            writer.add_scalar("eval/stepwise/precision", prec, step + 1)
            writer.add_scalar("eval/stepwise/recall", rec, step + 1)

    # ========================== METRICS & REPORTS ==========================
    y_true = np.array(y_true_list)
    y_pred = np.array(y_pred_list)
    probs = np.array(probs)

    report_dict = classification_report(
        y_true, y_pred, target_names=list(label_map.values()), output_dict=True, digits=4
    )
    cm = confusion_matrix(y_true, y_pred)
    acc = report_dict["accuracy"]
    macro_f1 = report_dict["macro avg"]["f1-score"]
    weighted_f1 = report_dict["weighted avg"]["f1-score"]

    # Save reports
    pd.DataFrame(report_dict).T.to_csv(os.path.join(run_dir, "metrics.csv"))
    pd.DataFrame(report_dict).T.to_json(os.path.join(run_dir, "metrics.json"), indent=4)
    with open(os.path.join(run_dir, "classification_report.txt"), "w") as f:
        f.write(classification_report(y_true, y_pred, target_names=list(label_map.values()), digits=4))

    # ========================== HELPER: PLOT & SAVE ==========================
    def save_plot(fig, name):
        path = os.path.join(run_dir, f"{name}.png")
        fig.savefig(path, bbox_inches="tight", dpi=250)
        plt.close(fig)
        img = plt.imread(path)
        writer.add_image(f"eval/{name}", img.transpose(2,0,1))
        return path

    # Confusion matrix
    fig, ax = plt.subplots(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="rocket",
                xticklabels=list(label_map.values()), yticklabels=list(label_map.values()), ax=ax)
    ax.set_title("Confusion Matrix", fontsize=13, fontweight="bold")
    save_plot(fig, "confusion_matrix")

    # Normalized CM
    cm_norm = cm.astype(float)/cm.sum(axis=1)[:, None]
    fig, ax = plt.subplots(figsize=(6,5))
    sns.heatmap(cm_norm, annot=True, fmt=".2f", cmap="mako",
                xticklabels=list(label_map.values()), yticklabels=list(label_map.values()), ax=ax)
    ax.set_title("Normalized Confusion Matrix", fontsize=13, fontweight="bold")
    save_plot(fig, "confusion_matrix_normalized")

    # Confidence histogram
    fig, ax = plt.subplots(figsize=(6,4))
    sns.histplot(probs, bins=25, kde=True, color="skyblue", ax=ax)
    ax.set_title("Prediction Confidence Distribution", fontsize=13, fontweight="bold")
    ax.set_xlabel("Confidence Score"); ax.set_ylabel("Frequency")
    save_plot(fig, "confidence_histogram")

    # True label distribution
    fig, ax = plt.subplots(figsize=(5,3))
    sns.countplot(x=[label_map[l] for l in y_true], palette="rocket", ax=ax)
    ax.set_title("True Label Distribution", fontsize=13, fontweight="bold")
    save_plot(fig, "true_label_distribution")

    # Step-wise metrics progression
    fig, ax = plt.subplots(figsize=(7,4))
    ax.plot(step_indices, step_metrics["accuracy"], label="Accuracy", color="royalblue", linewidth=2)
    ax.plot(step_indices, step_metrics["macro_f1"], label="Macro F1", color="orange", linewidth=2)
    ax.plot(step_indices, step_metrics["precision"], label="Precision", color="green", linewidth=2)
    ax.plot(step_indices, step_metrics["recall"], label="Recall", color="red", linewidth=2)
    ax.set_xlabel("Samples Evaluated", fontsize=12)
    ax.set_ylabel("Metric Value", fontsize=12)
    ax.set_title("Step-wise Metrics Progression", fontsize=13, fontweight="bold")
    ax.set_ylim(0, 1.05)
    ax.legend()
    save_plot(fig, "stepwise_metrics")

    # Misclassified samples
    mis_idx = np.where(y_true != y_pred)[0]
    misclassified = pd.DataFrame({
        "text": test_df.iloc[mis_idx]["clean_text"].values,
        "true_label": [label_map[t] for t in y_true[mis_idx]],
        "predicted_label": [label_map[p] for p in y_pred[mis_idx]],
        "confidence": probs[mis_idx]
    }).sort_values(by="confidence", ascending=False)
    misclassified.to_csv(os.path.join(run_dir, "misclassified.csv"), index=False)

    # ========================== RUNTIME & SUMMARY ==========================
    elapsed = time.time() - start_time
    samples_per_sec = len(test_df)/elapsed
    writer.add_scalar("eval/runtime_sec", elapsed)
    writer.add_scalar("eval/samples_per_second", samples_per_sec)

    summary = f"""
📊 SAMBODHAN URGENCY CLASSIFIER EVALUATION
────────────────────────────────────────────
Dataset: {dataset_name}
Samples: {len(test_df)}
Accuracy: {acc:.4f}
Macro F1: {macro_f1:.4f}
Weighted F1: {weighted_f1:.4f}
Runtime: {elapsed:.2f}s ({samples_per_sec:.2f} samples/sec)
Misclassified: {len(mis_idx)}
────────────────────────────────────────────
Run: {run_name}
"""
    print(summary)
    writer.add_text("eval/summary", summary)
    writer.close()

    # ========================== UPLOAD TO HUGGING FACE (optional) ==========================
    # Resolve token from env if not provided
    hf_token = hf_token or os.getenv("HUGGINGFACE_TOKEN")

    if hf_repo and hf_token:
        print("Uploading run logs to Hugging Face...")
        api = HfApi()
        upload_folder(
            folder_path=run_dir,
            repo_id=hf_repo,
            repo_type="model",
            token=hf_token,
            path_in_repo=f"runs/{run_name}",
        )
        print(f"Logs: https://huggingface.co/{hf_repo}/tensorboard")
    else:
        print("Skipping Hugging Face upload (missing hf_repo or token). Set HUGGINGFACE_TOKEN to enable.")

    return {
        "accuracy": acc,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "runtime_sec": elapsed,
        "samples_per_sec": samples_per_sec,
        "run_dir": run_dir,
        "summary": summary.strip(),
    }
