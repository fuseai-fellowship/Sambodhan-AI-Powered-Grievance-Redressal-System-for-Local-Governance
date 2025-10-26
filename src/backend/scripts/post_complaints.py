#!/usr/bin/env python3
"""
post_complaints.py
Read a JSON file (array of complaint objects) and POST each item to the API endpoint.
Usage:
    python post_complaints.py --file complaints.json --url http://localhost:8000/api/complaints/
"""

import argparse
import json
import sys
import time
from typing import List, Dict, Any

import requests


def load_json(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON file must contain an array (list) of complaint objects.")
    return data


def post_complaints(url: str, complaints: List[Dict[str, Any]], delay: float = 0.0, headers=None):
    headers = headers or {"Content-Type": "application/json"}
    successes = 0
    failures = 0
    for i, payload in enumerate(complaints, start=1):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code in (200, 201):
                print(f"[{i}/{len(complaints)}] OK {resp.status_code} - id: {getattr(resp, 'json', lambda: {})()}")
                successes += 1
            else:
                print(f"[{i}/{len(complaints)}] ERROR {resp.status_code} - {resp.text}")
                failures += 1
        except requests.RequestException as e:
            print(f"[{i}/{len(complaints)}] EXCEPTION - {e}")
            failures += 1

        if delay:
            time.sleep(delay)
    return successes, failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", "-f", required=True, help="Path to JSON file containing array of complaints.")
    parser.add_argument("--url", "-u", default="http://localhost:8000/api/complaints/", help="API endpoint URL.")
    parser.add_argument("--delay", "-d", type=float, default=0.0, help="Delay in seconds between requests.")
    parser.add_argument("--auth-token", help="Optional bearer token for Authorization header.")
    args = parser.parse_args()

    try:
        complaints = load_json(args.file)
    except Exception as e:
        print("Failed to load JSON:", e)
        sys.exit(1)

    headers = {"Content-Type": "application/json"}
    if args.auth_token:
        headers["Authorization"] = f"Bearer {args.auth_token}"

    print(f"Posting {len(complaints)} complaints to {args.url}")
    succ, fail = post_complaints(args.url, complaints, delay=args.delay, headers=headers)
    print(f"Done. Successes: {succ}, Failures: {fail}")


if __name__ == "__main__":
    main()
