import fetch from "node-fetch";
import FormData from "form-data";
import { createReadStream, statSync } from "fs";
import { basename } from "path";
import { lookup } from "mime-types";
import { getApiBaseUrl, loadCredentials } from "./config.js";
import type { ApiResponse, CLIOptions } from "../types.js";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getHeaders(contentType?: string): Record<string, string> {
  const creds = loadCredentials();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-AAMT-CLI": "1",
    "X-AAMT-CLI-Version": "1.0.0",
  };
  if (creds?.apiKey) {
    headers["X-API-Key"] = creds.apiKey;
  }
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

async function handleResponse<T>(res: import("node-fetch").Response): Promise<T> {
  if (res.status === 401) {
    throw new ApiError(
      "Authentication failed. Your API key may be invalid or expired. Run `aamt auth login` to re-authenticate.",
      401
    );
  }
  if (res.status === 403) {
    throw new ApiError(
      "Access denied. Your API key doesn't have the required scope for this action.",
      403
    );
  }
  if (res.status === 404) {
    throw new ApiError("Resource not found.", 404);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after") || "60";
    throw new ApiError(
      `Rate limited. Retry after ${retryAfter} seconds.`,
      429
    );
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json() as ApiResponse<unknown>;
      msg = body.error || body.message || msg;
    } catch {
      try {
        msg = await res.text() || msg;
      } catch { /* ignore */ }
    }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ─── HTTP Methods ────────────────────────────────────────────────────

export async function get<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "PATCH",
    headers: getHeaders("application/json"),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse<T>(res);
}

// ─── File Upload ─────────────────────────────────────────────────────

export async function uploadFile<T>(
  path: string,
  filePath: string,
  fields?: Record<string, string>,
  onProgress?: (uploaded: number, total: number) => void
): Promise<T> {
  const form = new FormData();

  if (fields) {
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  }

  const filename = basename(filePath);
  const mime = lookup(filePath) || "application/octet-stream";
  const stream = createReadStream(filePath);
  const stats = statSync(filePath);

  form.append("file", stream, {
    filename,
    contentType: mime,
    knownLength: stats.size,
  });

  const headers: Record<string, string> = {
    ...getHeaders(),
    ...form.getHeaders(),
  };

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: form as unknown as import("node-fetch").BodyInit,
  });

  return handleResponse<T>(res);
}

export async function downloadFile(
  path: string,
  destPath: string
): Promise<void> {
  const { pipeline } = await import("stream/promises");
  const { createWriteStream } = await import("fs");

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    await handleResponse(res);
    return;
  }

  if (!res.body) {
    throw new ApiError("No response body", 500);
  }

  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(destPath));
}

// ─── Pagination Helper ───────────────────────────────────────────────

export async function paginatedGet<T>(
  path: string,
  options?: CLIOptions
): Promise<{ items: T[]; meta: { total?: number; hasMore?: boolean } }> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const res = await get<ApiResponse<T[]>>(path, { limit, offset });
  if (!res.success || !res.data) {
    throw new ApiError(res.error || "Failed to fetch data", 500);
  }
  return {
    items: res.data,
    meta: {
      total: res.meta?.total,
      hasMore: res.meta?.hasMore,
    },
  };
}

export { ApiError };
