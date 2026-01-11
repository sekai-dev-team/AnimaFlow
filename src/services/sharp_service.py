import sys
import os
import requests
from pathlib import Path
import logging

from src.core.config import settings

LOGGER = logging.getLogger(__name__)

# Conditional imports to support Lite version without Torch/ML dependencies
try:
    import torch
    import torch.nn.functional as F
    import numpy as np

    # Add sharp source to path to enable imports
    sharp_src = settings.BASE_DIR / "sharp" / "src"
    if str(sharp_src) not in sys.path:
        sys.path.append(str(sharp_src))

    from sharp.models import PredictorParams, create_predictor
    from sharp.utils import io
    from sharp.utils.gaussians import unproject_gaussians, save_ply
    
    ML_AVAILABLE = True
except ImportError:
    LOGGER.warning("Torch or Sharp dependencies not found. ML features will be disabled.")
    ML_AVAILABLE = False
    # Define dummy placeholders if needed, though we will guard usage
    torch = None

class SharpService:
    MODEL_URL = "https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt"

    def __init__(self):
        self.available = ML_AVAILABLE
        if self.available:
            self.device = self._get_device()
            self.model = None
            self.internal_shape = (1536, 1536)
        else:
            self.device = None
            self.model = None

    def _get_device(self):
        if not self.available:
            return None
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch, "mps") and torch.mps.is_available():
             return "mps"
        return "cpu"

    def _download_model(self, target_path: Path):
        LOGGER.info(f"Downloading Sharp model weights from {self.MODEL_URL}...")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with requests.get(self.MODEL_URL, stream=True) as r:
                r.raise_for_status()
                with open(target_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192): 
                        f.write(chunk)
            LOGGER.info("Model download complete.")
        except Exception as e:
            LOGGER.error(f"Failed to download model: {e}")
            # Clean up partial file
            if target_path.exists():
                target_path.unlink()
            raise

    def load_model(self):
        if not self.available:
            LOGGER.info("ML mode disabled. Skipping model load.")
            return

        if self.model is not None:
            return

        checkpoint_path = settings.SHARP_WEIGHTS_PATH
        
        # Auto-download if missing
        if not checkpoint_path.exists():
            LOGGER.warning(f"Sharp model weights not found at {checkpoint_path}. Attempting download...")
            self._download_model(checkpoint_path)

        LOGGER.info(f"Loading Sharp model from {checkpoint_path} on {self.device}")
        
        # Load state dict
        if self.device == "cuda":
            state_dict = torch.load(checkpoint_path)
        else:
            state_dict = torch.load(checkpoint_path, map_location=self.device)
            
        self.model = create_predictor(PredictorParams())
        self.model.load_state_dict(state_dict)
        self.model.eval()
        self.model.to(self.device)

    def process_image(self, input_path: Path, output_ply_path: Path):
        """
        Runs the Sharp model inference on the input image and saves the PLY.
        """
        if not self.available:
            LOGGER.error("Process image requested but ML is not available.")
            raise RuntimeError("ML features are not installed in this environment.")

        with torch.no_grad():
            self._process_image_internal(input_path, output_ply_path)

    def _process_image_internal(self, input_path: Path, output_ply_path: Path):
        if self.model is None:
            self.load_model()
            
        LOGGER.info(f"Processing image: {input_path}")
        
        # 1. Load Image
        # sharp.utils.io.load_rgb returns (image, original_image, f_px)
        # image is numpy array (H, W, 3) uint8
        image, _, f_px = io.load_rgb(input_path)
        height, width = image.shape[:2]
        
        # 2. Preprocess
        # Convert to tensor, normalize to [0, 1], permute to (C, H, W)
        image_pt = torch.from_numpy(image.copy()).float().to(self.device).permute(2, 0, 1) / 255.0
        _, h, w = image_pt.shape # should match height, width
        
        disparity_factor = torch.tensor([f_px / width]).float().to(self.device)

        image_resized_pt = F.interpolate(
            image_pt[None],
            size=(self.internal_shape[1], self.internal_shape[0]),
            mode="bilinear",
            align_corners=True,
        )

        # 3. Inference
        LOGGER.info("Running inference...")
        gaussians_ndc = self.model(image_resized_pt, disparity_factor)

        # 4. Post-processing
        LOGGER.info("Running postprocessing...")
        intrinsics = (
            torch.tensor(
                [
                    [f_px, 0, width / 2, 0],
                    [0, f_px, height / 2, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1],
                ]
            )
            .float()
            .to(self.device)
        )
        
        intrinsics_resized = intrinsics.clone()
        intrinsics_resized[0] *= self.internal_shape[0] / width
        intrinsics_resized[1] *= self.internal_shape[1] / height

        # Convert Gaussians to metrics space
        gaussians = unproject_gaussians(
            gaussians_ndc, torch.eye(4).to(self.device), intrinsics_resized, self.internal_shape
        )
        
        # 5. Save PLY
        output_ply_path.parent.mkdir(parents=True, exist_ok=True)
        LOGGER.info(f"Saving PLY to {output_ply_path}")
        save_ply(gaussians, f_px, (height, width), output_ply_path)
        LOGGER.info("Done.")

# Singleton instance
sharp_service = SharpService()
