"use client";

import { toast } from "sonner";

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload.error ?? "Request failed";
    throw new Error(message);
  }

  return payload.data as T;
}

export async function withToast<T>(promise: Promise<T>, messages: { loading: string; success: string }) {
  const id = toast.loading(messages.loading);

  try {
    const result = await promise;
    toast.success(messages.success, { id });
    return result;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Something went wrong", { id });
    throw error;
  }
}
