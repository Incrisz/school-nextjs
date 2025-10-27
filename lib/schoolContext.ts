import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";
import type { School, Session, Term } from "@/lib/auth";

export interface SchoolContext {
  school: School | null;
  current_session_id: number | null;
  current_term_id: number | null;
  current_session: Session | null;
  current_term: Term | null;
}

export function createEmptySchoolContext(): SchoolContext {
  return {
    school: null,
    current_session_id: null,
    current_term_id: null,
    current_session: null,
    current_term: null,
  };
}

export function normalizeSchoolContext(payload: unknown): SchoolContext {
  if (!payload || typeof payload !== "object") {
    return createEmptySchoolContext();
  }

  const maybeSchool = (payload as { school?: School }).school;
  const school = maybeSchool ?? (payload as School);

  if (!school || typeof school !== "object") {
    return createEmptySchoolContext();
  }

  const currentSession =
    school.current_session ?? (school as Record<string, unknown>)?.currentSession;
  const currentTerm =
    school.current_term ?? (school as Record<string, unknown>)?.currentTerm;

  return {
    school,
    current_session_id:
      school.current_session_id ??
      (currentSession as Session | undefined)?.id ??
      null,
    current_term_id:
      school.current_term_id ?? (currentTerm as Term | undefined)?.id ?? null,
    current_session: (currentSession as Session) ?? null,
    current_term: (currentTerm as Term) ?? null,
  };
}

export async function fetchSchoolContext(): Promise<SchoolContext> {
  try {
    const payload = await apiFetch(API_ROUTES.schoolContext);
    return normalizeSchoolContext(payload);
  } catch (error) {
    console.error("Unable to load school context", error);
    return createEmptySchoolContext();
  }
}
