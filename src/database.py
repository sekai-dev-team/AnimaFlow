from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import uuid
from src.core.config import settings

Base = declarative_base()

class Wallpaper(Base):
    __tablename__ = "wallpapers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    upload_path = Column(String, nullable=False) # relative path
    ply_path = Column(String, nullable=True)     # relative path, null if not generated yet
    
    # Default camera settings (JSON strings)
    camera_pos = Column(String, nullable=True)     # e.g., '{"x":0, "y":0, "z":5}'
    camera_target = Column(String, nullable=True)  # e.g., '{"x":0, "y":0, "z":0}'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    view_configs = relationship("ViewConfig", back_populates="wallpaper")

class ViewConfig(Base):
    __tablename__ = "view_configs"

    id = Column(Integer, primary_key=True, index=True)
    wallpaper_id = Column(String, ForeignKey("wallpapers.id"), nullable=False)
    user = Column(String, default="default", index=True)
    fov = Column(Float, default=60.0)
    cam_matrix = Column(Text, nullable=True) # JSON string
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    wallpaper = relationship("Wallpaper", back_populates="view_configs")

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
