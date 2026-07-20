import type {
  AttendanceChange,
  AttendanceCorrection,
} from "./types";

export function CorrectionHistory({
  corrections,
}: {
  corrections: AttendanceCorrection[];
}) {
  if (corrections.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No attendance corrections have been recorded.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {corrections.map((correction) => (
        <article
          key={correction.id}
          className="p-6"
        >
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">
                {correction.correctionReason}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Opened by{" "}
                {correction.openedByName ??
                  "Unknown user"}{" "}
                on{" "}
                {new Date(
                  correction.openedAt,
                ).toLocaleString()}
              </p>

              {correction.completedAt && (
                <p className="mt-1 text-sm text-slate-500">
                  Completed by{" "}
                  {correction.completedByName ??
                    "Unknown user"}{" "}
                  on{" "}
                  {new Date(
                    correction.completedAt,
                  ).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CorrectionStatusBadge
                status={correction.status}
              />

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                {correction.changeCount} changes
              </span>
            </div>
          </header>

          {correction.changes.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-y bg-slate-50">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">
                      Previous
                    </th>
                    <th className="p-3">New</th>
                    <th className="p-3">
                      Changed by
                    </th>
                    <th className="p-3">Changed at</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {correction.changes.map(
                    (change) => (
                      <ChangeRow
                        key={change.id}
                        change={change}
                      />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function ChangeRow({
  change,
}: {
  change: AttendanceChange;
}) {
  return (
    <tr>
      <td className="p-3">
        <p className="font-medium">
          {change.firstName} {change.lastName}
        </p>

        <p className="text-sm text-slate-500">
          {change.studentNumber}
        </p>
      </td>

      <td className="p-3">
        <AttendanceSnapshot
          status={change.previousStatus}
          arrivalTime={
            change.previousArrivalTime
          }
          departureTime={
            change.previousDepartureTime
          }
          note={change.previousNote}
        />
      </td>

      <td className="p-3">
        <AttendanceSnapshot
          status={change.newStatus}
          arrivalTime={change.newArrivalTime}
          departureTime={
            change.newDepartureTime
          }
          note={change.newNote}
        />
      </td>

      <td className="p-3 text-sm">
        {change.changedByName ??
          "Unknown user"}
      </td>

      <td className="p-3 text-sm">
        {new Date(
          change.changedAt,
        ).toLocaleString()}
      </td>
    </tr>
  );
}

function AttendanceSnapshot({
  status,
  arrivalTime,
  departureTime,
  note,
}: {
  status: string;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string | null;
}) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">
        {status.replaceAll("_", " ")}
      </p>

      {(arrivalTime || departureTime) && (
        <p className="text-slate-500">
          {arrivalTime?.slice(0, 5) ?? "—"} –{" "}
          {departureTime?.slice(0, 5) ?? "—"}
        </p>
      )}

      {note && (
        <p className="max-w-xs whitespace-pre-wrap text-slate-500">
          {note}
        </p>
      )}
    </div>
  );
}

function CorrectionStatusBadge({
  status,
}: {
  status: "OPEN" | "COMPLETED" | "CANCELLED";
}) {
  const styles = {
    OPEN: "bg-amber-100 text-amber-700",
    COMPLETED:
      "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  } as const;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
