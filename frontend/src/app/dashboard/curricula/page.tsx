"use client";

import Link from "next/link";

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
  useConfirmDialog,
} from "@/components/confirm-dialog-provider";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  createCurriculum,
  getCurricula,
  updateCurriculum,
  updateCurriculumStatus,
} from "@/features/curricula/api";

import {
  CurriculumFormDialog,
} from "@/features/curricula/curriculum-form-dialog";

import type {
  CurriculumFormValues,
} from "@/features/curricula/curriculum-form-schema";

import {
  curriculumQueryKeys,
} from "@/features/curricula/query-keys";

import type {
  Curriculum,
  CurriculumStatus,
  SaveCurriculumRequest,
} from "@/features/curricula/types";

import {
  useLocalization,
} from "@/features/localization/use-localization";

import {
  getPrograms,
} from "@/features/programs/api";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function CurriculaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    statusLabel,
  } = useLocalization();

  const t = dictionary.pages.curricula;
  const common = dictionary.common;

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [programId, setProgramId] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    editingCurriculum,
    setEditingCurriculum,
  ] = useState<
    Curriculum | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingCurriculumId,
    setUpdatingCurriculumId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

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

    queryFn: () =>
      getCurricula(filters),

    enabled:
      currentUserQuery.isSuccess &&
      canRead,
  });

  const programsQuery = useQuery({
    queryKey: [
      "programs",
      "curriculum-options",
    ],

    queryFn: () => getPrograms(),

    enabled:
      currentUserQuery.isSuccess,
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
      queryKey:
        curriculumQueryKeys.all,
    });
  }

  function openCreateDialog() {
    setFormError(null);
    setEditingCurriculum(null);
  }

  function openEditDialog(
    curriculum: Curriculum,
  ) {
    setFormError(null);
    setEditingCurriculum(curriculum);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setFormError(null);
    setEditingCurriculum(undefined);
  }

  async function saveCurriculum(
    values: CurriculumFormValues,
  ) {
    const request: SaveCurriculumRequest = {
      programId: values.programId,
      code: values.code,
      name: values.name,

      description:
        values.description || null,

      versionLabel: values.versionLabel,
    };

    setFormError(null);

    try {
      if (editingCurriculum) {
        await updateMutation.mutateAsync({
          curriculumId:
            editingCurriculum.id,

          request,
        });
      } else {
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshCurricula();

      setEditingCurriculum(undefined);
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
    curriculum: Curriculum,
    newStatus: CurriculumStatus,
  ): Promise<boolean> {
    if (curriculum.status === newStatus) {
      return true;
    }

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: curriculum.name,

          currentStatus:
            statusLabel(
              curriculum.status,
            ),

          newStatus:
            statusLabel(newStatus),
        },
      ),

      confirmLabel:
        newStatus === "ARCHIVED"
          ? common.actions.archive
          : newStatus === "ACTIVE"
            ? common.actions.activate
            : common.actions.confirm,

      cancelLabel:
        common.actions.cancel,

      variant:
        newStatus === "ARCHIVED"
          ? "danger"
          : "info",
    });

    if (!confirmed) {
      return false;
    }

    setPageError(null);

    setUpdatingCurriculumId(
      curriculum.id,
    );

    try {
      await statusMutation.mutateAsync({
        curriculumId: curriculum.id,
        status: newStatus,
      });

      await refreshCurricula();

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
      setUpdatingCurriculumId(null);
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
              {t.title}
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

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]"
        >
          <div className="flex gap-2">
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
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
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
          </div>

          <select
            value={programId}
            aria-label={
              common.filters.allPrograms
            }
            onChange={(event) =>
              setProgramId(
                event.target.value,
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">
              {
                common.filters
                  .allPrograms
              }
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
        </form>

        {pageError && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
          >
            {pageError}
          </div>
        )}

        <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          {curriculaQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {curriculaQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                curriculaQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!curriculaQuery.isPending &&
            !curriculaQuery.isError &&
            curriculaQuery.data?.length ===
            0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {curriculaQuery.data &&
            curriculaQuery.data.length > 0 && (
              <table className="w-full min-w-[1000px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.curriculumName}
                    </th>

                    <th className="p-4">
                      {common.fields.program}
                    </th>

                    <th className="p-4">
                      {common.fields.version}
                    </th>

                    <th className="p-4">
                      {t.units}
                    </th>

                    <th className="p-4">
                      {t.learningOutcomes}
                    </th>

                    <th className="p-4">
                      {t.estimatedSessions}
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
                          {
                            curriculum.versionLabel
                          }
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
                          <CurriculumStatusBadge
                            status={
                              curriculum.status
                            }
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/curricula/${curriculum.id}`}
                              className="rounded border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50"
                            >
                              {
                                common.actions
                                  .view
                              }
                            </Link>

                            {canManage &&
                              curriculum.status ===
                              "DRAFT" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditDialog(
                                      curriculum,
                                    )
                                  }
                                  className="rounded border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50"
                                >
                                  {
                                    common.actions
                                      .edit
                                  }
                                </button>
                              )}

                            {canManage && (
                              <CurriculumStatusAction
                                curriculum={
                                  curriculum
                                }
                                updating={
                                  updatingCurriculumId ===
                                  curriculum.id
                                }
                                changeStatusLabel={
                                  t.changeStatus
                                }
                                statusLabel={
                                  statusLabel
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
      </main>

      {editingCurriculum !== undefined && (
        <CurriculumFormDialog
          curriculum={
            editingCurriculum ?? undefined
          }
          programs={
            programsQuery.data ?? []
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveCurriculum}
        />
      )}
    </div>
  );
}

type CurriculumStatusActionProps = {
  curriculum: Curriculum;
  updating: boolean;
  changeStatusLabel: string;

  statusLabel: (
    status: string,
  ) => string;

  onChange: (
    curriculum: Curriculum,
    status: CurriculumStatus,
  ) => Promise<boolean>;
};

function CurriculumStatusAction({
  curriculum,
  updating,
  changeStatusLabel,
  statusLabel,
  onChange,
}: CurriculumStatusActionProps) {
  const transitions: Record<
    CurriculumStatus,
    CurriculumStatus[]
  > = {
    DRAFT: [
      "ACTIVE",
      "ARCHIVED",
    ],

    ACTIVE: ["ARCHIVED"],

    ARCHIVED: [],
  };

  const availableStatuses =
    transitions[curriculum.status];

  if (availableStatuses.length === 0) {
    return null;
  }

  return (
    <select
      defaultValue=""
      disabled={updating}
      aria-label={changeStatusLabel}
      onChange={(event) => {
        const select =
          event.currentTarget;

        const newStatus =
          select.value as
          | CurriculumStatus
          | "";

        if (!newStatus) {
          return;
        }

        void onChange(
          curriculum,
          newStatus,
        ).finally(() => {
          select.value = "";
        });
      }}
      className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">
        {changeStatusLabel}
      </option>

      {availableStatuses.map(
        (status) => (
          <option
            key={status}
            value={status}
          >
            {statusLabel(status)}
          </option>
        ),
      )}
    </select>
  );
}

function CurriculumStatusBadge({
  status,
}: {
  status: CurriculumStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    CurriculumStatus,
    string
  > = {
    DRAFT:
      "bg-amber-100 text-amber-700",

    ACTIVE:
      "bg-green-100 text-green-700",

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