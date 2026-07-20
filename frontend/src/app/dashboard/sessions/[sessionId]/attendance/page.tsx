"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    useParams,
    useRouter,
} from "next/navigation";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    finalizeAttendance,
    getAttendanceCorrections,
    getSessionAttendance,
    initializeAttendance,
    openAttendanceCorrection,
    saveAttendance,
} from "@/features/attendance/api";

import {
    toEditableAttendance,
    toSaveAttendanceRecord,
    type EditableAttendanceRecord,
} from "@/features/attendance/attendance-editor";

import { AttendanceStatusBadge } from "@/features/attendance/attendance-status-badge";
import { CorrectionHistory } from "@/features/attendance/correction-history";
import { OpenCorrectionDialog } from "@/features/attendance/open-correction-dialog";
import { attendanceQueryKeys } from "@/features/attendance/query-keys";

import type {
    AttendanceStatus,
} from "@/features/attendance/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

const statuses: AttendanceStatus[] = [
    "NOT_RECORDED",
    "PRESENT",
    "ABSENT",
    "LATE",
    "EXCUSED",
];

export default function SessionAttendancePage() {
    const parameters = useParams<{
        sessionId: string;
    }>();

    const sessionId = parameters.sessionId;

    const router = useRouter();
    const queryClient = useQueryClient();

    const [editableRecords, setEditableRecords] =
        useState<EditableAttendanceRecord[]>([]);

    const [editorInitialized, setEditorInitialized] =
        useState(false);

    const [pageError, setPageError] =
        useState<string | null>(null);

    const [correctionDialogOpen, setCorrectionDialogOpen] =
        useState(false);

    const [correctionError, setCorrectionError] =
        useState<string | null>(null);

    const currentUserQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const currentUser = currentUserQuery.data;

    const canRead = hasPermission(
        currentUser,
        "attendance.read",
    );

    const canRecord = hasPermission(
        currentUser,
        "attendance.record",
    );

    const canFinalize = hasPermission(
        currentUser,
        "attendance.finalize",
    );

    const canCorrect = hasPermission(
        currentUser,
        "attendance.correct",
    );

    const attendanceQuery = useQuery({
        queryKey:
            attendanceQueryKeys.session(sessionId),
        queryFn: () =>
            getSessionAttendance(sessionId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(sessionId),
    });

    const correctionsQuery = useQuery({
        queryKey:
            attendanceQueryKeys.corrections(
                sessionId,
            ),
        queryFn: () =>
            getAttendanceCorrections(sessionId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(sessionId),
    });

    useEffect(() => {
        if (
            currentUserQuery.error instanceof ApiError &&
            currentUserQuery.error.status === 401
        ) {
            router.replace("/login");
        }
    }, [currentUserQuery.error, router]);

    useEffect(() => {
        if (
            attendanceQuery.data &&
            !editorInitialized
        ) {
            setEditableRecords(
                attendanceQuery.data.records.map(
                    toEditableAttendance,
                ),
            );

            setEditorInitialized(true);
        }
    }, [
        attendanceQuery.data,
        editorInitialized,
    ]);

    const initializeMutation = useMutation({
        mutationFn: () =>
            initializeAttendance(sessionId),
    });

    const saveMutation = useMutation({
        mutationFn: () =>
            saveAttendance(sessionId, {
                records: editableRecords.map(
                    toSaveAttendanceRecord,
                ),
            }),
    });

    const finalizeMutation = useMutation({
        mutationFn: () =>
            finalizeAttendance(sessionId),
    });

    const correctionMutation = useMutation({
        mutationFn: (reason: string) =>
            openAttendanceCorrection(
                sessionId,
                reason,
            ),
    });

    const attendance = attendanceQuery.data;

    const editable =
        Boolean(attendance) &&
        !attendance?.finalized &&
        canRecord &&
        ![
            "CANCELLED",
            "POSTPONED",
        ].includes(
            attendance?.sessionStatus ?? "",
        );

    const hasRoster =
        (attendance?.records.length ?? 0) > 0;

    const allRecorded = useMemo(
        () =>
            editableRecords.length > 0 &&
            editableRecords.every(
                (record) =>
                    record.status !== "NOT_RECORDED",
            ),
        [editableRecords],
    );

    const hasInvalidLateRecord = useMemo(
        () =>
            editableRecords.some(
                (record) =>
                    record.status === "LATE" &&
                    !record.arrivalTime,
            ),
        [editableRecords],
    );

    async function refreshAttendance() {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:
                    attendanceQueryKeys.session(
                        sessionId,
                    ),
            }),

            queryClient.invalidateQueries({
                queryKey:
                    attendanceQueryKeys.corrections(
                        sessionId,
                    ),
            }),
        ]);
    }

    async function initializeRoster() {
        setPageError(null);

        try {
            const result =
                await initializeMutation.mutateAsync();

            setEditableRecords(
                result.records.map(
                    toEditableAttendance,
                ),
            );

            setEditorInitialized(true);
            await refreshAttendance();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "Attendance could not be initialized.",
                ),
            );
        }
    }

    async function saveRoster() {
        setPageError(null);

        if (hasInvalidLateRecord) {
            setPageError(
                "Arrival time is required for every late student.",
            );

            return;
        }

        try {
            const result =
                await saveMutation.mutateAsync();

            setEditableRecords(
                result.records.map(
                    toEditableAttendance,
                ),
            );

            await refreshAttendance();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "Attendance could not be saved.",
                ),
            );
        }
    }

    async function finalizeRoster() {
        const confirmed = window.confirm(
            attendance?.correctionOpen
                ? "Re-finalize corrected attendance?"
                : "Finalize attendance? Normal editing will be locked.",
        );

        if (!confirmed) {
            return;
        }

        setPageError(null);

        try {
            await finalizeMutation.mutateAsync();
            setEditorInitialized(false);
            await refreshAttendance();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "Attendance could not be finalized.",
                ),
            );
        }
    }

    async function openCorrection(
        reason: string,
    ) {
        setCorrectionError(null);

        try {
            await correctionMutation.mutateAsync(
                reason,
            );

            setCorrectionDialogOpen(false);
            setEditorInitialized(false);
            await refreshAttendance();
        } catch (error) {
            setCorrectionError(
                getApiErrorMessage(
                    error,
                    "Attendance correction could not be opened.",
                ),
            );
        }
    }

    function updateRecord(
        studentId: string,
        patch: Partial<EditableAttendanceRecord>,
    ) {
        setEditableRecords((records) =>
            records.map((record) =>
                record.studentId === studentId
                    ? {
                        ...record,
                        ...patch,
                    }
                    : record,
            ),
        );
    }

    function changeStatus(
        record: EditableAttendanceRecord,
        status: AttendanceStatus,
    ) {
        const clearsTimes = [
            "NOT_RECORDED",
            "ABSENT",
            "EXCUSED",
        ].includes(status);

        updateRecord(record.studentId, {
            status,
            arrivalTime: clearsTimes
                ? ""
                : record.arrivalTime,
            departureTime: clearsTimes
                ? ""
                : record.departureTime,
        });
    }

    function markAllPresent() {
        setEditableRecords((records) =>
            records.map((record) => ({
                ...record,
                status: "PRESENT",
                arrivalTime:
                    record.arrivalTime ||
                    sessionStartTime(
                        attendance?.scheduledStart,
                    ),
                departureTime:
                    record.departureTime ||
                    sessionEndTime(
                        attendance?.scheduledEnd,
                    ),
            })),
        );
    }

    if (
        currentUserQuery.isPending ||
        attendanceQuery.isPending
    ) {
        return (
            <main className="p-8">
                Loading attendance...
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
                        You do not have permission to view attendance.
                    </div>
                </main>
            </div>
        );
    }

    if (
        attendanceQuery.isError ||
        !attendance
    ) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            attendanceQuery.error,
                            "Attendance could not be loaded.",
                        )}
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
                    href="/dashboard/sessions"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to schedule
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Session attendance
                        </h1>

                        <p className="mt-1 text-slate-600">
                            {attendance.sessionTitle}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {attendance.groupName} ·{" "}
                            {new Date(
                                attendance.scheduledStart,
                            ).toLocaleString()}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {attendance.finalized &&
                            canCorrect && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCorrectionError(null);
                                        setCorrectionDialogOpen(true);
                                    }}
                                    className="rounded-lg border border-amber-300 px-4 py-2 font-medium text-amber-700"
                                >
                                    Open correction
                                </button>
                            )}

                        {!hasRoster &&
                            canRecord &&
                            !attendance.finalized && (
                                <button
                                    type="button"
                                    disabled={
                                        initializeMutation.isPending
                                    }
                                    onClick={initializeRoster}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                                >
                                    {initializeMutation.isPending
                                        ? "Initializing..."
                                        : "Initialize roster"}
                                </button>
                            )}
                    </div>
                </header>

                {attendance.finalized && (
                    <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
                        Attendance was finalized on{" "}
                        {attendance.finalizedAt
                            ? new Date(
                                attendance.finalizedAt,
                            ).toLocaleString()
                            : "an unknown date"}
                        .
                    </div>
                )}

                {attendance.correctionOpen && (
                    <div className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-800">
                        <p className="font-medium">
                            Attendance correction is open.
                        </p>

                        <p className="mt-1 text-sm">
                            Reason:{" "}
                            {attendance.activeCorrectionReason}
                        </p>
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

                <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <SummaryCard
                        label="Students"
                        value={attendance.totalStudentCount}
                    />

                    <SummaryCard
                        label="Recorded"
                        value={attendance.recordedCount}
                    />

                    <SummaryCard
                        label="Present"
                        value={attendance.presentCount}
                    />

                    <SummaryCard
                        label="Late"
                        value={attendance.lateCount}
                    />

                    <SummaryCard
                        label="Absent"
                        value={attendance.absentCount}
                    />

                    <SummaryCard
                        label="Excused"
                        value={attendance.excusedCount}
                    />
                </section>

                {hasRoster && (
                    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Attendance roster
                                </h2>

                                <p className="mt-1 text-sm text-slate-600">
                                    {attendance.notRecordedCount} records
                                    remain unrecorded.
                                </p>
                            </div>

                            {editable && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={markAllPresent}
                                        className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700"
                                    >
                                        Mark all present
                                    </button>

                                    <button
                                        type="button"
                                        disabled={saveMutation.isPending}
                                        onClick={saveRoster}
                                        className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
                                    >
                                        {saveMutation.isPending
                                            ? "Saving..."
                                            : "Save attendance"}
                                    </button>

                                    {canFinalize && (
                                        <button
                                            type="button"
                                            disabled={
                                                finalizeMutation.isPending ||
                                                !allRecorded ||
                                                hasInvalidLateRecord
                                            }
                                            onClick={finalizeRoster}
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                        >
                                            {finalizeMutation.isPending
                                                ? "Finalizing..."
                                                : attendance.correctionOpen
                                                    ? "Re-finalize"
                                                    : "Finalize"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </header>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left">
                                <thead className="border-b bg-slate-50">
                                    <tr>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">
                                            Arrival
                                        </th>
                                        <th className="p-4">
                                            Departure
                                        </th>
                                        <th className="p-4">Note</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {editableRecords.map((record) => (
                                        <tr key={record.id}>
                                            <td className="p-4">
                                                <Link
                                                    href={`/dashboard/students/${record.studentId}`}
                                                    className="font-medium text-blue-700 hover:underline"
                                                >
                                                    {record.firstName}{" "}
                                                    {record.lastName}
                                                </Link>

                                                <p className="text-sm text-slate-500">
                                                    {record.studentNumber}
                                                </p>
                                            </td>

                                            <td className="p-4">
                                                {editable ? (
                                                    <select
                                                        value={record.status}
                                                        onChange={(event) =>
                                                            changeStatus(
                                                                record,
                                                                event.target
                                                                    .value as AttendanceStatus,
                                                            )
                                                        }
                                                        className="rounded-lg border px-3 py-2"
                                                    >
                                                        {statuses.map((status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {status.replaceAll(
                                                                    "_",
                                                                    " ",
                                                                )}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <AttendanceStatusBadge
                                                        status={record.status}
                                                    />
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <input
                                                    type="time"
                                                    disabled={
                                                        !editable ||
                                                        ![
                                                            "PRESENT",
                                                            "LATE",
                                                        ].includes(record.status)
                                                    }
                                                    value={record.arrivalTime}
                                                    onChange={(event) =>
                                                        updateRecord(
                                                            record.studentId,
                                                            {
                                                                arrivalTime:
                                                                    event.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="rounded-lg border px-3 py-2 disabled:bg-slate-100"
                                                />

                                                {record.status === "LATE" &&
                                                    !record.arrivalTime && (
                                                        <p className="mt-1 text-xs text-red-600">
                                                            Required for late status.
                                                        </p>
                                                    )}
                                            </td>

                                            <td className="p-4">
                                                <input
                                                    type="time"
                                                    disabled={
                                                        !editable ||
                                                        ![
                                                            "PRESENT",
                                                            "LATE",
                                                        ].includes(record.status)
                                                    }
                                                    value={
                                                        record.departureTime
                                                    }
                                                    onChange={(event) =>
                                                        updateRecord(
                                                            record.studentId,
                                                            {
                                                                departureTime:
                                                                    event.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="rounded-lg border px-3 py-2 disabled:bg-slate-100"
                                                />
                                            </td>

                                            <td className="p-4">
                                                <textarea
                                                    rows={2}
                                                    disabled={!editable}
                                                    maxLength={1000}
                                                    value={record.note}
                                                    onChange={(event) =>
                                                        updateRecord(
                                                            record.studentId,
                                                            {
                                                                note: event.target
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    className="w-full min-w-64 resize-y rounded-lg border px-3 py-2 disabled:bg-slate-100"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                    <header className="border-b p-5">
                        <h2 className="text-lg font-semibold">
                            Correction history
                        </h2>

                        <p className="mt-1 text-sm text-slate-600">
                            Immutable before-and-after attendance
                            changes.
                        </p>
                    </header>

                    {correctionsQuery.isPending ? (
                        <div className="p-8 text-center">
                            Loading correction history...
                        </div>
                    ) : correctionsQuery.isError ? (
                        <div className="p-8 text-center text-red-600">
                            {getApiErrorMessage(
                                correctionsQuery.error,
                            )}
                        </div>
                    ) : (
                        <CorrectionHistory
                            corrections={
                                correctionsQuery.data ?? []
                            }
                        />
                    )}
                </section>
            </main>

            {correctionDialogOpen && (
                <OpenCorrectionDialog
                    submitting={
                        correctionMutation.isPending
                    }
                    errorMessage={correctionError}
                    onClose={() =>
                        setCorrectionDialogOpen(false)
                    }
                    onSubmit={openCorrection}
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
    value: number;
}) {
    return (
        <article className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-semibold">
                {value}
            </p>
        </article>
    );
}

function sessionStartTime(
    value?: string,
): string {
    if (!value) {
        return "";
    }

    return new Date(value).toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        },
    );
}

function sessionEndTime(
    value?: string,
): string {
    if (!value) {
        return "";
    }

    return new Date(value).toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        },
    );
}