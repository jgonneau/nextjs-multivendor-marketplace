import type { Session } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

/** Dispatched when the API answers 401, so the session can sign the user out. */
export const AUTH_EXPIRED_EVENT = "nextjs-multivendor-marketplace:auth-expired";

export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  // The API's (non-standard) header format.
  if (token) headers.authorization = `Bearer: TOKEN ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const apiMessage =
      data && typeof data === "object" && "error" in data ? String(data.error) : "";
    const message = apiMessage || res.statusText || "Request failed";
    if (res.status === 401 && token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Reads the (unverified) payload of a token; the server does the verifying. */
export function decodeToken(token: string): Session | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    if (!json.id || !json.role) return null;
    return { token, id: json.id, email: json.email, role: json.role, exp: json.exp ?? 0 };
  } catch {
    return null;
  }
}

// Fallback texts in the current UI language; kept in sync by I18nProvider.
let errorTexts = { forbidden: "You don't have permission to do that.", generic: "Something went wrong." };
export function setErrorTexts(texts: typeof errorTexts) {
  errorTexts = texts;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403 && /forbidden/i.test(error.message)) {
      return errorTexts.forbidden;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : errorTexts.generic;
}
