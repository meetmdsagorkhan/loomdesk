"use client";

import { useState } from "react";
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EntryTable } from "@/components/report/entry-table";
import type { ReportRecord, UserRecord } from "@/types/app";

interface CalendarViewProps {
  reports: ReportRecord[];
  members: UserRecord[];
  month: string;
  onMonthChange: (month: string, userId?: string) => Promise<void>;
}

export function CalendarView({ reports, members, month, onMonthChange }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const monthDate = new Date(`${month}-01`);
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate)
  });

  const selectedReports = selectedDate
    ? reports.filter((report) => isSameDay(new Date(report.date), selectedDate))
    : reports.slice(0, 3);

  return (
    <Card id="calendar">
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
        <CardDescription>Browse report submissions by date, filter by team member, and inspect report details inline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Month</Label>
            <Input
              type="month"
              value={month}
              onChange={async (event) => {
                await onMonthChange(event.target.value, selectedUserId || undefined);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>User filter</Label>
            <Select
              value={selectedUserId}
              placeholder="All members"
              onChange={async (event) => {
                setSelectedUserId(event.target.value);
                await onMonthChange(month, event.target.value || undefined);
              }}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-sm text-slate-300">Reports this month</p>
            <p className="mt-2 text-3xl font-semibold">{reports.length}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const count = reports.filter((report) => isSameDay(new Date(report.date), day)).length;
            return (
              <button
                type="button"
                key={day.toISOString()}
                className="rounded-2xl border border-border bg-white p-4 text-left transition-colors hover:border-sky-300 hover:bg-sky-50"
                onClick={() => setSelectedDate(day)}
              >
                <p className="text-sm font-semibold text-slate-900">{format(day, "d")}</p>
                <p className="text-xs text-slate-500">{format(day, "EEE")}</p>
                <div className="mt-3">
                  <Badge variant={count > 0 ? "default" : "outline"}>{count} reports</Badge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            {selectedDate ? `Reports for ${format(selectedDate, "PPP")}` : "Recent report details"}
          </h3>
          {selectedReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No reports found for the current selection.
            </div>
          ) : (
            selectedReports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-border p-4">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Badge>{report.users?.email ?? "Unknown member"}</Badge>
                  <Badge variant="outline">{format(new Date(report.date), "PPP")}</Badge>
                  <Badge variant="secondary">{report.entries.length} entries</Badge>
                </div>
                <EntryTable entries={report.entries} />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
