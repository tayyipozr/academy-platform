"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  DevelopmentStatusBadge,
} from "@/features/evaluations/development-status-badge";

import {
  getGroups,
} from "@/features/groups/api";

import {
  getStudentProgressReport,
} from "./api";

import {
  ProgressSummaryCards,
} from "./progress-summary-cards";

import {
  ReportExportPanel,
} from "./report-export-panel";

import {
  reportingQueryKeys,
} from "./query-keys";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

type StudentProgressReportPanelProps = {
  studentId: string;
  canExport: boolean;
  showGroupFilter?: boolean;
};

export function StudentProgressReportPanel({
  studentId,
  canExport,
  showGroupFilter = true,
}: StudentProgressReportPanelProps) {
  const currentYear =
    new Date().getFullYear();

  const [groupId, setGroupId] =
    useState("");

  const [dateFrom, setDateFrom] =
    useState(`${currentYear}-01-01`);

  const [dateTo, setDateTo] =
    useState(`${currentYear}-12-31`);

  const filters = {
    groupId,
    dateFrom,
    dateTo,
  };

  const reportQuery = useQuery({
    queryKey:
      reportingQueryKeys.studentProgress(
        studentId,
        filters,
      ),

    queryFn: () =>
      getStudentProgressReport(
        studentId,
        {
          groupId: groupId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      ),

    enabled: Boolean(studentId),
  });

  const groupsQuery = useQuery({
    queryKey: [
      "groups",
      "progress-report-options",
    ],

    queryFn: () =>
      getGroups({
        includeArchived: true,
      }),

    enabled: showGroupFilter,
  });

  return (
    <section>
      <header>
        <h2 className="text-xl font-semibold">
          Consolidated progress report
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Attendance, evaluation, curriculum, and completed
          lesson information.
        </p>
      </header>

      <section
        className={`mt-5 grid gap-3 rounded-xl bg-white p-4 ${
          showGroupFilter
            ? "md:grid-cols-3"
            : "md:grid-cols-2"
        }`}
      >
        <FilterField
          id={`report-from-${studentId}`}
          label="Date from"
        >
          <input
            id={`report-from-${studentId}`}
            type="date"
            value={dateFrom}
            onChange={(event) =>
              setDateFrom(event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </FilterField>

        <FilterField
          id={`report-to-${studentId}`}
          label="Date to"
        >
          <input
            id={`report-to-${studentId}`}
            type="date"
            value={dateTo}
            onChange={(event) =>
              setDateTo(event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </FilterField>

        {showGroupFilter && (
          <FilterField
            id={`report-group-${studentId}`}
            label="Group"
          >
            <select
              id={`report-group-${studentId}`}
              value={groupId}
              onChange={(event) =>
                setGroupId(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">
                Most recent group
              </option>

              {groupsQuery.data?.map(
                (group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </option>
                ),
              )}
            </select>
          </FilterField>
        )}
      </section>

      {reportQuery.isPending && (
        <div className="mt-5 rounded-xl bg-white p-8 text-center">
          Loading consolidated report...
        </div>
      )}

      {reportQuery.isError && (
        <div className="mt-5 rounded-xl bg-red-50 p-5 text-red-700">
          {getApiErrorMessage(
            reportQuery.error,
            "The progress report could not be loaded.",
          )}
        </div>
      )}

      {reportQuery.data && (
        <>
          <div className="mt-5">
            <ProgressSummaryCards
              report={reportQuery.data}
            />
          </div>

          <section className="mt-5 grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Development status
              </p>

              <div className="mt-3">
                <DevelopmentStatusBadge
                  status={
                    reportQuery.data.development
                      .developmentStatus
                  }
                />
              </div>
            </article>

            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Passing rate
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {reportQuery.data.development.passingRate.toFixed(
                  2,
                )}
                %
              </p>
            </article>

            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Score trend
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {formatTrend(
                  reportQuery.data.development
                    .scoreTrend,
                )}
              </p>
            </article>
          </section>

          <div className="mt-5">
            <ReportExportPanel
              studentId={studentId}
              groupId={
                reportQuery.data.groupId
              }
              dateFrom={dateFrom}
              dateTo={dateTo}
              canExport={canExport}
            />
          </div>
        </>
      )}
    </section>
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

function formatTrend(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(
    2,
  )}`;
}
