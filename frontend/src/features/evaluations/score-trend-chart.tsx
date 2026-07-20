import type {
  EvaluationTrendPoint,
} from "./types";

const WIDTH = 800;
const HEIGHT = 280;
const PADDING_X = 55;
const PADDING_Y = 35;

export function ScoreTrendChart({
  points,
}: {
  points: EvaluationTrendPoint[];
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
        No published evaluation trend is available.
      </div>
    );
  }

  const sorted = [...points].sort(
    (first, second) =>
      first.evaluationDate.localeCompare(
        second.evaluationDate,
      ),
  );

  const chartWidth =
    WIDTH - PADDING_X * 2;

  const chartHeight =
    HEIGHT - PADDING_Y * 2;

  const xForIndex = (index: number) => {
    if (sorted.length === 1) {
      return WIDTH / 2;
    }

    return (
      PADDING_X +
      (index / (sorted.length - 1)) *
        chartWidth
    );
  };

  const yForScore = (score: number) =>
    PADDING_Y +
    ((100 - clamp(score, 0, 100)) / 100) *
      chartHeight;

  const polylinePoints = sorted
    .map(
      (point, index) =>
        `${xForIndex(index)},${yForScore(
          point.normalizedScore,
        )}`,
    )
    .join(" ");

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <header>
        <h3 className="text-lg font-semibold">
          Score trend
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Published scores normalized to a 0–100 scale.
        </p>
      </header>

      <div className="mt-5 overflow-x-auto">
        <svg
          role="img"
          aria-label="Student score trend"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-[650px]"
        >
          {[0, 25, 50, 75, 100].map(
            (score) => {
              const y = yForScore(score);

              return (
                <g key={score}>
                  <line
                    x1={PADDING_X}
                    y1={y}
                    x2={WIDTH - PADDING_X}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  <text
                    x={PADDING_X - 12}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#64748b"
                  >
                    {score}
                  </text>
                </g>
              );
            },
          )}

          {sorted.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {sorted.map((point, index) => {
            const x = xForIndex(index);
            const y = yForScore(
              point.normalizedScore,
            );

            return (
              <g key={point.evaluationId}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="#2563eb"
                >
                  <title>
                    {point.evaluationDate}:{" "}
                    {point.normalizedScore.toFixed(
                      2,
                    )}
                    %
                  </title>
                </circle>

                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#1e293b"
                >
                  {point.normalizedScore.toFixed(
                    1,
                  )}
                </text>

                <text
                  x={x}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                >
                  {formatShortDate(
                    point.evaluationDate,
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function formatShortDate(
  value: string,
): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
