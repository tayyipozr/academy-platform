import type {
  StudentProgressReport,
} from "./types";

export function ProgressSummaryCards({
  report,
}: {
  report: StudentProgressReport;
}) {
  const cards = [
    {
      label: "Attendance",
      value: `${report.attendance.attendancePercentage.toFixed(
        2,
      )}%`,
      style: "text-blue-700",
    },
    {
      label: "Average score",
      value:
        report.development
          .averageNormalizedScore === null
          ? "—"
          : `${report.development.averageNormalizedScore.toFixed(
              2,
            )}%`,
      style: "text-purple-700",
    },
    {
      label: "Curriculum",
      value:
        report.development
          .groupCurriculumCompletionPercentage ===
        null
          ? "—"
          : `${report.development.groupCurriculumCompletionPercentage.toFixed(
              2,
            )}%`,
      style: "text-green-700",
    },
    {
      label: "Completed lessons",
      value:
        report.lessons.completedSessionCount.toString(),
      style: "text-slate-900",
    },
    {
      label: "Attended lessons",
      value:
        report.lessons.attendedCompletedSessionCount.toString(),
      style: "text-green-700",
    },
    {
      label: "Missed lessons",
      value:
        report.lessons.missedCompletedSessionCount.toString(),
      style: "text-red-700",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </p>

          <p
            className={`mt-2 text-2xl font-semibold ${card.style}`}
          >
            {card.value}
          </p>
        </article>
      ))}
    </section>
  );
}
