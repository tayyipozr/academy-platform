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

import {
  getStudentEvaluations,
  publishStudentEvaluation,
} from "@/features/evaluations/api";

import {
  EvaluationStatusBadge,
} from "@/features/evaluations/evaluation-status-badge";

import {
  evaluationQueryKeys,
} from "@/features/evaluations/query-keys";

import type {
  EvaluationFilters,
  StudentEvaluationStatus,
  StudentEvaluationSummary,
} from "@/features/evaluations/types";

import { getGroups } from "@/features/groups/api";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function EvaluationsPage() {
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  const [groupId, setGroupId] = useState("");
  const [status, setStatus] =
    useState<StudentEvaluationStatus | "">("");

  const [dateFrom, setDateFrom] = useState(
    `${currentYear}-01-01`,
  );

  const [dateTo, setDateTo] = useState(
    `${currentYear}-12-31`,
  );

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [publishingId, setPublishingId] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "evaluations.read",
  );

  const canManage = hasPermission(
    currentUser,
    "evaluations.manage",
  );

  const canPublish = hasPermission(
    currentUser,
    "evaluations.publish",
  );

  const filters: EvaluationFilters = {
    groupId: groupId || undefined,
    status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const evaluationsQuery = useQuery({
    queryKey:
      evaluationQueryKeys.studentEvaluations(
        filters,
      ),

    queryFn: () =>
      getStudentEvaluations(filters),

    enabled:
      currentUserQuery.isSuccess && canRead,
  });

  const groupsQuery = useQuery({
    queryKey: [
      "groups",
      "evaluation-filter-options",
    ],

    queryFn: () =>
      getGroups({
        includeArchived: true,
      }),

    enabled: currentUserQuery.isSuccess,
  });

  const publishMutation = useMutation({
    mutationFn: publishStudentEvaluation,
  });

  async function refreshEvaluations() {
    await queryClient.invalidateQueries({
      queryKey: evaluationQueryKeys.all,
    });
  }

  async function publishEvaluation(
    evaluation: StudentEvaluationSummary,
  ) {
    const confirmed = window.confirm(
      `Publish the evaluation for ${evaluation.studentFirstName} ${evaluation.studentLastName}?`,
    );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPublishingId(evaluation.id);

    try {
      await publishMutation.mutateAsync(
        evaluation.id,
      );

      await refreshEvaluations();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The evaluation could not be published.",
        ),
      );
    } finally {
      setPublishingId(null);
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
            You do not have permission to view
            evaluations.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Student evaluations
                </h1>

                <p className="mt-1 text-slate-600">
                  Score student performance, submit
                  evaluations, and publish approved
                  results.
                </p>
              </div>

              {canManage && (
                <Link
                  href="/dashboard/evaluations/new"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Create evaluation
                </Link>
              )}
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-4">
              <FilterField
                id="evaluationGroup"
                label="Group"
              >
                <select
                  id="evaluationGroup"
                  value={groupId}
                  onChange={(event) =>
                    setGroupId(event.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">
                    All groups
                  </option>

                  {groupsQuery.data?.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField
                id="evaluationStatus"
                label="Status"
              >
                <select
                  id="evaluationStatus"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as
                        | StudentEvaluationStatus
                        | "",
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">
                    All statuses
                  </option>
                  <option value="DRAFT">
                    Draft
                  </option>
                  <option value="SUBMITTED">
                    Submitted
                  </option>
                  <option value="PUBLISHED">
                    Published
                  </option>
                </select>
              </FilterField>

              <FilterField
                id="evaluationDateFrom"
                label="Date from"
              >
                <input
                  id="evaluationDateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(event.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </FilterField>

              <FilterField
                id="evaluationDateTo"
                label="Date to"
              >
                <input
                  id="evaluationDateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(event.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </FilterField>
            </section>

            {pageError && (
              <div
                role="alert"
                className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
              >
                {pageError}
              </div>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {evaluationsQuery.isPending && (
                <div className="p-10 text-center">
                  Loading evaluations...
                </div>
              )}

              {evaluationsQuery.isError && (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    evaluationsQuery.error,
                    "Evaluations could not be loaded.",
                  )}
                </div>
              )}

              {evaluationsQuery.data?.length ===
                0 && (
                <div className="p-10 text-center text-slate-500">
                  No evaluations were found.
                </div>
              )}

              {evaluationsQuery.data &&
                evaluationsQuery.data.length > 0 && (
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          Student
                        </th>
                        <th className="p-4">
                          Group
                        </th>
                        <th className="p-4">
                          Template
                        </th>
                        <th className="p-4">
                          Date
                        </th>
                        <th className="p-4">
                          Score
                        </th>
                        <th className="p-4">
                          Evaluator
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
                      {evaluationsQuery.data.map(
                        (evaluation) => (
                          <tr key={evaluation.id}>
                            <td className="p-4">
                              <p className="font-medium">
                                {
                                  evaluation.studentFirstName
                                }{" "}
                                {
                                  evaluation.studentLastName
                                }
                              </p>

                              <p className="text-sm text-slate-500">
                                {
                                  evaluation.studentNumber
                                }
                              </p>
                            </td>

                            <td className="p-4">
                              {evaluation.groupName}
                            </td>

                            <td className="p-4">
                              <p>
                                {evaluation.templateName}
                              </p>

                              <p className="text-sm text-slate-500">
                                Version{" "}
                                {
                                  evaluation.templateVersion
                                }
                              </p>
                            </td>

                            <td className="p-4">
                              {new Date(
                                `${evaluation.evaluationDate}T00:00:00`,
                              ).toLocaleDateString()}
                            </td>

                            <td className="p-4">
                              {evaluation.overallScore ??
                                "Incomplete"}
                            </td>

                            <td className="p-4">
                              {evaluation.evaluatorName}
                            </td>

                            <td className="p-4">
                              <EvaluationStatusBadge
                                status={
                                  evaluation.status
                                }
                              />
                            </td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/evaluations/${evaluation.id}`}
                                  className="rounded border px-3 py-1.5 text-sm"
                                >
                                  {evaluation.status ===
                                  "DRAFT"
                                    ? "Edit"
                                    : "View"}
                                </Link>

                                {canPublish &&
                                  evaluation.status ===
                                    "SUBMITTED" && (
                                    <button
                                      type="button"
                                      disabled={
                                        publishingId ===
                                        evaluation.id
                                      }
                                      onClick={() =>
                                        publishEvaluation(
                                          evaluation,
                                        )
                                      }
                                      className="rounded border border-green-300 px-3 py-1.5 text-sm text-green-700 disabled:opacity-50"
                                    >
                                      {publishingId ===
                                      evaluation.id
                                        ? "Publishing..."
                                        : "Publish"}
                                    </button>
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
          </>
        )}
      </main>
    </div>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <div className="mt-1">{children}</div>
    </div>
  );
}
