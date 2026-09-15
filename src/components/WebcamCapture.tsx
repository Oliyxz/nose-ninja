import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

export interface WebcamRef {
  getVideoElement: () => HTMLVideoElement | null;
  getProcessedCanvas: () => HTMLCanvasElement | null;
}

interface WebcamCaptureProps {
  onVideoReady?: () => void;
}

const WebcamCapture = forwardRef<WebcamRef, WebcamCaptureProps>(({ onVideoReady }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getProcessedCanvas: () => processedCanvasRef.current,
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrameId: number;
    
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setHasPermission(false);
      }
    };

    startWebcam();

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = processedCanvasRef.current;
      const preview = previewCanvasRef.current;
      
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        // Center-crop to a square
        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;

        // Process at 256x256
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          // Draw the center-cropped video frame
          ctx.drawImage(video, sx, sy, size, size, 0, 0, 256, 256);

          const imageData = ctx.getImageData(0, 0, 256, 256);
          const data = imageData.data;

          // Convert to grayscale
          const gray = new Float32Array(256 * 256);
          for (let i = 0; i < data.length; i += 4) {
            gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }

          // Compute local mean using a block-based approach for adaptive thresholding
          // This handles uneven lighting, shadows, and paper gradients
          const blockSize = 15;
          const halfBlock = Math.floor(blockSize / 2);
          const w = 256;
          const h = 256;

          // Build integral image for fast local mean computation
          const integral = new Float64Array((w + 1) * (h + 1));
          for (let y = 0; y < h; y++) {
            let rowSum = 0;
            for (let x = 0; x < w; x++) {
              rowSum += gray[y * w + x];
              integral[(y + 1) * (w + 1) + (x + 1)] = 
                integral[y * (w + 1) + (x + 1)] + rowSum;
            }
          }

          // Apply adaptive threshold with sensitivity factor
          // A pixel is "ink" if it's significantly darker than its local neighborhood
          const sensitivity = 0.85; // Lower = more sensitive to faint lines
          
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const x1 = Math.max(0, x - halfBlock);
              const y1 = Math.max(0, y - halfBlock);
              const x2 = Math.min(w - 1, x + halfBlock);
              const y2 = Math.min(h - 1, y + halfBlock);

              const area = (x2 - x1 + 1) * (y2 - y1 + 1);
              const sum = integral[(y2 + 1) * (w + 1) + (x2 + 1)]
                        - integral[y1 * (w + 1) + (x2 + 1)]
                        - integral[(y2 + 1) * (w + 1) + x1]
                        + integral[y1 * (w + 1) + x1];
              const localMean = sum / area;

              const idx = y * w + x;
              const pixelVal = gray[idx];

              // NORMAL output: ink strokes become BLACK (0) on WHITE (255) background
              // This is what ml5.js DoodleNet actually expects
              const isInk = pixelVal < localMean * sensitivity;
              const outVal = isInk ? 0 : 255;

              data[idx * 4] = outVal;
              data[idx * 4 + 1] = outVal;
              data[idx * 4 + 2] = outVal;
              // alpha stays 255
            }
          }

          ctx.putImageData(imageData, 0, 0);

          // Update the small visible preview
          if (preview) {
            preview.width = 128;
            preview.height = 128;
            const pCtx = preview.getContext('2d');
            if (pCtx) {
              pCtx.drawImage(canvas, 0, 0, 128, 128);
            }
          }
        }
      }
      animFrameId = requestAnimationFrame(processFrame);
    };

    const videoEl = videoRef.current;
    const startProcessing = () => { processFrame(); };
    videoEl?.addEventListener('loadeddata', startProcessing);

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      cancelAnimationFrame(animFrameId);
      videoEl?.removeEventListener('loadeddata', startProcessing);
    };
  }, []);

  return (
    <div className="webcam-wrapper">
      {hasPermission === false ? (
        <div className="webcam-error">
          <AlertCircle size={48} color="var(--accent-color)" />
          <p>Camera access denied or not available.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Please allow camera access to play.</p>
        </div>
      ) : (
        <>
          {!hasPermission && (
             <div className="webcam-loading">
               <Camera className="animate-pulse" size={48} color="var(--text-muted)" />
               <p>Starting camera...</p>
             </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedData={onVideoReady}
            className={`webcam-video ${hasPermission ? 'ready' : ''}`}
          />
          {/* Hidden canvas for AI processing */}
          <canvas ref={processedCanvasRef} style={{ display: 'none' }} />
          
          {/* Small visible preview of what the AI sees */}
          {hasPermission && (
            <div className="ai-preview-container">
              <span className="ai-preview-label">AI Vision</span>
              <canvas ref={previewCanvasRef} className="ai-preview-canvas" />
            </div>
          )}
          
          {hasPermission && (
            <div className="webcam-overlay-guideline">
               <div className="guideline-box"></div>
               <p className="guideline-text">Hold your drawing inside the box</p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default WebcamCapture;
