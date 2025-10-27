import { apiFetch } from "@/lib/apiClient";
import { API_ROUTES } from "@/lib/config";

export interface FeeItem {
  id: string | number;
  name: string;
  category?: string | null;
  description?: string | null;
  default_amount?: number | string | null;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface FeeItemPayload {
  name: string;
  category?: string | null;
  default_amount: number;
  description?: string | null;
  is_active?: boolean;
}

type FeeItemCollection =
  | FeeItem[]
  | {
      data?: FeeItem[];
      [key: string]: unknown;
    };

function normalizeFeeItems(payload: FeeItemCollection): FeeItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listFeeItems(): Promise<FeeItem[]> {
  const payload = await apiFetch<FeeItemCollection>(
    `${API_ROUTES.feesItems}?per_page=200`,
  );
  return normalizeFeeItems(payload);
}

export async function createFeeItem(
  payload: FeeItemPayload,
): Promise<FeeItem> {
  return apiFetch<FeeItem>(API_ROUTES.feesItems, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFeeItem(
  itemId: string | number,
  payload: FeeItemPayload,
): Promise<FeeItem> {
  return apiFetch<FeeItem>(`${API_ROUTES.feesItems}/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFeeItem(itemId: string | number): Promise<void> {
  await apiFetch(`${API_ROUTES.feesItems}/${itemId}`, { method: "DELETE" });
}

export interface FeeStructureItem {
  id: string | number;
  amount?: number | string | null;
  is_mandatory?: boolean;
  fee_item?: FeeItem | null;
  [key: string]: unknown;
}

export interface FeeStructure {
  id: string | number;
  class?: {
    id?: string | number;
    name?: string;
    [key: string]: unknown;
  } | null;
  session?: {
    id?: string | number;
    name?: string;
    [key: string]: unknown;
  } | null;
  term?: {
    id?: string | number;
    name?: string;
    [key: string]: unknown;
  } | null;
  total_amount?: number | string | null;
  fee_items?: FeeStructureItem[];
  [key: string]: unknown;
}

type FeeStructureCollection =
  | FeeStructure[]
  | {
      data?: FeeStructure[];
      [key: string]: unknown;
    };

function normalizeFeeStructures(payload: FeeStructureCollection): FeeStructure[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export interface FeeStructureFilters {
  session_id: string | number;
  term_id: string | number;
}

export async function listFeeStructuresBySessionTerm(
  filters: FeeStructureFilters,
): Promise<FeeStructure[]> {
  const query = new URLSearchParams({
    session_id: String(filters.session_id),
    term_id: String(filters.term_id),
  });
  const payload = await apiFetch<FeeStructureCollection>(
    `${API_ROUTES.feeStructuresBySessionTerm}?${query.toString()}`,
  );
  return normalizeFeeStructures(payload);
}

export interface CreateFeeStructurePayload {
  session_id: string | number;
  term_id: string | number;
  class_id: string | number;
  fee_item_id: string | number;
  amount: number;
  is_mandatory: boolean;
}

export async function createFeeStructure(
  payload: CreateFeeStructurePayload,
): Promise<void> {
  await apiFetch(API_ROUTES.feeStructures, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteFeeStructure(
  structureItemId: string | number,
): Promise<void> {
  await apiFetch(`${API_ROUTES.feeStructures}/${structureItemId}`, {
    method: "DELETE",
  });
}

export interface CopyFeeStructurePayload {
  from_class_id: string | number;
  from_session_id: string | number;
  from_term_id: string | number;
  to_class_id: string | number;
  to_session_id: string | number;
  to_term_id: string | number;
}

export interface CopyFeeStructureResult {
  message?: string;
  data?: {
    created_count?: number;
    skipped_count?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function copyFeeStructures(
  payload: CopyFeeStructurePayload,
): Promise<CopyFeeStructureResult> {
  return apiFetch<CopyFeeStructureResult>(API_ROUTES.feeStructuresCopy, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
