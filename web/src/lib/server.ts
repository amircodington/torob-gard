import { notFound } from "next/navigation";
import { ApiError } from "./api";

/** Server-side catalog load: an id gone after a data refresh is the 404 page, never a 500 (Review Focus 2). */
export async function or404<T>(load: () => Promise<T>): Promise<T> {
  // ponytail: same default as the /api rewrite in next.config.ts; set API_URL in prod.
  process.env.API_URL ??= "http://localhost:8000";
  try {
    return await load();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

/** Persian slugs may reach the page still percent-encoded; a malformed one stays as it came. */
export function param(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
