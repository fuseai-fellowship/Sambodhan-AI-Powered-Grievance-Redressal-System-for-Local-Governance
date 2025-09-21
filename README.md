# Sambodhan-AI-Powered-Grievance-Redressal-System-for-Local-Governance



## Overview

Sambodhan is an AI-based system designed to streamline citizen grievance submission, classification, prioritization, and tracking for local governance. It supports multiple submission channels (mobile app, website) and provides real-time tracking, sentiment analysis, and departmental routing.

---

## Features
- Multi-channel grievance submission ( app, website)
- Automated grievance classification and departmental routing
- Urgency and sentiment detection
- Admin dashboard for analytics and grievance tracking

---

## Repository Structure

```
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └──  README.md
├── data/
│   ├── raw/
│   │   ├── complaints_processed.csv.zip
│   │   ├── csv/
│   │   │   ├── categorized_grievances_dataset.csv
│   │   │   └── Grievance_Tweets_India_RailMin_IncomeTax_DelhiPolice.csv
│   │   └── sql/
│   │       └── Grievance_Tweets_India_RailMin_IncomeTax_DelhiPolice.sql
│   ├── processed/
│   └── external/
├── notebooks/
├── src/
│   ├── __init__.py
│   ├── backend/
│   │   ├── app/
│   │   ├── models/
│   │   ├── database/
│   │   └── utils/
│   ├── frontend/
│   │   ├── components/
│   │   ├── pages/
│   │   └── assets/
│   └── data_science/
│       ├── preprocessing/
│       ├── models/
│       ├── evaluation/
│       └── utils/
├── tests/
│   ├── backend/
│   ├── frontend/
│   └── data_science/
├── scripts/
│   ├── export/
│   │   └── export_pre4_tweets.py
├── requirements.txt
├── environment.yml
├── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

