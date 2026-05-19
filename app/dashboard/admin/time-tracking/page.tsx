"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Users, Clock, FileText, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminTimeTrackingPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchTeamAnalytics();
  }, [currentMonth]);

  const fetchTeamAnalytics = async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const res = await fetch(`/api/time-tracking/analytics?userId=ALL&month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Team Time Tracking</h1>
          <p className="text-muted-foreground">Monitor check-ins, view shift adherence, and read checkout notes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card card-elevation-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Check-ins</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{entries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card card-elevation-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
            <Users className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {entries.filter(e => e.status === "ACTIVE" && format(new Date(e.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Members currently working</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card card-elevation-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Time Entries & Notes
              </CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="text-muted-foreground hover:text-foreground">Prev</button>
              <span className="text-foreground font-medium">{format(currentMonth, "MMM yyyy")}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="text-muted-foreground hover:text-foreground">Next</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-sm">
                  <th className="py-3 px-4 font-medium">Member</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Time (In/Out)</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Total</th>
                  <th className="py-3 px-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors text-sm text-foreground">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {entry.user?.name}
                      <div className="text-xs text-muted-foreground font-normal">{entry.user?.email}</div>
                    </td>
                    <td className="py-3 px-4">{format(new Date(entry.date), "MMM d, yyyy")}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span>In: {format(new Date(entry.checkInTime), "HH:mm")}</span>
                        {entry.checkOutTime ? (
                          <span className="text-muted-foreground">Out: {format(new Date(entry.checkOutTime), "HH:mm")}</span>
                        ) : (
                          <span className="text-primary text-xs">Ongoing</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {entry.status === "ACTIVE" && <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10">Active</Badge>}
                      {entry.status === "ON_BREAK" && <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">On Break</Badge>}
                      {entry.status === "COMPLETED" && <Badge variant="outline" className="border-gray-500/50 text-muted-foreground bg-muted">Completed</Badge>}
                    </td>
                    <td className="py-3 px-4">
                      {Math.floor(entry.totalMinutes / 60)}h {entry.totalMinutes % 60}m
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" title={entry.notes?.[0]?.content}>
                      {entry.notes?.[0]?.content || <span className="text-muted-foreground italic">No note</span>}
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">No time entries found.</td>
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
