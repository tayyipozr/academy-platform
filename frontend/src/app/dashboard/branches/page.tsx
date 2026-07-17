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
  activateBranch,
  archiveBranch,
  createBranch,
  getBranches,
  updateBranch,
} from "@/features/branches/api";

import { BranchFormDialog } from "@/features/branches/branch-form-dialog";
import type { BranchFormValues } from "@/features/branches/branch-form-schema";
import { branchQueryKeys } from "@/features/branches/query-keys";
import type { Branch } from "@/features/branches/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function BranchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingBranch, setEditingBranch] =
    useState<Branch | null | undefined>(undefined);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [updatingBranchId, setUpdatingBranchId] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "branches.read",
  );

  const canManage = hasPermission(
    currentUser,
    "branches.manage",
  );

  const branchesQuery = useQuery({
    queryKey:
      branchQueryKeys.list(includeArchived),
    queryFn: () => getBranches(includeArchived),
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

  async function refreshBranches() {
    await queryClient.invalidateQueries({
      queryKey: branchQueryKeys.all,
    });
  }

  const createMutation = useMutation({
    mutationFn: createBranch,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      branchId,
      request,
    }: {
      branchId: string;
      request: Parameters<typeof updateBranch>[1];
    }) => updateBranch(branchId, request),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveBranch,
  });

  const activateMutation = useMutation({
    mutationFn: activateBranch,
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  function openCreateDialog() {
    setFormError(null);
    setEditingBranch(null);
  }

  function openEditDialog(branch: Branch) {
    setFormError(null);
    setEditingBranch(branch);
  }

  function closeDialog() {
    if (!formSubmitting) {
      setEditingBranch(undefined);
      setFormError(null);
    }
  }

  async function saveBranch(
    values: BranchFormValues,
  ) {
    setFormError(null);

    const request = {
      code: values.code,
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      addressLine1:
        values.addressLine1 || null,
      addressLine2:
        values.addressLine2 || null,
      city: values.city || null,
      stateProvince:
        values.stateProvince || null,
      postalCode: values.postalCode || null,
      countryCode:
        values.countryCode || null,
      timezone: values.timezone,
    };

    try {
      if (editingBranch) {
        await updateMutation.mutateAsync({
          branchId: editingBranch.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshBranches();
      setEditingBranch(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The branch could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    branch: Branch,
    action: "archive" | "activate",
  ) {
    const confirmed =
      action === "archive"
        ? window.confirm(
            `Archive ${branch.name}?`,
          )
        : true;

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setUpdatingBranchId(branch.id);

    try {
      if (action === "archive") {
        await archiveMutation.mutateAsync(
          branch.id,
        );
      } else {
        await activateMutation.mutateAsync(
          branch.id,
        );
      }

      await refreshBranches();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The branch status could not be updated.",
        ),
      );
    } finally {
      setUpdatingBranchId(null);
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

  if (!canRead) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader user={currentUser} />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            You do not have permission to view branches.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Branches
            </h1>

            <p className="mt-1 text-slate-600">
              Manage campuses, offices, and training
              locations.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateDialog}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
            >
              Create branch
            </button>
          )}
        </header>

        <label className="mt-6 flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) =>
              setIncludeArchived(event.target.checked)
            }
          />

          <span className="text-sm">
            Include archived branches
          </span>
        </label>

        {pageError && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {branchesQuery.isPending && (
            <div className="p-10 text-center">
              Loading branches...
            </div>
          )}

          {branchesQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                branchesQuery.error,
              )}
            </div>
          )}

          {branchesQuery.data?.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              No branches were found.
            </div>
          )}

          {branchesQuery.data &&
            branchesQuery.data.length > 0 && (
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">Branch</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {branchesQuery.data.map((branch) => (
                    <tr key={branch.id}>
                      <td className="p-4">
                        <p className="font-medium">
                          {branch.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {branch.code}
                        </p>
                      </td>

                      <td className="p-4 text-sm">
                        {[branch.city, branch.countryCode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td className="p-4 text-sm">
                        <p>{branch.email || "—"}</p>
                        <p>{branch.phone || "—"}</p>
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                          {branch.status}
                        </span>
                      </td>

                      <td className="p-4">
                        {canManage && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditDialog(branch)
                              }
                              className="rounded border px-3 py-1.5 text-sm"
                            >
                              Edit
                            </button>

                            {branch.status !==
                              "ARCHIVED" && (
                              <button
                                type="button"
                                disabled={
                                  updatingBranchId ===
                                  branch.id
                                }
                                onClick={() =>
                                  changeStatus(
                                    branch,
                                    "archive",
                                  )
                                }
                                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                              >
                                Archive
                              </button>
                            )}

                            {branch.status ===
                              "ARCHIVED" && (
                              <button
                                type="button"
                                disabled={
                                  updatingBranchId ===
                                  branch.id
                                }
                                onClick={() =>
                                  changeStatus(
                                    branch,
                                    "activate",
                                  )
                                }
                                className="rounded border border-green-300 px-3 py-1.5 text-sm text-green-700"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>
      </main>

      {editingBranch !== undefined && (
        <BranchFormDialog
          branch={editingBranch ?? undefined}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={saveBranch}
        />
      )}
    </div>
  );
}
