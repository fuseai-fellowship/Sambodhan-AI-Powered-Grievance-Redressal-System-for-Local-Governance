# Sambodhan RAG-based LLM Chatbot Architecture

## Overview

This document describes the architecture and flow of the Sambodhan AI-powered chatbot, now enhanced with Retrieval-Augmented Generation (RAG) using Grok LLM. The chatbot can:

- Answer user queries using project documentation and database (RAG)
- Guide users through multi-turn grievance submission
- Classify grievance urgency and department using external APIs
- File and track grievances in the database

---

## 1. RAG-based LLM Integration

- **LLM Used:** Grok (via API, key required)
- **Retrieval:** Relevant context is fetched from project documentation (`docs/*.md`) using keyword search.
- **RAG Flow:**
  1. User asks a general question (not a grievance/complaint/track intent)
  2. Backend retrieves relevant docs context
  3. User query + context sent to Grok LLM API
  4. LLM response returned to user

---

## 2. Grievance Submission Flow

- **Multi-turn:** If user intent is to file a grievance, the bot asks for missing info (location, description) step by step.
- **Form Fields:** District, Municipality, Ward, Complaint Description
- **Classification:**
  - **Urgency:** Uses HuggingFace API (`/predict_urgency`)
  - **Department:** Uses HuggingFace API (`/predict_department`)
- **Database:** Complaint is saved with classified urgency/department

---

## 3. Complaint Tracking

- User can track complaint status by providing complaint ID
- Bot fetches status, department, urgency, and history from the database

---

## 4. APIs Used

- **Grok LLM:** For RAG-based answers (API key required)
- **Urgency Classifier:** https://kar137-sambodhan-urgency-classifier-space.hf.space/predict_urgency
- **Department Classifier:** https://mr-kush-sambodhan-department-classifier.hf.space/predict_department
- **Backend REST API:** `/api/chatbot/message` (main endpoint)

---

## 5. Security

- Grok API key is stored in environment variable `GROK_API_KEY`
- User authentication via JWT for personalized actions

---

## 6. Extending Knowledge Base

- Add more markdown files to `docs/` to improve RAG answers
- (Optional) Extend retriever to include database facts or other sources

---

## 7. Example User Flows

- **General Query:**
  - User: "What is Sambodhan?"
  - Bot: (LLM-powered answer from docs)
- **File Grievance:**
  - User: "I want to report a water problem in Sunsari, Barahakshetra, Ward 10"
  - Bot: (Asks for missing info if needed, files complaint, classifies urgency/department)
- **Track Complaint:**
  - User: "Track complaint 123"
  - Bot: (Fetches and displays status)

---

## 8. File Locations

- Backend logic: `src/backend/app/chatbot_api.py`, `src/backend/app/rag_utils.py`
- Frontend widget: `src/frontend/components/chatbot.js`
- Documentation: `docs/`

---

## 9. Environment Variables

- `GROK_API_KEY`: Your Grok API key for LLM access

---

## 10. References

- [Grok API Docs](https://grok.x.ai/docs)
- [HuggingFace Spaces](https://huggingface.co/spaces)

---

For further customization, extend the retriever or LLM prompt as needed.
