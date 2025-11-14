import os
import time
import logging
from sqlalchemy import create_engine, text
from huggingface_hub import HfApi
import requests
from dotenv import load_dotenv
load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
PREPARE_DATASET_REPO = os.getenv("PREPARE_DATASET_REPO")
RETRAIN_DEPT_REPO = os.getenv("RETRAIN_DEPT_REPO")
RETRAIN_URGENCY_REPO = os.getenv("RETRAIN_URGENCY_REPO")
DATABASE_URL = os.getenv("DATABASE_URL")

HF_HUB_METADATA = {
    "department": os.getenv("HF_HUB_METADATA_DEPT"),
    "urgency": os.getenv("HF_HUB_METADATA_URGENCY")
}

THRESHOLDS = {
    "department": int(os.getenv("THRESHOLD_DEPARTMENT", 1500)),
    "urgency": int(os.getenv("THRESHOLD_URGENCY", 1500))
}

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", 60))
POLL_TIMEOUT = int(os.getenv("POLL_TIMEOUT", 1800))
DRY_RUN = os.getenv("DRY_RUN", "false").lower() in ("1","true","yes")

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}
api = HfApi(token=HF_TOKEN)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("orchestrator")


def get_engine(db_url):
    return create_engine(db_url)


def compute_dataset_len(label: str, engine) -> int:
    miscond = f"mc.correct_{label} IS NOT NULL AND mc.model_predicted_{label} IS DISTINCT FROM mc.correct_{label}"
    sql_mis = text(f"SELECT COUNT(*) as mis_count FROM misclassified_complaints mc WHERE mc.reviewed = TRUE AND {miscond}")

    with engine.connect() as conn:
        mis_count = conn.execute(sql_mis).scalar() or 0
        correct_count = int(mis_count * 0.5)
        total_len = mis_count + correct_count

    return total_len, mis_count, correct_count


def restart_hf_space(repo_id: str, label: str):
    if DRY_RUN:
        logger.info("[DRY_RUN] Would restart HF Space: %s for label %s", repo_id, label)
        return
    api.restart_space(repo_id, token=HF_TOKEN)
    logger.info("HF Space '%s' restarted successfully for label '%s'", repo_id, label)


def fetch_json_with_retries(url: str, headers: dict | None = None, timeout: int = 10, retries: int = 3, backoff: int = 2) -> dict:
    headers = headers or {}
    last_exc = None
    with requests.Session() as session:
        for attempt in range(1, retries + 1):
            try:
                resp = session.get(url, headers=headers, timeout=timeout)
                resp.raise_for_status()
                return resp.json()
            except requests.exceptions.RequestException as exc:
                last_exc = exc
                logger.warning("GET %s failed (attempt %d/%d): %s", url, attempt, retries, str(exc))
                time.sleep(backoff * attempt)
    raise last_exc


def wait_for_dataset_update(label: str, min_len: int, last_version: str = None) -> dict:
    url = HF_HUB_METADATA[label]
    start_time = time.time()
    logger.info("Polling HF Hub for updated dataset (%s)...", label)

    while True:
        if time.time() - start_time > POLL_TIMEOUT:
            raise TimeoutError(f"Timeout waiting for {label} dataset update on HF Hub.")

        try:
            metadata = fetch_json_with_retries(url, headers=HEADERS, timeout=10)
            dataset_len = metadata.get("num_samples", 0)
            version_tag = metadata.get("version_tag", "")

            if dataset_len >= min_len and version_tag != last_version:
                logger.info("Dataset '%s' updated: num_samples=%d, version_tag=%s", label, dataset_len, version_tag)
                return metadata
            else:
                logger.info(
                    "Dataset '%s' not updated or same version. Current len=%d, required=%d, version=%s",
                    label, dataset_len, min_len, version_tag
                )
        except Exception as e:
            logger.warning("Error polling HF Hub for label %s: %s", label, str(e))

        time.sleep(POLL_INTERVAL)


def main():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set")
    engine = get_engine(DATABASE_URL)

    dataset_len_counts = {}
    labels_to_prepare = []

    for label in ["department", "urgency"]:
        # GitHub Actions UI group
        print(f"::group::Processing label '{label}'")

        ds_len, mis_count, correct_count = compute_dataset_len(label, engine)
        dataset_len_counts[label] = ds_len
        logger.info("Label '%s': misclassified=%d, sampled correct=%d, total dataset_len=%d", label, mis_count, correct_count, ds_len)

        # Threshold check
        if ds_len >= THRESHOLDS[label]:
            logger.info("Label '%s' exceeds threshold (%d). Dataset prep required.", label, THRESHOLDS[label])
            labels_to_prepare.append(label)
        else:
            logger.info("Label '%s' below threshold (%d). Skipping dataset prep.", label, THRESHOLDS[label])

        print("::endgroup::")

    if not labels_to_prepare:
        logger.info("No labels exceed threshold. Orchestration complete.")
        return

    # Trigger Dataset Prep Space
    if PREPARE_DATASET_REPO:
        restart_hf_space(PREPARE_DATASET_REPO, label=",".join(labels_to_prepare))
    else:
        logger.warning("PREPARE_DATASET_REPO not set. Skipping dataset prep trigger.")

    retrain_map = {"department": RETRAIN_DEPT_REPO, "urgency": RETRAIN_URGENCY_REPO}

    # Wait for dataset update and retrain
    for label in labels_to_prepare:
        print(f"::group::Waiting for dataset upload and retraining for label '{label}'")

        last_version = fetch_json_with_retries(HF_HUB_METADATA[label], headers=HEADERS, timeout=10).get("version_tag")
        metadata = wait_for_dataset_update(label, min_len=dataset_len_counts[label], last_version=last_version)
        logger.info("Dataset for label '%s' ready with %d samples (version %s)", label, metadata.get("num_samples"), metadata.get("version_tag"))

        # Restart retrain HF Space
        space_id = retrain_map.get(label)
        if space_id:
            restart_hf_space(space_id, label=label)
        else:
            logger.warning("Retrain Space not set for label '%s'. Skipping retraining.", label)

        print("::endgroup::")

    logger.info("Orchestration finished. Dataset counts: %s", dataset_len_counts)


if __name__ == "__main__":
    main()
