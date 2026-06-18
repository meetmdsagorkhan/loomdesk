"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Coffee, Clock } from "lucide-react";
import { CheckOutModal } from "./CheckOutModal";

export function TimeTrackerWidget() {
  const [status, setStatus] = useState<"IDLE" | "ACTIVE" | "ON_BREAK">("IDLE");
  const [timeEntryId, setTimeEntryId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Screen Capture Refs
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    fetchCurrentStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "ACTIVE") {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === "ACTIVE") {
      screenshotIntervalRef.current = setInterval(captureScreenshot, 300000); // 5 mins
    } else {
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    }
    return () => {
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    };
  }, [status, timeEntryId]);

  const captureScreenshot = async () => {
    if (!timeEntryId || !mediaStreamRef.current || !videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video is playing
      if (video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL("image/jpeg", 0.5);
      
      await fetch("/api/time-tracking/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, timeEntryId }),
      });
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  const startScreenCapture = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        // Automatically prompt checkout if they stop sharing
        if (status === "ACTIVE" || status === "ON_BREAK") {
          setIsCheckOutModalOpen(true);
        }
      };
      return true;
    } catch (error) {
      console.error("User denied screen share:", error);
      alert("Screen sharing is required to check in. Please allow access to your screen.");
      return false;
    }
  };

  const stopScreenCapture = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const fetchCurrentStatus = async () => {
    try {
      const res = await fetch("/api/time-tracking");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      if (data.timeEntry) {
        setStatus(data.timeEntry.status);
        setTimeEntryId(data.timeEntry.id);
        
        // Calculate elapsed time (rough estimate)
        const checkInTime = new Date(data.timeEntry.checkInTime).getTime();
        const now = new Date().getTime();
        let activeMs = now - checkInTime;

        // Subtract break duration if needed... for simplicity we just set a rough elapsed time here,
        // In reality, we'd subtract total break duration.
        const totalBreaksMs = data.timeEntry.breaks.reduce((acc: number, b: any) => acc + (b.duration ? b.duration * 60000 : 0), 0);
        activeMs -= totalBreaksMs;
        
        if (data.timeEntry.status === "ON_BREAK") {
          const activeBreak = data.timeEntry.breaks.find((b: any) => !b.endTime);
          if (activeBreak) {
            const breakStart = new Date(activeBreak.startTime).getTime();
            activeMs -= (now - breakStart); // Don't count current ongoing break
          }
        }
        
        setElapsedSeconds(Math.max(0, Math.floor(activeMs / 1000)));
      } else {
        setStatus("IDLE");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const hasPermission = await startScreenCapture();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/time-tracking", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatus("ACTIVE");
        setTimeEntryId(data.timeEntry.id);
        setElapsedSeconds(0);
      } else {
        stopScreenCapture();
      }
    } catch (err) {
      console.error(err);
      stopScreenCapture();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    setIsLoading(true);
    try {
      if (status === "ACTIVE") {
        await fetch("/api/time-tracking/breaks", { method: "POST" });
        setStatus("ON_BREAK");
      } else if (status === "ON_BREAK") {
        await fetch("/api/time-tracking/breaks", { method: "PATCH" });
        setStatus("ACTIVE");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (note: string) => {
    const res = await fetch("/api/time-tracking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error("Failed to checkout");
    setStatus("IDLE");
    setTimeEntryId(null);
    setElapsedSeconds(0);
    stopScreenCapture();
  };

  if (isLoading && status === "IDLE") return null;

  return (
    <>
      {/* Hidden elements for screen capturing */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="fixed bottom-6 right-6 z-40">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-blue-900/20 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className={`w-5 h-5 ${status === "ACTIVE" ? "text-green-400 animate-pulse" : status === "ON_BREAK" ? "text-yellow-400" : "text-gray-400"}`} />
            <span className="font-mono text-xl font-bold tracking-wider text-white">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status === "IDLE" ? (
              <button
                onClick={handleCheckIn}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-green-500/25"
              >
                <Play className="w-4 h-4 fill-current" />
                Check In
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleBreak}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                    status === "ON_BREAK"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                      : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  {status === "ON_BREAK" ? "Resume Work" : "Break"}
                </button>

                <button
                  onClick={() => setIsCheckOutModalOpen(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-red-500/25"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Check Out
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <CheckOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        onConfirm={handleCheckOut}
      />
    </>
  );
}
