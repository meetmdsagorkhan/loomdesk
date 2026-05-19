"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Camera, Search, Filter, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MonitoringPage() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchScreenshots();
  }, [dateFilter]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-tracking/screenshots?date=${dateFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setScreenshots(data.screenshots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredScreenshots = screenshots.filter(s => 
    s.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-indigo-500" />
            Activity Monitoring
          </h1>
          <p className="text-gray-400">View automated screen captures of active sessions.</p>
        </div>
        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filter member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border-transparent rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border-transparent rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredScreenshots.map((screenshot) => (
          <Card key={screenshot.id} className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden group">
            <div className="relative aspect-video bg-black/60 border-b border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={screenshot.imageUrl} 
                alt={`Screenshot for ${screenshot.user?.name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <button className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-medium transition-colors">
                  View Full Size
                </button>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-white truncate pr-2">{screenshot.user?.name}</div>
                <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {format(new Date(screenshot.timestamp), "HH:mm:ss")}
                </div>
              </div>
              <div className="text-xs text-gray-500 truncate">{screenshot.user?.email}</div>
            </CardContent>
          </Card>
        ))}

        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={`sk-${i}`} className="aspect-video bg-white/5 rounded-xl animate-pulse" />
        ))}
        
        {!loading && filteredScreenshots.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400">No screenshots found</h3>
            <p className="text-gray-500 mt-1">Try selecting a different date or clearing filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
