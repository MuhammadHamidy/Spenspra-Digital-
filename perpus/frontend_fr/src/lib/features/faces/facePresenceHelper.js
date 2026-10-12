/**
 * Detect whether a person is present in camera frame before triggering facial extraction.
 * 1. Native Chromium FaceDetector API (Chrome / Edge / Android)
 * 2. Canvas Center-ROI Facial Presence & Contrast Check (fallback)
 */
export async function detectFacePresence(video, canvas) {
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const detectedFaces = await detector.detect(video);
      if (Array.isArray(detectedFaces) && detectedFaces.length > 0) {
        return true;
      }
    } catch {
      // Fallback to canvas ROI analysis
    }
  }

  try {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return false;

    // Sample central 60% box where face is placed
    const roiX = Math.floor(w * 0.20);
    const roiY = Math.floor(h * 0.15);
    const roiW = Math.floor(w * 0.60);
    const roiH = Math.floor(h * 0.65);

    const imgData = ctx.getImageData(roiX, roiY, roiW, roiH).data;
    const totalPixels = imgData.length / 4;
    let brightnessSum = 0;
    let varianceSum = 0;

    for (let i = 0; i < imgData.length; i += 8) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      brightnessSum += (r + g + b) / 3;
    }
    const avgBrightness = brightnessSum / (totalPixels / 2);

    // If frame is pitch dark (< 20) or blown-out white ceiling (> 245), no face present
    if (avgBrightness < 20 || avgBrightness > 245) {
      return false;
    }

    // Measure gradient contrast
    for (let i = 0; i < imgData.length; i += 8) {
      const gray = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
      varianceSum += Math.abs(gray - avgBrightness);
    }
    const avgContrast = varianceSum / (totalPixels / 2);

    return avgContrast >= 11;
  } catch {
    return true; // Fail-safe
  }
}
