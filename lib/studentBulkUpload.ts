import { API_ROUTES, BACKEND_URL } from "@/lib/config";
import { getCookie } from "@/lib/cookies";

function buildAuthHeaders(): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const token = getCookie("token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function downloadStudentTemplate(): Promise<Blob> {
  const headers = buildAuthHeaders();
  headers.set("Accept", "text/csv");

  const response = await fetch(
    `${BACKEND_URL}${API_ROUTES.studentsBulkTemplate}`,
    {
      method: "GET",
      headers,
      credentials: "include",
    },
  );

  if (!response.ok) {
    let message = response.statusText || "Failed to download template.";
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.blob();
}

export interface BulkPreviewRow {
  name?: string | null;
  admission_no?: string | null;
  session?: string | null;
  class?: string | null;
  class_arm?: string | null;
  class_section?: string | null;
  parent_email?: string | null;
  [key: string]: unknown;
}

export interface BulkPreviewSummary {
  total_rows?: number;
  sessions?: number;
  classes?: number;
  [key: string]: unknown;
}

export interface BulkValidationError {
  row?: number | string;
  column?: string | null;
  message?: string | null;
  [key: string]: unknown;
}

export interface BulkPreviewSuccess {
  batchId: string;
  previewRows: BulkPreviewRow[];
  summary: BulkPreviewSummary | null;
  expiresAt: string | null;
}

export interface BulkPreviewFailure {
  message: string;
  errors: BulkValidationError[];
  errorCsv?: string | null;
}

export type BulkPreviewResult =
  | { ok: true; data: BulkPreviewSuccess }
  | { ok: false; error: BulkPreviewFailure };

interface BulkPreviewResponsePayload {
  batch_id?: string | number;
  preview_rows?: BulkPreviewRow[];
  summary?: BulkPreviewSummary | null;
  expires_at?: string | null;
  message?: string;
  errors?: BulkValidationError[];
  error_csv?: string | null;
}

export async function previewStudentBulkUpload(
  file: File,
): Promise<BulkPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = buildAuthHeaders();
  const response = await fetch(
    `${BACKEND_URL}${API_ROUTES.studentsBulkPreview}`,
    {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    },
  );

  let payload: BulkPreviewResponsePayload | null = null;
  try {
    payload = (await response.json()) as BulkPreviewResponsePayload;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        message:
          payload?.message ??
          `Unable to validate file (${response.status}).`,
        errors: Array.isArray(payload?.errors)
          ? payload.errors
          : [],
        errorCsv: payload?.error_csv ?? null,
      },
    };
  }

  return {
    ok: true,
    data: {
      batchId: String(payload?.batch_id ?? ""),
      previewRows: Array.isArray(payload?.preview_rows)
        ? (payload.preview_rows as BulkPreviewRow[])
        : [],
      summary: payload?.summary ?? null,
      expiresAt: payload?.expires_at ?? null,
    },
  };
}

export interface BulkCommitResult {
  message?: string;
  summary?: {
    total_processed?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type BulkCommitResponsePayload = BulkCommitResult;

export async function commitStudentBulkUpload(
  batchId: string,
): Promise<BulkCommitResult> {
  const headers = buildAuthHeaders();
  headers.set("Content-Type", "application/json");

  const response = await fetch(
    `${BACKEND_URL}${API_ROUTES.studentsBulkCommit}/${encodeURIComponent(batchId)}/commit`,
    {
      method: "POST",
      headers,
      credentials: "include",
    },
  );

  let payload: BulkCommitResponsePayload | null = null;
  try {
    payload = (await response.json()) as BulkCommitResponsePayload;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ?? `Bulk upload failed (${response.status}).`,
    );
  }

  return payload ?? {};
}
