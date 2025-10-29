"""Inference module for Sambodhan."""
import torch
from transformers import pipeline
from src.data_science.preprocessing.data_prep import clean_nepali_text

class UrgencyClassifier:
    def __init__(self, model_path):
        device = 0 if torch.cuda.is_available() else -1
        self.classifier = pipeline('text-classification', model=model_path, device=device, return_all_scores=True)
    
    def predict(self, text, return_probabilities=False):
        text = clean_nepali_text(text)
        results = self.classifier(text)[0]
        top_pred = max(results, key=lambda x: x['score'])
        
        response = {
            'urgency': top_pred['label'],
            'confidence': round(top_pred['score'], 3)
        }
        
        if return_probabilities:
            response['probabilities'] = {r['label']: round(r['score'], 3) for r in results}
        
        return response
    
    def predict_batch(self, texts, return_probabilities=False):
        texts = [clean_nepali_text(t) for t in texts]
        all_results = self.classifier(texts)
        
        predictions = []
        for results in all_results:
            top_pred = max(results, key=lambda x: x['score'])
            pred = {'urgency': top_pred['label'], 'confidence': round(top_pred['score'], 3)}
            if return_probabilities:
                pred['probabilities'] = {r['label']: round(r['score'], 3) for r in results}
            predictions.append(pred)
        
        return predictions