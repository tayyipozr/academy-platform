import type {
  CriterionAverage,
} from "./types";

export function CriterionAveragesTable({
  criteria,
}: {
  criteria: CriterionAverage[];
}) {
  if (criteria.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
        No criterion averages are available.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="border-b p-5">
        <h3 className="text-lg font-semibold">
          Criterion averages
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Average published scores by evaluation
          criterion.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-4">Template</th>
              <th className="p-4">Criterion</th>
              <th className="p-4">Weight</th>
              <th className="p-4">
                Evaluations
              </th>
              <th className="p-4">
                Average score
              </th>
              <th className="p-4">
                Normalized
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {criteria.map((criterion) => (
              <tr
                key={`${criterion.templateId}-${criterion.criterionId}`}
              >
                <td className="p-4">
                  {criterion.templateName}
                </td>

                <td className="p-4">
                  <p className="font-medium">
                    {criterion.criterionName}
                  </p>

                  <p className="text-sm text-slate-500">
                    {criterion.criterionCode}
                  </p>
                </td>

                <td className="p-4">
                  {criterion.weightPercentage.toFixed(
                    2,
                  )}
                  %
                </td>

                <td className="p-4">
                  {criterion.evaluationCount}
                </td>

                <td className="p-4">
                  {criterion.averageScore.toFixed(2)}
                </td>

                <td className="p-4">
                  <NormalizedScoreBadge
                    score={
                      criterion.averageNormalizedScore
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NormalizedScoreBadge({
  score,
}: {
  score: number;
}) {
  const style =
    score >= 85
      ? "bg-green-100 text-green-700"
      : score >= 70
        ? "bg-blue-100 text-blue-700"
        : score >= 50
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {score.toFixed(2)}%
    </span>
  );
}
