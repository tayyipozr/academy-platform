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
  useConfirmDialog,
} from "@/components/confirm-dialog-provider";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  createGuardian,
  getGuardians,
  updateGuardian,
  updateGuardianStatus,
} from "@/features/guardians/api";

import {
  GuardianFormDialog,
} from "@/features/guardians/guardian-form-dialog";

import type {
  GuardianFormValues,
} from "@/features/guardians/guardian-form-schema";

import {
  guardianQueryKeys,
} from "@/features/guardians/query-keys";

import type {
  Guardian,
  GuardianStatus,
} from "@/features/guardians/types";

import {
  useLocalization,
} from "@/features/localization/use-localization";

import {
  getAssignableAccounts,
} from "@/features/people/api";

import {
  peopleQueryKeys,
} from "@/features/people/query-keys";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function GuardiansPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    statusLabel,
  } = useLocalization();

  const t = dictionary.pages.guardians;
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
    editingGuardian,
    setEditingGuardian,
  ] = useState<
    Guardian | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingGuardianId,
    setUpdatingGuardianId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "guardians.read",
  );

  const canManage = hasPermission(
    currentUser,
    "guardians.manage",
  );

  const guardiansQuery = useQuery({
    queryKey: guardianQueryKeys.list(
      search,
      includeArchived,
    ),

    queryFn: () =>
      getGuardians({
        search,
        includeArchived,
      }),

    enabled:
      currentUserQuery.isSuccess &&
      canRead,
  });

  const accountsQuery = useQuery({
    queryKey:
      peopleQueryKeys.assignableAccounts(
        "GUARDIAN",
      ),

    queryFn: () =>
      getAssignableAccounts("GUARDIAN"),

    enabled:
      currentUserQuery.isSuccess &&
      canManage,
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
    mutationFn: createGuardian,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      guardianId,
      request,
    }: {
      guardianId: string;

      request: Parameters<
        typeof updateGuardian
      >[1];
    }) =>
      updateGuardian(
        guardianId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      guardianId,
      status,
    }: {
      guardianId: string;
      status: GuardianStatus;
    }) =>
      updateGuardianStatus(
        guardianId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          guardianQueryKeys.all,
      }),

      queryClient.invalidateQueries({
        queryKey:
          peopleQueryKeys
            .assignableAccounts(
              "GUARDIAN",
            ),
      }),
    ]);
  }

  function openCreateDialog() {
    setFormError(null);
    setEditingGuardian(null);
  }

  function openEditDialog(
    guardian: Guardian,
  ) {
    setFormError(null);
    setEditingGuardian(guardian);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setFormError(null);
    setEditingGuardian(undefined);
  }

  async function saveGuardian(
    values: GuardianFormValues,
  ) {
    const request = {
      membershipId: values.membershipId,

      guardianNumber:
        values.guardianNumber || null,

      phone: values.phone || null,

      alternatePhone:
        values.alternatePhone || null,

      occupation:
        values.occupation || null,

      addressLine1:
        values.addressLine1 || null,

      addressLine2:
        values.addressLine2 || null,

      city: values.city || null,

      stateProvince:
        values.stateProvince || null,

      postalCode:
        values.postalCode || null,

      countryCode:
        values.countryCode || null,

      notes: values.notes || null,
    };

    setFormError(null);

    try {
      if (editingGuardian) {
        await updateMutation.mutateAsync({
          guardianId:
            editingGuardian.id,

          request,
        });
      } else {
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshData();

      setEditingGuardian(undefined);
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
    guardian: Guardian,
    newStatus: GuardianStatus,
  ) {
    if (guardian.status === newStatus) {
      return;
    }

    const guardianName =
      `${guardian.firstName} ${guardian.lastName}`;

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: guardianName,

          currentStatus:
            statusLabel(
              guardian.status,
            ),

          newStatus:
            statusLabel(newStatus),
        },
      ),

      confirmLabel:
        common.actions.confirm,

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
      return;
    }

    setPageError(null);
    setUpdatingGuardianId(guardian.id);

    try {
      await statusMutation.mutateAsync({
        guardianId: guardian.id,
        status: newStatus,
      });

      await refreshData();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          t.statusChangeError,
        ),
      );
    } finally {
      setUpdatingGuardianId(null);
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
          {guardiansQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {guardiansQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                guardiansQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!guardiansQuery.isPending &&
            !guardiansQuery.isError &&
            guardiansQuery.data?.length ===
            0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {guardiansQuery.data &&
            guardiansQuery.data.length >
            0 && (
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.guardian}
                    </th>

                    <th className="p-4">
                      {t.number}
                    </th>

                    <th className="p-4">
                      {t.contact}
                    </th>

                    <th className="p-4">
                      {t.location}
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
                  {guardiansQuery.data.map(
                    (guardian) => (
                      <tr key={guardian.id}>
                        <td className="p-4">
                          <p className="font-medium">
                            {
                              guardian.firstName
                            }{" "}
                            {guardian.lastName}
                          </p>

                          <p className="text-sm text-slate-500">
                            {guardian.email}
                          </p>

                          {guardian.occupation && (
                            <p className="text-sm text-slate-600">
                              {
                                guardian.occupation
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          {guardian.guardianNumber ||
                            "—"}
                        </td>

                        <td className="p-4 text-sm">
                          <p>
                            {guardian.phone ||
                              "—"}
                          </p>

                          {guardian.alternatePhone && (
                            <p className="mt-1 text-slate-500">
                              {
                                guardian.alternatePhone
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          {[
                            guardian.city,
                            guardian.countryCode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>

                        <td className="p-4">
                          <GuardianStatusBadge
                            status={
                              guardian.status
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
                                    guardian,
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
                                  guardian.status
                                }
                                disabled={
                                  updatingGuardianId ===
                                  guardian.id
                                }
                                aria-label={
                                  t.statusChangeTitle
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const newStatus =
                                    event.target
                                      .value as GuardianStatus;

                                  void changeStatus(
                                    guardian,
                                    newStatus,
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

      {editingGuardian !== undefined && (
        <GuardianFormDialog
          guardian={
            editingGuardian ?? undefined
          }
          accounts={
            accountsQuery.data ?? []
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveGuardian}
        />
      )}
    </div>
  );
}

function GuardianStatusBadge({
  status,
}: {
  status: GuardianStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    GuardianStatus,
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