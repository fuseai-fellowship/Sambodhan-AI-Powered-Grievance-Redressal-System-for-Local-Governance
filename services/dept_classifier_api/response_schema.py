from typing import Union, List, Annotated, Dict
from pydantic import BaseModel, Field, field_validator


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

