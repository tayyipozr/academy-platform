"use client";

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

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

import { termQueryKeys } from "@/features/terms/query-keys";

import type {
  OperationalTerm,
  SaveTermRequest,
  TermStatus,
} from "@/features/terms/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function TermsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingTerm, setEditingTerm] =
    useState<
      OperationalTerm | null | undefined
    >(undefined);

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
    enabled: currentUserQuery.isSuccess && canRead,
  });

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
    }) => updateTerm(termId, request),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      termId,
      status,
    }: {
      termId: string;
      status: TermStatus;
    }) => updateTermStatus(termId, status),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshTerms() {
    await queryClient.invalidateQueries({
      queryKey: termQueryKeys.all,
    });
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
        await createMutation.mutateAsync(values);
      }

      await refreshTerms();
      setEditingTerm(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The term could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    term: OperationalTerm,
    status: TermStatus,
  ) {
    setPageError(null);

    try {
      await statusMutation.mutateAsync({
        termId: term.id,
        status,
      });

      await refreshTerms();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The term status could not be changed.",
        ),
      );
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
            You do not have permission to view terms.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Terms
                </h1>
                <p className="mt-1 text-slate-600">
                  Manage academic years, semesters, and
                  activity periods.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditingTerm(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Create term
                </button>
              )}
            </header>

            <div className="mt-6 flex flex-wrap gap-4">
              <form
                className="flex flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search terms"
                  className="max-w-md flex-1 rounded-lg border bg-white px-3 py-2"
                />
                <button className="rounded-lg border bg-white px-4 py-2">
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
              {termsQuery.isPending && (
                <div className="p-10 text-center">
                  Loading terms...
                </div>
              )}

              {termsQuery.data?.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  No terms were found.
                </div>
              )}

              {termsQuery.data &&
                termsQuery.data.length > 0 && (
                  <table className="w-full min-w-[800px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">Term</th>
                        <th className="p-4">Dates</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {termsQuery.data.map((term) => (
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
                            {term.startDate} – {term.endDate}
                          </td>

                          <td className="p-4">
                            {term.status}
                          </td>

                          <td className="p-4">
                            {canManage && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    term.status ===
                                    "ARCHIVED"
                                  }
                                  onClick={() => {
                                    setFormError(null);
                                    setEditingTerm(term);
                                  }}
                                  className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
                                >
                                  Edit
                                </button>

                                <TermStatusActions
                                  term={term}
                                  onChange={changeStatus}
                                />
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

      {editingTerm !== undefined && (
        <TermFormDialog
          term={editingTerm ?? undefined}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() => {
            if (!formSubmitting) {
              setEditingTerm(undefined);
              setFormError(null);
            }
          }}
          onSubmit={saveTerm}
        />
      )}
    </div>
  );
}

function TermStatusActions({
  term,
  onChange,
}: {
  term: OperationalTerm;
  onChange: (
    term: OperationalTerm,
    status: TermStatus,
  ) => Promise<void>;
}) {
  const nextStatuses: Record<
    TermStatus,
    TermStatus[]
  > = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["COMPLETED", "ARCHIVED"],
    COMPLETED: ["ARCHIVED"],
    ARCHIVED: [],
  };

  if (nextStatuses[term.status].length === 0) {
    return null;
  }

  return (
    <select
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) {
          void onChange(
            term,
            event.target.value as TermStatus,
          );
          event.target.value = "";
        }
      }}
      className="rounded border px-2 py-1.5 text-sm"
    >
      <option value="">Change status</option>

      {nextStatuses[term.status].map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
