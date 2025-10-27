import { apiFetch } from "@/lib/apiClient";

export interface Country {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface State {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface Lga {
  id?: number | string;
  name: string;
  [key: string]: unknown;
}

export interface BloodGroup {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

type CollectionResponse<T> =
  | T[]
  | {
      data?: T[];
      items?: T[];
      results?: T[];
      [key: string]: unknown;
    };

function normalizeCollection<T>(payload: CollectionResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload?.items && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload?.results && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

export async function listCountries(): Promise<Country[]> {
  const payload = await apiFetch<CollectionResponse<Country>>(
    "/api/v1/locations/countries",
  );
  return normalizeCollection(payload);
}

export async function listStates(
  countryId: string | number,
): Promise<State[]> {
  const payload = await apiFetch<CollectionResponse<State>>(
    `/api/v1/locations/states?country_id=${countryId}`,
  );
  return normalizeCollection(payload);
}

export async function listLgas(stateId: string | number): Promise<Lga[]> {
  const payload = await apiFetch<CollectionResponse<Lga>>(
    `/api/v1/locations/states/${stateId}/lgas`,
  );
  return normalizeCollection(payload);
}

export async function listBloodGroups(): Promise<BloodGroup[]> {
  const payload = await apiFetch<CollectionResponse<BloodGroup>>(
    "/api/v1/locations/blood-groups",
  );
  return normalizeCollection(payload);
}
