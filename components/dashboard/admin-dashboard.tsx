"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarView } from "@/components/admin/calendar-view";
import { AuditPanel } from "@/components/admin/audit-panel";
import { ScoreBoard } from "@/components/admin/score-board";
import { TeamManagement } from "@/components/admin/team-management";
import { MessageCenter } from "@/components/messages/message-center";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { InviteRecord, MessageRecord, PerformanceRecord, ReportRecord, UserRecord } from "@/types/app";

interface AdminDashboardProps {
  user: UserRecord;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [members, setMembers] = useState<UserRecord[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [scores, setScores] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard(nextMonth = month, userId?: string) {
    setLoading(true);

    try {
      const [teamData, reportData, messageData, scoreData] = await Promise.all([
        apiFetch<{ members: UserRecord[]; invites: InviteRecord[] }>("/api/invites"),
        apiFetch<ReportRecord[]>(`/api/reports?month=${nextMonth}${userId ? `&userId=${userId}` : ""}`),
        apiFetch<MessageRecord[]>("/api/messages"),
        apiFetch<PerformanceRecord[]>(`/api/performance?month=${nextMonth}`)
      ]);

      setMembers(teamData.members);
      setInvites(teamData.invites);
      setReports(reportData);
      setMessages(messageData);
      setScores(scoreData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard(month);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden bg-slate-950 text-white xl:col-span-2">
          <CardHeader>
            <CardTitle>Admin Control Center</CardTitle>
            <CardDescription className="text-slate-300">
              Govern the support operation with auditing, coaching, reporting, and month-end visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400">Workspace admin</p>
              <p className="mt-2 text-lg font-semibold">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Active members</p>
              <p className="mt-2 text-3xl font-semibold">{members.filter((member) => member.role === "member").length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Reports in month</p>
              <p className="mt-2 text-3xl font-semibold">{reports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>Outstanding invitations waiting for activation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{invites.filter((invite) => invite.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>At-risk members</CardTitle>
            <CardDescription>Members currently below the 90-point threshold.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{scores.filter((score) => score.score < 90).length}</p>
          </CardContent>
        </Card>
      </section>

      <TeamManagement members={members} invites={invites} onRefresh={() => loadDashboard(month)} />
      <CalendarView
        reports={reports}
        members={members.filter((member) => member.role === "member")}
        month={month}
        onMonthChange={async (nextMonth, userId) => {
          setMonth(nextMonth);
          await loadDashboard(nextMonth, userId);
        }}
      />
      <AuditPanel reports={reports} onRefresh={() => loadDashboard(month)} />
      <ScoreBoard scores={scores} />
      <MessageCenter
        messages={messages}
        members={members.filter((member) => member.role === "member")}
        role="admin"
        onRefresh={() => loadDashboard(month)}
      />
    </div>
  );
}
