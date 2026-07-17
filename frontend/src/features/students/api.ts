import { apiRequest } from "@/lib/api/api-client";

import type {
  SaveStudentGuardianRequest,
  SaveStudentRequest,
  Student,
  StudentGuardianRelationship,
  StudentStatus,
} from "./types";

export function getStudents(input: {
  search: string;
  includeArchived: boolean;
}): Promise<Student[]> {
  const query = new URLSearchParams({
    search: input.search,
    includeArchived:
      input.includeArchived.toString(),
  });

  return apiRequest<Student[]>(
    `/students?${query.toString()}`,
  );
}

export function getStudent(
  studentId: string,
): Promise<Student> {
  return apiRequest<Student>(
    `/students/${studentId}`,
  );
}

export function createStudent(
  request: SaveStudentRequest,
): Promise<Student> {
  return apiRequest<Student>("/students", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateStudent(
  studentId: string,
  request: SaveStudentRequest,
): Promise<Student> {
  return apiRequest<Student>(
    `/students/${studentId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateStudentStatus(
  studentId: string,
  status: StudentStatus,
): Promise<void> {
  return apiRequest<void>(
    `/students/${studentId}/status/${status}`,
    {
      method: "POST",
    },
  );
}

export function getStudentGuardians(
  studentId: string,
): Promise<StudentGuardianRelationship[]> {
  return apiRequest<StudentGuardianRelationship[]>(
    `/students/${studentId}/guardians`,
  );
}

export function linkStudentGuardian(
  studentId: string,
  request: SaveStudentGuardianRequest,
): Promise<StudentGuardianRelationship> {
  return apiRequest<StudentGuardianRelationship>(
    `/students/${studentId}/guardians`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateStudentGuardian(
  studentId: string,
  guardianId: string,
  request: SaveStudentGuardianRequest,
): Promise<StudentGuardianRelationship> {
  return apiRequest<StudentGuardianRelationship>(
    `/students/${studentId}/guardians/${guardianId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function unlinkStudentGuardian(
  studentId: string,
  guardianId: string,
): Promise<void> {
  return apiRequest<void>(
    `/students/${studentId}/guardians/${guardianId}`,
    {
      method: "DELETE",
    },
  );
}
