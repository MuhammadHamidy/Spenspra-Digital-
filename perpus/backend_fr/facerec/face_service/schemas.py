from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")

class ExtractResponse(BaseModel):
    success: bool
    face_count: int
    embedding: Optional[List[float]] = None
    bounding_box: Optional[List[int]] = None
    message: Optional[str] = None

class CompareRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]

class CompareResponse(BaseModel):
    similarity: float
    distance: float
    is_match: bool

class LivenessRequest(BaseModel):
    image_base64: str

class LivenessResponse(BaseModel):
    is_live: bool
    confidence: float
    message: Optional[str] = None
