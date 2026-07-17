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
  createGuardian,
  getGuardians,
  updateGuardian,
  updateGuardianStatus,
} from "@/features/guardians/api";

import { GuardianFormDialog } from "@/features/guardians/guardian-form-dialog";
import type { GuardianFormValues } from "@/features/guardians/guardian-form-schema";
import { guardianQueryKeys } from "@/features/guardians/query-keys";

import type {
  Guardian,
  GuardianStatus,
} from "@/features/guardians/types";

import { getAssignableAccounts } from "@/features/people/api";
import { peopleQueryKeys } from "@/features/people/query-keys";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function GuardiansPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingGuardian, setEditingGuardian] =
    useState<Guardian | null | undefined>(
      undefined,
    );

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
    enabled: currentUserQuery.isSuccess && canRead,
  });

  const accountsQuery = useQuery({
    queryKey:
      peopleQueryKeys.assignableAccounts(
        "GUARDIAN",
      ),
    queryFn: () =>
      getAssignableAccounts("GUARDIAN"),
    enabled:
      currentUserQuery.isSuccess && canManage,
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
      updateGuardian(guardianId, request),
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
        queryKey: guardianQueryKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey:
          peopleQueryKeys.assignableAccounts(
            "GUARDIAN",
          ),
      }),
    ]);
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
      occupation: values.occupation || null,
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
      notes: values.notes || null,
    };

    setFormError(null);

    try {
      if (editingGuardian) {
        await updateMutation.mutateAsync({
          guardianId: editingGuardian.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(request);
      }

      await refreshData();
      setEditingGuardian(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The guardian profile could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    guardian: Guardian,
    status: GuardianStatus,
  ) {
    setPageError(null);

    try {
      await statusMutation.mutateAsync({
        guardianId: guardian.id,
        status,
      });

      await refreshData();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The guardian status could not be changed.",
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
            You do not have permission to view guardians.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Guardians
                </h1>

                <p className="mt-1 text-slate-600">
                  Manage parents and legal guardian
                  profiles.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditingGuardian(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Create guardian profile
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
                  placeholder="Search guardians"
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
              {guardiansQuery.isPending && (
                <div className="p-10 text-center">
                  Loading guardians...
                </div>
              )}

              {guardiansQuery.isError && (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    guardiansQuery.error,
                  )}
                </div>
              )}

              {guardiansQuery.data?.length ===
                0 && (
                <div className="p-10 text-center text-slate-500">
                  No guardian profiles were found.
                </div>
              )}

              {guardiansQuery.data &&
                guardiansQuery.data.length > 0 && (
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          Guardian
                        </th>
                        <th className="p-4">
                          Number
                        </th>
                        <th className="p-4">
                          Contact
                        </th>
                        <th className="p-4">
                          Location
                        </th>
                        <th className="p-4">
                          Status
                        </th>
                        <th className="p-4">
                          Actions
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
                                <p className="text-sm">
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
                                {guardian.phone || "—"}
                              </p>
                              <p>
                                {guardian.alternatePhone ||
                                  ""}
                              </p>
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
                              {guardian.status}
                            </td>

                            <td className="p-4">
                              {canManage && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormError(
                                        null,
                                      );
                                      setEditingGuardian(
                                        guardian,
                                      );
                                    }}
                                    className="rounded border px-3 py-1.5 text-sm"
                                  >
                                    Edit
                                  </button>

                                  <select
                                    value={
                                      guardian.status
                                    }
                                    onChange={(event) =>
                                      changeStatus(
                                        guardian,
                                        event.target
                                          .value as GuardianStatus,
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

      {editingGuardian !== undefined && (
        <GuardianFormDialog
          guardian={
            editingGuardian ?? undefined
          }
          accounts={accountsQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() => {
            if (!formSubmitting) {
              setEditingGuardian(undefined);
              setFormError(null);
            }
          }}
          onSubmit={saveGuardian}
        />
      )}
    </div>
  );
}
