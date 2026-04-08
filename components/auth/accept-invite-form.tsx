"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AcceptInviteFormProps {
  token: string;
  email: string;
}

export function AcceptInviteForm({ token, email }: AcceptInviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      await apiFetch<{ email: string }>(`/api/invites/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({
          password
        })
      });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.success("Invite accepted. Please sign in.");
        router.push("/login");
        return;
      }

      toast.success("Your account is ready");
      router.push("/member");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-md border-white/60 bg-white/90">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
          <MailCheck className="h-6 w-6" />
        </div>
        <CardTitle>Accept your invitation</CardTitle>
        <CardDescription>
          Your workspace account will be linked to <span className="font-medium text-slate-900">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Set password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <Button className="w-full rounded-2xl" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Activate account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
