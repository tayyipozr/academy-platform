import type {
  DevelopmentStatus,
} from "./types";

const styles: Record<
  DevelopmentStatus,
  string
> = {
  NO_DATA: "bg-slate-200 text-slate-700",
  NEEDS_SUPPORT: "bg-red-100 text-red-700",
  DEVELOPING: "bg-amber-100 text-amber-700",
  ON_TRACK: "bg-blue-100 text-blue-700",
  EXCEEDING_EXPECTATIONS:
    "bg-green-100 text-green-700",
};

const labels: Record<
  DevelopmentStatus,
  string
> = {
  NO_DATA: "No data",
  NEEDS_SUPPORT: "Needs support",
  DEVELOPING: "Developing",
  ON_TRACK: "On track",
  EXCEEDING_EXPECTATIONS:
    "Exceeding expectations",
};

export function DevelopmentStatusBadge({
  status,
}: {
  status: DevelopmentStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
