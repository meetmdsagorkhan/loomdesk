"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { Clock, CheckCircle2, AlertTriangle, CalendarDays, BarChart3, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchAnalytics();
  }, [currentMonth]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const res = await fetch(`/api/time-tracking/analytics?month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data.timeEntries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const totalMinutesThisMonth = entries.reduce((acc, entry) => acc + (entry.totalMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutesThisMonth / 60);
  const remainingMinutes = totalMinutesThisMonth % 60;

  const getShiftDurationMinutes = (shift: any) => {
    if (!shift || !shift.startTime || !shift.endTime) return 480; // default 8 hours
    const start = new Date(`1970-01-01T${shift.startTime}:00Z`);
    const end = new Date(`1970-01-01T${shift.endTime}:00Z`);
    if (end < start) end.setDate(end.getDate() + 1);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getDayStatus = (date: Date) => {
    const entry = entries.find((e) => format(new Date(e.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
    if (!entry) return "untracked";
    if (entry.status !== "COMPLETED") return "active";

    const shiftMinutes = getShiftDurationMinutes(entry.shift);
    const diff = entry.totalMinutes - shiftMinutes;

    // Ahead if diff > 30 mins. Behind if diff < -30 mins. Full shift if within -30 to +30.
    if (diff > 30) return "ahead";
    if (diff < -30) return "behind";
    return "full";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "full": return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50";
      case "ahead": return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50";
      case "behind": return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50";
      case "active": return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50";
      default: return "bg-background/50 text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Time Tracking</h1>
        <p className="text-muted-foreground">View your work hours, check-ins, and schedule adherence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card card-elevation-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Time This Month</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalHours}h {remainingMinutes}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on completed check-outs</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-elevation-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Daily Hours</CardTitle>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {entries.length > 0 ? (totalMinutesThisMonth / entries.length / 60).toFixed(1) : 0}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Over {entries.length} tracked days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card card-elevation-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                Calendar View
              </CardTitle>
              <CardDescription className="text-muted-foreground">Your adherence to assigned shifts.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                &larr; Prev
              </button>
              <span className="text-foreground font-medium">{format(currentMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Full Shift
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> Ahead
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" /> Behind
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" /> Active
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-muted-foreground text-xs font-semibold py-2">
                {d}
              </div>
            ))}
            
            {/* Empty slots for start of month */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-xl bg-muted/10" />
            ))}

            {daysInMonth.map((date) => {
              const status = getDayStatus(date);
              const isTodayDate = isToday(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`h-24 rounded-xl border flex flex-col p-2 transition-all ${getStatusColor(status)} ${isTodayDate ? "ring-2 ring-white/20" : ""}`}
                >
                  <span className="text-sm font-medium opacity-80">{format(date, "d")}</span>
                  {status !== "untracked" && (
                    <div className="mt-auto text-xs font-medium flex items-center gap-1">
                      {status === "full" && <CheckCircle2 className="w-3 h-3" />}
                      {status === "ahead" && <CheckCircle2 className="w-3 h-3" />}
                      {status === "behind" && <AlertTriangle className="w-3 h-3" />}
                      {status === "active" && <Clock className="w-3 h-3" />}
                      <span className="capitalize">{status}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card card-elevation-md">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Recent Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.filter(e => e.notes && e.notes.length > 0).slice(0, 5).map(entry => (
            <div key={entry.id} className="p-4 bg-muted/30 rounded-xl border border-border">
              <div className="text-sm text-muted-foreground mb-2">{format(new Date(entry.date), "MMMM d, yyyy")} - {Math.floor(entry.totalMinutes / 60)}h {entry.totalMinutes % 60}m</div>
              <div className="text-foreground text-sm">
                {entry.notes[0]?.content}
              </div>
            </div>
          ))}
          {entries.length === 0 && <div className="text-muted-foreground text-sm">No notes available for this month.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
