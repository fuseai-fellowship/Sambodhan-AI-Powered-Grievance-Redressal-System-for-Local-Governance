# train_model.py
from load_dataset import load_dataset_from_hub
from model_pipeline import GrievanceClassifier
from configs import get_config
import time
import os

def run_grievance_training_pipeline():
    """
    Load configs, dataset, initialize classifier,
    and run the training pipeline with exception handling.
    Prints status messages for dynamic terminal viewing.
    """
    try:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Loading configurations...", flush=True)
        configs = get_config()
        # Print a short, non-sensitive summary of configs
        print(f"[{time.strftime('%H:%M:%S')}] Configs loaded: dataset_repo_id={configs.dataset_repo_id}, "
              f"model_checkpoint={configs.model_checkpoint}, hub_model_id={configs.hub_model_id}, "
              f"num_labels={len(configs.label2id)}",
              flush=True)


        print(f"[{time.strftime('%H:%M:%S')}] Loading dataset from hub: {configs.dataset_repo_id} ...", flush=True)
        data = load_dataset_from_hub(
            model_repo=configs.dataset_repo_id,
            hf_token=configs.hf_token
        )
        dataset = data['dataset']
        dataset_metadata = data['metadata']

        # Print dataset splits and sizes if available
        def _safe_len(split):
            try:
                return len(split)
            except Exception:
                return "unknown"
        train_len = _safe_len(dataset.get('train')) if dataset else "no dataset"
        eval_len = _safe_len(dataset.get('eval')) if dataset else "no dataset"
        test_len = _safe_len(dataset.get('test')) if dataset else "no dataset"
        print(f"[{time.strftime('%H:%M:%S')}] Dataset loaded: train={train_len}, eval={eval_len}, test={test_len}", flush=True)

        print(f"[{time.strftime('%H:%M:%S')}] Initializing classifier (checkpoint={configs.model_checkpoint}) ...", flush=True)
        classifier = GrievanceClassifier(
            model_checkpoint=configs.model_checkpoint,
            num_labels=len(configs.label2id),
            id2label=configs.id2label,
            label2id=configs.label2id,
            hf_token=configs.hf_token,
            wandb_api_key=configs.wandb_api_key,
            wandb_project_name=configs.wandb_project_name,
        )
        print(f"[{time.strftime('%H:%M:%S')}] Classifier initialized.", flush=True)

        print(f"[{time.strftime('%H:%M:%S')}] Start training the model ...", flush=True)
        result = classifier.train_pipeline(
            train_dataset=dataset['train'],
            eval_dataset=dataset['eval'],
            test_dataset=dataset['test'],
            dataset_metadata= dataset_metadata, 
            space_repo_id=configs.space_repo_id,
            hf_training_args={"hub_model_id": configs.hub_model_id},
            api_endpoint=configs.api_endpoint,
            early_stopping_patience=configs.early_stopping_patience,
            deployed_sample_size=configs.deployed_sample_size,
            decision_threshold=configs.decision_threshold
        )

        print(f"[{time.strftime('%H:%M:%S')}] Training completed successfully!", flush=True)
        # Print a brief summary of the result if it's a dict-like object
        try:
            if isinstance(result, dict):
                print(f"[{time.strftime('%H:%M:%S')}] Result keys: {list(result.keys())}", flush=True)
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Result: {result}", flush=True)
        except Exception:
            print(f"[{time.strftime('%H:%M:%S')}] Training finished (could not display result details).", flush=True)

        # pause the space if it was run in the hf_space
        if configs.retrain_space_id:
            try:
                print(f"[{time.strftime('%H:%M:%S')}] Attempting to pause Hugging Face Space...", flush=True)
                
                classifier.api.pause_space(repo_id=configs.retrain_space_id, token=configs.hf_token)
                
                print(f"[{time.strftime('%H:%M:%S')}] Pause command executed.", flush=True)
            except Exception as e:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] WARNING: Failed to pause HF Space: {e}", flush=True)

        return result

        
    except Exception as e:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Grievance training pipeline failed: {e}", flush=True)
        raise RuntimeError(f"Grievance training pipeline failed: {e}")


if __name__ == "__main__":
    run_grievance_training_pipeline()
