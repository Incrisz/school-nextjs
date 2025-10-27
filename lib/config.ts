const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  DEFAULT_BACKEND_URL;

export function resolveBackendUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }

  const normalized = `${path}`;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${BACKEND_URL}${normalized}`;
  }

  return `${BACKEND_URL}/${normalized}`;
}

export const API_ROUTES = {
  login: "/api/v1/login",
  logout: "/api/v1/logout",
  currentUser: "/api/v1/user",
  schoolContext: "/api/v1/school",
  classes: "/api/v1/classes",
  parents: "/api/v1/parents",
  parentsSearch: "/api/v1/parents",
  parentsIndex: "/api/v1/all-parents",
  staff: "/api/v1/staff",
  subjects: "/api/v1/settings/subjects",
  subjectAssignments: "/api/v1/settings/subject-assignments",
  subjectTeacherAssignments: "/api/v1/settings/subject-teacher-assignments",
  classTeachers: "/api/v1/settings/class-teachers",
  promotionsBulk: "/api/v1/promotions/bulk",
  promotionsHistory: "/api/v1/promotions/history",
  sessionsRollover: "/api/v1/sessions/rollover",
} as const;
