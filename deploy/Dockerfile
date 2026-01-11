# syntax=docker/dockerfile:1

# Using Python 3.11 slim as base
# We rely on the nvidia-* packages in requirements.txt for CUDA support
FROM python:3.11-slim

# Build argument to control ML dependency installation
ARG INSTALL_ML=true

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Ensure the sharp module is in the python path if needed, though the code adds it dynamically
ENV PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
# We install sharp dependencies and the main app dependencies
COPY sharp/requirements.txt /tmp/sharp_requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart sqlalchemy jinja2 aiofiles requests python-dotenv

RUN if [ "$INSTALL_ML" = "true" ]; then \
        echo "Installing ML dependencies..." && \
        sed -i '/^-e/d' /tmp/sharp_requirements.txt && \
        pip install --no-cache-dir -r /tmp/sharp_requirements.txt; \
    else \
        echo "Skipping ML dependencies installation (LITE mode)"; \
    fi

# Copy the application code
COPY src /app/src
COPY static /app/static
COPY sharp /app/sharp

# Install the sharp package conditionally
RUN if [ "$INSTALL_ML" = "true" ]; then \
        echo "Installing sharp package..." && \
        pip install --no-cache-dir /app/sharp; \
    else \
        echo "Skipping sharp package installation (LITE mode)"; \
    fi

# Create data directories (will be mounted)
RUN mkdir -p /app/data/db /app/data/uploads /app/data/generated

# Expose the port
EXPOSE 8888

# Command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8888"]
