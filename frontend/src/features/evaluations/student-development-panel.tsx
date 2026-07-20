"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { getGroups } from "@/features/groups/api";

import {
  getPublishedEvaluations,
  getStudentDevelopmentSummary,
} from "./api";

import {
  CriterionAveragesTable,
} from "./criterion-averages-table";

import {
  DevelopmentSummaryCards,
} from "./development-summary-cards";

import {
  evaluationQueryKeys,
} from "./query-keys";

import {
  PublishedEvaluationHistory,
} from "./published-evaluation-history";

import {
  ScoreTrendChart,
} from "./score-trend-chart";

import { getApiErrorMessage } from "@/lib/api/error-message";

type StudentDevelopmentPanelProps = {
  studentId: string;
  showGroupFilter?: boolean;
};

export function StudentDevelopmentPanel({
  studentId,
  showGroupFilter = true,
}: StudentDevelopmentPanelProps) {
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState(
    `${currentYear}-01-01`,
  );

  const [dateTo, setDateTo] = useState(
    `${currentYear}-12-31`,
  );

  const [groupId, setGroupId] = useState("");

  const filters = {
    groupId,
    dateFrom,
    dateTo,
  };

  const developmentQuery = useQuery({
    queryKey:
      evaluationQueryKeys.studentDevelopment(
        studentId,
        filters,
      ),

    queryFn: () =>
      getStudentDevelopmentSummary(
        studentId,
        {
          groupId: groupId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      ),

    enabled: Boolean(studentId),
  });

  const publishedQuery = useQuery({
    queryKey: [
      ...evaluationQueryKeys.studentDevelopment(
        studentId,
        filters,
      ),
      "published",
    ],

    queryFn: () =>
      getPublishedEvaluations(
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
      "development-filter-options",
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
          Development report
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Published performance, attendance, and
          curriculum-progress indicators.
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
          id={`development-from-${studentId}`}
          label="Date from"
        >
          <input
            id={`development-from-${studentId}`}
            type="date"
            value={dateFrom}
            onChange={(event) =>
              setDateFrom(event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </FilterField>

        <FilterField
          id={`development-to-${studentId}`}
          label="Date to"
        >
          <input
            id={`development-to-${studentId}`}
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
            id={`development-group-${studentId}`}
            label="Group"
          >
            <select
              id={`development-group-${studentId}`}
              value={groupId}
              onChange={(event) =>
                setGroupId(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">
                Most recent group
              </option>

              {groupsQuery.data?.map((group) => (
                <option
                  key={group.id}
                  value={group.id}
                >
                  {group.name}
                </option>
              ))}
            </select>
          </FilterField>
        )}
      </section>

      {developmentQuery.isPending && (
        <div className="mt-5 rounded-xl bg-white p-8 text-center">
          Loading development report...
        </div>
      )}

      {developmentQuery.isError && (
        <div className="mt-5 rounded-xl bg-red-50 p-5 text-red-700">
          {getApiErrorMessage(
            developmentQuery.error,
            "The development report could not be loaded.",
          )}
        </div>
      )}

      {developmentQuery.data && (
        <>
          <div className="mt-5">
            <DevelopmentSummaryCards
              summary={developmentQuery.data}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <ReportMetric
              label="Published evaluations"
              value={
                developmentQuery.data
                  .publishedEvaluationCount
              }
            />

            <ReportMetric
              label="Passing evaluations"
              value={`${developmentQuery.data.passingEvaluationCount}/${developmentQuery.data.passingRateDenominator}`}
            />

            <ReportMetric
              label="Passing rate"
              value={`${developmentQuery.data.passingRate.toFixed(
                2,
              )}%`}
            />
          </div>

          <div className="mt-5">
            <ScoreTrendChart
              points={
                developmentQuery.data.trend
              }
            />
          </div>

          <div className="mt-5">
            <CriterionAveragesTable
              criteria={
                developmentQuery.data
                  .criterionAverages
              }
            />
          </div>
        </>
      )}

      <div className="mt-5">
        {publishedQuery.isPending ? (
          <div className="rounded-xl bg-white p-8 text-center">
            Loading published evaluations...
          </div>
        ) : publishedQuery.isError ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {getApiErrorMessage(
              publishedQuery.error,
              "Published evaluations could not be loaded.",
            )}
          </div>
        ) : (
          <PublishedEvaluationHistory
            evaluations={
              publishedQuery.data ?? []
            }
          />
        )}
      </div>
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

function ReportMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </article>
  );
}
