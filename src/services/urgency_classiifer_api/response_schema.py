from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Union, List, Annotated, Dict
import re

def clean_text(text: str) -> str:
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

class TextInput(BaseModel):
    text: Annotated[
        Union[str, List[str]],
        Field(..., title="Input text(s)", description="Single string or list of strings")
    ]

    @field_validator("text")
    def validate_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("String input cannot be empty.")
        elif isinstance(value, list):
            if not value:
                raise ValueError("List input cannot be empty.")
            for i, v in enumerate(value):
                if not isinstance(v, str) or not v.strip():
                    raise ValueError(f"Item {i} in list is not a valid non-empty string.")
        else:
            raise TypeError("Input must be a string or a list of strings.")
        return value

    # Correct model validator for Pydantic v2
    @model_validator(mode="after")
    def clean_text_after(model):
        if isinstance(model.text, str):
            model.text = clean_text(model.text)
        else:
            model.text = [clean_text(t) for t in model.text]
        return model

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"text": "Where can I get a new water connection?"},
                {"text": ["Where can I get a new water connection?", "My streetlight is broken."]}
            ]
        }
    }

# Response schema

class UrgencyClassificationOutput(BaseModel):
    label: str = Field(..., description="Top predicted urgency label")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score for top label")
    scores: Dict[str, float] = Field(..., description="All label confidence scores")
