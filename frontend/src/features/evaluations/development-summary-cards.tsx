import {
  DevelopmentStatusBadge,
} from "./development-status-badge";

import type {
  StudentDevelopmentSummary,
} from "./types";

export function DevelopmentSummaryCards({
  summary,
}: {
  summary: StudentDevelopmentSummary;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard
        label="Development"
        content={
          <DevelopmentStatusBadge
            status={summary.developmentStatus}
          />
        }
      />

      <SummaryCard
        label="Average score"
        value={formatPercentage(
          summary.averageNormalizedScore,
        )}
      />

      <SummaryCard
        label="Latest score"
        value={formatPercentage(
          summary.latestNormalizedScore,
        )}
      />

      <SummaryCard
        label="Score trend"
        content={
          <TrendValue
            value={summary.scoreTrend}
          />
        }
      />

      <SummaryCard
        label="Attendance"
        value={formatPercentage(
          summary.attendancePercentage,
        )}
      />

      <SummaryCard
        label="Curriculum"
        value={formatPercentage(
          summary.groupCurriculumCompletionPercentage,
        )}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  content,
}: {
  label: string;
  value?: string;
  content?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-3">
        {content ?? (
          <p className="text-xl font-semibold">
            {value}
          </p>
        )}
      </div>
    </article>
  );
}

function TrendValue({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <p className="text-xl font-semibold text-slate-500">
        —
      </p>
    );
  }

  const positive = value > 0;
  const negative = value < 0;

  return (
    <p
      className={`text-xl font-semibold ${
        positive
          ? "text-green-700"
          : negative
            ? "text-red-700"
            : "text-slate-700"
      }`}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}
    </p>
  );
}

function formatPercentage(
  value: number | null,
): string {
  return value === null
    ? "—"
    : `${value.toFixed(2)}%`;
}
