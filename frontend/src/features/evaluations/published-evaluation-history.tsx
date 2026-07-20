import type {
  PublishedEvaluation,
} from "./types";

export function PublishedEvaluationHistory({
  evaluations,
}: {
  evaluations: PublishedEvaluation[];
}) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
        No published evaluations are available.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="border-b p-5">
        <h3 className="text-lg font-semibold">
          Published evaluations
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Evaluation details visible in development
          reports.
        </p>
      </header>

      <div className="divide-y">
        {evaluations.map((evaluation) => (
          <details
            key={evaluation.id}
            className="group"
          >
            <summary className="cursor-pointer list-none p-5 hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {evaluation.templateName}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {evaluation.groupName} ·{" "}
                    {formatDate(
                      evaluation.evaluationDate,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Evaluator:{" "}
                    {evaluation.evaluatorName ||
                      "Unknown"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {evaluation.passed !== null && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${evaluation.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {evaluation.passed
                        ? "Passed"
                        : "Below target"}
                    </span>
                  )}

                  <span className="text-2xl font-bold text-blue-700">
                    {evaluation.normalizedScore.toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>
              </div>
            </summary>

            <div className="border-t bg-slate-50 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <ScoreItem
                  label="Overall score"
                  value={formatNumber(
                    evaluation.overallScore,
                  )}
                />

                <ScoreItem
                  label="Score range"
                  value={`${formatNumber(
                    evaluation.minimumScore,
                  )} – ${formatNumber(
                    evaluation.maximumScore,
                  )}`}
                />

                <ScoreItem
                  label="Passing score"
                  value={
                    evaluation.passingScore ===
                      null
                      ? "Not defined"
                      : formatNumber(
                        evaluation.passingScore,
                      )
                  }
                />
              </div>

              {evaluation.evaluatorComment && (
                <div className="mt-5 rounded-lg bg-white p-4">
                  <p className="text-sm font-medium">
                    Overall evaluator comment
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {evaluation.evaluatorComment}
                  </p>
                </div>
              )}

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[750px] text-left">
                  <thead className="border-b">
                    <tr>
                      <th className="p-3">
                        Criterion
                      </th>
                      <th className="p-3">
                        Weight
                      </th>
                      <th className="p-3">
                        Score
                      </th>
                      <th className="p-3">
                        Weighted
                      </th>
                      <th className="p-3">
                        Comment
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {evaluation.scores.map(
                      (score) => (
                        <tr
                          key={score.criterionId}
                        >
                          <td className="p-3">
                            <p className="font-medium">
                              {score.criterionName}
                            </p>

                            <p className="text-sm text-slate-500">
                              {score.criterionCode}
                            </p>
                          </td>

                          <td className="p-3">
                            {score.weightPercentage.toFixed(
                              2,
                            )}
                            %
                          </td>

                          <td className="p-3">
                            {formatNumber(
                              score.score,
                            )}
                          </td>

                          <td className="p-3">
                            {formatNumber(
                              score.weightedScore,
                            )}
                          </td>

                          <td className="max-w-md whitespace-pre-wrap p-3 text-sm">
                            {score.evaluatorComment ||
                              "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ScoreItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold">
        {value}
      </p>
    </article>
  );
}

function formatDate(value: string): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString();
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
}
