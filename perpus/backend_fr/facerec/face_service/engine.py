import base64
import io
import numpy as np
import cv2
try:
    import face_recognition
except ImportError:
    face_recognition = None

def base64_to_cv2_image(base64_str: str) -> np.ndarray:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    image_bytes = base64.b64decode(base64_str)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return image

def apply_clahe(img_bgr: np.ndarray) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalization to handle lighting & specular highlights (glasses)."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def extract_face_embedding(image_base64: str):
    try:
        img = base64_to_cv2_image(image_base64)
        if img is None:
            return {"success": False, "face_count": 0, "embedding": None, "bounding_box": None, "message": "Invalid image format"}

        # Downscale image to max width 400px for 3x faster detection while preserving high accuracy
        h, w = img.shape[:2]
        scale = 1.0
        proc_img = img
        if w > 400:
            scale = 400.0 / w
            new_h = int(h * scale)
            proc_img = cv2.resize(img, (400, new_h), interpolation=cv2.INTER_AREA)

        # Apply lighting normalization on the scaled image
        img_norm = apply_clahe(proc_img)
        rgb_norm_img = cv2.cvtColor(img_norm, cv2.COLOR_BGR2RGB)

        if face_recognition is not None:
            boxes = face_recognition.face_locations(rgb_norm_img, model="hog")
            if len(boxes) == 0:
                # Fast fallback: try raw rgb without CLAHE if CLAHE was too aggressive
                rgb_proc = cv2.cvtColor(proc_img, cv2.COLOR_BGR2RGB)
                boxes = face_recognition.face_locations(rgb_proc, model="hog")

            if len(boxes) == 0:
                return {"success": False, "face_count": 0, "embedding": None, "bounding_box": None, "message": "No face detected in image"}
            if len(boxes) > 1:
                return {"success": False, "face_count": len(boxes), "embedding": None, "bounding_box": None, "message": "Multiple faces detected. Please ensure only one face is present."}

            # Single-pass encoding for 2x faster inference (num_jitters=1)
            encodings = face_recognition.face_encodings(rgb_norm_img, known_face_locations=boxes, num_jitters=1)
            if len(encodings) == 0:
                return {"success": False, "face_count": 0, "embedding": None, "bounding_box": None, "message": "Failed to extract face features"}

            embedding = encodings[0].tolist()

            # Rescale bounding box to match original image dimensions
            top, right, bottom, left = boxes[0]
            if scale != 1.0:
                inv_scale = 1.0 / scale
                left = int(left * inv_scale)
                top = int(top * inv_scale)
                right = int(right * inv_scale)
                bottom = int(bottom * inv_scale)

            return {
                "success": True,
                "face_count": 1,
                "embedding": embedding,
                "bounding_box": [left, top, right - left, bottom - top],
                "message": "Face embedding extracted successfully"
            }
        else:
            # Fallback for lightweight / OpenCV Haar Cascade if face_recognition is not compiled locally
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(img_norm, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detect_multi_scale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(faces) == 0:
                return {"success": False, "face_count": 0, "embedding": None, "bounding_box": None, "message": "No face detected"}
            if len(faces) > 1:
                return {"success": False, "face_count": len(faces), "embedding": None, "bounding_box": None, "message": "Multiple faces detected"}

            (x, y, fw, fh) = faces[0]
            face_crop = cv2.resize(gray[y:y+fh, x:x+fw], (36, 36))
            face_crop = cv2.equalizeHist(face_crop)
            face_roi = cv2.resize(face_crop, (16, 8)).flatten().astype(float)
            norm = np.linalg.norm(face_roi)
            if norm > 0:
                face_roi /= norm
            embedding = face_roi.tolist()

            if scale != 1.0:
                inv_scale = 1.0 / scale
                x = int(x * inv_scale)
                y = int(y * inv_scale)
                fw = int(fw * inv_scale)
                fh = int(fh * inv_scale)

            return {
                "success": True,
                "face_count": 1,
                "embedding": embedding,
                "bounding_box": [int(x), int(y), int(fw), int(fh)],
                "message": "Face extracted using OpenCV fallback with contrast normalization"
            }
    except Exception as e:
        return {"success": False, "face_count": 0, "embedding": None, "bounding_box": None, "message": str(e)}

def compute_similarity(emb1: list, emb2: list) -> dict:
    arr1 = np.array(emb1, dtype=float)
    arr2 = np.array(emb2, dtype=float)

    if len(arr1) != len(arr2) or len(arr1) == 0:
        return {"similarity": 0.0, "distance": 1.0, "is_match": False}

    # Normalize vectors
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 > 0:
        arr1 = arr1 / norm1
    if norm2 > 0:
        arr2 = arr2 / norm2

    # Euclidean distance
    euc_distance = float(np.linalg.norm(arr1 - arr2))

    # Cosine distance
    dot_prod = float(np.dot(arr1, arr2))
    cosine_distance = max(0.0, 1.0 - dot_prod)

    # Calibrated threshold for glasses / clothes invariance
    # Typical euclidean threshold for 128D face_recognition is ~0.55-0.6
    threshold = 0.54
    is_match = euc_distance <= threshold or cosine_distance <= 0.38

    # Calculate overall similarity score between 0.0 and 1.0
    combined_dist = 0.6 * euc_distance + 0.4 * (cosine_distance * 1.4)
    similarity = max(0.0, min(1.0, 1.0 - (combined_dist / 1.1)))

    return {
        "similarity": round(similarity, 4),
        "distance": round(euc_distance, 4),
        "is_match": is_match
    }

