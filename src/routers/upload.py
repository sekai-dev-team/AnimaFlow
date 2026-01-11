from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
import os

from src.database import get_db, Wallpaper, SessionLocal
from src.core.config import settings
from src.services.sharp_service import sharp_service

router = APIRouter()

def process_and_update_db(wallpaper_id: str, input_path: Path, ply_path: Path):
    try:
        # Run sharp inference
        sharp_service.process_image(input_path, ply_path)
        
        # Update DB
        new_db = SessionLocal()
        try:
            wp = new_db.query(Wallpaper).filter(Wallpaper.id == wallpaper_id).first()
            if wp:
                # Store relative path so it works in docker/static mounts
                # ply_path is absolute, settings.BASE_DIR is absolute
                try:
                    rel_ply = str(ply_path.relative_to(settings.BASE_DIR))
                except ValueError:
                    # Fallback if paths don't match (shouldn't happen in configured env)
                    rel_ply = str(ply_path)
                    
                wp.ply_path = rel_ply
                new_db.commit()
        finally:
            new_db.close()
            
    except Exception as e:
        print(f"Error processing wallpaper {wallpaper_id}: {e}")

@router.post("/")
async def upload_image(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    file_ext = Path(file.filename).suffix
    is_ply = file_ext.lower() == ".ply"

    if not file.content_type.startswith("image/") and not is_ply:
        raise HTTPException(status_code=400, detail="File must be an image or a .ply file")

    # Generate ID
    if not file_ext:
        file_ext = ".jpg" 
        
    wp_id = str(uuid.uuid4())
    filename = f"{wp_id}{file_ext}"
    
    # Absolute paths for file operations
    ply_filename = f"{wp_id}.ply"
    ply_path = settings.GENERATED_DIR / ply_filename

    # Decide where to save based on type
    if is_ply:
        # Save directly to generated folder to avoid duplication
        target_save_path = ply_path
        # For PLY uploads, the "upload path" is effectively the generated path
        upload_path = ply_path
    else:
        # Standard image upload
        upload_path = settings.UPLOAD_DIR / filename
        target_save_path = upload_path

    # Save uploaded file
    with open(target_save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB entry with relative paths
    try:
        rel_upload_path = str(upload_path.relative_to(settings.BASE_DIR))
    except ValueError:
        rel_upload_path = str(upload_path)
    
    # If it is PLY, we set ply_path immediately
    db_ply_path = None
    if is_ply:
         try:
            db_ply_path = str(ply_path.relative_to(settings.BASE_DIR))
         except ValueError:
            db_ply_path = str(ply_path)

    new_wallpaper = Wallpaper(
        id=wp_id,
        filename=file.filename,
        upload_path=rel_upload_path,
        ply_path=db_ply_path 
    )
    db.add(new_wallpaper)
    db.commit()
    db.refresh(new_wallpaper)

    # Trigger background processing only if NOT a PLY
    if not is_ply:
        background_tasks.add_task(process_and_update_db, wp_id, upload_path, ply_path)

    return {"id": wp_id, "status": "completed" if is_ply else "processing"}

@router.get("/")
def get_wallpapers(db: Session = Depends(get_db)):
    wallpapers = db.query(Wallpaper).order_by(Wallpaper.created_at.desc()).all()
    return wallpapers

@router.get("/{wallpaper_id}")
def get_wallpaper(wallpaper_id: str, db: Session = Depends(get_db)):
    wallpaper = db.query(Wallpaper).filter(Wallpaper.id == wallpaper_id).first()
    if not wallpaper:
        raise HTTPException(status_code=404, detail="Wallpaper not found")
    return wallpaper
