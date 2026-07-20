"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    createCurriculumUnit,
    createLearningOutcome,
    getCurriculum,
    getCurriculumUnits,
    getLearningOutcomes,
    updateCurriculumStatus,
    updateCurriculumUnit,
    updateLearningOutcome,
} from "@/features/curricula/api";

import { OutcomeFormDialog } from "@/features/curricula/outcome-form-dialog";
import type { OutcomeFormValues } from "@/features/curricula/outcome-form-schema";

import { curriculumQueryKeys } from "@/features/curricula/query-keys";

import { UnitFormDialog } from "@/features/curricula/unit-form-dialog";
import type { UnitFormValues } from "@/features/curricula/unit-form-schema";

import type {
    CurriculumUnit,
    LearningOutcome,
} from "@/features/curricula/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

type DialogState =
    | {
        type: "unit";
        unit?: CurriculumUnit;
    }
    | {
        type: "outcome";
        unit: CurriculumUnit;
        outcome?: LearningOutcome;
    }
    | null;

export default function CurriculumDetailPage() {
    const parameters = useParams<{
        curriculumId: string;
    }>();

    const curriculumId =
        parameters.curriculumId;

    const queryClient = useQueryClient();

    const [selectedUnitId, setSelectedUnitId] =
        useState<string | null>(null);

    const [dialog, setDialog] =
        useState<DialogState>(null);

    const [dialogError, setDialogError] =
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
        "curricula.read",
    );

    const canManage = hasPermission(
        currentUser,
        "curricula.manage",
    );

    const curriculumQuery = useQuery({
        queryKey:
            curriculumQueryKeys.detail(curriculumId),
        queryFn: () =>
            getCurriculum(curriculumId),
        enabled:
            currentUserQuery.isSuccess && canRead,
    });

    const unitsQuery = useQuery({
        queryKey:
            curriculumQueryKeys.units(curriculumId),
        queryFn: () =>
            getCurriculumUnits(curriculumId),
        enabled:
            currentUserQuery.isSuccess && canRead,
    });

    const selectedUnit = useMemo(
        () =>
            unitsQuery.data?.find(
                (unit) => unit.id === selectedUnitId,
            ) ?? null,
        [selectedUnitId, unitsQuery.data],
    );

    const outcomesQuery = useQuery({
        queryKey:
            curriculumQueryKeys.outcomes(
                curriculumId,
                selectedUnitId ?? "",
            ),
        queryFn: () =>
            getLearningOutcomes(
                curriculumId,
                selectedUnitId!,
            ),
        enabled:
            Boolean(selectedUnitId) &&
            currentUserQuery.isSuccess &&
            canRead,
    });

    const createUnitMutation = useMutation({
        mutationFn: (
            request: Parameters<
                typeof createCurriculumUnit
            >[1],
        ) =>
            createCurriculumUnit(
                curriculumId,
                request,
            ),
    });

    const updateUnitMutation = useMutation({
        mutationFn: ({
            unitId,
            request,
        }: {
            unitId: string;
            request: Parameters<
                typeof updateCurriculumUnit
            >[2];
        }) =>
            updateCurriculumUnit(
                curriculumId,
                unitId,
                request,
            ),
    });

    const createOutcomeMutation = useMutation({
        mutationFn: ({
            unitId,
            request,
        }: {
            unitId: string;
            request: Parameters<
                typeof createLearningOutcome
            >[2];
        }) =>
            createLearningOutcome(
                curriculumId,
                unitId,
                request,
            ),
    });

    const updateOutcomeMutation = useMutation({
        mutationFn: ({
            unitId,
            outcomeId,
            request,
        }: {
            unitId: string;
            outcomeId: string;
            request: Parameters<
                typeof updateLearningOutcome
            >[3];
        }) =>
            updateLearningOutcome(
                curriculumId,
                unitId,
                outcomeId,
                request,
            ),
    });

    const activateMutation = useMutation({
        mutationFn: () =>
            updateCurriculumStatus(
                curriculumId,
                "ACTIVE",
            ),
    });

    const dialogSubmitting =
        createUnitMutation.isPending ||
        updateUnitMutation.isPending ||
        createOutcomeMutation.isPending ||
        updateOutcomeMutation.isPending;

    async function refreshStructure() {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:
                    curriculumQueryKeys.detail(
                        curriculumId,
                    ),
            }),
            queryClient.invalidateQueries({
                queryKey:
                    curriculumQueryKeys.units(
                        curriculumId,
                    ),
            }),
            queryClient.invalidateQueries({
                queryKey:
                    curriculumQueryKeys.all,
            }),
        ]);

        if (selectedUnitId) {
            await queryClient.invalidateQueries({
                queryKey:
                    curriculumQueryKeys.outcomes(
                        curriculumId,
                        selectedUnitId,
                    ),
            });
        }
    }

    async function saveUnit(
        values: UnitFormValues,
    ) {
        if (dialog?.type !== "unit") {
            return;
        }

        const request = {
            parentUnitId:
                values.parentUnitId || null,
            code: values.code,
            title: values.title,
            description: values.description || null,
            sequenceNumber: Number(
                values.sequenceNumber,
            ),
            estimatedSessions:
                values.estimatedSessions === ""
                    ? null
                    : Number(values.estimatedSessions),
        };

        setDialogError(null);

        try {
            if (dialog.unit) {
                await updateUnitMutation.mutateAsync({
                    unitId: dialog.unit.id,
                    request,
                });
            } else {
                await createUnitMutation.mutateAsync(
                    request,
                );
            }

            await refreshStructure();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The curriculum unit could not be saved.",
                ),
            );
        }
    }

    async function saveOutcome(
        values: OutcomeFormValues,
    ) {
        if (dialog?.type !== "outcome") {
            return;
        }

        const request = {
            code: values.code,
            title: values.title,
            description: values.description || null,
            sequenceNumber: Number(
                values.sequenceNumber,
            ),
        };

        setDialogError(null);

        try {
            if (dialog.outcome) {
                await updateOutcomeMutation.mutateAsync({
                    unitId: dialog.unit.id,
                    outcomeId: dialog.outcome.id,
                    request,
                });
            } else {
                await createOutcomeMutation.mutateAsync({
                    unitId: dialog.unit.id,
                    request,
                });
            }

            await refreshStructure();

            await queryClient.invalidateQueries({
                queryKey:
                    curriculumQueryKeys.outcomes(
                        curriculumId,
                        dialog.unit.id,
                    ),
            });

            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The learning outcome could not be saved.",
                ),
            );
        }
    }

    async function activateCurriculum() {
        const confirmed = window.confirm(
            "Activate this curriculum? Its structure can no longer be edited.",
        );

        if (!confirmed) {
            return;
        }

        setPageError(null);

        try {
            await activateMutation.mutateAsync();
            await refreshStructure();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "The curriculum could not be activated.",
                ),
            );
        }
    }

    if (
        currentUserQuery.isPending ||
        curriculumQuery.isPending
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
                        You do not have permission to view this
                        curriculum.
                    </div>
                </main>
            </div>
        );
    }

    if (
        curriculumQuery.isError ||
        !curriculumQuery.data
    ) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            curriculumQuery.error,
                            "The curriculum could not be loaded.",
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const curriculum = curriculumQuery.data;
    const units = unitsQuery.data ?? [];
    const outcomes = outcomesQuery.data ?? [];

    const structureEditable =
        canManage && curriculum.status === "DRAFT";

    function openCreateUnitDialog() {
        setDialogError(null);
        setDialog({
            type: "unit",
        });
    }

    function openEditUnitDialog(
        unit: CurriculumUnit,
    ) {
        setDialogError(null);
        setDialog({
            type: "unit",
            unit,
        });
    }

    function openCreateOutcomeDialog(
        unit: CurriculumUnit,
    ) {
        setSelectedUnitId(unit.id);
        setDialogError(null);
        setDialog({
            type: "outcome",
            unit,
        });
    }

    function openEditOutcomeDialog(
        unit: CurriculumUnit,
        outcome: LearningOutcome,
    ) {
        setSelectedUnitId(unit.id);
        setDialogError(null);
        setDialog({
            type: "outcome",
            unit,
            outcome,
        });
    }

    function closeDialog() {
        if (dialogSubmitting) {
            return;
        }

        setDialog(null);
        setDialogError(null);
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href="/dashboard/curricula"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to curricula
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {curriculum.name}
                            </h1>

                            <CurriculumStatusBadge
                                status={curriculum.status}
                            />
                        </div>

                        <p className="mt-1 text-slate-600">
                            {curriculum.code} · Version{" "}
                            {curriculum.versionLabel}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Program: {curriculum.programName}
                        </p>
                    </div>

                    {canManage &&
                        curriculum.status === "DRAFT" && (
                            <button
                                type="button"
                                disabled={activateMutation.isPending}
                                onClick={activateCurriculum}
                                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {activateMutation.isPending
                                    ? "Activating..."
                                    : "Activate curriculum"}
                            </button>
                        )}
                </header>

                {curriculum.description && (
                    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Description
                        </h2>

                        <p className="mt-3 whitespace-pre-wrap text-slate-700">
                            {curriculum.description}
                        </p>
                    </section>
                )}

                <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                        label="Program"
                        value={curriculum.programName}
                    />

                    <SummaryCard
                        label="Units"
                        value={curriculum.unitCount.toString()}
                    />

                    <SummaryCard
                        label="Learning outcomes"
                        value={curriculum.outcomeCount.toString()}
                    />

                    <SummaryCard
                        label="Estimated sessions"
                        value={curriculum.estimatedSessionCount.toString()}
                    />
                </section>

                {curriculum.status !== "DRAFT" && (
                    <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                        This curriculum is {curriculum.status.toLowerCase()}.
                        Its units and learning outcomes are read-only.
                    </div>
                )}

                {pageError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
                    >
                        {pageError}
                    </div>
                )}

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Curriculum units
                                </h2>

                                <p className="mt-1 text-sm text-slate-600">
                                    Define the ordered instructional structure.
                                </p>
                            </div>

                            {structureEditable && (
                                <button
                                    type="button"
                                    onClick={openCreateUnitDialog}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                                >
                                    Create unit
                                </button>
                            )}
                        </header>

                        {unitsQuery.isPending && (
                            <div className="p-8 text-center text-slate-500">
                                Loading curriculum units...
                            </div>
                        )}

                        {unitsQuery.isError && (
                            <div className="p-8 text-center text-red-600">
                                {getApiErrorMessage(
                                    unitsQuery.error,
                                    "The curriculum units could not be loaded.",
                                )}
                            </div>
                        )}

                        {!unitsQuery.isPending &&
                            !unitsQuery.isError &&
                            units.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    This curriculum does not contain any units
                                    yet.
                                </div>
                            )}

                        {units.length > 0 && (
                            <div className="divide-y divide-slate-200">
                                {units.map((unit) => {
                                    const selected =
                                        selectedUnitId === unit.id;

                                    return (
                                        <article
                                            key={unit.id}
                                            className={`p-5 ${selected
                                                    ? "bg-blue-50"
                                                    : "hover:bg-slate-50"
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedUnitId(unit.id)
                                                }
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                                                {unit.sequenceNumber}
                                                            </span>

                                                            <h3 className="font-semibold text-slate-900">
                                                                {unit.title}
                                                            </h3>
                                                        </div>

                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {unit.code}
                                                        </p>

                                                        {unit.parentUnitTitle && (
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Parent: {unit.parentUnitTitle}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <span className="text-sm text-slate-500">
                                                        {unit.outcomeCount} outcomes
                                                    </span>
                                                </div>

                                                {unit.description && (
                                                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                                        {unit.description}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                                                    <span>
                                                        Estimated sessions:{" "}
                                                        {unit.estimatedSessions ?? "—"}
                                                    </span>
                                                </div>
                                            </button>

                                            {structureEditable && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditUnitDialog(unit)
                                                        }
                                                        className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                                                    >
                                                        Edit unit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openCreateOutcomeDialog(unit)
                                                        }
                                                        className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700"
                                                    >
                                                        Add outcome
                                                    </button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <header className="border-b border-slate-200 p-6">
                            <h2 className="text-lg font-semibold">
                                Learning outcomes
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                {selectedUnit
                                    ? `Outcomes for ${selectedUnit.title}`
                                    : "Select a curriculum unit to view its outcomes."}
                            </p>
                        </header>

                        {!selectedUnit && (
                            <div className="p-8 text-center text-slate-500">
                                Select a curriculum unit from the left panel.
                            </div>
                        )}

                        {selectedUnit &&
                            outcomesQuery.isPending && (
                                <div className="p-8 text-center text-slate-500">
                                    Loading learning outcomes...
                                </div>
                            )}

                        {selectedUnit &&
                            outcomesQuery.isError && (
                                <div className="p-8 text-center text-red-600">
                                    {getApiErrorMessage(
                                        outcomesQuery.error,
                                        "The learning outcomes could not be loaded.",
                                    )}
                                </div>
                            )}

                        {selectedUnit &&
                            !outcomesQuery.isPending &&
                            !outcomesQuery.isError &&
                            outcomes.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    This unit does not contain any learning
                                    outcomes yet.

                                    {structureEditable && (
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openCreateOutcomeDialog(
                                                        selectedUnit,
                                                    )
                                                }
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                                            >
                                                Create learning outcome
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        {selectedUnit &&
                            outcomes.length > 0 && (
                                <div className="divide-y divide-slate-200">
                                    {outcomes.map((outcome) => (
                                        <article
                                            key={outcome.id}
                                            className="p-5"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">
                                                            {outcome.sequenceNumber}
                                                        </span>

                                                        <h3 className="font-medium text-slate-900">
                                                            {outcome.title}
                                                        </h3>
                                                    </div>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {outcome.code}
                                                    </p>
                                                </div>

                                                {structureEditable && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditOutcomeDialog(
                                                                selectedUnit,
                                                                outcome,
                                                            )
                                                        }
                                                        className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>

                                            {outcome.description && (
                                                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                                    {outcome.description}
                                                </p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                    </section>
                </div>
            </main>

            {dialog?.type === "unit" && (
                <UnitFormDialog
                    unit={dialog.unit}
                    units={units}
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={saveUnit}
                />
            )}

            {dialog?.type === "outcome" && (
                <OutcomeFormDialog
                    outcome={dialog.outcome}
                    currentOutcomeCount={
                        dialog.unit.id === selectedUnitId
                            ? outcomes.length
                            : dialog.unit.outcomeCount
                    }
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={saveOutcome}
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-900">
                {value}
            </p>
        </article>
    );
}

function CurriculumStatusBadge({
    status,
}: {
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}) {
    const styles = {
        DRAFT: "bg-amber-100 text-amber-700",
        ACTIVE: "bg-green-100 text-green-700",
        ARCHIVED: "bg-slate-200 text-slate-700",
    } as const;

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
        >
            {status}
        </span>
    );
}