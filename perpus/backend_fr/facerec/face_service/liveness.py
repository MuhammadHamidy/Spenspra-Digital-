import cv2
import numpy as np
from engine import base64_to_cv2_image

def check_liveness(image_base64: str) -> dict:
    try:
        img = base64_to_cv2_image(image_base64)
        if img is None:
            return {"is_live": False, "confidence": 0.0, "message": "Invalid image format"}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Laplacian variance check for image blur / high resolution natural texture
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Basic anti-spoof texture heuristic
        if laplacian_var < 50.0:
            return {"is_live": False, "confidence": round(float(laplacian_var / 100.0), 2), "message": "Image is too blurry or low quality"}
            
        confidence = min(0.99, max(0.60, laplacian_var / 500.0))
        return {
            "is_live": True,
            "confidence": round(float(confidence), 2),
            "message": "Liveness check passed"
        }
    except Exception as e:
        return {"is_live": False, "confidence": 0.0, "message": str(e)}
