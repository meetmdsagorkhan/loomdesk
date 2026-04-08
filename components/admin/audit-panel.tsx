"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { apiFetch, withToast } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportRecord } from "@/types/app";

interface AuditPanelProps {
  reports: ReportRecord[];
  onRefresh: () => Promise<void>;
}

export function AuditPanel({ reports, onRefresh }: AuditPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const auditTargets = reports.flatMap((report) =>
    report.entries.map((entry) => ({
      report,
      entry
    }))
  );

  function submitAudit(reportId: string, entryId: string, userId: string, issueFound: boolean, pointsDeducted: number) {
    startTransition(async () => {
      await withToast(
        apiFetch("/api/audits", {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            entry_id: entryId,
            issue_found: issueFound,
            note: notes[entryId] || null,
            points_deducted: pointsDeducted
          })
        }),
        {
          loading: "Saving audit result",
          success: `Audit recorded for report ${reportId.slice(0, 8)}`
        }
      );

      await onRefresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit System</CardTitle>
        <CardDescription>Review entries, flag issues, deduct points, and maintain coaching notes with traceability.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {auditTargets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
            No report entries available for audit.
          </div>
        ) : (
          auditTargets.slice(0, 20).map(({ report, entry }) => (
            <div key={entry.id} className="grid gap-4 rounded-2xl border border-border p-4 xl:grid-cols-[1.5fr_1fr_auto]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge>{report.users?.email ?? "Unknown member"}</Badge>
                  <Badge variant="secondary">{entry.type}</Badge>
                  <Badge variant={entry.status === "solved" ? "success" : "warning"}>{entry.status}</Badge>
                </div>
                <p className="text-sm font-medium text-slate-900">Session {entry.session_id}</p>
                <p className="text-sm text-muted-foreground">Report date {format(new Date(report.date), "PPP")}</p>
                {entry.pending_reason ? <p className="mt-2 text-sm text-slate-600">Pending reason: {entry.pending_reason}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`note-${entry.id}`}>Audit note</Label>
                <Input
                  id={`note-${entry.id}`}
                  value={notes[entry.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))}
                  placeholder="Coaching note or issue summary"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button disabled={isPending} onClick={() => submitAudit(report.id, entry.id, report.user_id, false, 0)}>
                  Mark clean
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => submitAudit(report.id, entry.id, report.user_id, true, 1)}
                >
                  Mark issue and deduct 1
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
