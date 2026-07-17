import type {
  MembershipStatus,
} from "./types";

const styles: Record<MembershipStatus, string> = {
  ACTIVE:
    "bg-green-100 text-green-700",
  INVITED:
    "bg-blue-100 text-blue-700",
  SUSPENDED:
    "bg-red-100 text-red-700",
  ARCHIVED:
    "bg-slate-200 text-slate-700",
};

const labels: Record<MembershipStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

export function UserStatusBadge({
  status,
}: {
  status: MembershipStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
