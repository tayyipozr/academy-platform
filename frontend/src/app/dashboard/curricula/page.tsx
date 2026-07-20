"use client";

import Link from "next/link";
import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  createCurriculum,
  getCurricula,
  updateCurriculum,
  updateCurriculumStatus,
} from "@/features/curricula/api";

import { CurriculumFormDialog } from "@/features/curricula/curriculum-form-dialog";
import type { CurriculumFormValues } from "@/features/curricula/curriculum-form-schema";
import { curriculumQueryKeys } from "@/features/curricula/query-keys";

import type {
  Curriculum,
  CurriculumStatus,
  SaveCurriculumRequest,
} from "@/features/curricula/types";

import { getPrograms } from "@/features/programs/api";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function CurriculaPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingCurriculum, setEditingCurriculum] =
    useState<
      Curriculum | null | undefined
    >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "curricula.read",
  );

  const canManage = hasPermission(
    currentUser,
    "curricula.manage",
  );

  const filters = {
    search,
    programId,
    includeArchived,
  };

  const curriculaQuery = useQuery({
    queryKey:
      curriculumQueryKeys.list(filters),
    queryFn: () => getCurricula(filters),
    enabled: currentUserQuery.isSuccess && canRead,
  });

  const programsQuery = useQuery({
    queryKey: ["programs", "curriculum-options"],
    queryFn: () => getPrograms(),
    enabled: currentUserQuery.isSuccess,
  });

  const createMutation = useMutation({
    mutationFn: createCurriculum,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      curriculumId,
      request,
    }: {
      curriculumId: string;
      request: SaveCurriculumRequest;
    }) =>
      updateCurriculum(
        curriculumId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      curriculumId,
      status,
    }: {
      curriculumId: string;
      status: CurriculumStatus;
    }) =>
      updateCurriculumStatus(
        curriculumId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshCurricula() {
    await queryClient.invalidateQueries({
      queryKey: curriculumQueryKeys.all,
    });
  }

  async function saveCurriculum(
    values: CurriculumFormValues,
  ) {
    const request: SaveCurriculumRequest = {
      programId: values.programId,
      code: values.code,
      name: values.name,
      description: values.description || null,
      versionLabel: values.versionLabel,
    };

    setFormError(null);

    try {
      if (editingCurriculum) {
        await updateMutation.mutateAsync({
          curriculumId: editingCurriculum.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshCurricula();
      setEditingCurriculum(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The curriculum could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    curriculum: Curriculum,
    status: CurriculumStatus,
  ) {
    setPageError(null);

    try {
      await statusMutation.mutateAsync({
        curriculumId: curriculum.id,
        status,
      });

      await refreshCurricula();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The curriculum status could not be changed.",
        ),
      );
    }
  }

  if (currentUserQuery.isPending) {
    return <main className="p-8">Loading...</main>;
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
            You do not have permission to view curricula.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Curricula
                </h1>

                <p className="mt-1 text-slate-600">
                  Define units, learning outcomes, and
                  instructional structure.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditingCurriculum(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Create curriculum
                </button>
              )}
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search curricula"
                className="rounded-lg border px-3 py-2"
              />

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">
                  All programs
                </option>

                {programsQuery.data?.map(
                  (program) => (
                    <option
                      key={program.id}
                      value={program.id}
                    >
                      {program.name}
                    </option>
                  ),
                )}
              </select>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) =>
                    setIncludeArchived(
                      event.target.checked,
                    )
                  }
                />

                Include archived
              </label>
            </section>

            {pageError && (
              <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
                {pageError}
              </div>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {curriculaQuery.isPending && (
                <div className="p-10 text-center">
                  Loading curricula...
                </div>
              )}

              {curriculaQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  No curricula were found.
                </div>
              )}

              {curriculaQuery.data &&
                curriculaQuery.data.length > 0 && (
                  <table className="w-full min-w-[1000px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          Curriculum
                        </th>
                        <th className="p-4">
                          Program
                        </th>
                        <th className="p-4">
                          Version
                        </th>
                        <th className="p-4">
                          Units
                        </th>
                        <th className="p-4">
                          Outcomes
                        </th>
                        <th className="p-4">
                          Sessions
                        </th>
                        <th className="p-4">
                          Status
                        </th>
                        <th className="p-4">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {curriculaQuery.data.map(
                        (curriculum) => (
                          <tr key={curriculum.id}>
                            <td className="p-4">
                              <Link
                                href={`/dashboard/curricula/${curriculum.id}`}
                                className="font-medium text-blue-700 hover:underline"
                              >
                                {curriculum.name}
                              </Link>

                              <p className="text-sm text-slate-500">
                                {curriculum.code}
                              </p>
                            </td>

                            <td className="p-4">
                              {curriculum.programName}
                            </td>

                            <td className="p-4">
                              {curriculum.versionLabel}
                            </td>

                            <td className="p-4">
                              {curriculum.unitCount}
                            </td>

                            <td className="p-4">
                              {curriculum.outcomeCount}
                            </td>

                            <td className="p-4">
                              {
                                curriculum.estimatedSessionCount
                              }
                            </td>

                            <td className="p-4">
                              {curriculum.status}
                            </td>

                            <td className="p-4">
                              <div className="flex gap-2">
                                <Link
                                  href={`/dashboard/curricula/${curriculum.id}`}
                                  className="rounded border px-3 py-1.5 text-sm"
                                >
                                  View
                                </Link>

                                {canManage &&
                                  curriculum.status ===
                                    "DRAFT" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormError(null);
                                        setEditingCurriculum(
                                          curriculum,
                                        );
                                      }}
                                      className="rounded border px-3 py-1.5 text-sm"
                                    >
                                      Edit
                                    </button>
                                  )}

                                {canManage && (
                                  <CurriculumStatusAction
                                    curriculum={
                                      curriculum
                                    }
                                    onChange={
                                      changeStatus
                                    }
                                  />
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

      {editingCurriculum !== undefined && (
        <CurriculumFormDialog
          curriculum={
            editingCurriculum ?? undefined
          }
          programs={programsQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() => {
            if (!formSubmitting) {
              setEditingCurriculum(undefined);
              setFormError(null);
            }
          }}
          onSubmit={saveCurriculum}
        />
      )}
    </div>
  );
}

function CurriculumStatusAction({
  curriculum,
  onChange,
}: {
  curriculum: Curriculum;
  onChange: (
    curriculum: Curriculum,
    status: CurriculumStatus,
  ) => Promise<void>;
}) {
  const transitions: Record<
    CurriculumStatus,
    CurriculumStatus[]
  > = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["ARCHIVED"],
    ARCHIVED: [],
  };

  if (transitions[curriculum.status].length === 0) {
    return null;
  }

  return (
    <select
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) {
          void onChange(
            curriculum,
            event.target.value as CurriculumStatus,
          );

          event.target.value = "";
        }
      }}
      className="rounded border px-2 py-1.5 text-sm"
    >
      <option value="">Status</option>

      {transitions[curriculum.status].map(
        (status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ),
      )}
    </select>
  );
}
