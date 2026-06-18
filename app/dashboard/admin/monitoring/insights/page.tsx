"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  TrendingUp, AlertTriangle, CheckCircle, RefreshCw, XCircle, ArrowLeft, 
  HelpCircle, Clock, Award, ShieldCheck, Download, Search, Filter, ShieldAlert,
  Activity, Users, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filters for Alerts/Logs
  const [alertFilter, setAlertFilter] = useState("all");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditAction, setAuditAction] = useState("");

  useEffect(() => {
    fetchData();
  }, [alertFilter, auditAction]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Insights metrics
      const resInsights = await fetch("/api/monitoring/insights");
      if (resInsights.ok) {
        const data = await resInsights.json();
        setInsights(data);
      }

      // 2. Fetch Alerts
      const alertsUrl = alertFilter === "all" 
        ? "/api/monitoring/alerts" 
        : `/api/monitoring/alerts?status=${alertFilter}`;
      const resAlerts = await fetch(alertsUrl);
      if (resAlerts.ok) {
        const data = await resAlerts.json();
        setAlerts(data.alerts || []);
      }

      // 3. Fetch Audit Logs
      const logsUrl = auditAction 
        ? `/api/monitoring/audit-logs?action=${auditAction}&query=${auditQuery}` 
        : `/api/monitoring/audit-logs?query=${auditQuery}`;
      const resLogs = await fetch(logsUrl);
      if (resLogs.ok) {
        const data = await resLogs.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load insights data");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string, action: "ACKNOWLEDGED" | "RESOLVED") => {
    try {
      const res = await fetch("/api/monitoring/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: action }),
      });
      if (res.ok) {
        toast.success(`Alert successfully updated to ${action.toLowerCase()}`);
        fetchData(); // reload
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast.error("Failed to update alert status");
    }
  };

  const exportAuditLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LoomDesk_Monitoring_AuditLogs_${format(new Date(), "yyyyMMdd")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Audit logs exported successfully");
  };

  const health = insights?.health || {
    activePercentage: 0,
    idlePercentage: 0,
    awayPercentage: 0,
    attendanceRate: 0,
    presenceComplianceScore: 0,
    monitoringComplianceScore: 0,
    averageSessionLengthMinutes: 0
  };

  const managerInsights = insights?.insights || {
    frequentlyAway: [],
    frequentlyIdle: [],
    cameraIssues: [],
    highPerformers: []
  };

  const heatmap = insights?.heatmap || [];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center pb-4 border-b border-border/60">
        <Link href="/dashboard/admin/monitoring" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/65 px-4 py-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          Back to Live Wall
        </Link>
        <button 
          onClick={fetchData}
          className="p-2.5 bg-background border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Data
        </button>
      </div>

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card card-elevation-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              Attendance Rate
            </CardDescription>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
              {health.attendanceRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Percentage of total employees logged in today.</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-elevation-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Presence Compliance
            </CardDescription>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
              {health.presenceComplianceScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ratio of active/present/idle work time vs offline hours.</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-elevation-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              Monitoring Compliance
            </CardDescription>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
              {health.monitoringComplianceScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Time webcam streams remained clean without blockage/errors.</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-elevation-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              Active vs Idle
            </CardDescription>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
              {health.activePercentage}:{health.idlePercentage}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ratio of active engagement vs idle breaks today.</p>
          </CardContent>
        </Card>
      </div>

      {/* Workforce Heatmap & Performance Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap Graph card */}
        <Card className="lg:col-span-2 glass-card card-elevation-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Workforce Heatmap (Activity Trends)
            </CardTitle>
            <CardDescription>Hour-by-hour active team presence tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Visual Heatmap representation using custom CSS styled bars */}
            <div className="h-64 flex items-end justify-between gap-1.5 pt-6 border-b border-border/50 pb-2">
              {heatmap.map((h: any, idx: number) => {
                const heightVal = Math.max(10, h.activePercentage);
                const barColor = h.activePercentage > 75 
                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400" 
                  : h.activePercentage > 45 
                  ? "bg-gradient-to-t from-indigo-600 to-indigo-400" 
                  : "bg-gradient-to-t from-amber-600 to-amber-400";
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">{h.activePercentage}%</span>
                    <div 
                      className={`w-full rounded-t-md transition-all duration-300 ${barColor}`} 
                      style={{ height: `${heightVal}%` }}
                    ></div>
                    {idx % 4 === 0 && (
                      <span className="text-[9px] text-muted-foreground mt-2 font-mono whitespace-nowrap">{h.hour}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-400"></span> High Performance (&gt;75%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-indigo-400"></span> Standard Active (45%-75%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-400"></span> Idle / Low Engagement</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Manager Insights Highlights */}
        <Card className="glass-card card-elevation-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Manager Recommendations
            </CardTitle>
            <CardDescription>Automatically derived compliance insights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
            {managerInsights.cameraIssues.length > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Camera Blockage / Errors
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">Users experiencing camera issues repeatedly:</p>
                <div className="mt-1.5 space-y-1">
                  {managerInsights.cameraIssues.map((u: any, i: number) => (
                    <div key={i} className="text-xs font-semibold text-foreground flex justify-between">
                      <span>{u.name}</span>
                      <span className="text-rose-400 font-mono">{u.count} issues</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managerInsights.frequentlyAway.length > 0 && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Frequently Away from Desk
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">Users away from screen frequently:</p>
                <div className="mt-1.5 space-y-1">
                  {managerInsights.frequentlyAway.map((u: any, i: number) => (
                    <div key={i} className="text-xs font-semibold text-foreground flex justify-between">
                      <span>{u.name}</span>
                      <span className="text-purple-400 font-mono">{u.count} times</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managerInsights.highPerformers.length > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Consistent Performers
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">Top presence score users today:</p>
                <div className="mt-1.5 space-y-1">
                  {managerInsights.highPerformers.map((u: any, i: number) => (
                    <div key={i} className="text-xs font-semibold text-foreground flex justify-between">
                      <span>{u.name}</span>
                      <span className="text-emerald-400 font-mono">{u.score}% active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!managerInsights.cameraIssues.length && !managerInsights.frequentlyAway.length && !managerInsights.highPerformers.length && (
              <p className="text-xs text-muted-foreground text-center py-6">Calculating highlights... Please confirm user activity logs are populated.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts Manager Dashboard */}
      <Card className="glass-card card-elevation-md">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500 animate-pulse" />
              Compliance Alerts Log
            </CardTitle>
            <CardDescription>Track presence violation triggers and resolve compliance issues.</CardDescription>
          </div>
          <div className="relative">
            <select 
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Alerts</option>
              <option value="PENDING">Pending Only</option>
              <option value="ACKNOWLEDGED">Acknowledged Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-border/80 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/80 text-xs font-bold text-muted-foreground">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Violation Type</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Triggered Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{alert.user?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{alert.user?.email}</div>
                    </td>
                    <td className="p-4 uppercase tracking-wider font-semibold">
                      {alert.type.replace("_", " ")}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${alert.severity === "CRITICAL" ? "bg-red-500/10 text-red-500" : alert.severity === "HIGH" ? "bg-orange-500/10 text-orange-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">
                      {format(new Date(alert.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${alert.status === "PENDING" ? "bg-red-500/10 text-red-500" : alert.status === "ACKNOWLEDGED" ? "bg-indigo-500/10 text-indigo-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {alert.status === "PENDING" && (
                          <button 
                            onClick={() => handleResolveAlert(alert.id, "ACKNOWLEDGED")}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-[10px] transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button 
                            onClick={() => handleResolveAlert(alert.id, "RESOLVED")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-[10px] transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No alerts matching filters found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Section */}
      <Card className="glass-card card-elevation-md">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Monitoring Audit Trail
            </CardTitle>
            <CardDescription>Verify operations history and export compliant log listings.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Action filter */}
            <div className="relative">
              <select
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs font-semibold cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="monitoring.presence_change">Presence Changes</option>
                <option value="monitoring.screenshot_capture">Screenshots</option>
                <option value="monitoring.recording_start">Recording Actions</option>
                <option value="monitoring.alert_generated">Alert Triggers</option>
              </select>
            </div>
            
            <button 
              onClick={exportAuditLogs}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export logs
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by actor email..."
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs"
            />
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/80 text-xs font-bold text-muted-foreground">
                  <th className="p-4">Action</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Target Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Logged Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      {log.action}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {log.actorEmail || "system"}
                    </td>
                    <td className="p-4">
                      {log.targetEmail || "N/A"}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${log.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-muted-foreground">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No matching audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
