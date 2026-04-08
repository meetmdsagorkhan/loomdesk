"use client";

import { type FormEvent, useState, useTransition } from "react";
import { format } from "date-fns";
import { apiFetch, withToast } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { MessageRecord, UserRecord } from "@/types/app";

interface MessageCenterProps {
  messages: MessageRecord[];
  members: UserRecord[];
  role: "admin" | "member";
  onRefresh: () => Promise<void>;
}

export function MessageCenter({ messages, members, role, onRefresh }: MessageCenterProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: members[0]?.id ?? "",
    type: "reminder",
    message: ""
  });

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await withToast(
        apiFetch("/api/messages", {
          method: "POST",
          body: JSON.stringify(form)
        }),
        {
          loading: "Sending message",
          success: "Message sent"
        }
      );

      setOpen(false);
      setForm({
        user_id: members[0]?.id ?? "",
        type: "reminder",
        message: ""
      });
      await onRefresh();
    });
  }

  return (
    <Card id="messages">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Message Center</CardTitle>
          <CardDescription>Centralize reminders, warnings, notes, and internal communication for every support member.</CardDescription>
        </div>
        {role === "admin" ? <Button onClick={() => setOpen(true)}>Compose message</Button> : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell>
                  <Badge
                    variant={
                      message.type === "warning" ? "destructive" : message.type === "reminder" ? "warning" : "secondary"
                    }
                  >
                    {message.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{message.user?.email ?? "You"}</TableCell>
                <TableCell>{message.message}</TableCell>
                <TableCell>{format(new Date(message.created_at), "PPp")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Compose member message"
        description="Send reminders, warnings, and notes directly from the operations console."
      >
        <form className="space-y-4" onSubmit={handleSend}>
          <div className="space-y-2">
            <Label>Member</Label>
            <Select value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="reminder">Reminder</option>
              <option value="warning">Warning</option>
              <option value="note">Note</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Share the operational instruction or coaching note"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Send message
          </Button>
        </form>
      </Dialog>
    </Card>
  );
}
