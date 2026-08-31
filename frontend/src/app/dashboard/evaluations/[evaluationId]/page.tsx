"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";
import { getStudentEvaluation } from "@/features/evaluations/api";
import { EvaluationEditor } from "@/features/evaluations/evaluation-editor";
import { evaluationQueryKeys } from "@/features/evaluations/query-keys";
import { MediaGallery } from "@/features/media/media-gallery";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";

export default function EvaluationDetailPage() {
    const params = useParams<{
        evaluationId: string;
    }>();

    const evaluationId = params.evaluationId;

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

    const canReadMedia = hasPermission(
        currentUser,
        "media.read",
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

        retry: false,
    });

    if (
        currentUserQuery.isPending ||
        evaluationQuery.isPending
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">
                Loading evaluation...
            </main>
        );
    }

    if (!currentUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">
                Your session could not be loaded.
            </main>
        );
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
                        <h1 className="font-semibold">
                            Evaluation could not be loaded
                        </h1>

                        <p className="mt-2">
                            {getApiErrorMessage(
                                evaluationQuery.error,
                                "The evaluation does not exist or you do not have access.",
                            )}
                        </p>

                        <p className="mt-2 text-sm">
                            Evaluation ID: {evaluationId}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const evaluation = evaluationQuery.data;

    return (
        <div className="min-h-screen bg-slate-100">
            <DashboardHeader user={currentUser} />

            <main className="mx-auto max-w-7xl p-6">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">
                        Student evaluation
                    </h1>

                    <p className="mt-1 text-slate-600">
                        {evaluation.studentFirstName}{" "}
                        {evaluation.studentLastName} ·{" "}
                        {evaluation.groupName}
                    </p>
                </header>

                <EvaluationEditor
                    key={`${evaluation.id}-${evaluation.status}-${evaluation.updatedAt}`}
                    initialEvaluation={evaluation}
                    canManage={canManage}
                    canPublish={canPublish}
                />

                {canReadMedia && (
                    <div className="mt-8">
                        <MediaGallery
                            target={{
                                type: "EVALUATION",
                                id: evaluation.id,
                            }}
                            title="Evaluation attachments"
                            canUpload={hasPermission(
                                currentUser,
                                "media.upload",
                            )}
                            canManage={hasPermission(
                                currentUser,
                                "media.link",
                            )}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}