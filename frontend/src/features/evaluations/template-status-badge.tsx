import type {
  EvaluationTemplateStatus,
} from "./types";

const styles: Record<
  EvaluationTemplateStatus,
  string
> = {
  DRAFT: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

export function TemplateStatusBadge({
  status,
}: {
  status: EvaluationTemplateStatus;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
