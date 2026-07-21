"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    getGuardianLinkedStudents,
} from "@/features/attendance/api";

import {
    attendanceQueryKeys,
} from "@/features/attendance/query-keys";

import {
    StudentAttendancePanel,
} from "@/features/attendance/student-attendance-panel";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

import {
    StudentDevelopmentPanel,
} from "@/features/evaluations/student-development-panel";

import {
    MediaGallery,
} from "@/features/media/media-gallery";

export default function MyChildrenPage() {
    const [selectedStudentId, setSelectedStudentId] =
        useState<string | null>(null);

    const currentUserQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const currentUser = currentUserQuery.data;

    const canReadLinkedStudents = hasPermission(
        currentUser,
        "guardian.linked-students.read",
    );

    const canReadReports = hasPermission(
        currentUser,
        "guardian.reports.read",
    );

    const linkedStudentsQuery = useQuery({
        queryKey:
            attendanceQueryKeys.guardianStudents(),

        queryFn: getGuardianLinkedStudents,

        enabled:
            currentUserQuery.isSuccess &&
            canReadLinkedStudents,
    });

    const selectedStudent =
        linkedStudentsQuery.data?.find(
            (student) =>
                student.studentId === selectedStudentId,
        ) ??
        linkedStudentsQuery.data?.[0] ??
        null;

    if (currentUserQuery.isPending) {
        return <main className="p-8">Loading...</main>;
    }

    if (!currentUser) {
        return null;
    }

    if (!canReadLinkedStudents) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        You do not have permission to view linked
                        students.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <header>
                    <h1 className="text-2xl font-bold">
                        My children
                    </h1>

                    <p className="mt-1 text-slate-600">
                        View finalized attendance for linked students.
                    </p>
                </header>

                {linkedStudentsQuery.isPending && (
                    <div className="mt-6 rounded-xl bg-white p-8 text-center">
                        Loading linked students...
                    </div>
                )}

                {linkedStudentsQuery.isError && (
                    <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            linkedStudentsQuery.error,
                            "Linked students could not be loaded.",
                        )}
                    </div>
                )}

                {linkedStudentsQuery.data?.length ===
                    0 && (
                        <div className="mt-6 rounded-xl bg-white p-8 text-center text-slate-500">
                            No students are linked to this guardian
                            account.
                        </div>
                    )}

                {linkedStudentsQuery.data &&
                    linkedStudentsQuery.data.length > 0 && (
                        <>
                            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {linkedStudentsQuery.data.map(
                                    (student) => {
                                        const selected =
                                            selectedStudent?.studentId ===
                                            student.studentId;

                                        return (
                                            <button
                                                key={student.studentId}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedStudentId(
                                                        student.studentId,
                                                    )
                                                }
                                                className={`rounded-xl border p-5 text-left ${selected
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                                    }`}
                                            >
                                                <p className="font-semibold text-slate-900">
                                                    {student.firstName}{" "}
                                                    {student.lastName}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {student.studentNumber}
                                                </p>

                                                <dl className="mt-4 grid gap-2 text-sm">
                                                    <div>
                                                        <dt className="text-slate-500">
                                                            Relationship
                                                        </dt>

                                                        <dd>
                                                            {student.relationshipType
                                                                .replaceAll(
                                                                    "_",
                                                                    " ",
                                                                )
                                                                .toLowerCase()}
                                                        </dd>
                                                    </div>

                                                    <div>
                                                        <dt className="text-slate-500">
                                                            Branch
                                                        </dt>

                                                        <dd>
                                                            {student.branchName ||
                                                                "—"}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </button>
                                        );
                                    },
                                )}
                            </section>

                            {selectedStudent && (
                                <div className="mt-8">
                                    <header className="mb-5">
                                        <h2 className="text-xl font-semibold">
                                            {selectedStudent.firstName}{" "}
                                            {selectedStudent.lastName}
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-600">
                                            Attendance report
                                        </p>
                                    </header>

                                    <StudentAttendancePanel
                                        studentId={
                                            selectedStudent.studentId
                                        }
                                        showOrganizationFilters={false}
                                    />
                                </div>
                            )}

                            {selectedStudent && canReadReports && (
                                <div className="mt-10">
                                    <StudentDevelopmentPanel
                                        studentId={selectedStudent.studentId}
                                        showGroupFilter={false}
                                    />
                                </div>
                            )}

                            {selectedStudent &&
                                hasPermission(currentUser, "media.read") && (
                                    <div className="mt-10">
                                        <MediaGallery
                                            target={{
                                                type: "STUDENT",
                                                id: selectedStudent.studentId,
                                            }}
                                            title="Student media"
                                            canUpload={false}
                                            canManage={false}
                                            guardianMode
                                        />
                                    </div>
                                )}
                        </>
                    )}
            </main>
        </div>
    );
}