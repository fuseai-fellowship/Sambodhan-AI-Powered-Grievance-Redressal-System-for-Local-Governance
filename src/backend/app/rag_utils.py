"""
RAG (Retrieval-Augmented Generation) utility for Sambodhan Chatbot
- Retrieves relevant context from project docs and database
- Calls Grok LLM API for RAG-based answers
"""

import os
import httpx
from typing import List

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# --- Simple file retriever (for demo: reads all docs/*.md) ---
def retrieve_docs_context(query: str, max_chars: int = 2000) -> str:
    """Retrieve relevant context from docs/*.md files (simple full-text search)"""
    import glob
    import re
    docs = []
    matched = []
    all_texts = []
    for path in glob.glob(os.path.join(os.path.dirname(__file__), '../../../docs/*.md')):
        with open(path, encoding='utf-8') as f:
            text = f.read()
            all_texts.append(text)
            if re.search(re.escape(query), text, re.IGNORECASE):
                matched.append(text)
    # If any match, use those; else use all docs
    if matched:
        context = '\n\n'.join(matched)[:max_chars]
    else:
        context = '\n\n'.join(all_texts)[:max_chars]
    # Always prepend a project/system intro for LLM grounding
    intro = (
        "Sambodhan is an AI-powered Grievance Redressal System for Local Governance in Nepal. "
        "It helps citizens file complaints, track status, and get information about municipal services. "
        "The system uses LLMs, RAG, and classification models to assist users and route grievances.\n\n"
    )
    # If context is empty, provide a default fallback
    if not context.strip():
        context = (
            "Sambodhan is an AI-powered Grievance Redressal System for Local Governance in Nepal. "
            "It helps citizens file complaints, track status, and get information about municipal services. "
            "The system uses LLMs, RAG, and classification models to assist users and route grievances. "
            "You can ask about the system, how to file a complaint, or how to track your grievance."
        )
    return (intro + context)[:max_chars]

async def call_grok_llm(query: str, context: str) -> str:
    """Call Grok LLM API with user query and context"""
    if not GROQ_API_KEY:
        error_text = "LLM API error: GROQ_API_KEY environment variable is not set. Please set your Groq API key."
        print(error_text)
        return error_text
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",  # Best quality, latest recommended by Groq
        "messages": [
            {"role": "system", "content": "You are a helpful assistant for the Sambodhan Grievance Redressal System. Use the provided context to answer user queries."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
        ]
    }
    import traceback
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            error_text = f"LLM API error: {e.response.status_code} {e.response.text}"
            print(error_text)
            print(traceback.format_exc())
            return error_text + "\n" + traceback.format_exc()
        except Exception as e:
            error_text = f"LLM API exception: {str(e)}"
            print(error_text)
            print(traceback.format_exc())
            return error_text + "\n" + traceback.format_exc()
