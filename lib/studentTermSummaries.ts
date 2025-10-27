import { apiFetch } from "@/lib/apiClient";

export interface StudentTermSummary {
  class_teacher_comment?: string | null;
  principal_comment?: string | null;
  [key: string]: unknown;
}

export interface StudentTermSummaryFilters {
  session_id: string | number;
  term_id: string | number;
}

export interface UpdateStudentTermSummaryPayload
  extends StudentTermSummaryFilters {
  class_teacher_comment?: string | null;
  principal_comment?: string | null;
}

interface TermSummaryResponse {
  data?: StudentTermSummary | null;
  [key: string]: unknown;
}

const EMPTY_SUMMARY: StudentTermSummary = {
  class_teacher_comment: "",
  principal_comment: "",
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

function extractSummary(
  payload: StudentTermSummary | TermSummaryResponse | null,
): StudentTermSummary {
  if (!payload) {
    return { ...EMPTY_SUMMARY };
  }
  if ("class_teacher_comment" in payload || "principal_comment" in payload) {
    return {
      class_teacher_comment:
        (payload as StudentTermSummary).class_teacher_comment ?? "",
      principal_comment:
        (payload as StudentTermSummary).principal_comment ?? "",
    };
  }
  const wrapper = payload as TermSummaryResponse;
  if (wrapper?.data) {
    return {
      class_teacher_comment: wrapper.data.class_teacher_comment ?? "",
      principal_comment: wrapper.data.principal_comment ?? "",
    };
  }
  return { ...EMPTY_SUMMARY };
}

export async function getStudentTermSummary(
  studentId: string | number,
  filters: StudentTermSummaryFilters,
): Promise<StudentTermSummary> {
  const query = buildQuery({
    session_id: filters.session_id,
    term_id: filters.term_id,
  });
  try {
    const payload = await apiFetch<StudentTermSummary | TermSummaryResponse>(
      `/api/v1/students/${studentId}/term-summary${query}`,
    );
    return extractSummary(payload);
  } catch (error) {
    if (
      error instanceof Error &&
      /(not\s+found|404)/i.test(error.message ?? "")
    ) {
      return { ...EMPTY_SUMMARY };
    }
    throw error;
  }
}

export async function updateStudentTermSummary(
  studentId: string | number,
  payload: UpdateStudentTermSummaryPayload,
): Promise<StudentTermSummary> {
  const response = await apiFetch<StudentTermSummary | TermSummaryResponse>(
    `/api/v1/students/${studentId}/term-summary`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return extractSummary(response);
}
