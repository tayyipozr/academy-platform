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
import { getBranches } from "@/features/branches/api";
import { branchQueryKeys } from "@/features/branches/query-keys";
import { getAssignableAccounts } from "@/features/people/api";
import { peopleQueryKeys } from "@/features/people/query-keys";

import {
  createStaff,
  getStaff,
  updateStaff,
  updateStaffStatus,
} from "@/features/staff/api";

import { StaffFormDialog } from "@/features/staff/staff-form-dialog";
import type { StaffFormValues } from "@/features/staff/staff-form-schema";
import { staffQueryKeys } from "@/features/staff/query-keys";
import { StaffStatusBadge } from "@/features/staff/staff-status-badge";

import type {
  EmploymentStatus,
  StaffMember,
} from "@/features/staff/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function StaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingStaff, setEditingStaff] =
    useState<StaffMember | null | undefined>(
      undefined,
    );

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [updatingStaffId, setUpdatingStaffId] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

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
    enabled: currentUserQuery.isSuccess && canRead,
  });

  const accountsQuery = useQuery({
    queryKey:
      peopleQueryKeys.assignableAccounts(
        "INSTRUCTOR",
      ),
    queryFn: () =>
      getAssignableAccounts("INSTRUCTOR"),
    enabled:
      currentUserQuery.isSuccess && canManage,
  });

  const branchesQuery = useQuery({
    queryKey: branchQueryKeys.list(false),
    queryFn: () => getBranches(false),
    enabled:
      currentUserQuery.isSuccess &&
      hasPermission(currentUser, "branches.read"),
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
    mutationFn: createStaff,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      staffId,
      request,
    }: {
      staffId: string;
      request: Parameters<typeof updateStaff>[1];
    }) => updateStaff(staffId, request),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      staffId,
      status,
    }: {
      staffId: string;
      status: EmploymentStatus;
    }) => updateStaffStatus(staffId, status),
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
          peopleQueryKeys.assignableAccounts(
            "INSTRUCTOR",
          ),
      }),
    ]);
  }

  function openCreate() {
    setFormError(null);
    setEditingStaff(null);
  }

  function openEdit(staff: StaffMember) {
    setFormError(null);
    setEditingStaff(staff);
  }

  function closeDialog() {
    if (!formSubmitting) {
      setEditingStaff(undefined);
      setFormError(null);
    }
  }

  async function saveStaff(
    values: StaffFormValues,
  ) {
    const request = {
      membershipId: values.membershipId,
      branchId: values.branchId || null,
      staffNumber: values.staffNumber,
      title: values.title || null,
      specialization:
        values.specialization || null,
      biography: values.biography || null,
      hiredAt: values.hiredAt || null,
      endedAt: values.endedAt || null,
    };

    setFormError(null);

    try {
      if (editingStaff) {
        await updateMutation.mutateAsync({
          staffId: editingStaff.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshData();
      setEditingStaff(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The staff profile could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    staff: StaffMember,
    status: EmploymentStatus,
  ) {
    const confirmed =
      status !== "ARCHIVED" ||
      window.confirm(
        `Archive ${staff.firstName} ${staff.lastName}?`,
      );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setUpdatingStaffId(staff.id);

    try {
      await statusMutation.mutateAsync({
        staffId: staff.id,
        status,
      });

      await refreshData();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The employment status could not be changed.",
        ),
      );
    } finally {
      setUpdatingStaffId(null);
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
            You do not have permission to view staff.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Staff
                </h1>

                <p className="mt-1 text-slate-600">
                  Manage instructors, coaches, teachers,
                  and other organization staff.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Create staff profile
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
                  placeholder="Search staff"
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
              {staffQuery.isPending && (
                <div className="p-10 text-center">
                  Loading staff...
                </div>
              )}

              {staffQuery.isError && (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    staffQuery.error,
                  )}
                </div>
              )}

              {staffQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  No staff profiles were found.
                </div>
              )}

              {staffQuery.data &&
                staffQuery.data.length > 0 && (
                  <table className="w-full min-w-[950px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">Staff</th>
                        <th className="p-4">
                          Staff number
                        </th>
                        <th className="p-4">Branch</th>
                        <th className="p-4">
                          Specialization
                        </th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {staffQuery.data.map((staff) => (
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
                              <p className="text-sm">
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
                            <StaffStatusBadge
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
                                  className="rounded border px-3 py-1.5 text-sm"
                                >
                                  Edit
                                </button>

                                <select
                                  value={
                                    staff.employmentStatus
                                  }
                                  disabled={
                                    updatingStaffId ===
                                    staff.id
                                  }
                                  onChange={(event) =>
                                    changeStatus(
                                      staff,
                                      event.target
                                        .value as EmploymentStatus,
                                    )
                                  }
                                  className="rounded border px-2 py-1.5 text-sm"
                                >
                                  <option value="ACTIVE">
                                    Active
                                  </option>
                                  <option value="ON_LEAVE">
                                    On leave
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
                      ))}
                    </tbody>
                  </table>
                )}
            </section>
          </>
        )}
      </main>

      {editingStaff !== undefined && (
        <StaffFormDialog
          staff={editingStaff ?? undefined}
          accounts={accountsQuery.data ?? []}
          branches={branchesQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveStaff}
        />
      )}
    </div>
  );
}
