import type {
  StudentEvaluationStatus,
} from "./types";

const styles: Record<
  StudentEvaluationStatus,
  string
> = {
  DRAFT: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
};

export function EvaluationStatusBadge({
  status,
}: {
  status: StudentEvaluationStatus;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
