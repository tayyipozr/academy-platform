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
    assignStaffToGroup,
    endEnrollment,
    endGroupStaffAssignment,
    enrollStudent,
    getGroup,
    getGroupEnrollments,
    getGroupStaffAssignments,
} from "@/features/groups/api";

import { EndAssignmentDialog } from "@/features/groups/end-assignment-dialog";
import type { EndAssignmentFormValues } from "@/features/groups/end-assignment-dialog";

import { EndEnrollmentDialog } from "@/features/groups/end-enrollment-dialog";
import type { EndEnrollmentFormValues } from "@/features/groups/end-enrollment-schema";

import { EnrollmentDialog } from "@/features/groups/enrollment-dialog";
import type { EnrollmentFormValues } from "@/features/groups/enrollment-form-schema";

import { groupQueryKeys } from "@/features/groups/query-keys";

import { StaffAssignmentDialog } from "@/features/groups/staff-assignment-dialog";
import type { StaffAssignmentFormValues } from "@/features/groups/staff-assignment-schema";
import { GroupCurriculumPanel } from "@/features/group-curricula/group-curriculum-panel";

import type {
    GroupEnrollment,
    GroupStaffAssignment,
} from "@/features/groups/types";

import { getStaff } from "@/features/staff/api";
import { getStudents } from "@/features/students/api";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

import {
    MediaGallery,
} from "@/features/media/media-gallery";

type DialogState =
    | { type: "enroll" }
    | {
        type: "end-enrollment";
        enrollment: GroupEnrollment;
    }
    | { type: "assign-staff" }
    | {
        type: "end-assignment";
        assignment: GroupStaffAssignment;
    }
    | null;

export default function GroupDetailPage() {
    const parameters = useParams<{
        groupId: string;
    }>();

    const groupId = parameters.groupId;
    const queryClient = useQueryClient();

    const [includeEnrollmentHistory, setIncludeEnrollmentHistory] =
        useState(false);

    const [includeAssignmentHistory, setIncludeAssignmentHistory] =
        useState(false);

    const [dialog, setDialog] =
        useState<DialogState>(null);

    const [dialogError, setDialogError] =
        useState<string | null>(null);

    const currentUserQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const currentUser = currentUserQuery.data;

    const canReadGroups = hasPermission(
        currentUser,
        "groups.read",
    );

    const canReadEnrollments = hasPermission(
        currentUser,
        "enrollments.read",
    );

    const canReadGroupCurricula = hasPermission(
        currentUser,
        "group_curricula.read",
    );

    const canManageGroupCurricula = hasPermission(
        currentUser,
        "group_curricula.manage",
    );

    const canManageEnrollments = hasPermission(
        currentUser,
        "enrollments.manage",
    );

    const canReadStaffAssignments = hasPermission(
        currentUser,
        "group_staff.read",
    );

    const canManageStaffAssignments = hasPermission(
        currentUser,
        "group_staff.manage",
    );

    const canReadMedia = hasPermission(
        currentUser,
        "media.read",
    );

    const canUploadMedia = hasPermission(
        currentUser,
        "media.upload",
    );

    const canLinkMedia = hasPermission(
        currentUser,
        "media.link",
    );

    const groupQuery = useQuery({
        queryKey: groupQueryKeys.detail(groupId),
        queryFn: () => getGroup(groupId),
        enabled:
            currentUserQuery.isSuccess &&
            canReadGroups &&
            Boolean(groupId),
    });

    const enrollmentsQuery = useQuery({
        queryKey: groupQueryKeys.enrollments(
            groupId,
            includeEnrollmentHistory,
        ),
        queryFn: () =>
            getGroupEnrollments(
                groupId,
                includeEnrollmentHistory,
            ),
        enabled:
            currentUserQuery.isSuccess &&
            canReadEnrollments &&
            Boolean(groupId),
    });

    const assignmentsQuery = useQuery({
        queryKey: groupQueryKeys.staffAssignments(
            groupId,
            includeAssignmentHistory,
        ),
        queryFn: () =>
            getGroupStaffAssignments(
                groupId,
                includeAssignmentHistory,
            ),
        enabled:
            currentUserQuery.isSuccess &&
            canReadStaffAssignments &&
            Boolean(groupId),
    });

    const studentsQuery = useQuery({
        queryKey: ["students", "enrollment-options"],
        queryFn: () =>
            getStudents({
                search: "",
                includeArchived: false,
            }),
        enabled:
            currentUserQuery.isSuccess &&
            canManageEnrollments,
    });

    const staffQuery = useQuery({
        queryKey: ["staff", "assignment-options"],
        queryFn: () =>
            getStaff({
                search: "",
                includeArchived: false,
            }),
        enabled:
            currentUserQuery.isSuccess &&
            canManageStaffAssignments,
    });

    const enrollMutation = useMutation({
        mutationFn: (
            values: EnrollmentFormValues,
        ) =>
            enrollStudent(groupId, {
                studentId: values.studentId,
                enrolledAt: values.enrolledAt,
            }),
    });

    const endEnrollmentMutation = useMutation({
        mutationFn: ({
            enrollment,
            values,
        }: {
            enrollment: GroupEnrollment;
            values: EndEnrollmentFormValues;
        }) =>
            endEnrollment(
                groupId,
                enrollment.id,
                {
                    status: values.status,
                    endedAt: values.endedAt,
                    reason: values.reason || null,
                },
            ),
    });

    const assignStaffMutation = useMutation({
        mutationFn: (
            values: StaffAssignmentFormValues,
        ) =>
            assignStaffToGroup(groupId, {
                staffId: values.staffId,
                assignmentRole:
                    values.assignmentRole,
                startDate: values.startDate,
            }),
    });

    const endAssignmentMutation = useMutation({
        mutationFn: ({
            assignment,
            values,
        }: {
            assignment: GroupStaffAssignment;
            values: EndAssignmentFormValues;
        }) =>
            endGroupStaffAssignment(
                groupId,
                assignment.id,
                {
                    status: values.status,
                    endDate: values.endDate,
                    reason: values.reason || null,
                },
            ),
    });

    const dialogSubmitting =
        enrollMutation.isPending ||
        endEnrollmentMutation.isPending ||
        assignStaffMutation.isPending ||
        endAssignmentMutation.isPending;

    const activeEnrollmentStudentIds = useMemo(
        () =>
            new Set(
                enrollmentsQuery.data?.enrollments
                    .filter(
                        (enrollment) =>
                            enrollment.status === "ACTIVE",
                    )
                    .map(
                        (enrollment) =>
                            enrollment.studentId,
                    ) ?? [],
            ),
        [enrollmentsQuery.data],
    );

    const availableStudents = useMemo(
        () =>
            studentsQuery.data?.filter(
                (student) =>
                    student.status === "ACTIVE" &&
                    !activeEnrollmentStudentIds.has(
                        student.id,
                    ),
            ) ?? [],
        [
            activeEnrollmentStudentIds,
            studentsQuery.data,
        ],
    );

    const activeAssignedStaffIds = useMemo(
        () =>
            new Set(
                assignmentsQuery.data
                    ?.filter(
                        (assignment) =>
                            assignment.status === "ACTIVE",
                    )
                    .map(
                        (assignment) =>
                            assignment.staffId,
                    ) ?? [],
            ),
        [assignmentsQuery.data],
    );

    const availableStaff = useMemo(
        () =>
            staffQuery.data?.filter(
                (staffMember) =>
                    staffMember.employmentStatus ===
                    "ACTIVE" &&
                    !activeAssignedStaffIds.has(
                        staffMember.id,
                    ),
            ) ?? [],
        [activeAssignedStaffIds, staffQuery.data],
    );

    const hasPrimaryInstructor =
        assignmentsQuery.data?.some(
            (assignment) =>
                assignment.status === "ACTIVE" &&
                assignment.assignmentRole ===
                "PRIMARY_INSTRUCTOR",
        ) ?? false;

    async function refreshGroupMembership() {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: [
                    "groups",
                    groupId,
                    "enrollments",
                ],
            }),
            queryClient.invalidateQueries({
                queryKey: [
                    "groups",
                    groupId,
                    "staff-assignments",
                ],
            }),
            queryClient.invalidateQueries({
                queryKey: groupQueryKeys.all,
            }),
        ]);
    }

    function openDialog(nextDialog: DialogState) {
        setDialogError(null);
        setDialog(nextDialog);
    }

    function closeDialog() {
        if (!dialogSubmitting) {
            setDialog(null);
            setDialogError(null);
        }
    }

    async function submitEnrollment(
        values: EnrollmentFormValues,
    ) {
        setDialogError(null);

        try {
            await enrollMutation.mutateAsync(values);
            await refreshGroupMembership();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The student could not be enrolled.",
                ),
            );
        }
    }

    async function submitEndEnrollment(
        enrollment: GroupEnrollment,
        values: EndEnrollmentFormValues,
    ) {
        setDialogError(null);

        try {
            await endEnrollmentMutation.mutateAsync({
                enrollment,
                values,
            });

            await refreshGroupMembership();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The enrollment could not be ended.",
                ),
            );
        }
    }

    async function submitStaffAssignment(
        values: StaffAssignmentFormValues,
    ) {
        setDialogError(null);

        try {
            await assignStaffMutation.mutateAsync(
                values,
            );

            await refreshGroupMembership();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The instructor could not be assigned.",
                ),
            );
        }
    }

    async function submitEndAssignment(
        assignment: GroupStaffAssignment,
        values: EndAssignmentFormValues,
    ) {
        setDialogError(null);

        try {
            await endAssignmentMutation.mutateAsync({
                assignment,
                values,
            });

            await refreshGroupMembership();
            setDialog(null);
        } catch (error) {
            setDialogError(
                getApiErrorMessage(
                    error,
                    "The assignment could not be ended.",
                ),
            );
        }
    }

    if (
        currentUserQuery.isPending ||
        groupQuery.isPending
    ) {
        return (
            <main className="p-8">
                Loading group...
            </main>
        );
    }

    if (!currentUser) {
        return null;
    }

    if (!canReadGroups) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        You do not have permission to view this group.
                    </div>
                </main>
            </div>
        );
    }

    if (groupQuery.isError || !groupQuery.data) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            groupQuery.error,
                            "The group could not be loaded.",
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const group = groupQuery.data;

    const defaultOperationDate =
        group.termStartDate;

    const availablePlaces =
        enrollmentsQuery.data?.availablePlaces ??
        group.capacity;

    const groupCanReceiveAssignments = [
        "DRAFT",
        "ACTIVE",
    ].includes(group.status);

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href="/dashboard/groups"
                    className="text-sm font-medium text-blue-700"
                >
                    ← Back to groups
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {group.name}
                        </h1>

                        <p className="mt-1 text-slate-600">
                            {group.code} · {group.programName} ·{" "}
                            {group.termName}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {hasPermission(
                            currentUser,
                            "sessions.read",
                        ) && (
                                <Link
                                    href={`/dashboard/groups/${group.id}/schedule`}
                                    className="rounded-lg border border-blue-300 px-4 py-2 font-medium text-blue-700"
                                >
                                    Manage schedule
                                </Link>
                            )}

                        {hasPermission(
                            currentUser,
                            "evaluations.manage",
                        ) && (
                                <Link
                                    href="/dashboard/evaluations/new"
                                    className="rounded-lg border border-purple-300 px-4 py-2 font-medium text-purple-700"
                                >
                                    Create evaluation
                                </Link>
                            )}


                        {hasPermission(
                            currentUser,
                            "evaluations.read",
                        ) && (
                                <Link
                                    href={`/dashboard/groups/${group.id}/performance`}
                                    className="rounded-lg border border-purple-300 px-4 py-2 font-medium text-purple-700 hover:bg-purple-50"
                                >
                                    Performance report
                                </Link>
                            )}

                        {canReadMedia && (
                            <div className="mt-8">
                                <MediaGallery
                                    target={{
                                        type: "GROUP",
                                        id: group.id,
                                    }}
                                    title="Group media"
                                    canUpload={canUploadMedia}
                                    canManage={canLinkMedia}
                                />
                            </div>
                        )}

                        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium">
                            {group.status}
                        </span>
                    </div>

                    {hasPermission(
                        currentUser,
                        "attendance.read",
                    ) && (
                            <Link
                                href={`/dashboard/groups/${group.id}/attendance`}
                                className="rounded-lg border border-green-300 px-4 py-2 font-medium text-green-700 hover:bg-green-50"
                            >
                                Attendance report
                            </Link>
                        )}
                </header>

                <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                        label="Capacity"
                        value={group.capacity.toString()}
                    />

                    <SummaryCard
                        label="Active students"
                        value={(
                            enrollmentsQuery.data
                                ?.activeEnrollmentCount ?? 0
                        ).toString()}
                    />

                    <SummaryCard
                        label="Available places"
                        value={availablePlaces.toString()}
                    />

                    <SummaryCard
                        label="Branch"
                        value={group.branchName ?? "No branch"}
                    />
                </section>

                <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">
                        Group information
                    </h2>

                    <dl className="mt-5 grid gap-4 md:grid-cols-3">
                        <DetailItem
                            label="Program"
                            value={group.programName}
                        />

                        <DetailItem
                            label="Term"
                            value={`${group.termStartDate} – ${group.termEndDate}`}
                        />

                        <DetailItem
                            label="Age range"
                            value={
                                group.minimumAge === null &&
                                    group.maximumAge === null
                                    ? "No restriction"
                                    : `${group.minimumAge ?? "—"} – ${group.maximumAge ?? "—"
                                    }`
                            }
                        />

                        <DetailItem
                            label="Description"
                            value={group.description}
                        />
                    </dl>
                </section>

                <GroupCurriculumPanel
                    group={group}
                    canRead={canReadGroupCurricula}
                    canManage={canManageGroupCurricula}
                />

                {canReadEnrollments && (
                    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Student enrollments
                                </h2>

                                <label className="mt-2 flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={
                                            includeEnrollmentHistory
                                        }
                                        onChange={(event) =>
                                            setIncludeEnrollmentHistory(
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    Include enrollment history
                                </label>
                            </div>

                            {canManageEnrollments &&
                                groupCanReceiveAssignments && (
                                    <button
                                        type="button"
                                        disabled={availablePlaces <= 0}
                                        onClick={() =>
                                            openDialog({
                                                type: "enroll",
                                            })
                                        }
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                                    >
                                        Enroll student
                                    </button>
                                )}
                        </header>

                        <EnrollmentTable
                            enrollments={
                                enrollmentsQuery.data
                                    ?.enrollments ?? []
                            }
                            canManage={canManageEnrollments}
                            onEnd={(enrollment) =>
                                openDialog({
                                    type: "end-enrollment",
                                    enrollment,
                                })
                            }
                        />
                    </section>
                )}

                {canReadStaffAssignments && (
                    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Instructor assignments
                                </h2>

                                <label className="mt-2 flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={
                                            includeAssignmentHistory
                                        }
                                        onChange={(event) =>
                                            setIncludeAssignmentHistory(
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    Include assignment history
                                </label>
                            </div>

                            {canManageStaffAssignments &&
                                groupCanReceiveAssignments && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openDialog({
                                                type: "assign-staff",
                                            })
                                        }
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                                    >
                                        Assign instructor
                                    </button>
                                )}
                        </header>

                        <StaffAssignmentTable
                            assignments={
                                assignmentsQuery.data ?? []
                            }
                            canManage={
                                canManageStaffAssignments
                            }
                            onEnd={(assignment) =>
                                openDialog({
                                    type: "end-assignment",
                                    assignment,
                                })
                            }
                        />
                    </section>
                )}
            </main>

            {dialog?.type === "enroll" && (
                <EnrollmentDialog
                    students={availableStudents}
                    defaultEnrollmentDate={
                        defaultOperationDate
                    }
                    availablePlaces={availablePlaces}
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={submitEnrollment}
                />
            )}

            {dialog?.type === "end-enrollment" && (
                <EndEnrollmentDialog
                    enrollment={dialog.enrollment}
                    defaultEndDate={
                        group.termEndDate
                    }
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={(values) =>
                        submitEndEnrollment(
                            dialog.enrollment,
                            values,
                        )
                    }
                />
            )}

            {dialog?.type === "assign-staff" && (
                <StaffAssignmentDialog
                    staff={availableStaff}
                    defaultStartDate={
                        defaultOperationDate
                    }
                    hasPrimaryInstructor={
                        hasPrimaryInstructor
                    }
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={submitStaffAssignment}
                />
            )}

            {dialog?.type === "end-assignment" && (
                <EndAssignmentDialog
                    assignment={dialog.assignment}
                    defaultEndDate={group.termEndDate}
                    submitting={dialogSubmitting}
                    errorMessage={dialogError}
                    onClose={closeDialog}
                    onSubmit={(values) =>
                        submitEndAssignment(
                            dialog.assignment,
                            values,
                        )
                    }
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

function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div>
            <dt className="text-sm text-slate-500">
                {label}
            </dt>

            <dd className="mt-1 whitespace-pre-wrap font-medium">
                {value || "—"}
            </dd>
        </div>
    );
}

function EnrollmentTable({
    enrollments,
    canManage,
    onEnd,
}: {
    enrollments: GroupEnrollment[];
    canManage: boolean;
    onEnd: (
        enrollment: GroupEnrollment,
    ) => void;
}) {
    if (enrollments.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                No enrollments were found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
                <thead className="border-b bg-slate-50">
                    <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">
                            Student number
                        </th>
                        <th className="p-4">Enrolled</th>
                        <th className="p-4">Ended</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y">
                    {enrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                            <td className="p-4">
                                <Link
                                    href={`/dashboard/students/${enrollment.studentId}`}
                                    className="font-medium text-blue-700"
                                >
                                    {enrollment.firstName}{" "}
                                    {enrollment.lastName}
                                </Link>
                            </td>

                            <td className="p-4">
                                {enrollment.studentNumber}
                            </td>

                            <td className="p-4">
                                {enrollment.enrolledAt}
                            </td>

                            <td className="p-4">
                                {enrollment.endedAt || "—"}
                            </td>

                            <td className="p-4">
                                {enrollment.status}
                            </td>

                            <td className="p-4">
                                {enrollment.endReason || "—"}
                            </td>

                            <td className="p-4">
                                {canManage &&
                                    enrollment.status === "ACTIVE" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onEnd(enrollment)
                                            }
                                            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                                        >
                                            End enrollment
                                        </button>
                                    )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StaffAssignmentTable({
    assignments,
    canManage,
    onEnd,
}: {
    assignments: GroupStaffAssignment[];
    canManage: boolean;
    onEnd: (
        assignment: GroupStaffAssignment,
    ) => void;
}) {
    if (assignments.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                No staff assignments were found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
                <thead className="border-b bg-slate-50">
                    <tr>
                        <th className="p-4">
                            Instructor
                        </th>
                        <th className="p-4">Role</th>
                        <th className="p-4">
                            Start date
                        </th>
                        <th className="p-4">End date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y">
                    {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                            <td className="p-4">
                                <p className="font-medium">
                                    {assignment.firstName}{" "}
                                    {assignment.lastName}
                                </p>

                                <p className="text-sm text-slate-500">
                                    {assignment.staffNumber}
                                </p>
                            </td>

                            <td className="p-4">
                                {assignment.assignmentRole
                                    .replaceAll("_", " ")
                                    .toLowerCase()}
                            </td>

                            <td className="p-4">
                                {assignment.startDate}
                            </td>

                            <td className="p-4">
                                {assignment.endDate || "—"}
                            </td>

                            <td className="p-4">
                                {assignment.status}
                            </td>

                            <td className="p-4">
                                {canManage &&
                                    assignment.status === "ACTIVE" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onEnd(assignment)
                                            }
                                            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                                        >
                                            End assignment
                                        </button>
                                    )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}