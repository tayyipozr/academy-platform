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
  createTerm,
  getTerms,
  updateTerm,
  updateTermStatus,
} from "@/features/terms/api";

import {
  TermFormDialog,
  type TermFormValues,
} from "@/features/terms/term-form-dialog";

import {
  termQueryKeys,
} from "@/features/terms/query-keys";

import type {
  OperationalTerm,
  SaveTermRequest,
  TermStatus,
} from "@/features/terms/types";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function TermsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    statusLabel,
    formatDate,
  } = useLocalization();

  const t = dictionary.pages.terms;
  const common = dictionary.common;

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    editingTerm,
    setEditingTerm,
  ] = useState<
    OperationalTerm | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingTermId,
    setUpdatingTermId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "terms.read",
  );

  const canManage = hasPermission(
    currentUser,
    "terms.manage",
  );

  const termsQuery = useQuery({
    queryKey: termQueryKeys.list(
      search,
      includeArchived,
    ),

    queryFn: () =>
      getTerms({
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
    mutationFn: createTerm,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      termId,
      request,
    }: {
      termId: string;
      request: SaveTermRequest;
    }) =>
      updateTerm(
        termId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      termId,
      status,
    }: {
      termId: string;
      status: TermStatus;
    }) =>
      updateTermStatus(
        termId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshTerms() {
    await queryClient.invalidateQueries({
      queryKey: termQueryKeys.all,
    });
  }

  function openCreateDialog() {
    setFormError(null);
    setEditingTerm(null);
  }

  function openEditDialog(
    term: OperationalTerm,
  ) {
    setFormError(null);
    setEditingTerm(term);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setEditingTerm(undefined);
    setFormError(null);
  }

  async function saveTerm(
    values: TermFormValues,
  ) {
    setFormError(null);

    try {
      if (editingTerm) {
        await updateMutation.mutateAsync({
          termId: editingTerm.id,
          request: values,
        });
      } else {
        await createMutation.mutateAsync(
          values,
        );
      }

      await refreshTerms();

      setEditingTerm(undefined);
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
    term: OperationalTerm,
    newStatus: TermStatus,
  ): Promise<boolean> {
    if (term.status === newStatus) {
      return true;
    }

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: term.name,

          currentStatus:
            statusLabel(term.status),

          newStatus:
            statusLabel(newStatus),
        },
      ),

      confirmLabel:
        newStatus === "ARCHIVED"
          ? common.actions.archive
          : newStatus === "ACTIVE"
            ? common.actions.activate
            : newStatus === "COMPLETED"
              ? common.actions.complete
              : common.actions.confirm,

      cancelLabel:
        common.actions.cancel,

      variant:
        newStatus === "ARCHIVED"
          ? "danger"
          : newStatus === "COMPLETED"
            ? "warning"
            : "info",
    });

    if (!confirmed) {
      return false;
    }

    setPageError(null);
    setUpdatingTermId(term.id);

    try {
      await statusMutation.mutateAsync({
        termId: term.id,
        status: newStatus,
      });

      await refreshTerms();

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
      setUpdatingTermId(null);
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

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form
            className="flex max-w-xl flex-1 gap-2"
            onSubmit={handleSearchSubmit}
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
          {termsQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {termsQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                termsQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!termsQuery.isPending &&
            !termsQuery.isError &&
            termsQuery.data?.length ===
            0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {termsQuery.data &&
            termsQuery.data.length > 0 && (
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.term}
                    </th>

                    <th className="p-4">
                      {t.dates}
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
                  {termsQuery.data.map(
                    (term) => (
                      <tr key={term.id}>
                        <td className="p-4">
                          <p className="font-medium">
                            {term.name}
                          </p>

                          <p className="text-sm text-slate-500">
                            {term.code}
                          </p>
                        </td>

                        <td className="p-4">
                          {formatDate(
                            term.startDate,
                          )}
                          {" – "}
                          {formatDate(
                            term.endDate,
                          )}
                        </td>

                        <td className="p-4">
                          <TermStatusBadge
                            status={term.status}
                          />
                        </td>

                        <td className="p-4">
                          {canManage && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  term.status ===
                                  "ARCHIVED"
                                }
                                onClick={() =>
                                  openEditDialog(term)
                                }
                                className="rounded border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {
                                  common.actions
                                    .edit
                                }
                              </button>

                              <TermStatusActions
                                term={term}
                                updating={
                                  updatingTermId ===
                                  term.id
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

      {editingTerm !== undefined && (
        <TermFormDialog
          term={
            editingTerm ?? undefined
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveTerm}
        />
      )}
    </div>
  );
}

type TermStatusActionsProps = {
  term: OperationalTerm;
  updating: boolean;
  changeStatusLabel: string;

  statusLabel: (
    status: string,
  ) => string;

  onChange: (
    term: OperationalTerm,
    status: TermStatus,
  ) => Promise<boolean>;
};

function TermStatusActions({
  term,
  updating,
  changeStatusLabel,
  statusLabel,
  onChange,
}: TermStatusActionsProps) {
  const nextStatuses: Record<
    TermStatus,
    TermStatus[]
  > = {
    DRAFT: [
      "ACTIVE",
      "ARCHIVED",
    ],

    ACTIVE: [
      "COMPLETED",
      "ARCHIVED",
    ],

    COMPLETED: ["ARCHIVED"],

    ARCHIVED: [],
  };

  const availableStatuses =
    nextStatuses[term.status];

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

        const selectedStatus =
          select.value as
          | TermStatus
          | "";

        if (!selectedStatus) {
          return;
        }

        void onChange(
          term,
          selectedStatus,
        ).finally(() => {
          select.value = "";
        });
      }}
      className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">
        {updating
          ? commonStatusUpdatingLabel(
            changeStatusLabel,
          )
          : changeStatusLabel}
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

function TermStatusBadge({
  status,
}: {
  status: TermStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    TermStatus,
    string
  > = {
    DRAFT:
      "bg-amber-100 text-amber-700",

    ACTIVE:
      "bg-green-100 text-green-700",

    COMPLETED:
      "bg-blue-100 text-blue-700",

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

function commonStatusUpdatingLabel(
  fallback: string,
): string {
  return `${fallback}...`;
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