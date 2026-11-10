import { clearSession, getAccessToken, getRefreshToken, setAccessToken } from "@/lib/session";
import type { ApiErrorBody, AuthResponse } from "@/lib/types";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// A refresh is in flight at most once at a time — concurrent 401s from a
// batch of parallel requests all await the same promise instead of each
// firing their own /auth/refresh call (which would race token rotation).
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as AuthResponse;
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Authenticated JSON fetch against the Go API, with one silent-refresh retry on 401. */
export async function api<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && !_retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, init, true);
    }
    if (typeof window !== "undefined") {
      clearSession();
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(401, "unauthorized", "Session expired");
  }

  if (!res.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body — fall through with defaults
    }
    throw new ApiError(res.status, body.error ?? "unknown_error", body.message ?? res.statusText, body.fields);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
