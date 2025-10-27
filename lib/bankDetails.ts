import { apiFetch } from "@/lib/apiClient";
import { API_ROUTES } from "@/lib/config";

export interface BankDetail {
  id: string | number;
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_code?: string | null;
  branch?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  [key: string]: unknown;
}

type BankDetailCollection =
  | BankDetail[]
  | {
      data?: BankDetail[];
      [key: string]: unknown;
    };

function normalizeBankDetails(payload: BankDetailCollection): BankDetail[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listBankDetails(): Promise<BankDetail[]> {
  const payload = await apiFetch<BankDetailCollection>(
    `${API_ROUTES.bankDetails}?per_page=200`,
  );
  return normalizeBankDetails(payload);
}

export interface BankDetailPayload {
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_code?: string | null;
  branch?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export async function createBankDetail(
  payload: BankDetailPayload,
): Promise<BankDetail> {
  return apiFetch<BankDetail>(API_ROUTES.bankDetails, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBankDetail(
  detailId: string | number,
  payload: BankDetailPayload,
): Promise<BankDetail> {
  return apiFetch<BankDetail>(`${API_ROUTES.bankDetails}/${detailId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteBankDetail(
  detailId: string | number,
): Promise<void> {
  await apiFetch(`${API_ROUTES.bankDetails}/${detailId}`, {
    method: "DELETE",
  });
}

export async function setDefaultBankDetail(
  detailId: string | number,
): Promise<void> {
  await apiFetch(`${API_ROUTES.bankDetails}/${detailId}/set-default`, {
    method: "PUT",
  });
}
