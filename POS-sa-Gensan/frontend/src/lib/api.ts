import { getToken, clearAuth } from "./auth";
import type { ApiResponse } from "./types";

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Ignore dev localhost URL when app is served from production host
    if (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      (!configured ||
        configured.includes("localhost") ||
        configured.includes("127.0.0.1"))
    ) {
      return "";
    }
    return configured;
  }
  return configured || process.env.API_URL_INTERNAL || "http://127.0.0.1:5170";
}

const API_URL = resolveApiUrl();

/** Same-origin in production; use for attachment/download URLs in components. */
export function getApiBaseUrl(): string {
  return resolveApiUrl();
}

export class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    // Let the browser set multipart boundary for FormData uploads
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_URL}. Start the backend (dotnet run in backend/GensanPOS.API).`,
      0
    );
  }

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      const onLogin = window.location.pathname.startsWith("/login");
      const validatingSession = path === "/api/auth/me";
      if (!onLogin && !validatingSession) {
        window.location.href = "/login";
      }
    }
    throw new ApiError("Unauthorized", 401);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const snippet = (await res.text()).slice(0, 120);
    const hint =
      res.status === 502
        ? "Backend API is down (502). On the server run: systemctl restart gensanpos-api"
        : "Server returned HTML instead of JSON";
    throw new ApiError(`${hint}. ${snippet}`, res.status);
  }

  const body = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !body.success) {
    throw new ApiError(
      body.message || "Request failed",
      res.status,
      body.errors
    );
  }

  return body.data as T;
}

/** Public API read (no auth, no login redirect). */
export async function getPublic<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(`Cannot reach the API at ${API_URL}.`, 0);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("Unexpected server response", res.status);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    throw new ApiError(body.message || "Request failed", res.status, body.errors);
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Multipart upload (e.g. attachments). Shares auth + 401 + error handling. */
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};

/** Download a file export (Excel/PDF) from the API. */
export async function downloadExport(
  path: string,
  filename: string
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const body = (await res.json()) as { message?: string; error?: string };
        throw new ApiError(body.message ?? body.error ?? "Export failed", res.status);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    throw new ApiError("Export failed", res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
