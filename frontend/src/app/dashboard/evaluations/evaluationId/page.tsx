"use client";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
    getStudentEvaluation,
} from "@/features/evaluations/api";

import {
    EvaluationEditor,
} from "@/features/evaluations/evaluation-editor";

import {
    evaluationQueryKeys,
} from "@/features/evaluations/query-keys";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function EvaluationDetailPage() {
    const parameters = useParams<{
        evaluationId: string;
    }>();

    const evaluationId =
        parameters.evaluationId;

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

    const canPublish = hasPermission(
        currentUser,
        "evaluations.publish",
    );

    const evaluationQuery = useQuery({
        queryKey:
            evaluationQueryKeys.evaluationDetail(
                evaluationId,
            ),

        queryFn: () =>
            getStudentEvaluation(evaluationId),

        enabled:
            currentUserQuery.isSuccess &&
            canRead &&
            Boolean(evaluationId),
    });

    if (
        currentUserQuery.isPending ||
        evaluationQuery.isPending
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
                        evaluation.
                    </div>
                </main>
            </div>
        );
    }

    if (
        evaluationQuery.isError ||
        !evaluationQuery.data
    ) {
        return (
            <div className="min-h-screen bg-slate-100">
                <DashboardHeader user={currentUser} />

                <main className="mx-auto max-w-7xl p-6">
                    <div className="rounded-xl bg-red-50 p-5 text-red-700">
                        {getApiErrorMessage(
                            evaluationQuery.error,
                            "The evaluation could not be loaded.",
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
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">
                        Student evaluation
                    </h1>

                    <p className="mt-1 text-slate-600">
                        {evaluationQuery.data.studentFirstName}{" "}
                        {evaluationQuery.data.studentLastName} ·{" "}
                        {evaluationQuery.data.groupName}
                    </p>
                </header>

                <EvaluationEditor
                    key={`${evaluationQuery.data.id}-${evaluationQuery.data.status}-${evaluationQuery.data.updatedAt}`}
                    initialEvaluation={
                        evaluationQuery.data
                    }
                    canManage={canManage}
                    canPublish={canPublish}
                />
            </main>
        </div>
    );
}