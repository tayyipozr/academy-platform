"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { getGuardians } from "@/features/guardians/api";
import { guardianQueryKeys } from "@/features/guardians/query-keys";

import {
    getStudent,
    getStudentGuardians,
    linkStudentGuardian,
    unlinkStudentGuardian,
    updateStudentGuardian,
} from "@/features/students/api";

import { GuardianRelationshipDialog } from "@/features/students/guardian-relationship-dialog";
import type { GuardianRelationshipFormValues } from "@/features/students/guardian-relationship-schema";
import { studentQueryKeys } from "@/features/students/query-keys";
import { StudentStatusBadge } from "@/features/students/student-status-badge";

import type {
    StudentGuardianRelationship,
} from "@/features/students/types";

import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { StudentAttendancePanel } from "@/features/attendance/student-attendance-panel";

import {
    StudentDevelopmentPanel,
} from "@/features/evaluations/student-development-panel";

export default function StudentDetailPage() {
    const parameters = useParams<{
        studentId: string;
    }>();

    const studentId = parameters.studentId;

    const router = useRouter();
    const queryClient = useQueryClient();

    const [editingRelationship, setEditingRelationship] =
        useState<
            StudentGuardianRelationship | null | undefined
        >(undefined);

    const [relationshipError, setRelationshipError] =
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
        "students.read",
    );

    const canManage = hasPermission(
        currentUser,
        "students.manage",
    );

    const canReadAttendance = hasPermission(
        currentUser,
        "attendance.read",
    );

    const canReadEvaluations = hasPermission(
        currentUser,
        "evaluations.read",
    );

    const studentQuery = useQuery({
        queryKey:
            studentQueryKeys.detail(studentId),
        queryFn: () => getStudent(studentId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(studentId),
    });

    const relationshipsQuery = useQuery({
        queryKey:
            studentQueryKeys.guardians(studentId),
        queryFn: () =>
            getStudentGuardians(studentId),
        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(studentId),
    });

    const guardiansQuery = useQuery({
        queryKey: guardianQueryKeys.list("", false),
        queryFn: () =>
            getGuardians({
                search: "",
                includeArchived: false,
            }),
        enabled:
            currentUserQuery.isSuccess &&
            canManage &&
            hasPermission(
                currentUser,
                "guardians.read",
            ),
    });

    useEffect(() => {
        if (
            currentUserQuery.error instanceof ApiError &&
            currentUserQuery.error.status === 401
        ) {
            router.replace("/login");
        }
    }, [currentUserQuery.error, router]);

    const linkMutation = useMutation({
        mutationFn: (
            values: GuardianRelationshipFormValues,
        ) =>
            linkStudentGuardian(studentId, values),
    });

    const updateMutation = useMutation({
        mutationFn: ({
            guardianId,
            values,
        }: {
            guardianId: string;
            values: GuardianRelationshipFormValues;
        }) =>
            updateStudentGuardian(
                studentId,
                guardianId,
                values,
            ),
    });

    const unlinkMutation = useMutation({
        mutationFn: (guardianId: string) =>
            unlinkStudentGuardian(
                studentId,
                guardianId,
            ),
    });

    const relationshipSubmitting =
        linkMutation.isPending ||
        updateMutation.isPending;

    const availableGuardians = useMemo(() => {
        const linkedIds = new Set(
            relationshipsQuery.data?.map(
                (relationship) =>
                    relationship.guardianId,
            ) ?? [],
        );

        return (
            guardiansQuery.data?.filter(
                (guardian) =>
                    guardian.status === "ACTIVE" &&
                    (
                        editingRelationship?.guardianId ===
                        guardian.id ||
                        !linkedIds.has(guardian.id)
                    ),
            ) ?? []
        );
    }, [
        editingRelationship,
        guardiansQuery.data,
        relationshipsQuery.data,
    ]);

    async function refreshRelationships() {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey:
                    studentQueryKeys.guardians(studentId),
            }),
            queryClient.invalidateQueries({
                queryKey:
                    studentQueryKeys.detail(studentId),
            }),
            queryClient.invalidateQueries({
                queryKey: studentQueryKeys.lists(),
            }),
        ]);
    }

    function openLinkDialog() {
        setRelationshipError(null);
        setEditingRelationship(null);
    }

    function openEditDialog(
        relationship: StudentGuardianRelationship,
    ) {
        setRelationshipError(null);
        setEditingRelationship(relationship);
    }

    function closeRelationshipDialog() {
        if (!relationshipSubmitting) {
            setEditingRelationship(undefined);
            setRelationshipError(null);
        }
    }

    async function saveRelationship(
        values: GuardianRelationshipFormValues,
    ) {
        setRelationshipError(null);

        try {
            if (editingRelationship) {
                await updateMutation.mutateAsync({
                    guardianId:
                        editingRelationship.guardianId,
                    values,
                });
            } else {
                await linkMutation.mutateAsync(values);
            }

            await refreshRelationships();
            setEditingRelationship(undefined);
        } catch (error) {
            setRelationshipError(
                getApiErrorMessage(
                    error,
                    "The guardian relationship could not be saved.",
                ),
            );
        }
    }

    async function removeRelationship(
        relationship: StudentGuardianRelationship,
    ) {
        const confirmed = window.confirm(
            `Remove ${relationship.firstName} ${relationship.lastName} from this student?`,
        );

        if (!confirmed) {
            return;
        }

        setPageError(null);

        try {
            await unlinkMutation.mutateAsync(
                relationship.guardianId,
            );

            await refreshRelationships();
        } catch (error) {
            setPageError(
                getApiErrorMessage(
                    error,
                    "The guardian could not be unlinked.",
                ),
            );
        }
    }

    if (currentUserQuery.isPending) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">
                Loading...
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
                        You do not have permission to view this
                        student.
                    </div>
                </main>
            </div>
        );
    }

    if (studentQuery.isPending) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    Loading student...
                </main>
            </div>
        );
    }

    if (
        studentQuery.isError ||
        !studentQuery.data
    ) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            studentQuery.error,
                            "The student could not be loaded.",
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const student = studentQuery.data;

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <Link
                    href="/dashboard/students"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to students
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold">
                                {student.firstName}{" "}
                                {student.lastName}
                            </h1>

                            <StudentStatusBadge
                                status={student.status}
                            />
                        </div>

                        <p className="mt-1 text-slate-600">
                            Student number:{" "}
                            {student.studentNumber}
                        </p>
                    </div>

                    {hasPermission(
                        currentUser,
                        "evaluations.read",
                    ) && (
                            <Link
                                href={`/dashboard/evaluations?studentId=${student.id}`}
                                className="rounded-lg border border-blue-300 px-4 py-2 font-medium text-blue-700"
                            >
                                Evaluations
                            </Link>
                        )}
                </header>

                {pageError && (
                    <div
                        role="alert"
                        className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
                    >
                        {pageError}
                    </div>
                )}

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            General information
                        </h2>

                        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Branch"
                                value={student.branchName}
                            />

                            <DetailItem
                                label="Birth date"
                                value={
                                    student.birthDate
                                        ? new Date(
                                            `${student.birthDate}T00:00:00`,
                                        ).toLocaleDateString()
                                        : null
                                }
                            />

                            <DetailItem
                                label="Gender"
                                value={
                                    student.gender
                                        ?.replaceAll("_", " ")
                                        .toLowerCase() ?? null
                                }
                            />

                            <DetailItem
                                label="Enrollment date"
                                value={
                                    student.enrollmentDate
                                        ? new Date(
                                            `${student.enrollmentDate}T00:00:00`,
                                        ).toLocaleDateString()
                                        : null
                                }
                            />
                        </dl>
                    </section>

                    <section className="rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Emergency information
                        </h2>

                        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Emergency contact"
                                value={
                                    student.emergencyContactName
                                }
                            />

                            <DetailItem
                                label="Emergency phone"
                                value={
                                    student.emergencyContactPhone
                                }
                            />
                        </dl>
                    </section>

                    <section className="rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Medical information
                        </h2>

                        <dl className="mt-5 space-y-4">
                            <DetailItem
                                label="Allergies"
                                value={student.allergies}
                            />

                            <DetailItem
                                label="Medical notes"
                                value={student.medicalNotes}
                            />
                        </dl>
                    </section>

                    <section className="rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Notes
                        </h2>

                        <p className="mt-5 whitespace-pre-wrap text-sm text-slate-700">
                            {student.notes || "No notes recorded."}
                        </p>
                    </section>
                </div>

                {canReadAttendance && (
                    <div className="mt-8">
                        <StudentAttendancePanel
                            studentId={student.id}
                        />
                    </div>
                )}

                {canReadEvaluations && (
                    <div className="mt-8">
                        <StudentDevelopmentPanel
                            studentId={student.id}
                        />
                    </div>
                )}

                <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Guardians
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                Manage contacts, authorizations, and
                                consent.
                            </p>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={openLinkDialog}
                                disabled={
                                    availableGuardians.length === 0
                                }
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Link guardian
                            </button>
                        )}
                    </header>

                    {relationshipsQuery.isPending && (
                        <div className="p-8 text-center">
                            Loading guardian relationships...
                        </div>
                    )}

                    {relationshipsQuery.data?.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No guardians are linked to this student.
                        </div>
                    )}

                    {relationshipsQuery.data &&
                        relationshipsQuery.data.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1000px] text-left">
                                    <thead className="border-b bg-slate-50">
                                        <tr>
                                            <th className="p-4">
                                                Guardian
                                            </th>
                                            <th className="p-4">
                                                Relationship
                                            </th>
                                            <th className="p-4">
                                                Contact settings
                                            </th>
                                            <th className="p-4">
                                                Authorization
                                            </th>
                                            <th className="p-4">
                                                Media consent
                                            </th>
                                            <th className="p-4">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {relationshipsQuery.data.map(
                                            (relationship) => (
                                                <tr
                                                    key={
                                                        relationship.guardianId
                                                    }
                                                >
                                                    <td className="p-4">
                                                        <p className="font-medium">
                                                            {
                                                                relationship.firstName
                                                            }{" "}
                                                            {relationship.lastName}
                                                        </p>

                                                        <p className="text-sm text-slate-500">
                                                            {relationship.email}
                                                        </p>

                                                        <p className="text-sm text-slate-500">
                                                            {relationship.phone || "—"}
                                                        </p>
                                                    </td>

                                                    <td className="p-4">
                                                        <p>
                                                            {relationship.relationshipType
                                                                .replaceAll(
                                                                    "_",
                                                                    " ",
                                                                )
                                                                .toLowerCase()}
                                                        </p>

                                                        {relationship.primaryContact && (
                                                            <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                                                Primary contact
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="p-4 text-sm">
                                                        <BooleanValue
                                                            label="Notifications"
                                                            value={
                                                                relationship.receivesNotifications
                                                            }
                                                        />
                                                    </td>

                                                    <td className="p-4 text-sm">
                                                        <BooleanValue
                                                            label="Legal guardian"
                                                            value={
                                                                relationship.legalGuardian
                                                            }
                                                        />

                                                        <BooleanValue
                                                            label="Pickup"
                                                            value={
                                                                relationship.pickupAuthorized
                                                            }
                                                        />
                                                    </td>

                                                    <td className="p-4 text-sm">
                                                        <BooleanValue
                                                            label="Internal"
                                                            value={
                                                                relationship.internalMediaConsent
                                                            }
                                                        />

                                                        <BooleanValue
                                                            label="Marketing"
                                                            value={
                                                                relationship.marketingMediaConsent
                                                            }
                                                        />
                                                    </td>

                                                    <td className="p-4">
                                                        {canManage && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openEditDialog(
                                                                            relationship,
                                                                        )
                                                                    }
                                                                    className="rounded border px-3 py-1.5 text-sm"
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        unlinkMutation.isPending
                                                                    }
                                                                    onClick={() =>
                                                                        removeRelationship(
                                                                            relationship,
                                                                        )
                                                                    }
                                                                    className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                                                                >
                                                                    Unlink
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>
            </main>

            {editingRelationship !== undefined && (
                <GuardianRelationshipDialog
                    relationship={
                        editingRelationship ?? undefined
                    }
                    guardians={
                        editingRelationship
                            ? guardiansQuery.data ?? []
                            : availableGuardians
                    }
                    submitting={relationshipSubmitting}
                    errorMessage={relationshipError}
                    onClose={closeRelationshipDialog}
                    onSubmit={saveRelationship}
                />
            )}
        </div>
    );
}

function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div>
            <dt className="text-sm text-slate-500">
                {label}
            </dt>

            <dd className="mt-1 whitespace-pre-wrap font-medium text-slate-900">
                {value || "—"}
            </dd>
        </div>
    );
}

function BooleanValue({
    label,
    value,
}: {
    label: string;
    value: boolean;
}) {
    return (
        <p>
            <span className="text-slate-500">
                {label}:
            </span>{" "}
            <span
                className={
                    value
                        ? "font-medium text-green-700"
                        : "text-slate-500"
                }
            >
                {value ? "Yes" : "No"}
            </span>
        </p>
    );
}