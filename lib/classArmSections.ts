import { apiFetch } from "@/lib/apiClient";

export interface ClassArmSection {
  id: number;
  name: string;
  arm_id?: number;
  class_id?: number;
  [key: string]: unknown;
}

type SectionsResponse =
  | ClassArmSection[]
  | {
      data?: ClassArmSection[];
      [key: string]: unknown;
    };

function normalizeSections(payload: SectionsResponse): ClassArmSection[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listClassArmSections(
  classId: number | string,
  armId: number | string,
): Promise<ClassArmSection[]> {
  const payload = await apiFetch<SectionsResponse>(
    `/api/v1/classes/${classId}/arms/${armId}/sections`,
  );
  return normalizeSections(payload);
}

export async function getClassArmSection(
  classId: number | string,
  armId: number | string,
  sectionId: number | string,
): Promise<ClassArmSection | null> {
  try {
    return await apiFetch<ClassArmSection>(
      `/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`,
    );
  } catch (error) {
    console.error("Unable to load class arm section", error);
    return null;
  }
}

export async function createClassArmSection(
  classId: number | string,
  armId: number | string,
  payload: { name: string },
): Promise<ClassArmSection> {
  return apiFetch<ClassArmSection>(
    `/api/v1/classes/${classId}/arms/${armId}/sections`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateClassArmSection(
  classId: number | string,
  armId: number | string,
  sectionId: number | string,
  payload: { name: string },
): Promise<ClassArmSection> {
  return apiFetch<ClassArmSection>(
    `/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteClassArmSection(
  classId: number | string,
  armId: number | string,
  sectionId: number | string,
): Promise<void> {
  await apiFetch(
    `/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`,
    {
      method: "DELETE",
    },
  );
}
