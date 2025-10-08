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

## Grievance Dataset Schema:

| Column Name   | Data Type      | Description                                                                                             | Example / Allowed Values                                                                                                 |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **id**        | Integer/String | Unique identifier for each grievance record.                                                            | 1001                                                                                                                     |
| **grievance** | String         | Text of the citizen grievance describing the issue.                                                     | "Street lights not working in Ward 5."                                                                                   |
| **dept**      | String         | The department or super-department responsible for addressing the grievance.                            | Allowed values:<br>- Municipal Governance & Community Services<br>- Education, Health & Social Welfare <br>- Infrastructure, Utilities & Natural Resources<br>- Security & Law Enforcement |
| **urgency**   | String         | The urgency category of the grievance, based on predefined labels: `normal`, `urgent`, `highly urgent`. | "urgent"                                                                                                                 |



---
