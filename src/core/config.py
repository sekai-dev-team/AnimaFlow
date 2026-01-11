import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "AnimaFlow"
    VERSION: str = "0.1.0"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    GENERATED_DIR: Path = DATA_DIR / "generated"
    DB_DIR: Path = DATA_DIR / "db"
    
    # Database
    DB_NAME: str = "animaflow.sqlite"
    DATABASE_URL: str = f"sqlite:///{DB_DIR}/{DB_NAME}"
    
    # Model
    # Point to the sharp model weights if necessary
    SHARP_WEIGHTS_PATH: Path = BASE_DIR / "sharp" / "data" / "model" / "sharp_2572gikvuh.pt" 

    def init_dirs(self):
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        self.DB_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_dirs()
