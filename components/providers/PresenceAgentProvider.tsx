"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";

interface PresenceAgentContextType {
  state: string;
  isCameraActive: boolean;
  resolution: string;
  fps: number;
  error: string | null;
}

const PresenceAgentContext = createContext<PresenceAgentContextType>({
  state: "Offline",
  isCameraActive: false,
  resolution: "320x180",
  fps: 5,
  error: null,
});

export const usePresenceAgent = () => useContext(PresenceAgentContext);

export function PresenceAgentProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useCurrentUser();
  const [state, setState] = useState("Offline");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [resolution, setResolution] = useState("320x180");
  const [fps, setFps] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSignalRef = useRef<string>("low"); // "low" or "high"

  // 1. Setup activity listeners for Idle/Away tracking
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "MEMBER") return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("visibilitychange", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("visibilitychange", handleActivity);
    };
  }, [isAuthenticated, user]);

  // 2. Initialize camera & real-time analytics
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "MEMBER") {
      cleanupCamera();
      return;
    }

    // Attempt to start camera automatically if permission is already granted
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((permissionStatus) => {
        if (permissionStatus.state === "granted") {
          startCamera();
        } else {
          setState("Monitoring Error");
          setError("Webcam permission not granted");
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === "granted") {
            startCamera();
          } else {
            cleanupCamera();
            setState("Monitoring Error");
            setError("Webcam permission revoked");
          }
        };
      })
      .catch(() => {
        // Fallback to trying to start camera directly (triggers browser dialog if needed)
        startCamera();
      });

    // Clean up on unmount or logout
    return () => {
      cleanupCamera();
    };
  }, [isAuthenticated, user]);

  // 3. Setup signaling channel (Supabase fallback to short-poll)
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "MEMBER") return;

    let subscription: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    if (supabase) {
      // Connect to signaling channel for this employee
      const channel = supabase.channel(`monitoring:signals:${user.id}`);
      
      channel
        .on("broadcast", { event: "upgrade-stream" }, () => {
          console.log("Upgrading stream to high quality");
          upgradeStream();
        })
        .on("broadcast", { event: "downgrade-stream" }, () => {
          console.log("Downgrading stream to low quality");
          downgradeStream();
        })
        .on("broadcast", { event: "take-screenshot" }, async ({ payload }) => {
          console.log("Taking screenshot requested by admin");
          await captureAndUploadScreenshot(payload?.reason || "Instant Screenshot");
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("Subscribed to admin signaling channel");
          }
        });

      subscription = channel;
    } else {
      // Fallback: poll for command signals
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/monitoring/presence?userId=${user.id}&checkCommands=true`);
          if (res.ok) {
            const data = await res.json();
            if (data.command === "upgrade") upgradeStream();
            else if (data.command === "downgrade") downgradeStream();
            
            if (data.takeScreenshot) {
              await captureAndUploadScreenshot(data.screenshotReason || "Scheduled Screenshot");
            }
          }
        } catch (err) {
          console.error("Signal poll error:", err);
        }
      }, 5000);
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isAuthenticated, user]);

  const startCamera = async () => {
    try {
      cleanupCamera();

      // Create video and canvas elements dynamically if not mounted
      if (!videoRef.current) {
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.display = "none";
        videoRef.current = video;
        document.body.appendChild(video);
      }

      if (!canvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.style.display = "none";
        canvasRef.current = canvas;
        document.body.appendChild(canvas);
      }

      // Initialize in thumbnail/low-bandwidth mode by default
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 180 },
          frameRate: { ideal: 5 },
        },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setIsCameraActive(true);
      setError(null);
      setState("Present");

      // Start the frame analysis loop
      startAnalysisLoop();
    } catch (err: any) {
      console.error("Camera monitoring failed to start:", err);
      setState("Monitoring Error");
      setError(err.message || "Failed to initialize webcam");
    }
  };

  const cleanupCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove();
      videoRef.current = null;
    }

    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    setIsCameraActive(false);
    // Send final offline/stop event to the API before closing
    if (isAuthenticated && user?.id) {
      navigator.sendBeacon(
        "/api/monitoring/presence",
        JSON.stringify({ state: "Offline", metadata: { reason: "session_ended" } })
      );
    }
  };

  // Adjust camera constraints dynamically
  const upgradeStream = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        });
        setResolution("1280x720");
        setFps(30);
        currentSignalRef.current = "high";
      } catch (err) {
        console.error("Failed to upgrade camera stream constraints:", err);
      }
    }
  };

  const downgradeStream = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          width: { ideal: 320 },
          height: { ideal: 180 },
          frameRate: { ideal: 5 },
        });
        setResolution("320x180");
        setFps(5);
        currentSignalRef.current = "low";
      } catch (err) {
        console.error("Failed to downgrade camera stream constraints:", err);
      }
    }
  };

  // Take client-side canvas snapshot of current stream
  const captureAndUploadScreenshot = async (reason: string) => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL("image/jpeg", 0.6);

    try {
      await fetch("/api/monitoring/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, imageUrl, reason }),
      });
    } catch (err) {
      console.error("Upload screenshot failed:", err);
    }
  };

  // 4. Analytics Loop (runs every 4 seconds)
  const startAnalysisLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !user) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0) return;

      canvas.width = 160; // downsample for analytical speed
      canvas.height = 90;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;

      // Calculate average luminance and pixel variance (to detect covered/blocked camera)
      let sumLuminance = 0;
      const totalPixels = canvas.width * canvas.height;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLuminance += luminance;
      }

      const avgLuminance = sumLuminance / totalPixels;

      let varianceSum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        varianceSum += Math.pow(luminance - avgLuminance, 2);
      }
      const pixelVariance = varianceSum / totalPixels;

      // Determine presence state
      let calculatedState = "Present";

      // Covered camera typically has very low average luminance and nearly zero variance
      if (avgLuminance < 15 && pixelVariance < 45) {
        calculatedState = "Camera Blocked";
      } else {
        // Face detection implementation
        // Fallback or native Chrome Shape Detection API
        const FaceDetectorClass = (window as any).FaceDetector;
        if (FaceDetectorClass) {
          try {
            const detector = new FaceDetectorClass({ maxDetectedFaces: 5, fastMode: true });
            const faces = await detector.detect(video);
            if (faces.length === 0) {
              calculatedState = "Away From Desk";
            } else if (faces.length > 1) {
              calculatedState = "Multiple People Detected";
            }
          } catch (err) {
            console.error("FaceDetector API failed", err);
          }
        }
      }

      // Check inactivity timers if state is still standard
      if (calculatedState === "Present") {
        const idleDuration = Date.now() - lastActivityRef.current;
        if (idleDuration >= 10 * 60 * 1000) {
          calculatedState = "Away From Desk";
        } else if (idleDuration >= 3 * 60 * 1000) {
          calculatedState = "Idle";
        } else {
          calculatedState = "Active";
        }
      }

      // If state has changed or 30 seconds have passed, push update to backend
      if (calculatedState !== state || Math.random() < 0.15) {
        setState(calculatedState);
        pushStateToBackend(calculatedState, { avgLuminance, pixelVariance, resolution, fps });
      }
    }, 4000);
  };

  const pushStateToBackend = async (newState: string, metrics: any) => {
    try {
      await fetch("/api/monitoring/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState, metadata: metrics }),
      });
    } catch (err) {
      console.error("Failed to push presence update:", err);
    }
  };

  // Listen to network change/tab close
  useEffect(() => {
    const handleUnload = () => {
      cleanupCamera();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isAuthenticated]);

  return (
    <PresenceAgentContext.Provider value={{ state, isCameraActive, resolution, fps, error }}>
      {children}
    </PresenceAgentContext.Provider>
  );
}
