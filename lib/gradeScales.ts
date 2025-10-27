import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";

export interface GradeRange {
  id: number | string | null;
  min_score: number;
  max_score: number;
  grade_label: string;
  description?: string | null;
  grade_point?: number | null;
  locked?: boolean;
  order_index?: number | null;
  [key: string]: unknown;
}

export interface GradeScale {
  id: number | string;
  name: string;
  description?: string | null;
  grade_ranges: GradeRange[];
  [key: string]: unknown;
}

type GradeScalesResponse =
  | GradeScale[]
  | {
      data?: GradeScale[];
      [key: string]: unknown;
    };

function normalizeScales(payload: GradeScalesResponse): GradeScale[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listGradeScales(): Promise<GradeScale[]> {
  const payload = await apiFetch<GradeScalesResponse>(API_ROUTES.gradeScales);
  return normalizeScales(payload);
}

export interface GradeRangePayload {
  id?: number | string | null;
  min_score: number;
  max_score: number;
  grade_label: string;
  description?: string | null;
  grade_point?: number | null;
  order_index?: number;
}

export interface UpdateGradeScaleRangesPayload {
  ranges: GradeRangePayload[];
  deleted_ids?: Array<number | string>;
}

interface GradeScaleUpdateResponse {
  data?: GradeScale;
  message?: string;
  [key: string]: unknown;
}

export interface GradeScaleUpdateResult {
  scale: GradeScale;
  message?: string;
}

export async function updateGradeScaleRanges(
  scaleId: number | string,
  payload: UpdateGradeScaleRangesPayload,
): Promise<GradeScaleUpdateResult> {
  const raw = await apiFetch<GradeScale | GradeScaleUpdateResponse>(
    `${API_ROUTES.gradeScales}/${scaleId}/ranges`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  if (raw && typeof raw === "object" && "grade_ranges" in raw) {
    return {
      scale: raw as GradeScale,
      message: undefined,
    };
  }

  const wrapper = raw as GradeScaleUpdateResponse;
  if (!wrapper || !wrapper.data) {
    throw new Error("Server returned no data while updating grade ranges.");
  }

  return {
    scale: wrapper.data,
    message:
      typeof wrapper.message === "string" ? wrapper.message : undefined,
  };
}
