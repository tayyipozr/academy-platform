"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    createEvaluationCriterion,
    getEvaluationCriteria,
    getEvaluationTemplate,
    updateEvaluationCriterion,
    updateEvaluationTemplateStatus,
} from "@/features/evaluations/api";

import {
    CriterionFormDialog,
} from "@/features/evaluations/criterion-form-dialog";

import type {
    EvaluationCriterionFormValues,
} from "@/features/evaluations/criterion-form-schema";

import {
    evaluationQueryKeys,
} from "@/features/evaluations/query-keys";

import {
    TemplateStatusBadge,
} from "@/features/evaluations/template-status-badge";

import type {
    EvaluationCriterion,
    SaveEvaluationCriterionRequest,
} from "@/features/evaluations/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { formatMessage, useLocalization } from "@/features/localization/use-localization";

export default function EvaluationTemplateDetailPage() {
    const parameters = useParams<{
        templateId: string;
    }>();

    const templateId = parameters.templateId;
    const queryClient = useQueryClient();

    const [editingCriterion, setEditingCriterion] =
        useState<
            EvaluationCriterion | null | undefined
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

    const templateQuery = useQuery({
        queryKey:
            evaluationQueryKeys.templateDetail(
                templateId,
            ),

        queryFn: () =>
            getEvaluationTemplate(templateId),

        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(templateId),
    });

    const criteriaQuery = useQuery({
        queryKey:
            evaluationQueryKeys.criteria(
                templateId,
            ),

        queryFn: () =>
            getEvaluationCriteria(templateId),

        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(templateId),
    });

    const createMutation = useMutation({
        mutationFn: (
            request: SaveEvaluationCriterionRequest,
        ) =>
            createEvaluationCriterion(
                templateId,
                request,
            ),
    });

    const updateMutation = useMutation({
        mutationFn: ({
            criterionId,
            request,
        }: {
            criterionId: string;
            request: SaveEvaluationCriterionRequest;
        }) =>
            updateEvaluationCriterion(
                templateId,
                criterionId,
                request,
            ),
    });

    const activateMutation = useMutation({
        mutationFn: () =>
            updateEvaluationTemplateStatus(
                templateId,
                "ACTIVE",
            ),
    });

    const formSubmitting =
        createMutation.isPending ||
        updateMutation.isPending;

    const { dictionary, terminology, statusLabel, formatDate } =
        useLocalization();

    const t = dictionary.pages.evaluationTemplateDetail;
    const common = dictionary.common;

    async function refreshTemplate() {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:
                    evaluationQueryKeys.templateDetail(
                        templateId,
                    ),
            }),

            queryClient.invalidateQueries({
                queryKey:
                    evaluationQueryKeys.criteria(
                        templateId,
                    ),
            }),

            queryClient.invalidateQueries({
                queryKey:
                    evaluationQueryKeys.templates(),
            }),
        ]);
    }

    async function saveCriterion(
        values: EvaluationCriterionFormValues,
    ) {
        const request: SaveEvaluationCriterionRequest =
        {
            code: values.code,
            name: values.name,
            description:
                values.description || null,
            weightPercentage: Number(
                values.weightPercentage,
            ),
            sequenceNumber: Number(
                values.sequenceNumber,
            ),
        };

        setFormError(null);

        try {
            if (editingCriterion) {
                await updateMutation.mutateAsync({
                    criterionId:
                        editingCriterion.id,
                    request,
                });
            } else {
                await createMutation.mutateAsync(
                    request,
                );
            }

            await refreshTemplate();
            setEditingCriterion(undefined);
        } catch (error) {
            setFormError(
                getApiErrorMessage(
                    error,
                    "The evaluation criterion could not be saved.",
                ),
            );
        }
    }

    async function activateTemplate() {
        const confirmed = window.confirm(
            "Activate this evaluation template? Its criteria and scoring range will become read-only.",
        );

        if (!confirmed) {
            return;
        }

        setPageError(null);

        try {
            await activateMutation.mutateAsync();
            await refreshTemplate();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "The evaluation template could not be activated.",
                ),
            );
        }
    }

    if (
        currentUserQuery.isPending ||
        templateQuery.isPending
    ) {
        return <main className="p-8">Loading...</main>;
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
                        You do not have permission to view evaluation
                        templates.
                    </div>
                </main>
            </div>
        );
    }

    if (
        templateQuery.isError ||
        !templateQuery.data
    ) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            templateQuery.error,
                            "The evaluation template could not be loaded.",
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const template = templateQuery.data;
    const criteria = criteriaQuery.data ?? [];

    const structureEditable =
        canManage &&
        template.status === "DRAFT";

    const remainingWeight = Math.max(
        100 - template.totalWeight,
        0,
    );

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href="/dashboard/evaluation-templates"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    {t.backToTemplates}
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold">
                                {template.name}
                            </h1>

                            <TemplateStatusBadge
                                status={template.status}
                            />
                        </div>

                        <p className="mt-1 text-slate-600">
                            {template.code} · Version{" "}
                            {template.versionLabel}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {t.program}: {template.programName}
                        </p>
                    </div>

                    {structureEditable && (
                        <button
                            type="button"
                            disabled={
                                activateMutation.isPending
                            }
                            onClick={activateTemplate}
                            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                        >
                            {activateMutation.isPending
                                ? "Activating..."
                                : "Activate template"}
                        </button>
                    )}
                </header>

                {pageError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
                    >
                        {pageError}
                    </div>
                )}

                {template.status !== "DRAFT" && (
                    <div className="mt-6 rounded-lg bg-blue-50 p-4 text-blue-800">
                        {formatMessage(
                            t.readOnlyMessage,
                            {
                                status: statusLabel(template.status).toLowerCase()
                            },
                        )}
                    </div>
                )}

                <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <SummaryCard
                        label={common.fields.minimumScore}
                        value={formatNumber(
                            template.minimumScore,
                        )}
                    />

                    <SummaryCard
                        label={common.fields.maximumScore}
                        value={formatNumber(
                            template.maximumScore,
                        )}
                    />

                    <SummaryCard
                        label={common.fields.passingScore}
                        value={
                            template.passingScore === null
                                ? "Not defined"
                                : formatNumber(
                                    template.passingScore,
                                )
                        }
                    />

                    <SummaryCard
                        label={t.criteria}
                        value={template.criterionCount.toString()}
                    />

                    <SummaryCard
                        label={dictionary.pages.evaluationTemplates.totalWeight}
                        value={`${template.totalWeight.toFixed(2)}%`}
                        highlight={
                            template.totalWeight === 100
                        }
                    />
                </section>

                {template.description && (
                    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            {common.fields.description}
                        </h2>

                        <p className="mt-3 whitespace-pre-wrap text-slate-700">
                            {template.description}
                        </p>
                    </section>
                )}

                <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
                        <div>
                            <h2 className="text-lg font-semibold">
                                {t.criteria}
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                {t.criteriaDescription}
                            </p>

                            <p className="mt-2 text-sm">
                                {t.remainingWeight}:{" "}
                                <strong
                                    className={
                                        remainingWeight === 0
                                            ? "text-green-700"
                                            : "text-amber-700"
                                    }
                                >
                                    {remainingWeight.toFixed(2)}%
                                </strong>
                            </p>
                        </div>

                        {structureEditable &&
                            remainingWeight > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormError(null);
                                        setEditingCriterion(null);
                                    }}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                                >
                                    Create criterion
                                </button>
                            )}
                    </header>

                    {criteriaQuery.isPending && (
                        <div className="p-8 text-center text-slate-500">
                            {t.loadingCriteria}
                        </div>
                    )}

                    {criteriaQuery.isError && (
                        <div className="p-8 text-center text-red-600">
                            {getApiErrorMessage(
                                criteriaQuery.error,
                                t.criteriaLoadError,
                            )}
                        </div>
                    )}

                    {!criteriaQuery.isPending &&
                        !criteriaQuery.isError &&
                        criteria.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                {t.noCriteria}
                            </div>
                        )}

                    {criteria.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left">
                                <thead className="border-b bg-slate-50">
                                    <tr>
                                        <th className="p-4">
                                            {t.sequence}
                                        </th>
                                        <th className="p-4">
                                            {t.criterion}
                                        </th>
                                        <th className="p-4">
                                            {t.descriptionTitle}
                                        </th>
                                        <th className="p-4">
                                            {common.fields.weight}
                                        </th>
                                        <th className="p-4">
                                            {common.fields.actions}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {criteria.map((criterion) => (
                                        <tr key={criterion.id}>
                                            <td className="p-4">
                                                {criterion.sequenceNumber}
                                            </td>

                                            <td className="p-4">
                                                <p className="font-medium">
                                                    {criterion.name}
                                                </p>

                                                <p className="text-sm text-slate-500">
                                                    {criterion.code}
                                                </p>
                                            </td>

                                            <td className="max-w-lg whitespace-pre-wrap p-4 text-sm text-slate-600">
                                                {criterion.description ||
                                                    "—"}
                                            </td>

                                            <td className="p-4">
                                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                    {criterion.weightPercentage.toFixed(
                                                        2,
                                                    )}
                                                    %
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                {structureEditable && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormError(null);
                                                            setEditingCriterion(
                                                                criterion,
                                                            );
                                                        }}
                                                        className="rounded border px-3 py-1.5 text-sm"
                                                    >
                                                        {common.actions.edit}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot className="border-t bg-slate-50">
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="p-4 text-right font-semibold"
                                        >
                                            Total
                                        </td>

                                        <td className="p-4 font-semibold">
                                            {template.totalWeight.toFixed(
                                                2,
                                            )}
                                            %
                                        </td>

                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            {editingCriterion !== undefined && (
                <CriterionFormDialog
                    criterion={
                        editingCriterion ?? undefined
                    }
                    criterionCount={criteria.length}
                    currentTotalWeight={
                        template.totalWeight
                    }
                    submitting={formSubmitting}
                    errorMessage={formError}
                    onClose={() => {
                        if (!formSubmitting) {
                            setEditingCriterion(undefined);
                            setFormError(null);
                        }
                    }}
                    onSubmit={saveCriterion}
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <article className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p
                className={`mt-2 text-xl font-semibold ${highlight
                    ? "text-green-700"
                    : "text-slate-900"
                    }`}
            >
                {value}
            </p>
        </article>
    );
}

function formatNumber(value: number): string {
    return Number.isInteger(value)
        ? value.toString()
        : value.toFixed(2);
}