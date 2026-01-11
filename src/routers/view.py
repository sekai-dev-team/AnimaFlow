from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from src.database import get_db, ViewConfig, Wallpaper

router = APIRouter()

class ViewConfigSchema(BaseModel):
    wallpaper_id: str
    user: str
    fov: float
    cam_matrix: Optional[str] = None # JSON string

@router.get("/{wallpaper_id}")
def get_view_config(wallpaper_id: str, user: str = "default", db: Session = Depends(get_db)):
    # Try to find specific user config
    config = db.query(ViewConfig).filter(
        ViewConfig.wallpaper_id == wallpaper_id,
        ViewConfig.user == user
    ).first()
    
    if not config and user != "default":
        # Fallback to default (global config for this wallpaper)
        config = db.query(ViewConfig).filter(
            ViewConfig.wallpaper_id == wallpaper_id,
            ViewConfig.user == "default"
        ).first()
        
    if not config:
        # Return default values if nothing found
        return {"fov": 60.0, "cam_matrix": None}
        
    return config

@router.post("/")
def save_view_config(config_data: ViewConfigSchema, db: Session = Depends(get_db)):
    # Check if exists
    config = db.query(ViewConfig).filter(
        ViewConfig.wallpaper_id == config_data.wallpaper_id,
        ViewConfig.user == config_data.user
    ).first()
    
    if config:
        config.fov = config_data.fov
        config.cam_matrix = config_data.cam_matrix
    else:
        config = ViewConfig(
            wallpaper_id=config_data.wallpaper_id,
            user=config_data.user,
            fov=config_data.fov,
            cam_matrix=config_data.cam_matrix
        )
        db.add(config)
        
    db.commit()
    db.refresh(config)
    return config