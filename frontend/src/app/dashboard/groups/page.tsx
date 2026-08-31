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
  getBranches,
} from "@/features/branches/api";

import {
  getPrograms,
} from "@/features/programs/api";

import {
  getTerms,
} from "@/features/terms/api";

import {
  createGroup,
  getGroups,
  updateGroup,
  updateGroupStatus,
} from "@/features/groups/api";

import {
  GroupFormDialog,
  type GroupFormValues,
} from "@/features/groups/group-form-dialog";

import {
  groupQueryKeys,
} from "@/features/groups/query-keys";

import type {
  AcademyGroup,
  GroupStatus,
  SaveGroupRequest,
} from "@/features/groups/types";

import {
  useLocalization,
} from "@/features/localization/use-localization";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmDialog();

  const {
    dictionary,
    terminology,
    statusLabel,
  } = useLocalization();

  const t = dictionary.pages.groups;
  const common = dictionary.common;

  const pageTitle =
    terminology.groupLabel || t.title;

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [programId, setProgramId] =
    useState("");

  const [termId, setTermId] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    editingGroup,
    setEditingGroup,
  ] = useState<
    AcademyGroup | null | undefined
  >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [
    updatingGroupId,
    setUpdatingGroupId,
  ] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser =
    currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "groups.read",
  );

  const canManage = hasPermission(
    currentUser,
    "groups.manage",
  );

  const filters = {
    search,
    programId,
    termId,
    branchId,
    includeArchived,
  };

  const groupsQuery = useQuery({
    queryKey:
      groupQueryKeys.list(filters),

    queryFn: () => getGroups(filters),

    enabled:
      currentUserQuery.isSuccess &&
      canRead,
  });

  const programsQuery = useQuery({
    queryKey: [
      "programs",
      "group-options",
    ],

    queryFn: () => getPrograms(),

    enabled: currentUserQuery.isSuccess,
  });

  const termsQuery = useQuery({
    queryKey: [
      "terms",
      "group-options",
    ],

    queryFn: () => getTerms(),

    enabled: currentUserQuery.isSuccess,
  });

  const branchesQuery = useQuery({
    queryKey: [
      "branches",
      "group-options",
    ],

    queryFn: () => getBranches(false),

    enabled: currentUserQuery.isSuccess,
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
    mutationFn: createGroup,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      groupId,
      request,
    }: {
      groupId: string;
      request: SaveGroupRequest;
    }) =>
      updateGroup(
        groupId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      groupId,
      status,
    }: {
      groupId: string;
      status: GroupStatus;
    }) =>
      updateGroupStatus(
        groupId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshGroups() {
    await queryClient.invalidateQueries({
      queryKey: groupQueryKeys.all,
    });
  }

  function openCreateDialog() {
    setFormError(null);
    setEditingGroup(null);
  }

  function openEditDialog(
    group: AcademyGroup,
  ) {
    setFormError(null);
    setEditingGroup(group);
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setFormError(null);
    setEditingGroup(undefined);
  }

  async function saveGroup(
    values: GroupFormValues,
  ) {
    const request: SaveGroupRequest = {
      branchId:
        values.branchId || null,

      programId: values.programId,
      termId: values.termId,
      code: values.code,
      name: values.name,

      description:
        values.description || null,

      capacity: Number(values.capacity),

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
      if (editingGroup) {
        await updateMutation.mutateAsync({
          groupId: editingGroup.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshGroups();

      setEditingGroup(undefined);
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
    group: AcademyGroup,
    newStatus: GroupStatus,
  ): Promise<boolean> {
    if (group.status === newStatus) {
      return true;
    }

    const confirmed = await confirm({
      title: t.statusChangeTitle,

      description: formatMessage(
        t.statusChangeDescription,
        {
          name: group.name,

          currentStatus:
            statusLabel(group.status),

          newStatus:
            statusLabel(newStatus),
        },
      ),

      confirmLabel:
        actionLabelForStatus(
          newStatus,
          common,
        ),

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
    setUpdatingGroupId(group.id);

    try {
      await statusMutation.mutateAsync({
        groupId: group.id,
        status: newStatus,
      });

      await refreshGroups();

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
      setUpdatingGroupId(null);
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

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setProgramId("");
    setTermId("");
    setBranchId("");
    setIncludeArchived(false);
  }

  const filtersActive =
    Boolean(search) ||
    Boolean(searchInput) ||
    Boolean(programId) ||
    Boolean(termId) ||
    Boolean(branchId) ||
    includeArchived;

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

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_220px_220px_220px_auto]"
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

          <select
            value={termId}
            aria-label={
              common.filters.allTerms
            }
            onChange={(event) =>
              setTermId(
                event.target.value,
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">
              {common.filters.allTerms}
            </option>

            {termsQuery.data?.map(
              (term) => (
                <option
                  key={term.id}
                  value={term.id}
                >
                  {term.name}
                </option>
              ),
            )}
          </select>

          <select
            value={branchId}
            aria-label={
              common.filters.allBranches
            }
            onChange={(event) =>
              setBranchId(
                event.target.value,
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">
              {
                common.filters
                  .allBranches
              }
            </option>

            {branchesQuery.data?.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ),
            )}
          </select>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
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

            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition hover:bg-slate-50"
              >
                {common.actions.clear}
              </button>
            )}
          </div>
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
          {groupsQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              {t.loading}
            </div>
          )}

          {groupsQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                groupsQuery.error,
                t.loadError,
              )}
            </div>
          )}

          {!groupsQuery.isPending &&
            !groupsQuery.isError &&
            groupsQuery.data?.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

          {groupsQuery.data &&
            groupsQuery.data.length > 0 && (
              <table className="w-full min-w-[1000px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">
                      {t.group}
                    </th>

                    <th className="p-4">
                      {t.program}
                    </th>

                    <th className="p-4">
                      {t.term}
                    </th>

                    <th className="p-4">
                      {t.branch}
                    </th>

                    <th className="p-4">
                      {t.capacity}
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
                  {groupsQuery.data.map(
                    (group) => (
                      <tr key={group.id}>
                        <td className="p-4">
                          <Link
                            href={`/dashboard/groups/${group.id}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {group.name}
                          </Link>

                          <p className="text-sm text-slate-500">
                            {group.code}
                          </p>
                        </td>

                        <td className="p-4">
                          {group.programName}
                        </td>

                        <td className="p-4">
                          {group.termName}
                        </td>

                        <td className="p-4">
                          {group.branchName ||
                            t.noBranch}
                        </td>

                        <td className="p-4">
                          {group.capacity}
                        </td>

                        <td className="p-4">
                          <GroupStatusBadge
                            status={group.status}
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/groups/${group.id}`}
                              className="rounded border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50"
                            >
                              {
                                common.actions
                                  .view
                              }
                            </Link>

                            {canManage &&
                              ![
                                "COMPLETED",
                                "ARCHIVED",
                              ].includes(
                                group.status,
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditDialog(
                                      group,
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
                              <GroupStatusAction
                                group={group}
                                updating={
                                  updatingGroupId ===
                                  group.id
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

      {editingGroup !== undefined && (
        <GroupFormDialog
          group={
            editingGroup ?? undefined
          }
          programs={
            programsQuery.data ?? []
          }
          terms={
            termsQuery.data ?? []
          }
          branches={
            branchesQuery.data ?? []
          }
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveGroup}
        />
      )}
    </div>
  );
}

type GroupStatusActionProps = {
  group: AcademyGroup;
  updating: boolean;
  changeStatusLabel: string;

  statusLabel: (
    status: string,
  ) => string;

  onChange: (
    group: AcademyGroup,
    status: GroupStatus,
  ) => Promise<boolean>;
};

function GroupStatusAction({
  group,
  updating,
  changeStatusLabel,
  statusLabel,
  onChange,
}: GroupStatusActionProps) {
  const transitions: Record<
    GroupStatus,
    GroupStatus[]
  > = {
    DRAFT: [
      "ACTIVE",
      "ARCHIVED",
    ],

    ACTIVE: [
      "INACTIVE",
      "COMPLETED",
      "ARCHIVED",
    ],

    INACTIVE: [
      "ACTIVE",
      "COMPLETED",
      "ARCHIVED",
    ],

    COMPLETED: ["ARCHIVED"],

    ARCHIVED: [],
  };

  const availableStatuses =
    transitions[group.status];

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
          | GroupStatus
          | "";

        if (!newStatus) {
          return;
        }

        void onChange(
          group,
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

function GroupStatusBadge({
  status,
}: {
  status: GroupStatus;
}) {
  const {
    statusLabel,
  } = useLocalization();

  const styles: Record<
    GroupStatus,
    string
  > = {
    DRAFT:
      "bg-amber-100 text-amber-700",

    ACTIVE:
      "bg-green-100 text-green-700",

    INACTIVE:
      "bg-orange-100 text-orange-700",

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

function actionLabelForStatus(
  status: GroupStatus,
  common: {
    actions: {
      archive: string;
      activate: string;
      deactivate: string;
      complete: string;
      confirm: string;
    };
  },
): string {
  switch (status) {
    case "ARCHIVED":
      return common.actions.archive;

    case "ACTIVE":
      return common.actions.activate;

    case "INACTIVE":
      return common.actions.deactivate;

    case "COMPLETED":
      return common.actions.complete;

    default:
      return common.actions.confirm;
  }
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