# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables for the virtual environment
ENV VIRTUAL_ENV=/app/venv
ENV PATH="/app/venv/bin:$PATH"

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2 and building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Install virtualenv tool
RUN pip install --no-cache-dir virtualenv

# Create the virtual environment
RUN virtualenv $VIRTUAL_ENV

# Copy the requirements file to leverage Docker cache for dependency installation
COPY requirements.txt .

# Install Python dependencies within the virtual environment
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . /app

# Expose the port the app runs on (adjust if needed)
EXPOSE 5000

# Command to run the application (adjust the entrypoint as needed)
CMD ["python", "data_ingestion/main.py"]