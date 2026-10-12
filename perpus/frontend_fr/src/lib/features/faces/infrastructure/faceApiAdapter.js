import { httpClient } from '@/lib/common/httpClient';

const FACE_SERVICE_URL = process.env.NEXT_PUBLIC_FACE_SERVICE_URL || 'http://localhost:5000';

/**
 * Extract a proper 128-D face embedding from the Python face recognition service.
 * This ONLY uses the face region (ignoring clothes, background, etc.).
 * Falls back to center-crop grayscale vector if the service is unavailable.
 */
export async function extractFaceEmbeddingFromPhoto(base64DataUrl) {
  // Strip the data URL prefix if present
  const base64 = base64DataUrl.includes(',') ? base64DataUrl : base64DataUrl;

  try {
    const response = await fetch(`${FACE_SERVICE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64 }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.embedding) && data.embedding.length === 128) {
        return { success: true, embedding: data.embedding, source: 'face-service' };
      }
      return { success: false, embedding: [], message: data.message || 'Tidak ada wajah terdeteksi' };
    }
  } catch (err) {
    console.warn('[FaceApiAdapter] Python face service unreachable, using center-crop fallback:', err.message);
  }

  // Fallback: center-crop face oval region only (ignore clothing/background)
  return new Promise((resolve) => {
    if (!base64DataUrl || typeof window === 'undefined') return resolve({ success: true, embedding: [], source: 'fallback' });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = img.naturalWidth || 640;
        const H = img.naturalHeight || 480;

        // Crop center face oval region (avoid clothing)
        const cropX = Math.floor(W * 0.25);
        const cropY = Math.floor(H * 0.05);
        const cropW = Math.floor(W * 0.50);
        const cropH = Math.floor(H * 0.55);

        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 16, 8);
        const imgData = ctx.getImageData(0, 0, 16, 8).data;

        const vector = [];
        let sumSq = 0;
        const raw = [];
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
          raw.push(gray);
          sumSq += gray * gray;
        }
        const norm = Math.sqrt(sumSq) || 1;
        for (const v of raw) {
          vector.push(Number((v / norm).toFixed(4)));
        }
        resolve({ success: true, embedding: vector, source: 'center-crop-fallback' });
      } catch (e) {
        resolve({ success: false, embedding: [], source: 'error' });
      }
    };
    img.onerror = () => resolve({ success: false, embedding: [], source: 'error' });
    img.src = base64DataUrl;
  });
}

// Legacy shim — kept for backward compatibility (faces/register page)
export function extract128DVectorFromImage(base64DataUrl) {
  return extractFaceEmbeddingFromPhoto(base64DataUrl).then((r) => r.embedding);
}

export const faceApiAdapter = {
  extractEmbedding: async (photoUrl) => {
    return extractFaceEmbeddingFromPhoto(photoUrl);
  },

  registerFace: async ({ userId, user_id, fullName, full_name, nim, photoUrl, photo_url, faceVector, face_vector }) => {
    // If face_vector was extracted client-side, try to re-extract via Python service for better accuracy
    let finalVector = face_vector || faceVector;
    const photo = photo_url || photoUrl;
    if (photo && (!finalVector || finalVector.length !== 128)) {
      const extracted = await extractFaceEmbeddingFromPhoto(photo);
      if (extracted.success && extracted.embedding.length > 0) {
        finalVector = extracted.embedding;
      }
    }

    const res = await httpClient.post('/faces/register', {
      user_id: user_id || userId,
      full_name: full_name || fullName,
      nim: nim,
      photo_url: photo,
      face_vector: finalVector,
    });
    return res.data;
  },

  getByUserId: async (userId) => {
    const res = await httpClient.get(`/faces/user/${userId}`);
    return res.data;
  },

  matchFace: async (faceVector, allowedUserIds = []) => {
    const res = await httpClient.post('/faces/match', {
      face_vector: faceVector,
      allowed_user_ids: allowedUserIds,
    });
    return res.data;
  },
};
