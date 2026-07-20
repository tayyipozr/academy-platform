"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    getGroupAttendanceSummary,
} from "@/features/attendance/api";

import {
    AttendancePercentageCard,
} from "@/features/attendance/attendance-percentage-card";

import {
    AttendanceSummaryCards,
} from "@/features/attendance/attendance-summary-cards";

import {
    attendanceQueryKeys,
} from "@/features/attendance/query-keys";

import { getGroup } from "@/features/groups/api";
import {
    groupQueryKeys,
} from "@/features/groups/query-keys";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function GroupAttendancePage() {
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
        "attendance.read",
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

    const summaryQuery = useQuery({
        queryKey:
            attendanceQueryKeys.groupSummary(
                groupId,
                filters,
            ),

        queryFn: () =>
            getGroupAttendanceSummary(
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
                        You do not have permission to view attendance
                        reports.
                    </div>
                </main>
            </div>
        );
    }

    if (!groupQuery.data) {
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
                        Group attendance
                    </h1>

                    <p className="mt-1 text-slate-600">
                        {group.name} · {group.termName}
                    </p>
                </header>

                <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-2">
                    <FilterField
                        id="groupAttendanceFrom"
                        label="Date from"
                    >
                        <input
                            id="groupAttendanceFrom"
                            type="date"
                            value={effectiveDateFrom}
                            min={group.termStartDate}
                            max={group.termEndDate}
                            onChange={(event) =>
                                setDateFrom(event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                        />
                    </FilterField>

                    <FilterField
                        id="groupAttendanceTo"
                        label="Date to"
                    >
                        <input
                            id="groupAttendanceTo"
                            type="date"
                            value={effectiveDateTo}
                            min={group.termStartDate}
                            max={group.termEndDate}
                            onChange={(event) =>
                                setDateTo(event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                        />
                    </FilterField>
                </section>

                {summaryQuery.isPending && (
                    <div className="mt-6 rounded-xl bg-white p-8 text-center">
                        Loading attendance summary...
                    </div>
                )}

                {summaryQuery.isError && (
                    <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            summaryQuery.error,
                            "Attendance summary could not be loaded.",
                        )}
                    </div>
                )}

                {summaryQuery.data && (
                    <>
                        <div className="mt-6 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                            <AttendancePercentageCard
                                percentage={
                                    summaryQuery.data
                                        .attendancePercentage
                                }
                            />

                            <AttendanceSummaryCards
                                total={
                                    summaryQuery.data
                                        .finalizedSessionCount
                                }
                                present={
                                    summaryQuery.data.presentCount
                                }
                                late={
                                    summaryQuery.data.lateCount
                                }
                                absent={
                                    summaryQuery.data.absentCount
                                }
                                excused={
                                    summaryQuery.data.excusedCount
                                }
                            />
                        </div>

                        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                            <header className="border-b p-5">
                                <h2 className="text-lg font-semibold">
                                    Student comparison
                                </h2>

                                <p className="mt-1 text-sm text-slate-600">
                                    Attendance percentage per student.
                                </p>
                            </header>

                            {summaryQuery.data.students.length ===
                                0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No finalized attendance data exists for
                                    this group and period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1000px] text-left">
                                        <thead className="border-b bg-slate-50">
                                            <tr>
                                                <th className="p-4">
                                                    Student
                                                </th>
                                                <th className="p-4">
                                                    Sessions
                                                </th>
                                                <th className="p-4">
                                                    Present
                                                </th>
                                                <th className="p-4">
                                                    Late
                                                </th>
                                                <th className="p-4">
                                                    Absent
                                                </th>
                                                <th className="p-4">
                                                    Excused
                                                </th>
                                                <th className="p-4">
                                                    Percentage
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y">
                                            {summaryQuery.data.students.map(
                                                (student) => (
                                                    <tr
                                                        key={student.studentId}
                                                    >
                                                        <td className="p-4">
                                                            <Link
                                                                href={`/dashboard/students/${student.studentId}`}
                                                                className="font-medium text-blue-700 hover:underline"
                                                            >
                                                                {student.firstName}{" "}
                                                                {student.lastName}
                                                            </Link>

                                                            <p className="text-sm text-slate-500">
                                                                {
                                                                    student.studentNumber
                                                                }
                                                            </p>
                                                        </td>

                                                        <td className="p-4">
                                                            {
                                                                student.totalFinalizedSessions
                                                            }
                                                        </td>

                                                        <td className="p-4 text-green-700">
                                                            {student.presentCount}
                                                        </td>

                                                        <td className="p-4 text-amber-700">
                                                            {student.lateCount}
                                                        </td>

                                                        <td className="p-4 text-red-700">
                                                            {student.absentCount}
                                                        </td>

                                                        <td className="p-4 text-blue-700">
                                                            {student.excusedCount}
                                                        </td>

                                                        <td className="p-4">
                                                            <AttendancePercentageBadge
                                                                percentage={
                                                                    student.attendancePercentage
                                                                }
                                                            />
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

function AttendancePercentageBadge({
    percentage,
}: {
    percentage: number;
}) {
    const style =
        percentage >= 90
            ? "bg-green-100 text-green-700"
            : percentage >= 75
                ? "bg-blue-100 text-blue-700"
                : percentage >= 60
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700";

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
        >
            {percentage.toFixed(2)}%
        </span>
    );
}