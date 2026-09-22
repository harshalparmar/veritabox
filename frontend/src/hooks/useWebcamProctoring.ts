import { useEffect, useRef, useCallback } from 'react';
import { hackathonsApi } from '@/lib/api';
import { toast } from 'sonner';

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const JPEG_QUALITY = 0.6;

export function useWebcamProctoring(hackathonId: string, roundNumber: number, intervalMinutes: number) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Retry queue: holds payloads that failed to upload
  const retryQueueRef = useRef<Array<{ imageData: string; roundNumber: number }>>([]);

  const uploadSnapshot = useCallback(async (payload: { imageData: string; roundNumber: number }) => {
    try {
      await hackathonsApi.submitProctorSnapshot(hackathonId, payload);
    } catch {
      retryQueueRef.current.push(payload);
    }
  }, [hackathonId]);

  const flushRetryQueue = useCallback(async () => {
    if (retryQueueRef.current.length === 0) return;
    const pending = [...retryQueueRef.current];
    retryQueueRef.current = [];
    for (const item of pending) {
      await uploadSnapshot(item);
    }
  }, [uploadSnapshot]);

  const captureAndUpload = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const imageData = canvasRef.current.toDataURL('image/jpeg', JPEG_QUALITY);

    await flushRetryQueue();
    await uploadSnapshot({ imageData, roundNumber });
  }, [hackathonId, roundNumber, uploadSnapshot, flushRetryQueue]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startProctoring = useCallback(async () => {
    try {
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.width = VIDEO_WIDTH;
        video.height = VIDEO_HEIGHT;
        video.autoplay = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;
      }

      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = VIDEO_WIDTH;
        canvas.height = VIDEO_HEIGHT;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT }
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Initial snapshot after stream stabilizes
      setTimeout(() => captureAndUpload(), 3000);

    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error("Camera Permission Required", {
          description: "You must grant camera access to participate. Please allow camera permissions and click 'Initialize Security' again.",
          duration: 10000,
        });
      } else {
        toast.error("Camera Initialization Failed", {
          description: "Could not start webcam. Please check your device and try again.",
        });
      }
    }
  }, [captureAndUpload]);

  // Interval-based snapshots
  useEffect(() => {
    if (intervalMinutes <= 0) return;
    const intervalId = setInterval(captureAndUpload, intervalMinutes * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [intervalMinutes, captureAndUpload]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
      // Remove hidden elements from DOM
      if (videoRef.current?.parentNode) videoRef.current.parentNode.removeChild(videoRef.current);
      if (canvasRef.current?.parentNode) canvasRef.current.parentNode.removeChild(canvasRef.current);
    };
  }, [stopStream]);

  return { startProctoring, stopStream };
}
