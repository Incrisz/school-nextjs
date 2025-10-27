import { BACKEND_URL } from "@/lib/config";
import { getCookie } from "@/lib/cookies";

type FetchOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth = false, headers, ...rest } = options;
  const token = getCookie("token");
  const resolvedHeaders = new Headers(headers);

  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  resolvedHeaders.set("Accept", "application/json");
  if (!resolvedHeaders.has("Content-Type") && rest.body && !isFormData) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  if (!skipAuth && token) {
    resolvedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: resolvedHeaders,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.message ?? JSON.stringify(data);
    } catch {
      // ignore parse errors, fall back to status text
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
