"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";
import { getBranches } from "@/features/branches/api";
import { branchQueryKeys } from "@/features/branches/query-keys";

import {
  createStudent,
  getStudents,
  updateStudent,
  updateStudentStatus,
} from "@/features/students/api";

import { StudentFormDialog } from "@/features/students/student-form-dialog";
import type { StudentFormValues } from "@/features/students/student-form-schema";
import { studentQueryKeys } from "@/features/students/query-keys";
import { StudentStatusBadge } from "@/features/students/student-status-badge";

import type {
  Student,
  StudentStatus,
} from "@/features/students/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { useLocalization } from "@/features/localization/use-localization";

export default function StudentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingStudent, setEditingStudent] =
    useState<Student | null | undefined>(
      undefined,
    );

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [updatingStudentId, setUpdatingStudentId] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "students.read",
  );

  const canManage = hasPermission(
    currentUser,
    "students.manage",
  );

  const studentsQuery = useQuery({
    queryKey: studentQueryKeys.list(
      search,
      includeArchived,
    ),
    queryFn: () =>
      getStudents({
        search,
        includeArchived,
      }),
    enabled: currentUserQuery.isSuccess && canRead,
  });

  const branchesQuery = useQuery({
    queryKey: branchQueryKeys.list(false),
    queryFn: () => getBranches(false),
    enabled:
      currentUserQuery.isSuccess &&
      hasPermission(currentUser, "branches.read"),
  });

  const {
    dictionary,
    statusLabel,
    formatDate,
  } = useLocalization();

  const t = dictionary.pages.students;
  const common = dictionary.common;

  const studentLabel = common.fields.student;

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  const createMutation = useMutation({
    mutationFn: createStudent,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      studentId,
      request,
    }: {
      studentId: string;
      request: Parameters<
        typeof updateStudent
      >[1];
    }) => updateStudent(studentId, request),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      studentId,
      status,
    }: {
      studentId: string;
      status: StudentStatus;
    }) =>
      updateStudentStatus(studentId, status),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshStudents() {
    await queryClient.invalidateQueries({
      queryKey: studentQueryKeys.all,
    });
  }

  function openCreate() {
    setFormError(null);
    setEditingStudent(null);
  }

  function openEdit(student: Student) {
    setFormError(null);
    setEditingStudent(student);
  }

  function closeDialog() {
    if (!formSubmitting) {
      setEditingStudent(undefined);
      setFormError(null);
    }
  }

  async function saveStudent(
    values: StudentFormValues,
  ) {
    const request = {
      branchId: values.branchId || null,
      studentNumber: values.studentNumber,
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate || null,
      gender: values.gender,
      enrollmentDate:
        values.enrollmentDate || null,
      medicalNotes:
        values.medicalNotes || null,
      allergies: values.allergies || null,
      emergencyContactName:
        values.emergencyContactName || null,
      emergencyContactPhone:
        values.emergencyContactPhone || null,
      notes: values.notes || null,
    };

    setFormError(null);

    try {
      if (editingStudent) {
        await updateMutation.mutateAsync({
          studentId: editingStudent.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshStudents();
      setEditingStudent(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The student could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    student: Student,
    status: StudentStatus,
  ) {
    const confirmed =
      status !== "ARCHIVED" ||
      window.confirm(
        `Archive ${student.firstName} ${student.lastName}?`,
      );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setUpdatingStudentId(student.id);

    try {
      await statusMutation.mutateAsync({
        studentId: student.id,
        status,
      });

      await refreshStudents();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The student status could not be updated.",
        ),
      );
    } finally {
      setUpdatingStudentId(null);
    }
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        {t.loading}
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        {!canRead ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {dictionary.common.messages.permissionDenied}
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {studentLabel}
                </h1>

                <p className="mt-1 text-slate-600">
                  {t.description}
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  {t.create}
                </button>
              )}
            </header>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <form
                className="flex max-w-xl flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value,
                    )
                  }
                  placeholder={t.searchPlaceholder}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
                />

                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                >
                  {dictionary.common.actions.search}
                </button>

                {(search || searchInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchInput("");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                  >
                    {dictionary.common.actions.clear}
                  </button>
                )}
              </form>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) =>
                    setIncludeArchived(
                      event.target.checked,
                    )
                  }
                />

                {common.filters.includeArchived}
              </label>
            </div>

            {pageError && (
              <div
                role="alert"
                className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
              >
                {pageError}
              </div>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {studentsQuery.isPending && (
                <div className="p-10 text-center">
                  {t.loading}
                </div>
              )}

              {studentsQuery.isError && (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    studentsQuery.error,
                  )}
                </div>
              )}

              {studentsQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  {t.empty}
                </div>
              )}

              {studentsQuery.data &&
                studentsQuery.data.length > 0 && (
                  <table className="w-full min-w-[950px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          {common.fields.student}
                        </th>
                        <th className="p-4">
                          {t.studentNumber}
                        </th>
                        <th className="p-4">
                          {common.fields.branch}
                        </th>
                        <th className="p-4">
                          {t.birthDate}
                        </th>
                        <th className="p-4">
                          {common.fields.guardian}
                        </th>
                        <th className="p-4">
                          {common.fields.status}
                        </th>
                        <th className="p-4">
                          {common.fields.actions}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {studentsQuery.data.map(
                        (student) => (
                          <tr key={student.id}>
                            <td className="p-4">
                              <Link
                                href={`/dashboard/students/${student.id}`}
                                className="font-medium text-blue-700 hover:underline"
                              >
                                {student.firstName}{" "}
                                {student.lastName}
                              </Link>
                            </td>

                            <td className="p-4">
                              {
                                student.studentNumber
                              }
                            </td>

                            <td className="p-4">
                              {student.branchName ||
                                "—"}
                            </td>

                            <td className="p-4">
                              {student.birthDate
                                ? formatDate(student.birthDate,)
                                : "—"}
                            </td>

                            <td className="p-4">
                              {student.guardianCount}
                            </td>

                            <td className="p-4">
                              <StudentStatusBadge
                                status={
                                  student.status
                                }
                              />
                            </td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/students/${student.id}`}
                                  className="rounded border px-3 py-1.5 text-sm"
                                >
                                  {common.actions.view}
                                </Link>

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEdit(
                                          student,
                                        )
                                      }
                                      className="rounded border px-3 py-1.5 text-sm"
                                    >
                                      {common.actions.edit}
                                    </button>

                                    <select
                                      value={
                                        student.status
                                      }
                                      disabled={
                                        updatingStudentId ===
                                        student.id
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        changeStatus(
                                          student,
                                          event.target
                                            .value as StudentStatus,
                                        )
                                      }
                                      className="rounded border px-2 py-1.5 text-sm"
                                    >
                                      <option value="ACTIVE">
                                        {common.statuses.ACTIVE}
                                      </option>
                                      <option value="INACTIVE">
                                        {common.statuses.INACTIVE}
                                      </option>
                                      <option value="GRADUATED">
                                        {common.statuses.GRADUATED}
                                      </option>
                                      <option value="ARCHIVED">
                                        {common.statuses.ARCHIVED}
                                      </option>
                                    </select>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                )}
            </section>
          </>
        )}
      </main>

      {editingStudent !== undefined && (
        <StudentFormDialog
          student={
            editingStudent ?? undefined
          }
          branches={branchesQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveStudent}
        />
      )}
    </div>
  );
}
