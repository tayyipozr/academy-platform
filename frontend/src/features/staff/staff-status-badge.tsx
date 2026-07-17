import type { EmploymentStatus } from "./types";

const styles: Record<EmploymentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_LEAVE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const labels: Record<EmploymentStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export function StaffStatusBadge({
  status,
}: {
  status: EmploymentStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
