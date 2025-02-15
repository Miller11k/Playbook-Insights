# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install the virtualenv tool
RUN pip install --no-cache-dir virtualenv

# Create and activate the virtual environment
RUN virtualenv venv

# Use the virtual environment
ENV PATH="/app/venv/bin:$PATH"

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt within the virtual environment
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port the app runs on
EXPOSE 5000

# Command to run non-api structure application continuously
# CMD ["tail", "-f", "/dev/null"]

# Command to run the application
CMD ["python", "app.py"]