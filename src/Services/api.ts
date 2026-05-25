const API_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "auth_token";

// Asegura compatibilidad: este archivo es la fuente de verdad para el storage key del JWT.
const AUTH_MESSAGE_KEY = "auth_message";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

type JsonValue = unknown;

type ApiErrorResponse = {
  ok?: false;
  error?: { code?: string; message: string };
  detail?: string;
  message?: string;
};



function buildHeaders(extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonOrText(res: Response): Promise<JsonValue> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

function extractMessage(payload: JsonValue): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "Error de red";

  const p = payload as Partial<ApiErrorResponse> & { message?: unknown };

  if (p.error && typeof p.error.message === "string") return p.error.message;
  if (typeof p.detail === "string") return p.detail;
  if (typeof p.message === "string") return p.message;

  return "Error de red";
}

function handleUnauthorizedRedirect() {
  clearToken();
  try {
    window.localStorage.setItem(
      AUTH_MESSAGE_KEY,
      "Tu sesión expiró. Inicia sesión para continuar."
    );
  } catch {
    // ignore
  }
  window.location.assign("/login");
}

type FetchError = Error & { code?: string };

async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 8000, ...rest } = init;

  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: buildHeaders(rest.headers as Record<string, string> | undefined),
    });

    const payload = await parseJsonOrText(res);

    if (!res.ok) {
      const msg = extractMessage(payload);

      if (res.status === 401) {
        handleUnauthorizedRedirect();
        throw Object.assign(new Error(msg || "No autorizado"), {
          code: "UNAUTHORIZED",
        }) as FetchError;
      }

      // Backend actualiza/estandariza más adelante: hoy aceptamos payload desconocido.
      const codeFromPayload =
        payload && typeof payload === "object" && "code" in (payload as Record<string, unknown>)
          ? String((payload as Record<string, unknown>).code ?? "")
          : "";

      throw Object.assign(new Error(msg || "Error"), {
        code: codeFromPayload || String(res.status),
      }) as FetchError;
    }

    return payload as T;
  } finally {
    window.clearTimeout(t);
  }
}

// Mantener endpoints públicos de booking
export async function getSlots(userId: string): Promise<string[]> {
  const res = await fetch(`${API_URL}/slots/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Error cargando horarios");

  const data = (await res.json()) as unknown;
  if (!data || typeof data !== "object") return [];

  const maybeSlots = (data as { slots?: unknown }).slots;
  return Array.isArray(maybeSlots) ? (maybeSlots.filter((s): s is string => typeof s === "string")) : [];
}

type CreateAppointmentResponse = {
  ok: true;
  turn_number: number;
  appointment?: unknown;
};

export async function createAppointment(
  userId: string,
  data: { client_name: string; phone: string; time_slot: string },
): Promise<CreateAppointmentResponse> {
  return apiFetch<CreateAppointmentResponse>(`/book/${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Protected
export type AppointmentStatus = "pending" | "completed" | "cancelled";

export type AppointmentListItem = {
  id: number;
  client_name: string;
  phone: string;
  time_slot: string;
  turn_number: number;
  appointment_date: string;
  status: AppointmentStatus;
  user_id: number;
};

function isAppointmentListItem(x: unknown): x is AppointmentListItem {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  const st = r.status;
  return (
    typeof r.id === "number" &&
    typeof r.client_name === "string" &&
    typeof r.phone === "string" &&
    typeof r.time_slot === "string" &&
    typeof r.turn_number === "number" &&
    typeof r.appointment_date === "string" &&
    typeof r.user_id === "number" &&
    (st === "pending" || st === "completed" || st === "cancelled")
  );
}

export async function getMyAppointmentsProtected(): Promise<AppointmentListItem[]> {
  const data = await apiFetch<unknown>(`/appointments`, { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data.filter(isAppointmentListItem);
}

type UpdateAppointmentPayload = {
  client_name?: string;
  phone?: string;
  time_slot?: string;
  status?: AppointmentStatus;
};

export async function updateAppointment(
  id: number,
  payload: UpdateAppointmentPayload,
): Promise<AppointmentListItem> {
  const data = await apiFetch<unknown>(`/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!isAppointmentListItem(data)) {
    // backend should respond with AppointmentOut
    throw new Error("Respuesta inesperada del servidor");
  }
  return data;
}

export async function deleteAppointment(id: number): Promise<{ ok: true; deleted_id: number }> {
  const data = await apiFetch<unknown>(`/appointments/${id}`, { method: "DELETE" });
  if (!data || typeof data !== "object") throw new Error("Respuesta inesperada del servidor");
  const r = data as Record<string, unknown>;
  if (r.ok !== true || typeof r.deleted_id !== "number") throw new Error("Respuesta inesperada del servidor");
  return data as { ok: true; deleted_id: number };
}

export async function logout() {
  clearToken();
}


