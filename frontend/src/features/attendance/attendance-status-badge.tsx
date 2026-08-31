import { useLocalization } from "../localization/use-localization";
import type {
  AttendanceStatus,
} from "./types";

const styles: Record<
  AttendanceStatus,
  string
> = {
  NOT_RECORDED:
    "bg-slate-200 text-slate-700",
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-amber-100 text-amber-700",
  EXCUSED: "bg-blue-100 text-blue-700",
};

const labels: Record<
  AttendanceStatus,
  string
> = {
  NOT_RECORDED: "Not recorded",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

export function AttendanceStatusBadge({
  status,
}: {
  status: AttendanceStatus;
}) {

  const {
    statusLabel,
  } = useLocalization();

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
