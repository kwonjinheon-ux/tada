import "server-only";

export type Cursor = { value: string | number; id: string };

export function encodeCursor(value: string | number, id: string): string {
  return Buffer.from(JSON.stringify({ value, id })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined | null): Cursor | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
    return typeof value.id === "string" && (typeof value.value === "string" || typeof value.value === "number") ? value : null;
  } catch {
    return null;
  }
}
