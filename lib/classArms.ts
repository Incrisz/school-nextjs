import { apiFetch } from "@/lib/apiClient";

export interface ClassArm {
  id: number;
  name: string;
  class_id?: number;
  [key: string]: unknown;
}

type ClassArmsResponse =
  | ClassArm[]
  | {
      data?: ClassArm[];
      [key: string]: unknown;
    };

function normalizeClassArms(payload: ClassArmsResponse): ClassArm[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listClassArms(
  classId: number | string,
): Promise<ClassArm[]> {
  const payload = await apiFetch<ClassArmsResponse>(
    `/api/v1/classes/${classId}/arms`,
  );
  return normalizeClassArms(payload);
}

export async function getClassArm(
  classId: number | string,
  armId: number | string,
): Promise<ClassArm | null> {
  try {
    return await apiFetch<ClassArm>(
      `/api/v1/classes/${classId}/arms/${armId}`,
    );
  } catch (error) {
    console.error("Unable to load class arm", error);
    return null;
  }
}

export async function createClassArm(
  classId: number | string,
  payload: { name: string },
): Promise<ClassArm> {
  return apiFetch<ClassArm>(`/api/v1/classes/${classId}/arms`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateClassArm(
  classId: number | string,
  armId: number | string,
  payload: { name: string },
): Promise<ClassArm> {
  return apiFetch<ClassArm>(`/api/v1/classes/${classId}/arms/${armId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteClassArm(
  classId: number | string,
  armId: number | string,
): Promise<void> {
  await apiFetch(`/api/v1/classes/${classId}/arms/${armId}`, {
    method: "DELETE",
  });
}
