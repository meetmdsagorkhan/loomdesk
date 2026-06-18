"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  Camera, Search, Filter, Monitor, Users, AlertTriangle, ShieldAlert,
  LayoutGrid, Maximize2, RefreshCw, Play, Pause, Square, Film, Eye, 
  UserCheck, Shield, Award, HelpCircle, ChevronRight, Activity, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

export default function MonitoringPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gridSize, setGridSize] = useState<4 | 9 | 16>(9);
  
  // Selected employee for details drawer
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  
  // Live states for upgraded streams & recording
  const [upgradedStreams, setUpgradedStreams] = useState<Record<string, boolean>>({});
  const [activeRecordings, setActiveRecordings] = useState<Record<string, { id: string; status: "RECORDING" | "PAUSED" }>>({});
  const [burstCountdowns, setBurstCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchPresenceData();
    const interval = setInterval(fetchPresenceData, 4000); // Poll presence every 4s
    return () => clearInterval(interval);
  }, []);

  const fetchPresenceData = async () => {
    try {
      const res = await fetch("/api/monitoring/presence");
      if (!res.ok) throw new Error("Failed to fetch presence data");
      const data = await res.json();
      setEmployees(data.presence || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeStream = async (userId: string) => {
    const isUpgraded = upgradedStreams[userId];
    setUpgradedStreams(prev => ({ ...prev, [userId]: !isUpgraded }));
    
    // Simulate signaling WebRTC upgrade/downgrade
    toast.success(isUpgraded 
      ? "Stream downgraded to low-bandwidth thumbnail"
      : "Stream upgraded to 1080p High Definition"
    );
  };

  const handleInstantScreenshot = async (userId: string) => {
    toast.info("Triggering instant screenshot capture...");
    try {
      const res = await fetch("/api/monitoring/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          imageUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='24'>Instant Capture - ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</text></svg>`,
          reason: "Instant Screenshot (Admin Triggered)"
        })
      });
      if (res.ok) {
        toast.success("Screenshot saved successfully");
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast.error("Failed to capture screenshot");
    }
  };

  const handleBurstScreenshot = async (userId: string) => {
    toast.info("Starting burst screenshot mode (3 shots in 3 seconds)...");
    setBurstCountdowns(prev => ({ ...prev, [userId]: 3 }));

    let remaining = 3;
    const interval = setInterval(async () => {
      remaining--;
      setBurstCountdowns(prev => ({ ...prev, [userId]: remaining }));
      
      try {
        await fetch("/api/monitoring/screenshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            imageUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23ef4444' font-size='24'>Burst Capture ${3 - remaining}/3 - ${format(new Date(), "HH:mm:ss")}</text></svg>`,
            reason: `Burst Screenshot (Capture ${3 - remaining}/3)`
          })
        });
      } catch (err) {
        console.error(err);
      }

      if (remaining <= 0) {
        clearInterval(interval);
        toast.success("Burst screenshot mode completed");
        setBurstCountdowns(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    }, 1000);
  };

  const handleToggleRecording = async (userId: string) => {
    const activeRec = activeRecordings[userId];
    
    if (activeRec) {
      // STOP recording
      try {
        const res = await fetch("/api/monitoring/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "STOP",
            recordingId: activeRec.id
          })
        });
        if (res.ok) {
          toast.success("Recording saved and logged to audit trail");
          setActiveRecordings(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      } catch {
        toast.error("Failed to stop recording");
      }
    } else {
      // START recording
      try {
        const res = await fetch("/api/monitoring/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "START",
            userId,
            reason: "QA Review & Compliance Session Check"
          })
        });
        if (res.ok) {
          const data = await res.json();
          toast.success("Recording started successfully");
          setActiveRecordings(prev => ({
            ...prev,
            [userId]: { id: data.recording.id, status: "RECORDING" }
          }));
        }
      } catch {
        toast.error("Failed to start recording");
      }
    }
  };

  // Metrics calculators
  const getPresenceState = (e: any) => e.currentPresence?.state || "Offline";
  const onlineCount = employees.filter(e => getPresenceState(e) !== "Offline").length;
  const activeCount = employees.filter(e => getPresenceState(e) === "Active").length;
  const idleCount = employees.filter(e => getPresenceState(e) === "Idle").length;
  const awayCount = employees.filter(e => getPresenceState(e) === "Away From Desk").length;
  const issueCount = employees.filter(e => ["Camera Blocked", "Monitoring Error"].includes(getPresenceState(e))).length;
  const alertCount = employees.filter(e => e.pendingAlerts?.length > 0).length;

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.email.toLowerCase().includes(searchQuery.toLowerCase());
    const presenceState = e.currentPresence?.state || "Offline";
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "online") return matchesSearch && presenceState !== "Offline";
    if (statusFilter === "active") return matchesSearch && presenceState === "Active";
    if (statusFilter === "idle") return matchesSearch && presenceState === "Idle";
    if (statusFilter === "away") return matchesSearch && presenceState === "Away From Desk";
    if (statusFilter === "issue") return matchesSearch && ["Camera Blocked", "Monitoring Error"].includes(presenceState);
    if (statusFilter === "alert") return matchesSearch && e.pendingAlerts?.length > 0;
    return matchesSearch;
  });

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Monitor className="w-10 h-10 text-indigo-500 animate-pulse" />
            Workforce Presence Wall
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time compliance monitoring, adaptive video streaming, and productivity audits.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/dashboard/admin/monitoring/insights" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all shadow-md flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Team Insights & Alerts
          </Link>
          <button 
            onClick={fetchPresenceData}
            className="p-3 bg-background border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh Statuses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics Counts Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Online Employees", value: onlineCount, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Active Now", value: activeCount, icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Idle Status", value: idleCount, icon: Clock, color: "text-amber-500 bg-amber-500/10" },
          { label: "Away From Desk", value: awayCount, icon: Eye, color: "text-purple-500 bg-purple-500/10" },
          { label: "Camera Issues", value: issueCount, icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10" },
          { label: "Active Alerts", value: alertCount, icon: ShieldAlert, color: "text-red-500 bg-red-500/10 animate-bounce" },
        ].map((item, index) => (
          <Card key={index} className="glass-card card-elevation-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground truncate">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Grid Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 p-4 rounded-2xl border border-border/80 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="online">Online Only</option>
              <option value="active">Active Only</option>
              <option value="idle">Idle Only</option>
              <option value="away">Away Only</option>
              <option value="issue">Camera Issues</option>
              <option value="alert">With Pending Alerts</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Grid Sizer */}
        <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded-xl border border-border">
          {[
            { size: 4, label: "2x2" },
            { size: 9, label: "3x3" },
            { size: 16, label: "4x4" }
          ].map(g => (
            <button
              key={g.size}
              onClick={() => setGridSize(g.size as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${gridSize === g.size ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
            >
              {g.label}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1"></div>
          <LayoutGrid className="w-4 h-4 text-muted-foreground mr-1.5" />
        </div>
      </div>

      {/* Grid Wall */}
      <div className={`grid gap-6 ${gridSize === 4 ? "grid-cols-1 sm:grid-cols-2" : gridSize === 9 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {filteredEmployees.map((emp) => {
          const presenceState = emp.currentPresence?.state || "Offline";
          const isUpgraded = upgradedStreams[emp.id];
          const isRecording = activeRecordings[emp.id];
          const burstCountdown = burstCountdowns[emp.id];

          // Determine card style based on state
          let stateColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";
          let videoBorder = "border-border";
          if (presenceState === "Active" || presenceState === "Present") {
            stateColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            videoBorder = "border-emerald-500/40";
          } else if (presenceState === "Idle") {
            stateColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
            videoBorder = "border-amber-500/40";
          } else if (presenceState === "Away From Desk") {
            stateColor = "bg-purple-500/15 text-purple-400 border-purple-500/30";
            videoBorder = "border-purple-500/40";
          } else if (["Camera Blocked", "Monitoring Error"].includes(presenceState)) {
            stateColor = "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse";
            videoBorder = "border-rose-500/40";
          }

          return (
            <Card key={emp.id} className={`glass-card overflow-hidden group flex flex-col border transition-all duration-300 hover:shadow-xl`}>
              {/* Simulated Camera Window */}
              <div className={`relative aspect-video bg-slate-950 border-b overflow-hidden flex flex-col justify-center items-center ${videoBorder}`}>
                
                {/* Live indicators */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stateColor}`}>
                    {presenceState}
                  </span>
                  {isUpgraded && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      HD
                    </span>
                  )}
                  {isRecording && (
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      REC
                    </span>
                  )}
                  {burstCountdown !== undefined && (
                    <span className="px-2 py-0.5 bg-yellow-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Burst: {burstCountdown}
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 z-10">
                  <span className="text-[10px] text-white/50 bg-black/60 px-2 py-0.5 rounded-full">
                    {isUpgraded ? "1080p @ 30fps" : "180p @ 5fps"}
                  </span>
                </div>

                {/* Animated Mock stream or visual camera stream fallback */}
                {presenceState !== "Offline" && presenceState !== "Monitoring Error" && presenceState !== "Camera Blocked" ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* Simulated live video stream noise / lines */}
                    <div className="absolute inset-0 bg-cover bg-center filter saturate-[0.85] opacity-40" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600')` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    {/* Mock pulse indicators representing movement */}
                    <div className="w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center animate-ping"></div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      {presenceState === "Offline" ? "Stream Closed (Offline)" : presenceState === "Camera Blocked" ? "Webcam Blocked/Covered" : "Camera Disconnected"}
                    </p>
                  </div>
                )}

                {/* Quick overlay controls */}
                {presenceState !== "Offline" && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => handleUpgradeStream(emp.id)}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                      title={isUpgraded ? "Downgrade Feed" : "Upgrade to HD Feed"}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleInstantScreenshot(emp.id)}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                      title="Instant Screenshot"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleToggleRecording(emp.id)}
                      className={`p-3 border rounded-xl transition-colors ${isRecording ? "bg-red-600/30 hover:bg-red-600/40 border-red-500 text-red-400" : "bg-white/10 hover:bg-white/20 border-white/20 text-white"}`}
                      title={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Feed Card Footer info */}
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
                  {emp.currentPresence?.timestamp && (
                    <div>
                      Updated {format(new Date(emp.currentPresence.timestamp), "HH:mm:ss")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {loading && Array.from({ length: gridSize }).map((_, i) => (
          <div key={`sk-${i}`} className="aspect-video bg-muted rounded-xl animate-pulse border border-border/80" />
        ))}
        
        {!loading && filteredEmployees.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-muted-foreground">No employees found</h3>
            <p className="text-muted-foreground mt-2">Try clearing your filters or search query.</p>
          </div>
        )}
      </div>

      {/* Selected Employee Details Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground">Employee Details</h3>
            <button 
              onClick={() => setSelectedEmployee(null)}
              className="text-muted-foreground hover:text-foreground text-sm font-semibold px-2.5 py-1.5 bg-muted/65 hover:bg-muted rounded-lg"
            >
              Close
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Identity info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/15 flex items-center justify-center font-bold text-lg text-indigo-400">
                {selectedEmployee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-foreground">{selectedEmployee.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedEmployee.email}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Position</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedEmployee.position || "N/A"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedEmployee.department || "N/A"}</p>
              </div>
            </div>

            {/* Monitoring Controls */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interactive Commands</h5>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleInstantScreenshot(selectedEmployee.id)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Camera className="w-4 h-4 text-indigo-400" />
                  Instant Shot
                </button>
                <button 
                  onClick={() => handleBurstScreenshot(selectedEmployee.id)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Film className="w-4 h-4 text-rose-400" />
                  Burst Mode
                </button>
                <button 
                  onClick={() => handleToggleRecording(selectedEmployee.id)}
                  className={`col-span-2 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${activeRecordings[selectedEmployee.id] ? "bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20" : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500/20 text-white"}`}
                >
                  {activeRecordings[selectedEmployee.id] ? (
                    <>
                      <Square className="w-4 h-4 text-red-500 fill-current" />
                      Stop Recording Session
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Start Manual Recording
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pending Alerts list */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Alerts</h5>
              {selectedEmployee.pendingAlerts?.length > 0 ? (
                <div className="space-y-2">
                  {selectedEmployee.pendingAlerts.map((alert: any) => (
                    <div key={alert.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-red-400 uppercase tracking-wider">{alert.type.replace("_", " ")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Severity: {alert.severity}</p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No pending alerts for this employee.</p>
              )}
            </div>

            {/* Presence History logs */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Presence Logs (Last 24h)</h5>
              <div className="p-4 bg-muted/20 border border-border/80 rounded-xl divide-y divide-border/60 max-h-48 overflow-y-auto">
                <div className="pb-2 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                  <span>STATE</span>
                  <span>TIME</span>
                </div>
                {selectedEmployee.currentPresence ? (
                  <div className="py-2 flex justify-between items-center text-xs text-foreground">
                    <span className="font-semibold">{selectedEmployee.currentPresence.state}</span>
                    <span className="text-[11px] text-muted-foreground">{format(new Date(selectedEmployee.currentPresence.timestamp), "HH:mm:ss")}</span>
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">No recent presence logs found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
