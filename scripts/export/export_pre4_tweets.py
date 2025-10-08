import mysql.connector
import csv
import os
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# CONFIGURATION
# -----------------------------
host = os.getenv("DB_HOST")
user = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")
database = os.getenv("DB_NAME")
table_name = os.getenv('TABLE_NAME')
output_file = os.getenv("OUTPUT_FILE")
columns = ["tweet_id", "tweet_text", "organization"]  # columns to extract
# -----------------------------

# Ensure output directory exists
os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Connect to MySQL
conn = mysql.connector.connect(
    host=host,
    user=user,
    password=password,
    database=database
)

cursor = conn.cursor()

# Prepare SQL query to extract columns
query = f"SELECT {', '.join(columns)} FROM {table_name};"
cursor.execute(query)

# Fetch all rows
rows = cursor.fetchall()

# Write to CSV
with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    # Write header
    writer.writerow(columns)
    # Write data
    writer.writerows(rows)

print(f"Successfully exported {len(rows)} rows to {output_file}")

# Close connections
cursor.close()
conn.close()
