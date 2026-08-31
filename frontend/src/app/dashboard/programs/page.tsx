"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  useConfirmDialog,
} from "@/components/confirm-dialog-provider";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  useLocalization,
} from "@/features/localization/use-localization";

import {
  createProgram,
  getPrograms,
  updateProgram,
  updateProgramStatus,
} from "@/features/programs/api";

import {
  ProgramFormDialog,
} from "@/features/programs/program-form-dialog";

import type {
  ProgramFormValues,
} from "@/features/programs/program-form-schema";

import {
  programQueryKeys,
} from "@/features/programs/query-keys";

import type {
  Program,
  ProgramStatus,
  SaveProgramRequest,
} from "@/features/programs/types";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function ProgramsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    terminology,
    statusLabel,
  } = useLocalization();

  const t = dictionary.pages.programs;
  const common = dictionary.common;

  const pageTitle =
    terminology.programLabel || t.title;

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    editingProgram,
    setEditingProgram,
  ] = useState<
    Program | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingProgramId,
    setUpdatingProgramId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

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

    enabled:
      currentUserQuery.isSuccess &&
      canRead,
  });

  useEffect(() => {
    if (
      currentUserQuery.error instanceof
      ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [
    currentUserQuery.error,
    router,
  ]);

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
    }) =>
      updateProgram(
        programId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      programId,
      status,
    }: {
      programId: string;
      status: ProgramStatus;
    }) =>
      updateProgramStatus(
        programId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshPrograms() {
    await queryClient.invalidateQueries({
      queryKey: programQueryKeys.all,
    });
  }

  function openCreateDialog() {
    setFormError(null);
    setEditingProgram(null);
  }

  function openEditDialog(
    program: Program,
  ) {
    setFormError(null);
    setEditingProgram(program);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setFormError(null);
    setEditingProgram(undefined);
  }

  async function saveProgram(
    values: ProgramFormValues,
  ) {
    const request: SaveProgramRequest = {
      code: values.code,
      name: values.name,

      description:
        values.description || null,

      category:
        values.category || null,

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
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshPrograms();

      setEditingProgram(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          t.saveError,
        ),
      );
    }
  }

  async function changeStatus(
    program: Program,
    newStatus: ProgramStatus,
  ): Promise<boolean> {
    if (program.status === newStatus) {
      return true;
    }

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: program.name,

          currentStatus:
            statusLabel(program.status),

          newStatus:
            statusLabel(newStatus),
        },
      ),

      confirmLabel:
        newStatus === "ARCHIVED"
          ? common.actions.archive
          : common.actions.confirm,

      cancelLabel:
        common.actions.cancel,

      variant:
        newStatus === "ARCHIVED"
          ? "danger"
          : newStatus === "INACTIVE"
            ? "warning"
            : "info",
    });

    if (!confirmed) {
      return false;
    }

    setPageError(null);
    setUpdatingProgramId(program.id);

    try {
      await statusMutation.mutateAsync({
        programId: program.id,
        status: newStatus,
      });

      await refreshPrograms();

      return true;
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          t.statusChangeError,
        ),
      );

      return false;
    } finally {
      setUpdatingProgramId(null);
    }
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          {t.sessionLoading}
        </p>
      </main>
    );
  }

  if (
    currentUserQuery.isError ||
    !currentUser
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-red-50 p-5 text-red-700">
          {t.sessionLoadError}
        </div>
      </main>
    );
  }

  if (!canRead) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader
          user={currentUser}
        />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {
              common.messages
                .permissionDenied
            }
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader
        user={currentUser}
      />

      <main className="mx-auto max-w-7xl p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {pageTitle}
            </h1>

            <p className="mt-1 text-slate-600">
              {t.description}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateDialog}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              {t.create}
            </button>
          )}
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form
            className="flex max-w-xl flex-1 gap-2"
            onSubmit={
              handleSearchSubmit
            }
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder={
                t.searchPlaceholder
              }
              aria-label={
                t.searchPlaceholder
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
            />

            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium transition hover:bg-slate-50"
            >
              {common.actions.search}
            </button>

            {(search || searchInput) && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 transition hover:bg-slate-50"
              >
                {common.actions.clear}
              </button>
            )}
          </form>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) =>
                setIncludeArchived(
                  event.target.checked,
                )
              }
            />

            {t.includeArchived}
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
          {programsQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {programsQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                programsQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!programsQuery.isPending &&
            !programsQuery.isError &&
            programsQuery.data?.length ===
            0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {programsQuery.data &&
            programsQuery.data.length > 0 && (
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.program}
                    </th>

                    <th className="p-4">
                      {t.category}
                    </th>

                    <th className="p-4">
                      {t.ageRange}
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
                          {program.minimumAge ===
                            null &&
                            program.maximumAge ===
                            null
                            ? t.noAgeRestriction
                            : formatAgeRange(
                              program.minimumAge,
                              program.maximumAge,
                            )}
                        </td>

                        <td className="p-4">
                          <ProgramStatusBadge
                            status={
                              program.status
                            }
                          />
                        </td>

                        <td className="p-4">
                          {canManage && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditDialog(
                                    program,
                                  )
                                }
                                className="rounded border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50"
                              >
                                {
                                  common.actions
                                    .edit
                                }
                              </button>

                              <select
                                value={
                                  program.status
                                }
                                disabled={
                                  updatingProgramId ===
                                  program.id
                                }
                                aria-label={
                                  t.statusChangeTitle
                                }
                                onChange={(event) => {
                                  const select =
                                    event.currentTarget;

                                  const newStatus =
                                    select.value as ProgramStatus;

                                  void changeStatus(
                                    program,
                                    newStatus,
                                  ).then(
                                    (changed) => {
                                      if (!changed) {
                                        select.value =
                                          program.status;
                                      }
                                    },
                                  );
                                }}
                                className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="ACTIVE">
                                  {statusLabel(
                                    "ACTIVE",
                                  )}
                                </option>

                                <option value="INACTIVE">
                                  {statusLabel(
                                    "INACTIVE",
                                  )}
                                </option>

                                <option value="ARCHIVED">
                                  {statusLabel(
                                    "ARCHIVED",
                                  )}
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
      </main>

      {editingProgram !== undefined && (
        <ProgramFormDialog
          program={
            editingProgram ?? undefined
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveProgram}
        />
      )}
    </div>
  );
}

function ProgramStatusBadge({
  status,
}: {
  status: ProgramStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    ProgramStatus,
    string
  > = {
    ACTIVE:
      "bg-green-100 text-green-700",

    INACTIVE:
      "bg-amber-100 text-amber-700",

    ARCHIVED:
      "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function formatAgeRange(
  minimumAge: number | null,
  maximumAge: number | null,
): string {
  return `${minimumAge ?? "—"} – ${maximumAge ?? "—"
    }`;
}

function formatMessage(
  message: string,
  values: Record<
    string,
    string | number
  >,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(
        `{${key}}`,
        String(value),
      ),
    message,
  );
}