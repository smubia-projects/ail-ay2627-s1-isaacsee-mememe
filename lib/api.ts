// Client-side fetch helper. Every error carries a user-facing message (what happened + what to do).

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export async function postJson<T>(url: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch {
    throw ac.signal.aborted
      ? new ApiError("timeout", "That took too long. Check your connection and try again.")
      : new ApiError("network", "We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // handled below
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? `http_${res.status}`, err?.message ?? "Something went wrong. Try again in a moment.", res.status);
  }
  return json as T;
}
