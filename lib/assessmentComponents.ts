import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";
import { type Subject } from "@/lib/subjects";

export interface AssessmentComponent {
  id: number | string;
  name: string;
  weight: number;
  order: number;
  label?: string | null;
  subjects?: Subject[];
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface AssessmentComponentListResponse {
  data: AssessmentComponent[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
  [key: string]: unknown;
}

export interface AssessmentComponentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  subject_id?: string | number;
  session_id?: string | number;
  term_id?: string | number;
}

type AssessmentComponentPayload =
  | AssessmentComponent
  | {
      data?: AssessmentComponent | AssessmentComponent[];
      [key: string]: unknown;
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

function normalizeComponentList(
  payload: AssessmentComponentPayload,
): AssessmentComponentListResponse {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as AssessmentComponentListResponse).data) &&
    ("current_page" in payload || "total" in payload)
  ) {
    return payload as AssessmentComponentListResponse;
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const dataField = (payload as { data?: unknown }).data;
    if (Array.isArray(dataField)) {
      return {
        data: dataField as AssessmentComponent[],
        current_page: 1,
        last_page: 1,
        per_page: dataField.length,
        total: dataField.length,
      };
    }
    if (
      dataField &&
      typeof dataField === "object" &&
      Array.isArray((dataField as AssessmentComponentListResponse).data)
    ) {
      return dataField as AssessmentComponentListResponse;
    }
  }

  if (Array.isArray(payload)) {
    return {
      data: payload,
      current_page: 1,
      last_page: 1,
      per_page: payload.length,
      total: payload.length,
    };
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 0,
    total: 0,
  };
}

export async function listAssessmentComponents(
  filters: AssessmentComponentFilters = {},
): Promise<AssessmentComponentListResponse> {
  const query = buildQuery({
    page: filters.page,
    per_page: filters.per_page,
    search: filters.search,
    subject_id: filters.subject_id,
    session_id: filters.session_id,
    term_id: filters.term_id,
  });

  const payload = await apiFetch<AssessmentComponentPayload>(
    `${API_ROUTES.assessmentComponents}${query}`,
  );

  return normalizeComponentList(payload);
}

export interface UpsertAssessmentComponentPayload {
  name: string;
  weight: number;
  order: number;
  label?: string | null;
  subject_ids: Array<number | string>;
}

interface AssessmentComponentResponse {
  data?: AssessmentComponent;
  message?: string;
  [key: string]: unknown;
}

function extractAssessmentComponent(
  payload: AssessmentComponent | AssessmentComponentResponse,
): AssessmentComponent {
  if (payload && typeof payload === "object" && "weight" in payload) {
    return payload as AssessmentComponent;
  }
  const wrapper = payload as AssessmentComponentResponse;
  if (wrapper && wrapper.data) {
    return wrapper.data;
  }
  throw new Error("Unexpected server response for assessment component.");
}

export async function getAssessmentComponent(
  componentId: number | string,
): Promise<AssessmentComponent | null> {
  try {
    const payload = await apiFetch<
      AssessmentComponent | AssessmentComponentResponse
    >(`${API_ROUTES.assessmentComponents}/${componentId}`);
    return extractAssessmentComponent(payload);
  } catch (error) {
    console.error("Unable to load assessment component", error);
    return null;
  }
}

export async function createAssessmentComponent(
  payload: UpsertAssessmentComponentPayload,
): Promise<AssessmentComponent> {
  const response = await apiFetch<
    AssessmentComponent | AssessmentComponentResponse
  >(API_ROUTES.assessmentComponents, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return extractAssessmentComponent(response);
}

export async function updateAssessmentComponent(
  componentId: number | string,
  payload: UpsertAssessmentComponentPayload,
): Promise<AssessmentComponent> {
  const response = await apiFetch<
    AssessmentComponent | AssessmentComponentResponse
  >(`${API_ROUTES.assessmentComponents}/${componentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return extractAssessmentComponent(response);
}

export async function deleteAssessmentComponent(
  componentId: number | string,
): Promise<void> {
  await apiFetch(`${API_ROUTES.assessmentComponents}/${componentId}`, {
    method: "DELETE",
  });
}
