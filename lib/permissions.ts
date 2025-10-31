import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  guard_name?: string | null;
  school_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface PermissionListResponse {
  data: Permission[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
  [key: string]: unknown;
}

export interface PermissionFilters {
  page?: number;
  per_page?: number;
  search?: string;
}

type PermissionPayload =
  | Permission[]
  | PermissionListResponse
  | {
      data?: Permission[] | PermissionListResponse;
      [key: string]: unknown;
    }
  | undefined;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizePermissionList(payload: PermissionPayload): PermissionListResponse {
  if (!payload) {
    return {
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 0,
      total: 0,
    };
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

  if ("data" in payload) {
    const dataField = payload.data;
    if (Array.isArray(dataField)) {
      return {
        data: dataField,
        current_page: 1,
        last_page: 1,
        per_page: dataField.length,
        total: dataField.length,
      };
    }

    if (
      dataField &&
      typeof dataField === "object" &&
      Array.isArray((dataField as PermissionListResponse).data)
    ) {
      return dataField as PermissionListResponse;
    }
  }

  if (Array.isArray(payload.data)) {
    return {
      data: payload.data,
      current_page: 1,
      last_page: 1,
      per_page: payload.data.length,
      total: payload.data.length,
    };
  }

  if (Array.isArray((payload as PermissionListResponse)?.data)) {
    return payload as PermissionListResponse;
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 0,
    total: 0,
  };
}

export async function listPermissions(
  filters: PermissionFilters = {},
): Promise<PermissionListResponse> {
  const query = buildQuery({
    page: filters.page,
    per_page: filters.per_page,
    search: filters.search,
  });

  const payload = await apiFetch<PermissionPayload>(
    `${API_ROUTES.permissions}${query}`,
  );

  return normalizePermissionList(payload);
}

