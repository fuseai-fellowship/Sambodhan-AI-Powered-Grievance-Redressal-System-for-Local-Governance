from app.schemas.complaint import URGENCY_LABEL_MAP, DEPARTMENT_LABEL_MAP

INV_URGENCY_LABEL_MAP = {v: k for k, v in URGENCY_LABEL_MAP.items()}
INV_DEPARTMENT_LABEL_MAP = {v: k for k, v in DEPARTMENT_LABEL_MAP.items()}

def resolve_label(value, mapping):
    """Converts numeric to string or passes through valid string."""
    if value is None:
        return None
    if isinstance(value, str):
        # Accept only valid label
        if value in mapping.values():
            return value
        raise ValueError(f"Invalid label: {value}")
    if isinstance(value, int):
        if value in mapping:
            return mapping[value]
        raise ValueError(f"Invalid numeric code: {value}")
    raise TypeError(f"Unexpected type for label: {type(value)}")
