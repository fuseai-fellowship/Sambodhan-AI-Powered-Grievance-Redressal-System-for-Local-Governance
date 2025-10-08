import pandas as pd
import torch
import transformers


df = pd.read_csv('/content/cleaned_grievance_tweets.csv')




# Load Llama-3 8B Instruct model

model_id = "meta-llama/Meta-Llama-3-8B-Instruct"

pipeline = transformers.pipeline(
    "text-generation",
    model=model_id,
    model_kwargs={"torch_dtype": torch.bfloat16},  # efficient precision
    device_map="auto",
)

import tqdm

# Fix pad token for safety
if pipeline.tokenizer.pad_token is None:
    pipeline.tokenizer.pad_token = pipeline.tokenizer.eos_token
    pipeline.tokenizer.pad_token_id = pipeline.model.config.eos_token_id



# Label mapping

label2id = {"normal": 0, "urgent": 1, "highly urgent": 2}
valid_labels = list(label2id.keys())



# Prompt Template

def create_prompt(grievance, super_depart):
    return [
        {"role": "system", "content": (
            "You are an AI assistant specialized in analyzing citizen grievances. "
            "Your task is to determine the urgency of each grievance. "
            "Use the following criteria for labeling:\n"
            "- \"normal\": grievance that does not require immediate attention and can be addressed in regular timelines.\n"
            "- \"urgent\": grievance that needs prompt action but is not life-threatening or critical.\n"
            "- \"highly urgent\": grievance that requires immediate attention, may involve safety, legal, or critical public issues.\n"
            "Only output one of the following labels: \"normal\", \"urgent\", or \"highly urgent\"."
        )},
        {"role": "user", "content": (
            f"Department: {super_depart}\n\n"
            f"Grievance: {grievance}\n\n"
            "### Response:\nUrgency Category:"
        )}
    ]




# Prediction (all at once)

def predict_all(df, max_new_tokens=10):
    terminators = [
        pipeline.tokenizer.eos_token_id,
        pipeline.tokenizer.convert_tokens_to_ids("<|eot_id|>")
    ]

    prompts = [create_prompt(r["grievance"], r["super_depart"]) for _, r in df.iterrows()]

    outputs = pipeline(
        prompts,
        max_new_tokens=max_new_tokens,
        eos_token_id=terminators,
        do_sample=False,  # deterministic
    )

    urgency_labels = []
    i =0
    df_shape = df.shape[0]
    for output in outputs:
        print(f"Iteration: {i}/{df_shape}")
        text = output[0]["generated_text"][-1]["content"].strip().lower()
        label_found = next((lbl for lbl in valid_labels if lbl in text), None)
        urgency_labels.append(label_found if label_found else "normal")
        print(urgency_labels )

    return urgency_labels


df["urgency_label"] = predict_all(df)

urgency_map = {
    'normal': 'NORMAL',
    'urgent': 'URGENT',
    'highly urgent': 'HIGHLY URGENT'
}

df['urgency'] = df.urgency_label.map(urgency_map)

df.drop(columns=['urgency_label', 'organization'], inplace=True, axis=1)





