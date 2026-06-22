// @ts-nocheck
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { Room } from "livekit-client";

interface PresenceAgentContextType {
  state: string;
  error: string | null;
}

const PresenceAgentContext = createContext<PresenceAgentContextType>({
  state: "Offline",
  error: null,
});

export const usePresenceAgent = () => useContext(PresenceAgentContext);

export function PresenceAgentProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useCurrentUser();
  const [state, setState] = useState("Offline");
  const [error, setError] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const lastPushedStateRef = useRef<string>("Offline");
  const lastPushedTimeRef = useRef<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // LiveKit room for on-demand video — starts only when admin explicitly requests a view
  const livekitRoomRef = useRef<Room | null>(null);

  // Roles that participate in presence monitoring
  const isMonitoredRole = user?.role === "MEMBER" || user?.role === "TEAM_LEAD";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Activity listeners — track last user interaction for idle/away detection
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isMonitoredRole) return;

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
  }, [isAuthenticated, user?.id, user?.role]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Heartbeat — purely activity-based presence (no camera required)
  //    Pushes state update every 4s, guarantees a heartbeat at least every 30s.
  //    Camera is NO longer auto-started here — it only starts when admin views.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isMonitoredRole) return;

    // Push "Active" immediately on login so admin sees the member right away
    pushStateToBackend("Active", { reason: "session_started" });
    setState("Active");
    lastPushedStateRef.current = "Active";
    lastPushedTimeRef.current = Date.now();

    heartbeatIntervalRef.current = setInterval(() => {
      const idleDuration = Date.now() - lastActivityRef.current;
      let calculatedState: string;

      if (idleDuration >= 10 * 60 * 1000) {
        calculatedState = "Away From Desk";
      } else if (idleDuration >= 3 * 60 * 1000) {
        calculatedState = "Idle";
      } else {
        calculatedState = "Active";
      }

      const now = Date.now();
      const heartbeatDue = now - lastPushedTimeRef.current >= 30_000;

      if (calculatedState !== lastPushedStateRef.current || heartbeatDue) {
        setState(calculatedState);
        lastPushedStateRef.current = calculatedState;
        lastPushedTimeRef.current = now;
        pushStateToBackend(calculatedState, {});
      }
    }, 4000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Disconnect any active LiveKit session on logout
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
      // Send Offline beacon on session end
      const payload = JSON.stringify({ state: "Offline", metadata: { reason: "session_ended" } });
      navigator.sendBeacon(
        "/api/monitoring/presence",
        new Blob([payload], { type: "application/json" })
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.role]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Supabase signaling channel — listens for admin LiveKit view requests
  //    Hidden from the member — no UI notification is shown.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || !isMonitoredRole || !supabase) return;

    const channel = supabase.channel(`monitoring:signals:${user.id}`);

    channel
      .on("broadcast", { event: "livekit-view-request" }, async () => {
        await startLiveKitPublish();
      })
      .on("broadcast", { event: "livekit-view-end" }, async () => {
        await stopLiveKitPublish();
      })
      // Keep screenshot capture signals working as before
      .on("broadcast", { event: "take-screenshot" }, async ({ payload }) => {
        // Screenshot capture is handled by the admin-triggered API
        console.log("Screenshot signal received:", payload?.reason);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.role]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Clean up LiveKit on tab close
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // LiveKit: silently start publishing camera + mic when admin requests a view
  // ─────────────────────────────────────────────────────────────────────────────
  const startLiveKitPublish = async () => {
    if (!user?.id) return;
    if (livekitRoomRef.current) return; // already connected — ignore duplicate requests

    try {
      const res = await fetch(`/api/monitoring/livekit-token?userId=${user.id}&role=member`);
      if (!res.ok) throw new Error("Token fetch failed");
      const { token, url } = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Optimise for monitoring: low latency over quality
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      await room.connect(url, token);
      // Enable camera and microphone — browser will ask permission once and remember it
      await room.localParticipant.enableCameraAndMicrophone();

      livekitRoomRef.current = room;
    } catch (err: any) {
      console.error("LiveKit publish error:", err);
      setError(err.message);
      livekitRoomRef.current = null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LiveKit: disconnect when admin stops viewing
  // ─────────────────────────────────────────────────────────────────────────────
  const stopLiveKitPublish = async () => {
    if (!livekitRoomRef.current) return;
    await livekitRoomRef.current.disconnect();
    livekitRoomRef.current = null;
  };

  const pushStateToBackend = async (newState: string, metrics: Record<string, unknown>) => {
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

  return (
    <PresenceAgentContext.Provider value={{ state, error }}>
      {children}
    </PresenceAgentContext.Provider>
  );
}
