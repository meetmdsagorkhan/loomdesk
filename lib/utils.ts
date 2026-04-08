import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function toTitleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
