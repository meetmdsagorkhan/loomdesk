// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Camera, Search, Filter, Monitor, Users, AlertTriangle, ShieldAlert,
  LayoutGrid, RefreshCw, Play, Square, Film, Eye, EyeOff,
  UserCheck, Shield, ChevronRight, Activity, Clock, Video, VideoOff,
  Circle, StopCircle, Mic, MicOff, Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  ConnectionState,
} from "livekit-client";

// ─────────────────────────────────────────────────────────────────────────────
// LiveKit video player — attaches the remote MediaStream to a <video> element
// ─────────────────────────────────────────────────────────────────────────────
const LiveKitVideoPlayer = ({
  stream,
  muted,
}: {
  stream: MediaStream;
  muted: boolean;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LiveSession {
  room: Room;
  stream: MediaStream;
  state: "connecting" | "live" | "error";
}

interface RecordingSession {
  recorder: MediaRecorder;
  chunks: Blob[];
}

export default function MonitoringPage() {
  // ── Presence data ──────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gridSize, setGridSize] = useState<4 | 9 | 16>(9);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // ── LiveKit sessions ───────────────────────────────────────────────────────
  // liveSessionsRef stores Room objects + stream — avoids stale closures
  const liveSessionsRef = useRef<Record<string, LiveSession>>({});
  // liveStreams drives re-renders when a new stream arrives
  const [liveStreams, setLiveStreams] = useState<Record<string, MediaStream>>({});
  const [sessionStates, setSessionStates] = useState<
    Record<string, "connecting" | "live" | "error">
  >({});
  const [mutedSessions, setMutedSessions] = useState<Record<string, boolean>>({});

  // ── Local recording ────────────────────────────────────────────────────────
  const recordingsRef = useRef<Record<string, RecordingSession>>({});
  const [activeRecordingIds, setActiveRecordingIds] = useState<Set<string>>(new Set());

  // ── Screenshot / server-side recording (existing API) ─────────────────────
  const [serverRecordings, setServerRecordings] = useState<
    Record<string, { id: string; status: "RECORDING" | "PAUSED" }>
  >({});
  const [burstCountdowns, setBurstCountdowns] = useState<Record<string, number>>({});

  // ── Admin session ──────────────────────────────────────────────────────────
  const adminIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.id) adminIdRef.current = d.user.id;
      });
  }, []);

  // ── Presence polling ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchPresence();
    const id = setInterval(fetchPresence, 4000);
    return () => clearInterval(id);
  }, []);

  const fetchPresence = async () => {
    try {
      const res = await fetch("/api/monitoring/presence");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setEmployees(data.presence || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ── Derived counts ─────────────────────────────────────────────────────────
  const getState = (e: any) => e.currentPresence?.state || "Offline";
  const onlineCount = employees.filter((e) => getState(e) !== "Offline").length;
  const activeCount = employees.filter((e) => getState(e) === "Active").length;
  const idleCount = employees.filter((e) => getState(e) === "Idle").length;
  const awayCount = employees.filter((e) => getState(e) === "Away From Desk").length;
  const issueCount = employees.filter((e) =>
    ["Camera Blocked", "Monitoring Error"].includes(getState(e))
  ).length;
  const alertCount = employees.filter((e) => e.pendingAlerts?.length > 0).length;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    const match =
      e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const s = getState(e);
    if (statusFilter === "online") return match && s !== "Offline";
    if (statusFilter === "active") return match && s === "Active";
    if (statusFilter === "idle") return match && s === "Idle";
    if (statusFilter === "away") return match && s === "Away From Desk";
    if (statusFilter === "issue")
      return match && ["Camera Blocked", "Monitoring Error"].includes(s);
    if (statusFilter === "alert") return match && e.pendingAlerts?.length > 0;
    return match;
  });

  // ── LiveKit: start viewing a member ───────────────────────────────────────
  const handleStartView = useCallback(async (userId: string, empName: string) => {
    if (liveSessionsRef.current[userId]) return; // already viewing

    setSessionStates((p) => ({ ...p, [userId]: "connecting" }));
    toast.info(`Connecting to ${empName}'s feed…`);

    try {
      // 1. Get admin token from our API
      const res = await fetch(
        `/api/monitoring/livekit-token?userId=${userId}&role=admin`
      );
      if (!res.ok) throw new Error("Failed to get LiveKit token");
      const { token, url } = await res.json();

      // 2. Create room and register track handler BEFORE connecting
      const room = new Room({ adaptiveStream: true, dynacast: false });
      const stream = new MediaStream();

      room.on(
        RoomEvent.TrackSubscribed,
        (track: any, _pub: any, _participant: any) => {
          stream.addTrack(track.mediaStreamTrack);
          // Force re-render so the video element picks up the new stream
          setLiveStreams((p) => ({ ...p, [userId]: stream }));
          setSessionStates((p) => ({ ...p, [userId]: "live" }));
          toast.success(`${empName} is now live`);
        }
      );

      room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
        try {
          stream.removeTrack(track.mediaStreamTrack);
        } catch {/* track already removed */}
        setLiveStreams((p) => ({ ...p, [userId]: stream }));
      });

      room.on(RoomEvent.Disconnected, () => {
        handleStopView(userId, false);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected) {
          setSessionStates((p) => {
            const next = { ...p };
            delete next[userId];
            return next;
          });
        }
      });

      // 3. Connect admin to LiveKit room
      await room.connect(url, token);

      liveSessionsRef.current[userId] = { room, stream, state: "connecting" };

      // 4. Signal the member to start publishing (via Supabase broadcast)
      if (supabase) {
        const ch = supabase.channel(`monitoring:signals:${userId}`);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.send({
              type: "broadcast",
              event: "livekit-view-request",
              payload: { adminId: adminIdRef.current },
            });
            // Clean up the signaling channel after sending
            setTimeout(() => supabase.removeChannel(ch), 2000);
          }
        });
      }
    } catch (err: any) {
      console.error("LiveKit admin connect error:", err);
      toast.error(`Could not connect to ${empName}'s feed`);
      setSessionStates((p) => ({ ...p, [userId]: "error" }));
      delete liveSessionsRef.current[userId];
    }
  }, []);

  // ── LiveKit: stop viewing ─────────────────────────────────────────────────
  const handleStopView = useCallback(
    async (userId: string, sendSignal = true) => {
      // Stop any local recording first
      if (recordingsRef.current[userId]) {
        stopLocalRecording(userId, true);
      }

      const session = liveSessionsRef.current[userId];
      if (session) {
        await session.room.disconnect();
        delete liveSessionsRef.current[userId];
      }

      setLiveStreams((p) => {
        const next = { ...p };
        delete next[userId];
        return next;
      });
      setSessionStates((p) => {
        const next = { ...p };
        delete next[userId];
        return next;
      });

      // Tell member to stop publishing
      if (sendSignal && supabase) {
        const ch = supabase.channel(`monitoring:signals:${userId}`);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.send({ type: "broadcast", event: "livekit-view-end", payload: {} });
            setTimeout(() => supabase.removeChannel(ch), 2000);
          }
        });
      }
    },
    []
  );

  // ── Local recording: start ────────────────────────────────────────────────
  const startLocalRecording = useCallback((userId: string, empName: string) => {
    const stream = liveSessionsRef.current[userId]?.stream;
    if (!stream || stream.getTracks().length === 0) {
      toast.error("No live stream to record");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000); // collect chunks every second

    recordingsRef.current[userId] = { recorder, chunks };
    setActiveRecordingIds((p) => new Set([...p, userId]));
    toast.success("Recording started — saves to your device when stopped");
  }, []);

  // ── Local recording: stop + download ─────────────────────────────────────
  const stopLocalRecording = useCallback(
    (userId: string, silent = false) => {
      const rec = recordingsRef.current[userId];
      if (!rec) return;

      const { recorder, chunks } = rec;
      recorder.onstop = () => {
        if (!silent) {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const emp = employees.find((e) => e.id === userId);
          a.download = `loomdesk-${emp?.name || userId}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.webm`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Recording downloaded to your device");
        }
      };
      recorder.stop();
      delete recordingsRef.current[userId];
      setActiveRecordingIds((p) => {
        const next = new Set(p);
        next.delete(userId);
        return next;
      });
    },
    [employees]
  );

  // ── Screenshot helpers (existing API) ─────────────────────────────────────
  const handleInstantScreenshot = async (userId: string) => {
    toast.info("Sending screenshot capture signal…");
    if (!supabase) { toast.error("Signaling unavailable"); return; }
    const ch = supabase.channel(`monitoring:signals:${userId}`);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "take-screenshot", payload: { reason: "Admin Instant Screenshot" } });
        setTimeout(() => supabase.removeChannel(ch), 1000);
        toast.success("Signal sent");
      }
    });
  };

  const handleBurstScreenshot = async (userId: string) => {
    toast.info("Burst mode: 3 shots…");
    setBurstCountdowns((p) => ({ ...p, [userId]: 3 }));
    let remaining = 3;
    const id = setInterval(async () => {
      remaining--;
      setBurstCountdowns((p) => ({ ...p, [userId]: remaining }));
      if (supabase) {
        const ch = supabase.channel(`monitoring:signals:${userId}`);
        ch.subscribe((s) => {
          if (s === "SUBSCRIBED") {
            ch.send({ type: "broadcast", event: "take-screenshot", payload: { reason: `Burst ${3 - remaining}/3` } });
            setTimeout(() => supabase.removeChannel(ch), 1000);
          }
        });
      }
      if (remaining <= 0) {
        clearInterval(id);
        toast.success("Burst complete");
        setBurstCountdowns((p) => { const n = { ...p }; delete n[userId]; return n; });
      }
    }, 1000);
  };

  // Server-side recording toggle (existing API — separate from local recording)
  const handleServerRecordToggle = async (userId: string) => {
    const active = serverRecordings[userId];
    if (active) {
      const res = await fetch("/api/monitoring/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "STOP", recordingId: active.id }),
      });
      if (res.ok) {
        toast.success("Server recording saved");
        setServerRecordings((p) => { const n = { ...p }; delete n[userId]; return n; });
      }
    } else {
      const res = await fetch("/api/monitoring/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START", userId, reason: "QA Compliance Session" }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerRecordings((p) => ({ ...p, [userId]: { id: data.recording.id, status: "RECORDING" } }));
        toast.success("Server recording started");
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Monitor className="w-10 h-10 text-indigo-500 animate-pulse" />
            Workforce Presence Wall
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time presence monitoring with on-demand live video via LiveKit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/monitoring/insights"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all shadow-md flex items-center gap-2"
          >
            <Activity className="w-4 h-4" /> Team Insights
          </Link>
          <button
            onClick={fetchPresence}
            className="p-3 bg-background border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Online", value: onlineCount, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Active Now", value: activeCount, icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Idle", value: idleCount, icon: Clock, color: "text-amber-500 bg-amber-500/10" },
          { label: "Away", value: awayCount, icon: Eye, color: "text-purple-500 bg-purple-500/10" },
          { label: "Issues", value: issueCount, icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10" },
          { label: "Alerts", value: alertCount, icon: ShieldAlert, color: "text-red-500 bg-red-500/10 animate-bounce" },
        ].map((item, i) => (
          <Card key={i} className="glass-card card-elevation-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground truncate">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & grid size */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 p-4 rounded-2xl border border-border/80 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="online">Online Only</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="away">Away</option>
              <option value="issue">Camera Issues</option>
              <option value="alert">With Alerts</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded-xl border border-border">
          {([4, 9, 16] as const).map((s) => (
            <button
              key={s}
              onClick={() => setGridSize(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                gridSize === s ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s === 4 ? "2×2" : s === 9 ? "3×3" : "4×4"}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <LayoutGrid className="w-4 h-4 text-muted-foreground mr-1" />
        </div>
      </div>

      {/* Employee grid */}
      <div
        className={`grid gap-6 ${
          gridSize === 4
            ? "grid-cols-1 sm:grid-cols-2"
            : gridSize === 9
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        }`}
      >
        {filtered.map((emp) => {
          const presenceState = getState(emp);
          const isOnline = presenceState !== "Offline";
          const sessionState = sessionStates[emp.id];
          const isViewing = !!liveStreams[emp.id];
          const isConnecting = sessionState === "connecting";
          const isRecording = activeRecordingIds.has(emp.id);
          const isMuted = mutedSessions[emp.id] !== false; // default muted
          const burstCount = burstCountdowns[emp.id];

          // Card accent colour
          let stateColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";
          let ringColor = "border-border";
          if (presenceState === "Active") {
            stateColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            ringColor = isViewing ? "border-indigo-500/60" : "border-emerald-500/40";
          } else if (presenceState === "Idle") {
            stateColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
            ringColor = "border-amber-500/40";
          } else if (presenceState === "Away From Desk") {
            stateColor = "bg-purple-500/15 text-purple-400 border-purple-500/30";
            ringColor = "border-purple-500/40";
          } else if (["Camera Blocked", "Monitoring Error"].includes(presenceState)) {
            stateColor = "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse";
            ringColor = "border-rose-500/40";
          }

          return (
            <Card key={emp.id} className={`glass-card overflow-hidden group flex flex-col border transition-all duration-300 hover:shadow-xl ${isViewing ? "ring-2 ring-indigo-500/40" : ""}`}>
              {/* Video area */}
              <div className={`relative aspect-video bg-slate-950 border-b overflow-hidden flex flex-col justify-center items-center ${ringColor}`}>

                {/* State badge + indicators */}
                <div className="absolute top-3 left-3 z-10 flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stateColor}`}>
                    {presenceState}
                  </span>
                  {isViewing && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                  )}
                  {isRecording && (
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <Circle className="w-2 h-2 fill-current" /> REC
                    </span>
                  )}
                  {isConnecting && (
                    <span className="px-2 py-0.5 bg-amber-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Connecting…
                    </span>
                  )}
                  {burstCount !== undefined && (
                    <span className="px-2 py-0.5 bg-yellow-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Burst: {burstCount}
                    </span>
                  )}
                </div>

                {/* Mute toggle when live */}
                {isViewing && (
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => setMutedSessions((p) => ({ ...p, [emp.id]: !isMuted }))}
                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* Video content */}
                {isViewing && liveStreams[emp.id] ? (
                  <LiveKitVideoPlayer stream={liveStreams[emp.id]} muted={isMuted} />
                ) : isOnline ? (
                  /* Placeholder for online but not yet viewed */
                  <div className="w-full h-full flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-cover bg-center filter saturate-[0.6] opacity-20"
                      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600')` }}
                    />
                    <div className="relative text-center">
                      <Video className="w-10 h-10 text-indigo-400/60 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Click <span className="text-indigo-400 font-semibold">View Live</span> to stream</p>
                    </div>
                  </div>
                ) : (
                  /* Offline */
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">Stream Closed (Offline)</p>
                  </div>
                )}

                {/* Hover overlay — monitoring actions */}
                {isOnline && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap px-4">
                    {/* View Live / Stop */}
                    {isViewing ? (
                      <button
                        onClick={() => handleStopView(emp.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500 text-indigo-300 rounded-xl text-xs font-semibold transition-colors"
                        title="Stop Live View"
                      >
                        <VideoOff className="w-4 h-4" /> Stop View
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartView(emp.id, emp.name)}
                        disabled={isConnecting}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                        title="View Live Feed"
                      >
                        <Video className="w-4 h-4" />
                        {isConnecting ? "Connecting…" : "View Live"}
                      </button>
                    )}

                    {/* Local recording — only available when live */}
                    {isViewing && (
                      <button
                        onClick={() =>
                          isRecording
                            ? stopLocalRecording(emp.id)
                            : startLocalRecording(emp.id, emp.name)
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          isRecording
                            ? "bg-red-600/30 border-red-500 text-red-300 hover:bg-red-600/50"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                        title={isRecording ? "Stop & Download Recording" : "Record to Device"}
                      >
                        {isRecording ? (
                          <><Download className="w-4 h-4" /> Save Recording</>
                        ) : (
                          <><Circle className="w-4 h-4 fill-current text-red-400" /> Record</>
                        )}
                      </button>
                    )}

                    {/* Screenshot */}
                    <button
                      onClick={() => handleInstantScreenshot(emp.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                      title="Instant Screenshot"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Burst screenshot */}
                    <button
                      onClick={() => handleBurstScreenshot(emp.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                      title="Burst Screenshots"
                    >
                      <Film className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card footer */}
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-foreground truncate pr-2">{emp.name}</div>
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center shrink-0"
                    >
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mb-3">{emp.email}</div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-500/70" />
                    {emp.role}
                  </div>
                  {emp.currentPresence?.timestamp ? (() => {
                    const ts = new Date(emp.currentPresence.timestamp);
                    const ageMs = Date.now() - ts.getTime();
                    const isStale = ageMs > 5 * 60 * 1000;
                    return (
                      <div
                        className={isStale ? "text-amber-500" : "text-muted-foreground"}
                        title={format(ts, "PPpp")}
                      >
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </div>
                    );
                  })() : (
                    <div className="text-muted-foreground/50">No data yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Skeleton loaders */}
        {loading &&
          Array.from({ length: gridSize }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="aspect-video bg-muted rounded-xl animate-pulse border border-border/80"
            />
          ))}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-muted-foreground">No employees found</h3>
            <p className="text-muted-foreground mt-2">Try clearing your search or filter.</p>
          </div>
        )}
      </div>

      {/* Employee detail drawer */}
      {selectedEmployee && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold">Employee Details</h3>
            <button
              onClick={() => setSelectedEmployee(null)}
              className="text-muted-foreground hover:text-foreground text-sm font-semibold px-2.5 py-1.5 bg-muted/65 hover:bg-muted rounded-lg"
            >
              Close
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/15 flex items-center justify-center font-bold text-lg text-indigo-400">
                {selectedEmployee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h4 className="font-bold">{selectedEmployee.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedEmployee.email}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Position</p>
                <p className="text-sm font-semibold mt-1">{selectedEmployee.position || "N/A"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold mt-1">{selectedEmployee.department || "N/A"}</p>
              </div>
            </div>

            {/* Live view controls */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live View</h5>
              <div className="grid grid-cols-2 gap-2">
                {sessionStates[selectedEmployee.id] || liveStreams[selectedEmployee.id] ? (
                  <button
                    onClick={() => handleStopView(selectedEmployee.id)}
                    className="col-span-2 px-4 py-2.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <VideoOff className="w-4 h-4" /> Stop Live View
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartView(selectedEmployee.id, selectedEmployee.name)}
                    className="col-span-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Video className="w-4 h-4" /> Start Live View
                  </button>
                )}

                {/* Local recording — only when viewing */}
                {liveStreams[selectedEmployee.id] && (
                  <button
                    onClick={() =>
                      activeRecordingIds.has(selectedEmployee.id)
                        ? stopLocalRecording(selectedEmployee.id)
                        : startLocalRecording(selectedEmployee.id, selectedEmployee.name)
                    }
                    className={`col-span-2 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      activeRecordingIds.has(selectedEmployee.id)
                        ? "bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20"
                        : "bg-muted hover:bg-muted/80 border-border text-foreground"
                    }`}
                  >
                    {activeRecordingIds.has(selectedEmployee.id) ? (
                      <><Download className="w-4 h-4" /> Stop & Download Recording</>
                    ) : (
                      <><Circle className="w-4 h-4 fill-current text-red-400" /> Record to My Device</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Screenshot controls */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Screenshots</h5>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleInstantScreenshot(selectedEmployee.id)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Camera className="w-4 h-4 text-indigo-400" /> Instant Shot
                </button>
                <button
                  onClick={() => handleBurstScreenshot(selectedEmployee.id)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Film className="w-4 h-4 text-rose-400" /> Burst Mode
                </button>
              </div>
            </div>

            {/* Pending alerts */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Alerts</h5>
              {selectedEmployee.pendingAlerts?.length > 0 ? (
                <div className="space-y-2">
                  {selectedEmployee.pendingAlerts.map((alert: any) => (
                    <div key={alert.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                          {alert.type.replace("_", " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Severity: {alert.severity}</p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No pending alerts.</p>
              )}
            </div>

            {/* Presence log */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Seen</h5>
              <div className="p-4 bg-muted/20 border border-border/80 rounded-xl">
                {selectedEmployee.currentPresence ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold">{selectedEmployee.currentPresence.state}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(selectedEmployee.currentPresence.timestamp), "HH:mm:ss")}
                    </span>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">No recent presence logs.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
