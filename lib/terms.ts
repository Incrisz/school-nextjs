import { apiFetch } from "@/lib/apiClient";

export interface Term {
  id: number;
  name: string;
  session?: number | string;
  start_date?: string | null;
  end_date?: string | null;
  [key: string]: unknown;
}

type TermsResponse =
  | Term[]
  | {
      data?: Term[];
      [key: string]: unknown;
    };

function normalizeTerms(payload: TermsResponse): Term[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listTermsBySession(
  sessionId: number | string,
): Promise<Term[]> {
  const payload = await apiFetch<TermsResponse>(
    `/api/v1/sessions/${sessionId}/terms`,
  );
  return normalizeTerms(payload);
}

export async function getTerm(termId: number | string): Promise<Term | null> {
  try {
    return await apiFetch<Term>(`/api/v1/terms/${termId}`);
  } catch (error) {
    console.error("Unable to load term", error);
    return null;
  }
}
