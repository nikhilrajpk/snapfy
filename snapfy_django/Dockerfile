# Dockerfile
FROM python:3.12

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Health check for Cloud Run
RUN pip install httpie
HEALTHCHECK --interval=30s --timeout=3s \
  CMD http --quiet http://localhost:8080/health || exit 1

# Command to run Daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8080", "snapfy_django.asgi:application"]