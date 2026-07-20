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
  createEvaluationTemplate,
  getEvaluationTemplates,
  updateEvaluationTemplate,
  updateEvaluationTemplateStatus,
} from "@/features/evaluations/api";

import { evaluationQueryKeys } from "@/features/evaluations/query-keys";

import {
  TemplateFormDialog,
} from "@/features/evaluations/template-form-dialog";

import type {
  EvaluationTemplateFormValues,
} from "@/features/evaluations/template-form-schema";

import {
  TemplateStatusBadge,
} from "@/features/evaluations/template-status-badge";

import type {
  EvaluationTemplate,
  EvaluationTemplateStatus,
  SaveEvaluationTemplateRequest,
} from "@/features/evaluations/types";

import { getPrograms } from "@/features/programs/api";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function EvaluationTemplatesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [includeArchived, setIncludeArchived] =
    useState(false);

  const [editingTemplate, setEditingTemplate] =
    useState<
      EvaluationTemplate | null | undefined
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
    "evaluations.read",
  );

  const canManage = hasPermission(
    currentUser,
    "evaluations.manage",
  );

  const filters = {
    search,
    programId,
    includeArchived,
  };

  const templatesQuery = useQuery({
    queryKey:
      evaluationQueryKeys.templateList(
        filters,
      ),

    queryFn: () =>
      getEvaluationTemplates(filters),

    enabled:
      currentUserQuery.isSuccess && canRead,
  });

  const programsQuery = useQuery({
    queryKey: [
      "programs",
      "evaluation-template-options",
    ],

    queryFn: () => getPrograms(),

    enabled: currentUserQuery.isSuccess,
  });

  const createMutation = useMutation({
    mutationFn: createEvaluationTemplate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      request,
    }: {
      templateId: string;
      request: SaveEvaluationTemplateRequest;
    }) =>
      updateEvaluationTemplate(
        templateId,
        request,
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      templateId,
      status,
    }: {
      templateId: string;
      status: EvaluationTemplateStatus;
    }) =>
      updateEvaluationTemplateStatus(
        templateId,
        status,
      ),
  });

  const formSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  async function refreshTemplates() {
    await queryClient.invalidateQueries({
      queryKey:
        evaluationQueryKeys.templates(),
    });
  }

  async function saveTemplate(
    values: EvaluationTemplateFormValues,
  ) {
    const request: SaveEvaluationTemplateRequest =
      {
        programId: values.programId,
        code: values.code,
        name: values.name,
        description:
          values.description || null,
        versionLabel: values.versionLabel,
        minimumScore: Number(
          values.minimumScore,
        ),
        maximumScore: Number(
          values.maximumScore,
        ),
        passingScore:
          values.passingScore === ""
            ? null
            : Number(values.passingScore),
      };

    setFormError(null);

    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          templateId: editingTemplate.id,
          request,
        });
      } else {
        await createMutation.mutateAsync(
          request,
        );
      }

      await refreshTemplates();
      setEditingTemplate(undefined);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The evaluation template could not be saved.",
        ),
      );
    }
  }

  async function changeStatus(
    template: EvaluationTemplate,
    status: EvaluationTemplateStatus,
  ) {
    setPageError(null);

    try {
      await statusMutation.mutateAsync({
        templateId: template.id,
        status,
      });

      await refreshTemplates();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The template status could not be changed.",
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
            You do not have permission to view evaluation
            templates.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Evaluation templates
                </h1>

                <p className="mt-1 text-slate-600">
                  Configure program-specific scoring models
                  and weighted criteria.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditingTemplate(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Create template
                </button>
              )}
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-3">
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search templates"
                className="rounded-lg border px-3 py-2"
              />

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">
                  All programs
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

            {pageError && (
              <div
                role="alert"
                className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
              >
                {pageError}
              </div>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
              {templatesQuery.isPending && (
                <div className="p-10 text-center text-slate-500">
                  Loading evaluation templates...
                </div>
              )}

              {templatesQuery.isError && (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    templatesQuery.error,
                    "Evaluation templates could not be loaded.",
                  )}
                </div>
              )}

              {templatesQuery.data?.length ===
                0 && (
                <div className="p-10 text-center text-slate-500">
                  No evaluation templates were found.
                </div>
              )}

              {templatesQuery.data &&
                templatesQuery.data.length > 0 && (
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          Template
                        </th>
                        <th className="p-4">
                          Program
                        </th>
                        <th className="p-4">
                          Version
                        </th>
                        <th className="p-4">
                          Score range
                        </th>
                        <th className="p-4">
                          Criteria
                        </th>
                        <th className="p-4">
                          Total weight
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
                      {templatesQuery.data.map(
                        (template) => (
                          <tr key={template.id}>
                            <td className="p-4">
                              <Link
                                href={`/dashboard/evaluation-templates/${template.id}`}
                                className="font-medium text-blue-700 hover:underline"
                              >
                                {template.name}
                              </Link>

                              <p className="text-sm text-slate-500">
                                {template.code}
                              </p>
                            </td>

                            <td className="p-4">
                              {template.programName}
                            </td>

                            <td className="p-4">
                              {template.versionLabel}
                            </td>

                            <td className="p-4">
                              {formatNumber(
                                template.minimumScore,
                              )}
                              {" – "}
                              {formatNumber(
                                template.maximumScore,
                              )}

                              {template.passingScore !==
                                null && (
                                <p className="text-xs text-slate-500">
                                  Pass:{" "}
                                  {formatNumber(
                                    template.passingScore,
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="p-4">
                              {
                                template.criterionCount
                              }
                            </td>

                            <td className="p-4">
                              <WeightBadge
                                weight={
                                  template.totalWeight
                                }
                              />
                            </td>

                            <td className="p-4">
                              <TemplateStatusBadge
                                status={
                                  template.status
                                }
                              />
                            </td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/evaluation-templates/${template.id}`}
                                  className="rounded border px-3 py-1.5 text-sm"
                                >
                                  View
                                </Link>

                                {canManage &&
                                  template.status ===
                                    "DRAFT" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormError(null);
                                        setEditingTemplate(
                                          template,
                                        );
                                      }}
                                      className="rounded border px-3 py-1.5 text-sm"
                                    >
                                      Edit
                                    </button>
                                  )}

                                {canManage && (
                                  <TemplateStatusAction
                                    template={template}
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
          </>
        )}
      </main>

      {editingTemplate !== undefined && (
        <TemplateFormDialog
          template={
            editingTemplate ?? undefined
          }
          programs={programsQuery.data ?? []}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={() => {
            if (!formSubmitting) {
              setEditingTemplate(undefined);
              setFormError(null);
            }
          }}
          onSubmit={saveTemplate}
        />
      )}
    </div>
  );
}

function TemplateStatusAction({
  template,
  onChange,
}: {
  template: EvaluationTemplate;
  onChange: (
    template: EvaluationTemplate,
    status: EvaluationTemplateStatus,
  ) => Promise<void>;
}) {
  const transitions: Record<
    EvaluationTemplateStatus,
    EvaluationTemplateStatus[]
  > = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["ARCHIVED"],
    ARCHIVED: [],
  };

  if (transitions[template.status].length === 0) {
    return null;
  }

  return (
    <select
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) {
          void onChange(
            template,
            event.target
              .value as EvaluationTemplateStatus,
          );

          event.target.value = "";
        }
      }}
      className="rounded border px-2 py-1.5 text-sm"
    >
      <option value="">Status</option>

      {transitions[template.status].map(
        (status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ),
      )}
    </select>
  );
}

function WeightBadge({
  weight,
}: {
  weight: number;
}) {
  const style =
    weight === 100
      ? "bg-green-100 text-green-700"
      : weight > 100
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {weight.toFixed(2)}%
    </span>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
}
