# Use a slim Python base
FROM python:3.12-slim

# Create a non-root user   
RUN useradd -m -u 1000 user

USER user
ENV HOME=/home/user \
    PATH="/home/user/.local/bin:$PATH"

WORKDIR /home/user/app

# Copy only requirements first for caching
COPY --chown=user requirements.txt /home/user/app/requirements.txt

# Install OS-level dependencies and Python dependencies
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Set environment variables for Hugging Face cache locations (inside container)
ENV HF_HOME=/home/user/app/hf_cache \
    HF_DATASETS_CACHE=/home/user/app/hf_cache \
    HF_METRICS_CACHE=/home/user/app/hf_cache

# Create cache directory and ensure write permissions
RUN mkdir -p /home/user/app/hf_cache && chmod -R 777 /home/user/app/hf_cache

# Copy all other source files (your scripts, modules, etc.)
COPY --chown=user . /home/user/app


# Default command: run dataset preparation script
CMD ["python", "prepare_dataset_pipeline.py"]
