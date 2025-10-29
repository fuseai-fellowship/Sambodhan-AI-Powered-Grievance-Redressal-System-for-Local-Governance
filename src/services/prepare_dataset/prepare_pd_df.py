# prepare_pd_dataframe.py

import pandas as pd
from sqlalchemy import text


def fetch_misclassified_dataframe(label_column: str, 
                                  engine, 
                                  correct_ratio: float = 0.5,
                                  random_state: int = 42
                                  ) -> pd.DataFrame:
    """
    Fetches a DataFrame with grievance text + labels from the tables:
      - misclassified_complaints (schema as provided)
      - complaints (schema as provided)
    Will include:
      - all reviewed misclassified records (model_predicted_x != correct_x)
      - + sampled correct records (model_predicted_x == correct_x) at `correct_ratio` of misclassified count.
    
    Args:
      label_column (str): either 'department' or 'urgency'
      correct_ratio (float): fraction of misclassified count to sample from correct set
      random_state (int): random seed for sampling
    
    Returns:
      pd.DataFrame with columns ['grievance', 'department', 'urgency']
    """
    if label_column not in {"department", "urgency"}:
        raise ValueError("label_column must be either 'department' or 'urgency'")
    
    
    
    # define conditions based on column
    miscond = f"mc.correct_{label_column} IS NOT NULL AND mc.model_predicted_{label_column} IS DISTINCT FROM mc.correct_{label_column}"
    
    # SQL to fetch misclassified records
    sql_mis = text(f"""
        SELECT c.message AS grievance,
               mc.correct_department AS department,
               mc.correct_urgency AS urgency
        FROM misclassified_complaints mc
        JOIN complaints c ON c.id = mc.complaint_id
        WHERE mc.reviewed = TRUE
          AND {miscond}
    """)
    with engine.connect() as conn:
        df_mis = pd.read_sql(sql_mis, conn)
    
    # basic check
    if df_mis.empty:
        return pd.DataFrame(columns=["grievance","department","urgency"])
    
    n_mis = len(df_mis)
    n_correct = int(n_mis * correct_ratio)
    
    # SQL to fetch correct records from complaints table NOT in misclassified_complaints
    sql_corr = text(f"""
        SELECT c.id AS complaint_id,
               c.message AS grievance,
               c.department AS department,
               c.urgency AS urgency
        FROM complaints c
        WHERE c.id NOT IN (SELECT complaint_id FROM misclassified_complaints)
          AND c.{label_column} IS NOT NULL
    """)
    
    with engine.connect() as conn:
        df_corr_all = pd.read_sql(sql_corr, conn)
    
    if n_correct > 0 and not df_corr_all.empty:
        # reproducible random sample
        df_corr = df_corr_all.sample(n=min(n_correct, len(df_corr_all)), random_state=random_state).reset_index(drop=True)
    else:
        df_corr = pd.DataFrame(columns=["grievance","department","urgency"])
    
    # Combine
    df_combined = pd.concat([df_mis.reset_index(drop=True), df_corr], ignore_index=True)
    
    # final check: ensure columns present
    assert set(df_combined.columns) == {"grievance","department","urgency"}, "Unexpected columns in combined DataFrame"
    
    return df_combined

# # If this file is run directly, simple test:
# if __name__ == "__main__":
#     # Quick sanity test for department label
#     df_test = fetch_misclassified_dataframe(label_column="department", 
#                                             correct_ratio=0.5)
#     print("Rows fetched:", len(df_test))
#     print(df_test.head())
#     # Basic assertion: if rows>0 then none of grievances should be null
#     if len(df_test) > 0:
#         assert df_test['grievance'].isna().sum() == 0, "Some grievances are null"
