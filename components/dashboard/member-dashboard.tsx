"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportForm } from "@/components/report/report-form";
import { ScoreBoard } from "@/components/admin/score-board";
import { MessageCenter } from "@/components/messages/message-center";
import { apiFetch } from "@/lib/api";
import type { MessageRecord, PerformanceRecord, ReportRecord, UserRecord } from "@/types/app";

interface MemberDashboardProps {
  user: UserRecord;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [reportData, messageData, performanceData] = await Promise.all([
        apiFetch<ReportRecord[]>(`/api/reports?month=${format(new Date(), "yyyy-MM")}`),
        apiFetch<MessageRecord[]>("/api/messages"),
        apiFetch<PerformanceRecord>(`/api/performance?month=${format(new Date(), "yyyy-MM")}`)
      ]);

      setReports(reportData);
      setMessages(messageData);
      setPerformance(performanceData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>Member Workspace</CardTitle>
            <CardDescription className="text-slate-300">
              Submit your operational output, track score movement, and stay aligned with admin instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400">Current month</p>
              <p className="mt-2 text-3xl font-semibold">{format(new Date(), "MMMM")}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Reports submitted</p>
              <p className="mt-2 text-3xl font-semibold">{reports.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Current score</p>
              <p className="mt-2 text-3xl font-semibold">{performance?.score ?? 100}</p>
            </div>
          </CardContent>
        </Card>

        <Card id="performance">
          <CardHeader>
            <CardTitle>Your performance snapshot</CardTitle>
            <CardDescription>Score starts at 100 and drops one point per verified audit issue.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-sm text-sky-700">Score</p>
              <p className="mt-2 text-3xl font-semibold text-sky-900">{performance?.score ?? 100}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-amber-700">Issues</p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">{performance?.issues_count ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Deductions</p>
              <p className="mt-2 text-3xl font-semibold text-rose-900">{performance?.deductions ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <ReportForm recentReports={reports} onSaved={loadDashboard} />

      {performance ? <ScoreBoard scores={[{ ...performance, users: { email: user.email } }]} /> : null}

      <MessageCenter messages={messages} members={[user]} role="member" onRefresh={loadDashboard} />
    </div>
  );
}
