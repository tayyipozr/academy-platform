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
import { getBranches } from "@/features/branches/api";
import { getPrograms } from "@/features/programs/api";
import { getTerms } from "@/features/terms/api";

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

import { groupQueryKeys } from "@/features/groups/query-keys";

import type {
  AcademyGroup,
  GroupStatus,
  SaveGroupRequest,
} from "@/features/groups/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function GroupsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [termId, setTermId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingGroup, setEditingGroup] =
    useState<
      AcademyGroup | null | undefined
    >(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

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
    queryKey: groupQueryKeys.list(filters),
    queryFn: () => getGroups(filters),
    enabled: currentUserQuery.isSuccess && canRead,
  });

  const programsQuery = useQuery({
    queryKey: ["programs", "group-options"],
    queryFn: () => getPrograms(),
    enabled: currentUserQuery.isSuccess,
  });

  const termsQuery = useQuery({
    queryKey: ["terms", "group-options"],
    queryFn: () => getTerms(),
    enabled: currentUserQuery.isSuccess,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", "group-options"],
    queryFn: () => getBranches(false),
    enabled: currentUserQuery.isSuccess,
  });

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
    }) => updateGroup(groupId, request),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      groupId,
      status,
    }: {
      groupId: string;
      status: GroupStatus;
    }) => updateGroupStatus(groupId, status),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshGroups() {
    await queryClient.invalidateQueries({
      queryKey: groupQueryKeys.all,
    });
  }

  async function saveGroup(
    values: GroupFormValues,
  ) {
    const request: SaveGroupRequest = {
      branchId: values.branchId || null,
      programId: values.programId,
      termId: values.termId,
      code: values.code,
      name: values.name,
      description: values.description || null,
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
        await createMutation.mutateAsync(request);
      }

      await refreshGroups();
      setEditingGroup(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The group could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    group: AcademyGroup,
    status: GroupStatus,
  ) {
    try {
      await statusMutation.mutateAsync({
        groupId: group.id,
        status,
      });
      await refreshGroups();
    } catch (error) {
      window.alert(getApiErrorMessage(error));
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
            You do not have permission to view groups.
          </div>
        ) : (
          <>
            <header className="flex justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Groups
                </h1>
                <p className="mt-1 text-slate-600">
                  Manage teams, classes, and activity groups.
                </p>
              </div>

              {canManage && (
                <button
                  onClick={() =>
                    setEditingGroup(null)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Create group
                </button>
              )}
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-5">
              <input
                placeholder="Search groups"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              />

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">All programs</option>
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
                onChange={(event) =>
                  setTermId(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">All terms</option>
                {termsQuery.data?.map((term) => (
                  <option
                    key={term.id}
                    value={term.id}
                  >
                    {term.name}
                  </option>
                ))}
              </select>

              <select
                value={branchId}
                onChange={(event) =>
                  setBranchId(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">All branches</option>
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

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {groupsQuery.isPending && (
                <div className="p-10 text-center">
                  Loading groups...
                </div>
              )}

              {groupsQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  No groups were found.
                </div>
              )}

              {groupsQuery.data &&
                groupsQuery.data.length > 0 && (
                  <table className="w-full min-w-[1000px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">Group</th>
                        <th className="p-4">Program</th>
                        <th className="p-4">Term</th>
                        <th className="p-4">Branch</th>
                        <th className="p-4">Capacity</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {groupsQuery.data.map((group) => (
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
                            {group.branchName || "—"}
                          </td>

                          <td className="p-4">
                            {group.capacity}
                          </td>

                          <td className="p-4">
                            {group.status}
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <Link
                                href={`/dashboard/groups/${group.id}`}
                                className="rounded border px-3 py-1.5 text-sm"
                              >
                                View
                              </Link>

                              {canManage &&
                                ![
                                  "COMPLETED",
                                  "ARCHIVED",
                                ].includes(
                                  group.status,
                                ) && (
                                  <button
                                    onClick={() =>
                                      setEditingGroup(
                                        group,
                                      )
                                    }
                                    className="rounded border px-3 py-1.5 text-sm"
                                  >
                                    Edit
                                  </button>
                                )}

                              {canManage && (
                                <GroupStatusAction
                                  group={group}
                                  onChange={
                                    changeStatus
                                  }
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </section>
          </>
        )}
      </main>

      {editingGroup !== undefined && (
        <GroupFormDialog
          group={editingGroup ?? undefined}
          programs={programsQuery.data ?? []}
          terms={termsQuery.data ?? []}
          branches={branchesQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() =>
            setEditingGroup(undefined)
          }
          onSubmit={saveGroup}
        />
      )}
    </div>
  );
}

function GroupStatusAction({
  group,
  onChange,
}: {
  group: AcademyGroup;
  onChange: (
    group: AcademyGroup,
    status: GroupStatus,
  ) => Promise<void>;
}) {
  const transitions: Record<
    GroupStatus,
    GroupStatus[]
  > = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
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

  if (transitions[group.status].length === 0) {
    return null;
  }

  return (
    <select
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) {
          void onChange(
            group,
            event.target.value as GroupStatus,
          );
          event.target.value = "";
        }
      }}
      className="rounded border px-2 py-1.5 text-sm"
    >
      <option value="">Status</option>
      {transitions[group.status].map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
