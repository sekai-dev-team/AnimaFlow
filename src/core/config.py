import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AnimaFlow")
    VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Paths
    # In Docker, we might set BASE_DIR to /app via env, but deriving it is usually safer
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    
    # Data Directories - Allow override via env vars for flexibility
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(DATA_DIR / "uploads")))
    GENERATED_DIR: Path = Path(os.getenv("GENERATED_DIR", str(DATA_DIR / "generated")))
    DB_DIR: Path = Path(os.getenv("DB_DIR", str(DATA_DIR / "db")))
    
    # Database
    DB_NAME: str = os.getenv("DB_NAME", "animaflow.sqlite")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_DIR}/{DB_NAME}")
    
    # Model
    # Point to the sharp model weights if necessary
    SHARP_WEIGHTS_PATH: Path = Path(os.getenv("SHARP_WEIGHTS_PATH", str(BASE_DIR / "sharp" / "data" / "model" / "sharp_2572gikvuh.pt")))

    def init_dirs(self):
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        self.DB_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_dirs()
