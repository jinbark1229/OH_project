# Use Python as the base image
FROM python:3.9

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port and start the Flask server
EXPOSE 5000
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]