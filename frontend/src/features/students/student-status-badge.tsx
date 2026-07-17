import type { StudentStatus } from "./types";

const styles: Record<StudentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-200 text-slate-700",
  GRADUATED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const labels: Record<StudentStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  GRADUATED: "Graduated",
  ARCHIVED: "Archived",
};

export function StudentStatusBadge({
  status,
}: {
  status: StudentStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
