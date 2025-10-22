import os
import pandas as pd
import json

def df_to_json(df: pd.DataFrame, orient: str = "records", indent: int = 2) -> str:
    try:
        return df.to_json(orient=orient, indent=indent, force_ascii=False)
    except Exception as e:
        raise ValueError(f"Error converting DataFrame to JSON: {e}")

def prepare_viz_data(df: pd.DataFrame, columns: list[str] = None, group_by: str = None) -> pd.DataFrame:
    if columns:
        df = df[columns].copy()

    df = df.dropna()

    if group_by and group_by in df.columns:
        df = df.groupby(group_by).size().reset_index(name="count")

    df = df.sort_values(by=df.columns[-1], ascending=False).reset_index(drop=True)
    return df

def export_json_from_csv(csv_path: str, orient: str = "records", indent: int = 2, group_by: str = None):
    if not csv_path.endswith(".csv"):
        raise ValueError("Input file must be a .csv")

    df = pd.read_csv(csv_path)

    df = prepare_viz_data(df, group_by=group_by)

    json_str = df_to_json(df, orient=orient, indent=indent)


    base_dir = os.path.dirname(csv_path)
    filename = os.path.splitext(os.path.basename(csv_path))[0] + ".json"
    output_path = os.path.join(base_dir, filename)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(json_str)

    print(f"Exported JSON to: {output_path}")
    return output_path

