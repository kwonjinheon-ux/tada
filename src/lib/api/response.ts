import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/contracts/api";

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiFailure(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}
