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
  getBranches,
} from "@/features/branches/api";

import {
  branchQueryKeys,
} from "@/features/branches/query-keys";

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
  createStaff,
  getStaff,
  updateStaff,
  updateStaffStatus,
} from "@/features/staff/api";

import {
  StaffFormDialog,
} from "@/features/staff/staff-form-dialog";

import type {
  StaffFormValues,
} from "@/features/staff/staff-form-schema";

import {
  staffQueryKeys,
} from "@/features/staff/query-keys";

import type {
  EmploymentStatus,
  StaffMember,
} from "@/features/staff/types";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function StaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    terminology,
    statusLabel,
  } = useLocalization();

  const t = dictionary.pages.staff;
  const common = dictionary.common;

  const staffPageTitle =
    terminology.staffLabel || t.title;

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    editingStaff,
    setEditingStaff,
  ] = useState<
    StaffMember | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingStaffId,
    setUpdatingStaffId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "staff.read",
  );

  const canManage = hasPermission(
    currentUser,
    "staff.manage",
  );

  const staffQuery = useQuery({
    queryKey: staffQueryKeys.list(
      search,
      includeArchived,
    ),

    queryFn: () =>
      getStaff({
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
        "INSTRUCTOR",
      ),

    queryFn: () =>
      getAssignableAccounts("INSTRUCTOR"),

    enabled:
      currentUserQuery.isSuccess &&
      canManage,
  });

  const branchesQuery = useQuery({
    queryKey:
      branchQueryKeys.list(false),

    queryFn: () =>
      getBranches(false),

    enabled:
      currentUserQuery.isSuccess &&
      hasPermission(
        currentUser,
        "branches.read",
      ),
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
    mutationFn: createStaff,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      staffId,
      request,
    }: {
      staffId: string;

      request: Parameters<
        typeof updateStaff
      >[1];
    }) =>
      updateStaff(
        staffId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      staffId,
      status,
    }: {
      staffId: string;
      status: EmploymentStatus;
    }) =>
      updateStaffStatus(
        staffId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: staffQueryKeys.all,
      }),

      queryClient.invalidateQueries({
        queryKey:
          peopleQueryKeys
            .assignableAccounts(
              "INSTRUCTOR",
            ),
      }),
    ]);
  }

  function openCreate() {
    setFormError(null);
    setEditingStaff(null);
  }

  function openEdit(
    staff: StaffMember,
  ) {
    setFormError(null);
    setEditingStaff(staff);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setEditingStaff(undefined);
    setFormError(null);
  }

  async function saveStaff(
    values: StaffFormValues,
  ) {
    const request = {
      membershipId: values.membershipId,

      branchId:
        values.branchId || null,

      staffNumber: values.staffNumber,

      title: values.title || null,

      specialization:
        values.specialization || null,

      biography:
        values.biography || null,

      hiredAt:
        values.hiredAt || null,

      endedAt:
        values.endedAt || null,
    };

    setFormError(null);

    try {
      if (editingStaff) {
        await updateMutation.mutateAsync({
          staffId: editingStaff.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshData();

      setEditingStaff(undefined);
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
    staff: StaffMember,
    newStatus: EmploymentStatus,
  ): Promise<boolean> {
    if (
      staff.employmentStatus === newStatus
    ) {
      return true;
    }

    const staffName =
      `${staff.firstName} ${staff.lastName}`;

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: staffName,

          currentStatus:
            statusLabel(
              staff.employmentStatus,
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
      return false;
    }

    setPageError(null);
    setUpdatingStaffId(staff.id);

    try {
      await statusMutation.mutateAsync({
        staffId: staff.id,
        status: newStatus,
      });

      await refreshData();

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
      setUpdatingStaffId(null);
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
              {staffPageTitle}
            </h1>

            <p className="mt-1 text-slate-600">
              {t.description}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
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
          {staffQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {staffQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                staffQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!staffQuery.isPending &&
            !staffQuery.isError &&
            staffQuery.data?.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {staffQuery.data &&
            staffQuery.data.length > 0 && (
              <table className="w-full min-w-[950px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.staff}
                    </th>

                    <th className="p-4">
                      {t.staffNumber}
                    </th>

                    <th className="p-4">
                      {t.branch}
                    </th>

                    <th className="p-4">
                      {t.specialization}
                    </th>

                    <th className="p-4">
                      {t.employmentStatus}
                    </th>

                    <th className="p-4">
                      {common.fields.actions}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {staffQuery.data.map(
                    (staff) => (
                      <tr key={staff.id}>
                        <td className="p-4">
                          <p className="font-medium">
                            {staff.firstName}{" "}
                            {staff.lastName}
                          </p>

                          <p className="text-sm text-slate-500">
                            {staff.email}
                          </p>

                          {staff.title && (
                            <p className="text-sm text-slate-600">
                              {staff.title}
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          {staff.staffNumber}
                        </td>

                        <td className="p-4">
                          {staff.branchName || "—"}
                        </td>

                        <td className="p-4">
                          {staff.specialization ||
                            "—"}
                        </td>

                        <td className="p-4">
                          <StaffEmploymentStatusBadge
                            status={
                              staff.employmentStatus
                            }
                          />
                        </td>

                        <td className="p-4">
                          {canManage && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(staff)
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
                                  staff.employmentStatus
                                }
                                disabled={
                                  updatingStaffId ===
                                  staff.id
                                }
                                aria-label={
                                  t.statusChangeTitle
                                }
                                onChange={(event) => {
                                  const select =
                                    event.currentTarget;

                                  const newStatus =
                                    select.value as EmploymentStatus;

                                  void changeStatus(
                                    staff,
                                    newStatus,
                                  ).then(
                                    (changed) => {
                                      if (!changed) {
                                        select.value =
                                          staff.employmentStatus;
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

                                <option value="ON_LEAVE">
                                  {statusLabel(
                                    "ON_LEAVE",
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

      {editingStaff !== undefined && (
        <StaffFormDialog
          staff={
            editingStaff ?? undefined
          }
          accounts={
            accountsQuery.data ?? []
          }
          branches={
            branchesQuery.data ?? []
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveStaff}
        />
      )}
    </div>
  );
}

function StaffEmploymentStatusBadge({
  status,
}: {
  status: EmploymentStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    EmploymentStatus,
    string
  > = {
    ACTIVE:
      "bg-green-100 text-green-700",

    ON_LEAVE:
      "bg-blue-100 text-blue-700",

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