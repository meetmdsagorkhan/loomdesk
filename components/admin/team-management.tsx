"use client";

import { type FormEvent, useState, useTransition } from "react";
import { format } from "date-fns";
import { apiFetch, withToast } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InviteRecord, UserRecord } from "@/types/app";

interface TeamManagementProps {
  members: UserRecord[];
  invites: InviteRecord[];
  onRefresh: () => Promise<void>;
}

export function TeamManagement({ members, invites, onRefresh }: TeamManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    role: "member",
    expiresInDays: "7"
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await withToast(
        apiFetch("/api/invites", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            role: form.role,
            expiresInDays: Number(form.expiresInDays)
          })
        }),
        {
          loading: "Sending invitation",
          success: "Invitation sent"
        }
      );

      setForm({
        email: "",
        role: "member",
        expiresInDays: "7"
      });
      await onRefresh();
    });
  }

  return (
    <Card id="team">
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>Invite support members, monitor pending invites, and keep the team roster current.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="member@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="member">Member</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expiry</Label>
            <Select
              value={form.expiresInDays}
              onChange={(event) => setForm((current) => ({ ...current, expiresInDays: event.target.value }))}
            >
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={isPending}>
              Send invite
            </Button>
          </div>
        </form>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Members</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      <Badge>{member.role}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(member.created_at), "PPP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Recent Invites</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant={invite.status === "accepted" ? "success" : invite.status === "pending" ? "warning" : "outline"}>
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(invite.expires_at), "PPP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
