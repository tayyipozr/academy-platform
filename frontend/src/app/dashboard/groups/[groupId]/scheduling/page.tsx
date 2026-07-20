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
    getGroupCurriculumAssignments,
    getGroupCurriculumProgress,
} from "@/features/group-curricula/api";

import {
    groupCurriculumQueryKeys,
} from "@/features/group-curricula/query-keys";

import {
    getGroup,
    getGroupStaffAssignments,
} from "@/features/groups/api";

import {
    groupQueryKeys,
} from "@/features/groups/query-keys";

import {
    createScheduleRule,
    generateSessions,
    getScheduleRules,
    updateScheduleRule,
    updateScheduleRuleStatus,
} from "@/features/scheduling/api";

import {
    schedulingQueryKeys,
} from "@/features/scheduling/query-keys";

import {
    ScheduleRuleDialog,
} from "@/features/scheduling/schedule-rule-dialog";

import type {
    ScheduleRuleFormValues,
} from "@/features/scheduling/schedule-rule-form-schema";

import {
    SessionGenerationDialog,
} from "@/features/scheduling/session-generation-dialog";

import type {
    SessionGenerationFormValues,
} from "@/features/scheduling/session-generation-schema";

import type {
    SaveScheduleRuleRequest,
    ScheduleRule,
    ScheduleRuleStatus,
    SessionGenerationResponse,
} from "@/features/scheduling/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

type DialogState =
    | {
        type: "rule";
        rule?: ScheduleRule;
    }
    | {
        type: "generate";
        rule: ScheduleRule;
    }
    | null;

export default function GroupSchedulePage() {
    const parameters = useParams<{
        groupId: string;
    }>();

    const groupId = parameters.groupId;
    const queryClient = useQueryClient();

    const [includeArchived, setIncludeArchived] =
        useState(false);

    const [dialog, setDialog] =
        useState<DialogState>(null);

    const [dialogError, setDialogError] =
        useState<string | null>(null);

    const [generationResult, setGenerationResult] =
        useState<SessionGenerationResponse | null>(
            null,
        );

    const [pageError, setPageError] =
        useState<string | null>(null);

    const currentUserQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const currentUser = currentUserQuery.data;

    const canRead = hasPermission(
        currentUser,
        "sessions.read",
    );

    const canManage = hasPermission(
        currentUser,
        "sessions.manage",
    );

    const groupQuery = useQuery({
        queryKey: groupQueryKeys.detail(groupId),
        queryFn: () => getGroup(groupId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupId),
    });

    const rulesQuery = useQuery({
        queryKey: schedulingQueryKeys.rules(
            groupId,
            includeArchived,
        ),
        queryFn: () =>
            getScheduleRules(
                groupId,
                includeArchived,
            ),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupId),
    });

    const curriculumAssignmentsQuery = useQuery({
        queryKey:
            groupCurriculumQueryKeys.assignments(
                groupId,
                false,
            ),
        queryFn: () =>
            getGroupCurriculumAssignments(
                groupId,
                false,
            ),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupId),
    });

    const activeCurriculumAssignment =
        curriculumAssignmentsQuery.data?.find(
            (assignment) =>
                assignment.status === "ACTIVE",
        ) ?? null;

    const progressQuery = useQuery({
        queryKey: groupCurriculumQueryKeys.progress(
            groupId,
            activeCurriculumAssignment?.id ?? "",
        ),
        queryFn: () =>
            getGroupCurriculumProgress(
                groupId,
                activeCurriculumAssignment!.id,
            ),
        enabled:
            Boolean(activeCurriculumAssignment) &&
            currentUserQuery.isSuccess &&
            canRead,
    });

    const staffAssignmentsQuery = useQuery({
        queryKey:
            groupQueryKeys.staffAssignments(
                groupId,
                false,
            ),
        queryFn: () =>
            getGroupStaffAssignments(
                groupId,
                false,
            ),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupId),
    });

    const createMutation = useMutation({
        mutationFn: (
            request: SaveScheduleRuleRequest,
        ) => createScheduleRule(groupId, request),
    });

    const updateMutation = useMutation({
        mutationFn: ({
            ruleId,
            request,
        }: {
            ruleId: string;
            request: SaveScheduleRuleRequest;
        }) =>
            updateScheduleRule(
                groupId,
                ruleId,
                request,
            ),
    });

    const statusMutation = useMutation({
        mutationFn: ({
            ruleId,
            status,
        }: {
            ruleId: string;
            status: ScheduleRuleStatus;
        }) =>
            updateScheduleRuleStatus(
                groupId,
                ruleId,
                status,
            ),
    });

    const generationMutation = useMutation({
        mutationFn: ({
            ruleId,
            values,
        }: {
            ruleId: string;
            values: SessionGenerationFormValues;
        }) =>
            generateSessions(groupId, ruleId, {
                dateFrom: values.dateFrom,
                dateTo: values.dateTo,
            }),
    });

    const dialogSubmitting =
        createMutation.isPending ||
        updateMutation.isPending ||
        generationMutation.isPending;

    const group = groupQuery.data;

    const units = progressQuery.data?.units ?? [];

    const staffAssignments =
        staffAssignmentsQuery.data ?? [];

    const groupAllowsScheduling =
        group !== undefined &&
        ["DRAFT", "ACTIVE"].includes(group.status);

    const activeRuleCount = useMemo(
        () =>
            rulesQuery.data?.filter(
                (rule) => rule.status === "ACTIVE",
            ).length ?? 0,
        [rulesQuery.data],
    );

    async function refreshRules() {
        await queryClient.invalidateQueries({
            queryKey: schedulingQueryKeys.all,
        });
    }

    function openCreateDialog() {
        setDialogError(null);
        setGenerationResult(null);
        setDialog({
            type: "rule",
        });
    }

    function openEditDialog(rule: ScheduleRule) {
        setDialogError(null);
        setGenerationResult(null);
        setDialog({
            type: "rule",
            rule,
        });
    }

    function openGenerationDialog(
        rule: ScheduleRule,
    ) {
        setDialogError(null);
        setGenerationResult(null);
        setDialog({
            type: "generate",
            rule,
        });
    }

    function closeDialog() {
        if (dialogSubmitting) {
            return;
        }

        setDialog(null);
        setDialogError(null);
        setGenerationResult(null);
    }

    async function saveRule(
        values: ScheduleRuleFormValues,
    ) {
        if (dialog?.type !== "rule") {
            return;
        }

        const request: SaveScheduleRuleRequest = {
            curriculumUnitId:
                values.curriculumUnitId || null,
            leadStaffId: values.leadStaffId || null,
            title: values.title,
            description: values.description || null,
            dayOfWeek: Number(values.dayOfWeek),
            startTime: values.startTime,
            endTime: values.endTime,
            effectiveFrom: values.effectiveFrom,
            effectiveUntil: values.effectiveUntil,
            timezone: values.timezone,
            location: values.location || null,
        };

        setDialogError(null);

        try {
            if (dialog.rule) {
                await updateMutation.mutateAsync({
                    ruleId: dialog.rule.id,
                    request,
                });
            } else {
                await createMutation.mutateAsync(
                    request,
                );
            }

            await refreshRules();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The schedule rule could not be saved.",
                ),
            );
        }
    }

    async function changeStatus(
        rule: ScheduleRule,
        status: ScheduleRuleStatus,
    ) {
        setPageError(null);

        try {
            await statusMutation.mutateAsync({
                ruleId: rule.id,
                status,
            });

            await refreshRules();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "The schedule-rule status could not be changed.",
                ),
            );
        }
    }

    async function generateRuleSessions(
        values: SessionGenerationFormValues,
    ) {
        if (dialog?.type !== "generate") {
            return;
        }

        setDialogError(null);

        try {
            const result =
                await generationMutation.mutateAsync({
                    ruleId: dialog.rule.id,
                    values,
                });

            setGenerationResult(result);

            await queryClient.invalidateQueries({
                queryKey: schedulingQueryKeys.all,
            });
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "Sessions could not be generated.",
                ),
            );
        }
    }

    if (
        currentUserQuery.isPending ||
        groupQuery.isPending
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
                        You do not have permission to view scheduling.
                    </div>
                </main>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        The group could not be loaded.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href={`/dashboard/groups/${group.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to group
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Schedule rules
                        </h1>

                        <p className="mt-1 text-slate-600">
                            {group.name} · {group.termName}
                        </p>
                    </div>

                    {canManage &&
                        groupAllowsScheduling && (
                            <button
                                type="button"
                                onClick={openCreateDialog}
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                            >
                                Create schedule rule
                            </button>
                        )}
                </header>

                <section className="mt-6 grid gap-4 sm:grid-cols-3">
                    <SummaryCard
                        label="Total rules"
                        value={(
                            rulesQuery.data?.length ?? 0
                        ).toString()}
                    />

                    <SummaryCard
                        label="Active rules"
                        value={activeRuleCount.toString()}
                    />

                    <SummaryCard
                        label="Curriculum units"
                        value={units.length.toString()}
                    />
                </section>

                <label className="mt-6 flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={includeArchived}
                        onChange={(event) =>
                            setIncludeArchived(
                                event.target.checked,
                            )
                        }
                    />

                    Include archived rules
                </label>

                {!activeCurriculumAssignment && (
                    <div className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-800">
                        This group has no active curriculum. Schedule
                        rules may still be created, but they cannot be
                        linked to curriculum units.
                    </div>
                )}

                {staffAssignments.length === 0 && (
                    <div className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-800">
                        This group has no active instructor assignment.
                        Schedule rules may be created without a lead
                        instructor.
                    </div>
                )}

                {pageError && (
                    <div
                        role="alert"
                        className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
                    >
                        {pageError}
                    </div>
                )}

                <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
                    {rulesQuery.isPending && (
                        <div className="p-10 text-center text-slate-500">
                            Loading schedule rules...
                        </div>
                    )}

                    {rulesQuery.isError && (
                        <div className="p-10 text-center text-red-600">
                            {getApiErrorMessage(
                                rulesQuery.error,
                                "The schedule rules could not be loaded.",
                            )}
                        </div>
                    )}

                    {rulesQuery.data?.length === 0 && (
                        <div className="p-10 text-center text-slate-500">
                            No schedule rules were found.
                        </div>
                    )}

                    {rulesQuery.data &&
                        rulesQuery.data.length > 0 && (
                            <table className="w-full min-w-[1100px] text-left">
                                <thead className="border-b bg-slate-50">
                                    <tr>
                                        <th className="p-4">Rule</th>
                                        <th className="p-4">Weekly time</th>
                                        <th className="p-4">Effective period</th>
                                        <th className="p-4">Curriculum unit</th>
                                        <th className="p-4">Instructor</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {rulesQuery.data.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="p-4">
                                                <p className="font-medium">
                                                    {rule.title}
                                                </p>

                                                <p className="text-sm text-slate-500">
                                                    {rule.location || "No location"}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {rule.timezone}
                                                </p>
                                            </td>

                                            <td className="p-4">
                                                <p>
                                                    {dayLabel(rule.dayOfWeek)}
                                                </p>

                                                <p className="text-sm text-slate-500">
                                                    {formatTime(rule.startTime)} –{" "}
                                                    {formatTime(rule.endTime)}
                                                </p>
                                            </td>

                                            <td className="p-4 text-sm">
                                                {rule.effectiveFrom}
                                                <br />
                                                {rule.effectiveUntil}
                                            </td>

                                            <td className="p-4">
                                                {rule.curriculumUnitTitle || "—"}
                                            </td>

                                            <td className="p-4">
                                                {rule.leadStaffName || "—"}
                                            </td>

                                            <td className="p-4">
                                                <ScheduleRuleStatusBadge
                                                    status={rule.status}
                                                />
                                            </td>

                                            <td className="p-4">
                                                {canManage && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {rule.status !==
                                                            "ARCHIVED" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openEditDialog(rule)
                                                                    }
                                                                    className="rounded border px-3 py-1.5 text-sm"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}

                                                        {rule.status ===
                                                            "ACTIVE" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openGenerationDialog(
                                                                            rule,
                                                                        )
                                                                    }
                                                                    className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700"
                                                                >
                                                                    Generate sessions
                                                                </button>
                                                            )}

                                                        <ScheduleRuleStatusAction
                                                            rule={rule}
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
            </main>

            {dialog?.type === "rule" && (
                <ScheduleRuleDialog
                    rule={dialog.rule}
                    units={units}
                    staffAssignments={staffAssignments}
                    minimumDate={group.termStartDate}
                    maximumDate={group.termEndDate}
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={saveRule}
                />
            )}

            {dialog?.type === "generate" && (
                <SessionGenerationDialog
                    rule={dialog.rule}
                    submitting={dialogSubmitting}
                    result={generationResult}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={generateRuleSessions}
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

            <p className="mt-2 text-xl font-semibold">
                {value}
            </p>
        </article>
    );
}

function dayLabel(day: number): string {
    return [
        "",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ][day];
}

function formatTime(time: string): string {
    return time.slice(0, 5);
}

function ScheduleRuleStatusBadge({
    status,
}: {
    status: ScheduleRuleStatus;
}) {
    const styles = {
        ACTIVE: "bg-green-100 text-green-700",
        INACTIVE: "bg-amber-100 text-amber-700",
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

function ScheduleRuleStatusAction({
    rule,
    onChange,
}: {
    rule: ScheduleRule;
    onChange: (
        rule: ScheduleRule,
        status: ScheduleRuleStatus,
    ) => Promise<void>;
}) {
    const transitions: Record<
        ScheduleRuleStatus,
        ScheduleRuleStatus[]
    > = {
        ACTIVE: ["INACTIVE", "ARCHIVED"],
        INACTIVE: ["ACTIVE", "ARCHIVED"],
        ARCHIVED: [],
    };

    if (transitions[rule.status].length === 0) {
        return null;
    }

    return (
        <select
            defaultValue=""
            onChange={(event) => {
                if (event.target.value) {
                    void onChange(
                        rule,
                        event.target
                            .value as ScheduleRuleStatus,
                    );

                    event.target.value = "";
                }
            }}
            className="rounded border px-2 py-1.5 text-sm"
        >
            <option value="">Status</option>

            {transitions[rule.status].map(
                (status) => (
                    <option key={status} value={status}>
                        {status}
                    </option>
                ),
            )}
        </select>
    );
}