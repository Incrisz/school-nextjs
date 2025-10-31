import { API_ROUTES } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";
import { type Permission } from "@/lib/permissions";

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  guard_name?: string | null;
  school_id?: string | number | null;
  permissions?: Permission[];
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface RoleListResponse {
  data: Role[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
  [key: string]: unknown;
}

export interface RoleFilters {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface UpsertRolePayload {
  name: string;
  description?: string | null;
  permissions?: Array<number | string>;
}

type RolePayload =
  | Role[]
  | RoleListResponse
  | Role
  | {
      data?: Role | Role[] | RoleListResponse;
      [key: string]: unknown;
    };

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

function normalizeRoleList(payload: RolePayload): RoleListResponse {
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
      Array.isArray((dataField as RoleListResponse).data)
    ) {
      return dataField as RoleListResponse;
    }
  }

  if (
    payload &&
    typeof (payload as RoleListResponse).data !== "undefined" &&
    Array.isArray((payload as RoleListResponse).data)
  ) {
    return payload as RoleListResponse;
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 0,
    total: 0,
  };
}

function extractRole(payload: RolePayload): Role {
  if (!payload) {
    throw new Error("Empty response received for role operation.");
  }

  if (Array.isArray(payload)) {
    const [first] = payload;
    if (first) {
      return first;
    }
    throw new Error("No role found in response payload.");
  }

  if (!("data" in payload)) {
    const maybeRole = payload as Role;
    if (maybeRole && typeof maybeRole === "object" && "id" in maybeRole) {
      return maybeRole;
    }
  }

  const dataField = (payload as { data?: unknown }).data;
  if (Array.isArray(dataField)) {
    const [first] = dataField;
    if (first) {
      return first as Role;
    }
  }

  if (dataField && typeof dataField === "object" && "id" in dataField) {
    return dataField as Role;
  }

  throw new Error("Unexpected server response for role.");
}

export async function listRoles(filters: RoleFilters = {}): Promise<RoleListResponse> {
  const query = buildQuery({
    page: filters.page,
    per_page: filters.per_page,
    search: filters.search,
  });

  const payload = await apiFetch<RolePayload>(`${API_ROUTES.roles}${query}`);
  return normalizeRoleList(payload);
}

export async function createRole(payload: UpsertRolePayload): Promise<Role> {
  const response = await apiFetch<RolePayload>(API_ROUTES.roles, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return extractRole(response);
}

export async function updateRole(
  roleId: number | string,
  payload: UpsertRolePayload,
): Promise<Role> {
  const response = await apiFetch<RolePayload>(`${API_ROUTES.roles}/${roleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return extractRole(response);
}

export async function deleteRole(roleId: number | string): Promise<void> {
  await apiFetch(`${API_ROUTES.roles}/${roleId}`, {
    method: "DELETE",
  });
}

