// Klien API tipis untuk route handler backend (same-origin, cookie sesi
// Better Auth otomatis terkirim). Kontrak respons: { ok: true, ... } atau
// { ok: false, error: "pesan" }.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(path, {
    method: options?.method ?? "GET",
    // Content-Type selalu disertakan: beberapa endpoint Better Auth
    // (mis. sign-out) menolak POST tanpa content-type (415).
    headers: { "Content-Type": "application/json" },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const message =
      (json as { error?: string })?.error ??
      (json as { message?: string })?.message ??
      `Terjadi kesalahan (HTTP ${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return json as T;
}

// GET dengan hasil { ok, data: T[] }
export async function apiList<T>(path: string): Promise<T[]> {
  const res = await apiFetch<{ ok: boolean; data: T[] }>(path);
  return res.data ?? [];
}
