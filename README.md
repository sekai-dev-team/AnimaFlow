# AnimaFlow
AnimaFlow is a self-hosted service to convert 2D images into parallax-enabled 3D wallpapers (PLY) and serve a WebGL-based viewer for preview and configuration.

This repository contains the FastAPI backend, the `sharp` model code used for generation, and a lightweight frontend viewer.

## Features
- **Upload & Dream**: Convert 2D images to 3D point clouds using the integrated `sharp` model.
- **Glassmorphism Dashboard**: A modern, dark-themed UI for managing your wallpaper gallery.
- **Director Mode**: A powerful 3D editor to adjust FOV, Parallax Intensity, Focus/Vignette, and Camera Angle.
- **Persistent Config**: Your director settings are saved per-wallpaper in the database.

## Quick Start (Development)

1. **Environment Setup**:
	- Windows (PowerShell):
	  ```powershell
	  python -m venv .venv; .\\.venv\\Scripts\\Activate.ps1
	  pip install -r requirements.txt
	  ```
	- Linux / macOS:
	  ```bash
	  python3 -m venv .venv; source .venv/bin/activate
	  pip install -r requirements.txt
	  ```

2. **Run Locally**:
	```bash
	uvicorn src.main:app --reload --port 8000
	```

3. **Usage**:
    - Open **http://localhost:8000**.
    - Upload an image.
    - Click "Director Mode" on any wallpaper card to enter the editor.
    - Adjust controls (FOV, Parallax, Focus) and click **Save Config**.
    - The standard "Preview" link will now respect your saved settings.

## Docker (Production)

1. **Build & Run**:
	```bash
	docker-compose -f deploy/docker-compose.yml up --build -d
	```

2. **Access**:
    - The service runs on **port 8888** by default in Docker.
    - Open **http://localhost:8888** (or your server IP).

## Configuration

- **Hardware Acceleration**: The Docker setup assumes NVIDIA GPU availability for the ML model. If running without a GPU, ensure you set `INSTALL_ML=false` or expect slower/mocked generation (depending on implementation).
- **Storage**: Data is persisted in the `data/` directory (mapped to Docker volumes).

## CI/CD
A GitHub Actions workflow (`.github/workflows/docker-publish.yml`) is included to automatically build and push the Docker image to Docker Hub on pushes to `main`. Configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets in your repo.
