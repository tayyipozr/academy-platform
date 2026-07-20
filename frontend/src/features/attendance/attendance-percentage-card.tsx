export function AttendancePercentageCard({
  percentage,
}: {
  percentage: number;
}) {
  const color =
    percentage >= 90
      ? "text-green-700"
      : percentage >= 75
        ? "text-blue-700"
        : percentage >= 60
          ? "text-amber-700"
          : "text-red-700";

  const progressColor =
    percentage >= 90
      ? "bg-green-600"
      : percentage >= 75
        ? "bg-blue-600"
        : percentage >= 60
          ? "bg-amber-500"
          : "bg-red-600";

  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        Attendance percentage
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${color}`}
      >
        {percentage.toFixed(2)}%
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${progressColor}`}
          style={{
            width: `${Math.min(
              percentage,
              100,
            )}%`,
          }}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Present and late records count as attended.
        Excused absences are excluded from the
        denominator.
      </p>
    </article>
  );
}
