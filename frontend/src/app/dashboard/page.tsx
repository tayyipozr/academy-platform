"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  DashboardMetricCard,
} from "@/features/reporting/dashboard-metric-card";

import {
  getDashboardSummary,
} from "@/features/reporting/api";

import {
  reportingQueryKeys,
} from "@/features/reporting/query-keys";

import {
  UpcomingSessionsWidget,
} from "@/features/reporting/upcoming-sessions-widget";

import {
  ApiError,
} from "@/lib/api/api-client";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";
import { useLocalization } from "@/features/localization/use-localization";

export default function DashboardPage() {
  const router = useRouter();

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const isGuardian =
    currentUser?.roles.includes("GUARDIAN") ?? false;

  useEffect(() => {
    if (currentUser && isGuardian) {
      router.replace("/dashboard/my-children");
    }
  }, [currentUser, isGuardian, router]);

  const canReadReports = hasPermission(
    currentUser,
    "reports.read",
  );

  const dashboardQuery = useQuery({
    queryKey:
      reportingQueryKeys.dashboard(),

    queryFn: getDashboardSummary,

    enabled:
      currentUserQuery.isSuccess &&
      canReadReports,
  });

  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.dashboard;
  const common = dictionary.common;

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        Loading dashboard...
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  /*
   * Guardians do not have reports.read. Their primary
   * navigation begins at My Children.
   */

  if (!canReadReports) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader user={currentUser} />

        <main className="mx-auto max-w-7xl p-6">
          <header>
            <h1 className="text-2xl font-bold">
              Welcome, {currentUser.firstName}
            </h1>

            <p className="mt-1 text-slate-600">
              Select an available portal feature from the
              navigation.
            </p>
          </header>
        </main>
      </div>
    );
  }
  if (isGuardian) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Opening guardian portal...
        </p>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        <header>
          <h1 className="text-2xl font-bold">
            {dashboardQuery.data?.dashboardType ===
              "INSTRUCTOR"
              ? t.instructorTitle
              : t.administratorTitle}
          </h1>

          <p className="mt-1 text-slate-600">
            {t.welcome}, {currentUser.firstName}{" "}
            {currentUser.lastName}.
          </p>
        </header>

        {dashboardQuery.isPending && (
          <div className="mt-6 rounded-xl bg-white p-8 text-center">
            t.loading
          </div>
        )}

        {dashboardQuery.isError && (
          <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
            {getApiErrorMessage(
              dashboardQuery.error,
              t.loadFailiure,
            )}
          </div>
        )}

        {dashboardQuery.data && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardMetricCard
                label={t.activeStudents}
                value={
                  dashboardQuery.data
                    .activeStudentCount
                }
                href="/dashboard/students"
                tone="info"
              />

              <DashboardMetricCard
                label={t.activeGroups}
                value={
                  dashboardQuery.data
                    .activeGroupCount
                }
                href="/dashboard/groups"
              />

              <DashboardMetricCard
                label={t.activeStaff}
                value={
                  dashboardQuery.data
                    .activeStaffCount
                }
                href="/dashboard/staff"
              />

              <DashboardMetricCard
                label={t.activeCurricula}
                value={
                  dashboardQuery.data
                    .activeCurriculumCount
                }
                href="/dashboard/curricula"
              />
            </section>

            <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DashboardMetricCard
                label={t.upcomingSessions}
                value={
                  dashboardQuery.data
                    .upcomingSessionCount
                }
                href="/dashboard/sessions"
                tone="info"
              />

              <DashboardMetricCard
                label={t.missingAttendance}
                value={
                  dashboardQuery.data
                    .sessionsMissingAttendanceCount
                }
                description={t.missingAttendance}
                href="/dashboard/sessions"
                tone={
                  dashboardQuery.data
                    .sessionsMissingAttendanceCount > 0
                    ? "danger"
                    : "success"
                }
              />

              <DashboardMetricCard
                label={t.draftEvaluations}
                value={
                  dashboardQuery.data
                    .draftEvaluationCount
                }
                href="/dashboard/evaluations"
                tone="warning"
              />

              <DashboardMetricCard
                label={t.pendingPublication}
                value={
                  dashboardQuery.data
                    .submittedEvaluationCount
                }
                href="/dashboard/evaluations"
                tone={
                  dashboardQuery.data
                    .submittedEvaluationCount > 0
                    ? "warning"
                    : "default"
                }
              />

              <DashboardMetricCard
                label={t.publishedEvaluations}
                value={
                  dashboardQuery.data
                    .publishedEvaluationCount
                }
                href="/dashboard/evaluations"
                tone="success"
              />
            </section>

            <div className="mt-6">
              <UpcomingSessionsWidget
                sessions={
                  dashboardQuery.data
                    .upcomingSessions
                }
              />
            </div>

            <p className="mt-4 text-right text-xs text-slate-500">
              Generated at{" "}
              {new Date(
                dashboardQuery.data.generatedAt,
              ).toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}