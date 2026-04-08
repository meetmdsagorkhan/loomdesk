"use client";

import { type FormEvent, useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, withToast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EntryTable } from "@/components/report/entry-table";
import type { ReportRecord } from "@/types/app";

interface ReportFormProps {
  recentReports: ReportRecord[];
  onSaved: () => Promise<void>;
}

type DraftEntry = {
  localId: string;
  type: "chat" | "ticket";
  session_id: string;
  status: "solved" | "pending";
  pending_reason: string;
};

const emptyEntry = (): DraftEntry => ({
  localId: crypto.randomUUID(),
  type: "chat",
  session_id: "",
  status: "solved",
  pending_reason: ""
});

export function ReportForm({ recentReports, onSaved }: ReportFormProps) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<DraftEntry[]>([emptyEntry()]);

  const solvedCount = entries.filter((entry) => entry.status === "solved").length;
  const pendingCount = entries.filter((entry) => entry.status === "pending").length;

  function updateEntry(localId: string, field: keyof DraftEntry, value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.localId === localId
          ? {
              ...entry,
              [field]: value,
              ...(field === "status" && value === "solved" ? { pending_reason: "" } : {})
            }
          : entry
      )
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await withToast(
        apiFetch("/api/reports", {
          method: "POST",
          body: JSON.stringify({
            date,
            entries: entries.map((entry) => ({
              type: entry.type,
              session_id: entry.session_id,
              status: entry.status,
              pending_reason: entry.status === "pending" ? entry.pending_reason : null
            }))
          })
        }),
        {
          loading: "Saving daily report",
          success: "Report saved"
        }
      );

      setEntries([emptyEntry()]);
      await onSaved();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Report Submission</CardTitle>
        <CardDescription>Track chat and ticket productivity with clean validation and automatic totals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-sm text-slate-300">Total Entries</p>
            <p className="mt-2 text-3xl font-semibold">{entries.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Solved</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">{solvedCount}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Pending</p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">{pendingCount}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="report-date">Report date</Label>
            <Input id="report-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.localId} className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={entry.type} onChange={(event) => updateEntry(entry.localId, "type", event.target.value)}>
                    <option value="chat">Chat</option>
                    <option value="ticket">Ticket</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session ID</Label>
                  <Input
                    value={entry.session_id}
                    onChange={(event) => updateEntry(entry.localId, "session_id", event.target.value)}
                    placeholder="CHAT-10091"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={entry.status} onChange={(event) => updateEntry(entry.localId, "status", event.target.value)}>
                    <option value="solved">Solved</option>
                    <option value="pending">Pending</option>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Pending reason</Label>
                  <div className="flex gap-2">
                    <Input
                      value={entry.pending_reason}
                      onChange={(event) => updateEntry(entry.localId, "pending_reason", event.target.value)}
                      disabled={entry.status !== "pending"}
                      placeholder={entry.status === "pending" ? "Explain the pending blocker" : "Not required"}
                    />
                    {entries.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove entry ${index + 1}`}
                        onClick={() => setEntries((current) => current.filter((item) => item.localId !== entry.localId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setEntries((current) => [...current, emptyEntry()])}>
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
            <Button type="submit" disabled={isPending}>
              Save report
            </Button>
          </div>
        </form>

        {recentReports.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Latest saved report</h3>
            <EntryTable entries={recentReports[0].entries} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
