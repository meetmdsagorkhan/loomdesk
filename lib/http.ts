import { NextResponse } from "next/server";
import { AppError, toErrorMessage } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
}
