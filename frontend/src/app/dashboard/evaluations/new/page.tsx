"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  EvaluationEditor,
} from "@/features/evaluations/evaluation-editor";

import { hasPermission } from "@/lib/permissions";

export default function NewEvaluationPage() {
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  if (currentUserQuery.isPending) {
    return <main className="p-8">Loading...</main>;
  }

  if (!currentUserQuery.data) {
    return null;
  }

  const currentUser =
    currentUserQuery.data;

  const canManage = hasPermission(
    currentUser,
    "evaluations.manage",
  );

  const canPublish = hasPermission(
    currentUser,
    "evaluations.publish",
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        {!canManage ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            You do not have permission to create
            evaluations.
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-bold">
                Create student evaluation
              </h1>

              <p className="mt-1 text-slate-600">
                Create a partial draft or complete and
                submit the evaluation.
              </p>
            </header>

            <EvaluationEditor
              canManage={canManage}
              canPublish={canPublish}
            />
          </>
        )}
      </main>
    </div>
  );
}
