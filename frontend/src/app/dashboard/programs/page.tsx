"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  createProgram,
  getPrograms,
  updateProgram,
  updateProgramStatus,
} from "@/features/programs/api";

import { ProgramFormDialog } from "@/features/programs/program-form-dialog";
import type { ProgramFormValues } from "@/features/programs/program-form-schema";
import { programQueryKeys } from "@/features/programs/query-keys";

import type {
  Program,
  ProgramStatus,
  SaveProgramRequest,
} from "@/features/programs/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function ProgramsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingProgram, setEditingProgram] =
    useState<Program | null | undefined>(undefined);

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
    "programs.read",
  );

  const canManage = hasPermission(
    currentUser,
    "programs.manage",
  );

  const programsQuery = useQuery({
    queryKey: programQueryKeys.list(
      search,
      includeArchived,
    ),
    queryFn: () =>
      getPrograms({
        search,
        includeArchived,
      }),
    enabled: currentUserQuery.isSuccess && canRead,
  });

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  const createMutation = useMutation({
    mutationFn: createProgram,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      programId,
      request,
    }: {
      programId: string;
      request: SaveProgramRequest;
    }) => updateProgram(programId, request),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      programId,
      status,
    }: {
      programId: string;
      status: ProgramStatus;
    }) =>
      updateProgramStatus(programId, status),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshPrograms() {
    await queryClient.invalidateQueries({
      queryKey: programQueryKeys.all,
    });
  }

  async function saveProgram(
    values: ProgramFormValues,
  ) {
    const request: SaveProgramRequest = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      category: values.category || null,
      minimumAge:
        values.minimumAge === ""
          ? null
          : Number(values.minimumAge),
      maximumAge:
        values.maximumAge === ""
          ? null
          : Number(values.maximumAge),
    };

    setFormError(null);

    try {
      if (editingProgram) {
        await updateMutation.mutateAsync({
          programId: editingProgram.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshPrograms();
      setEditingProgram(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The program could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    program: Program,
    status: ProgramStatus,
  ) {
    setPageError(null);

    try {
      await statusMutation.mutateAsync({
        programId: program.id,
        status,
      });

      await refreshPrograms();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The program status could not be changed.",
        ),
      );
    }
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        Loading...
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
            You do not have permission to view programs.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Programs
                </h1>

                <p className="mt-1 text-slate-600">
                  Manage sports, subjects, departments,
                  and activity categories.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditingProgram(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Create program
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
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search programs"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
                />

                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                >
                  Search
                </button>
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
                Include archived
              </label>
            </div>

            {pageError && (
              <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
                {pageError}
              </div>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {programsQuery.isPending && (
                <div className="p-10 text-center">
                  Loading programs...
                </div>
              )}

              {programsQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  No programs were found.
                </div>
              )}

              {programsQuery.data &&
                programsQuery.data.length > 0 && (
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">Program</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Age range</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {programsQuery.data.map(
                        (program) => (
                          <tr key={program.id}>
                            <td className="p-4">
                              <p className="font-medium">
                                {program.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {program.code}
                              </p>
                            </td>

                            <td className="p-4">
                              {program.category || "—"}
                            </td>

                            <td className="p-4">
                              {program.minimumAge === null &&
                              program.maximumAge === null
                                ? "No restriction"
                                : `${program.minimumAge ?? "—"} – ${
                                    program.maximumAge ??
                                    "—"
                                  }`}
                            </td>

                            <td className="p-4">
                              {program.status}
                            </td>

                            <td className="p-4">
                              {canManage && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormError(null);
                                      setEditingProgram(
                                        program,
                                      );
                                    }}
                                    className="rounded border px-3 py-1.5 text-sm"
                                  >
                                    Edit
                                  </button>

                                  <select
                                    value={program.status}
                                    onChange={(event) =>
                                      changeStatus(
                                        program,
                                        event.target
                                          .value as ProgramStatus,
                                      )
                                    }
                                    className="rounded border px-2 py-1.5 text-sm"
                                  >
                                    <option value="ACTIVE">
                                      Active
                                    </option>
                                    <option value="INACTIVE">
                                      Inactive
                                    </option>
                                    <option value="ARCHIVED">
                                      Archived
                                    </option>
                                  </select>
                                </div>
                              )}
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

      {editingProgram !== undefined && (
        <ProgramFormDialog
          program={editingProgram ?? undefined}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() => {
            if (!formSubmitting) {
              setEditingProgram(undefined);
              setFormError(null);
            }
          }}
          onSubmit={saveProgram}
        />
      )}
    </div>
  );
}
