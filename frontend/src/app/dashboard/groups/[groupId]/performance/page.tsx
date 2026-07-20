"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    DevelopmentStatusBadge,
} from "@/features/evaluations/development-status-badge";

import {
    getGroupPerformanceSummary,
} from "@/features/evaluations/api";

import {
    evaluationQueryKeys,
} from "@/features/evaluations/query-keys";

import { getGroup } from "@/features/groups/api";
import {
    groupQueryKeys,
} from "@/features/groups/query-keys";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function GroupPerformancePage() {
    const parameters = useParams<{
        groupId: string;
    }>();

    const groupId = parameters.groupId;

    const [dateFrom, setDateFrom] =
        useState("");

    const [dateTo, setDateTo] =
        useState("");

    const currentUserQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const currentUser = currentUserQuery.data;

    const canRead = hasPermission(
        currentUser,
        "evaluations.read",
    );

    const groupQuery = useQuery({
        queryKey: groupQueryKeys.detail(groupId),
        queryFn: () => getGroup(groupId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupId),
    });

    const effectiveDateFrom =
        dateFrom ||
        groupQuery.data?.termStartDate ||
        "";

    const effectiveDateTo =
        dateTo ||
        groupQuery.data?.termEndDate ||
        "";

    const filters = {
        dateFrom: effectiveDateFrom,
        dateTo: effectiveDateTo,
    };

    const performanceQuery = useQuery({
        queryKey:
            evaluationQueryKeys.groupPerformance(
                groupId,
                filters,
            ),

        queryFn: () =>
            getGroupPerformanceSummary(
                groupId,
                {
                    dateFrom:
                        effectiveDateFrom || undefined,

                    dateTo:
                        effectiveDateTo || undefined,
                },
            ),

        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(groupQuery.data),
    });

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
                        You do not have permission to view
                        performance reports.
                    </div>
                </main>
            </div>
        );
    }

    if (!groupQuery.data) {
        return null;
    }

    const group = groupQuery.data;

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href={`/dashboard/groups/${groupId}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to group
                </Link>

                <header className="mt-4">
                    <h1 className="text-2xl font-bold">
                        Group performance
                    </h1>

                    <p className="mt-1 text-slate-600">
                        {group.name} · {group.programName}
                    </p>
                </header>

                <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-2">
                    <FilterField
                        id="performanceDateFrom"
                        label="Date from"
                    >
                        <input
                            id="performanceDateFrom"
                            type="date"
                            min={group.termStartDate}
                            max={group.termEndDate}
                            value={effectiveDateFrom}
                            onChange={(event) =>
                                setDateFrom(event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                        />
                    </FilterField>

                    <FilterField
                        id="performanceDateTo"
                        label="Date to"
                    >
                        <input
                            id="performanceDateTo"
                            type="date"
                            min={group.termStartDate}
                            max={group.termEndDate}
                            value={effectiveDateTo}
                            onChange={(event) =>
                                setDateTo(event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                        />
                    </FilterField>
                </section>

                {performanceQuery.isPending && (
                    <div className="mt-6 rounded-xl bg-white p-8 text-center">
                        Loading performance report...
                    </div>
                )}

                {performanceQuery.isError && (
                    <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            performanceQuery.error,
                            "The performance report could not be loaded.",
                        )}
                    </div>
                )}

                {performanceQuery.data && (
                    <>
                        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <MetricCard
                                label="Students evaluated"
                                value={
                                    performanceQuery.data.studentCount
                                }
                            />

                            <MetricCard
                                label="Published evaluations"
                                value={
                                    performanceQuery.data
                                        .publishedEvaluationCount
                                }
                            />

                            <MetricCard
                                label="Average score"
                                value={
                                    performanceQuery.data
                                        .averageNormalizedScore === null
                                        ? "—"
                                        : `${performanceQuery.data.averageNormalizedScore.toFixed(
                                            2,
                                        )}%`
                                }
                            />

                            <MetricCard
                                label="Passing rate"
                                value={`${performanceQuery.data.passingRate.toFixed(
                                    2,
                                )}%`}
                            />
                        </section>

                        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                            <header className="border-b p-5">
                                <h2 className="text-lg font-semibold">
                                    Student comparison
                                </h2>

                                <p className="mt-1 text-sm text-slate-600">
                                    Published performance and development
                                    status per student.
                                </p>
                            </header>

                            {performanceQuery.data.students.length ===
                                0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No published evaluation data exists for
                                    this group and period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1050px] text-left">
                                        <thead className="border-b bg-slate-50">
                                            <tr>
                                                <th className="p-4">
                                                    Student
                                                </th>
                                                <th className="p-4">
                                                    Evaluations
                                                </th>
                                                <th className="p-4">
                                                    Average
                                                </th>
                                                <th className="p-4">
                                                    Latest
                                                </th>
                                                <th className="p-4">
                                                    Trend
                                                </th>
                                                <th className="p-4">
                                                    Development
                                                </th>
                                                <th className="p-4">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y">
                                            {performanceQuery.data.students.map(
                                                (student) => (
                                                    <tr
                                                        key={student.studentId}
                                                    >
                                                        <td className="p-4">
                                                            <p className="font-medium">
                                                                {student.firstName}{" "}
                                                                {student.lastName}
                                                            </p>

                                                            <p className="text-sm text-slate-500">
                                                                {
                                                                    student.studentNumber
                                                                }
                                                            </p>
                                                        </td>

                                                        <td className="p-4">
                                                            {
                                                                student.publishedEvaluationCount
                                                            }
                                                        </td>

                                                        <td className="p-4">
                                                            {formatPercentage(
                                                                student.averageNormalizedScore,
                                                            )}
                                                        </td>

                                                        <td className="p-4">
                                                            {formatPercentage(
                                                                student.latestNormalizedScore,
                                                            )}
                                                        </td>

                                                        <td className="p-4">
                                                            <TrendValue
                                                                value={
                                                                    student.scoreTrend
                                                                }
                                                            />
                                                        </td>

                                                        <td className="p-4">
                                                            <DevelopmentStatusBadge
                                                                status={
                                                                    student.developmentStatus
                                                                }
                                                            />
                                                        </td>

                                                        <td className="p-4">
                                                            <Link
                                                                href={`/dashboard/students/${student.studentId}`}
                                                                className="rounded border px-3 py-1.5 text-sm"
                                                            >
                                                                View student
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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

function MetricCard({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-semibold">
                {value}
            </p>
        </article>
    );
}

function TrendValue({
    value,
}: {
    value: number | null;
}) {
    if (value === null) {
        return <>—</>;
    }

    return (
        <span
            className={
                value > 0
                    ? "font-medium text-green-700"
                    : value < 0
                        ? "font-medium text-red-700"
                        : "text-slate-600"
            }
        >
            {value > 0 ? "+" : ""}
            {value.toFixed(2)}
        </span>
    );
}

function formatPercentage(
    value: number | null,
): string {
    return value === null
        ? "—"
        : `${value.toFixed(2)}%`;
}