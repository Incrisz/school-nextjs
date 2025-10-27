import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";
import { deleteCookie, setCookie } from "@/lib/cookies";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  [key: string]: unknown;
}

export interface User {
  id: number;
  name: string;
  email: string;
  school?: School;
  [key: string]: unknown;
}

export interface School {
  id: number;
  name: string;
  logo_url?: string | null;
  current_session_id?: number | null;
  current_term_id?: number | null;
  current_session?: Session | null;
  current_term?: Term | null;
  [key: string]: unknown;
}

export interface Session {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface Term {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface AuthenticatedUserResponse {
  user?: User;
  school?: School;
  [key: string]: unknown;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>(API_ROUTES.login, {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });

  if (response.token) {
    setCookie("token", response.token);
  }

  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch(API_ROUTES.logout, { method: "POST" });
  } catch (error) {
    console.warn("Logout request failed:", error);
  } finally {
    deleteCookie("token");
  }
}

export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const payload = await apiFetch<AuthenticatedUserResponse>(
      API_ROUTES.currentUser,
    );
    if (payload?.user) {
      return {
        ...payload.user,
        school: payload.user.school ?? payload.school,
      };
    }
    if (payload?.school) {
      return {
        id: -1,
        name: "Unknown",
        email: "",
        school: payload.school,
      };
    }
    return null;
  } catch (error) {
    console.error("Unable to fetch authenticated user", error);
    return null;
  }
}
