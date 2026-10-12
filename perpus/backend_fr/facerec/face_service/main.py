from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import ExtractRequest, ExtractResponse, CompareRequest, CompareResponse, LivenessRequest, LivenessResponse
from engine import extract_face_embedding, compute_similarity
from liveness import check_liveness
import uvicorn
import os

app = FastAPI(title="Face Recognition Microservice API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "face-recognition-python", "version": "1.1.0"}

@app.post("/extract", response_model=ExtractResponse)
def extract_embedding(req: ExtractRequest):
    res = extract_face_embedding(req.image_base64)
    return res

@app.post("/compare", response_model=CompareResponse)
def compare_embeddings(req: CompareRequest):
    res = compute_similarity(req.embedding1, req.embedding2)
    return res

@app.post("/liveness", response_model=LivenessResponse)
def liveness_check(req: LivenessRequest):
    res = check_liveness(req.image_base64)
    return res

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    workers = int(os.getenv("WORKERS", 1))
    # If workers > 1, reload must be False
    reload_mode = workers == 1 and os.getenv("ENV") != "production"
    uvicorn.run("main:app", host="0.0.0.0", port=port, workers=workers, reload=reload_mode)
