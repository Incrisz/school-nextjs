import { apiFetch } from "@/lib/apiClient";

export interface Session {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  [key: string]: unknown;
}

type SessionsResponse =
  | Session[]
  | {
      data?: Session[];
      [key: string]: unknown;
    };

function normalizeSessions(payload: SessionsResponse): Session[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listSessions(): Promise<Session[]> {
  const payload = await apiFetch<SessionsResponse>("/api/v1/sessions");
  return normalizeSessions(payload);
}

export interface SessionPayload {
  name: string;
  start_date: string;
  end_date: string;
}

export async function createSession(payload: SessionPayload): Promise<Session> {
  return apiFetch<Session>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSession(
  id: number,
  payload: SessionPayload,
): Promise<Session> {
  return apiFetch<Session>(`/api/v1/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function removeSession(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/sessions/${id}`, {
    method: "DELETE",
  });
}

export async function getSession(id: number): Promise<Session> {
  return apiFetch<Session>(`/api/v1/sessions/${id}`);
}
