from typing import Union, List, Annotated, Dict
from pydantic import BaseModel, Field, field_validator, model_validator
import re


# Text cleaning function
def clean_text(text: str) -> str:
    """Clean grievance text by removing URLs, HTML tags, extra whitespace."""
    text = re.sub(r'https?://\S+|www\.\S+', '', text)  # Remove URLs
    text = re.sub(r'<.*?>', '', text)  # Remove HTML tags
    text = re.sub(r'\n', ' ', text)  # Replace newlines with space
    text = re.sub(r'\s+', ' ', text).strip()  # Reduce multiple spaces
    return text


# pydantic classes 

class TextInput(BaseModel):
    text: Annotated[
        Union[str, List[str]],
        Field(
            ...,
            title="Input text(s)",
            description="A single string or a list of non-empty strings representing user input."
        )
    ]

    # Validator to ensure non-empty strings in both str and list[str] forms
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


    @model_validator(mode="after")
    def clean_texts(self):
        if isinstance(self.text, str):
            self.text = clean_text(self.text)
        else:
            self.text = [clean_text(t) for t in self.text]
        return self

        

    # Correct place for OpenAPI examples in Pydantic v2
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Where can I get a new water connection?"
                },
                {
                    "text": [
                        "Where can I get a new water connection?",
                        "My streetlight is broken."
                    ]
                }
            ]
        }
    }




class ClassificationOutput(BaseModel):
    label: str = Field(..., description="Top predicted label")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    scores: Dict[str, float] = Field(..., description="All label confidence scores")