"use client";

import Link from "next/link";

import type {
  LessonSession,
  SessionStatus,
} from "./types";

type SessionTableProps = {
  sessions: LessonSession[];
  canManage: boolean;
  onReschedule: (
    session: LessonSession,
  ) => void;
  onStatusChange: (
    session: LessonSession,
    status: SessionStatus,
  ) => void;
};

export function SessionTable({
  sessions,
  canManage,
  onReschedule,
  onStatusChange,
}: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        No sessions were found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="p-4">Session</th>
            <th className="p-4">Group</th>
            <th className="p-4">Date and time</th>
            <th className="p-4">Instructor</th>
            <th className="p-4">
              Curriculum unit
            </th>
            <th className="p-4">Status</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="p-4">
                <p className="font-medium">
                  {session.title}
                </p>

                <p className="text-sm text-slate-500">
                  {session.location || "No location"}
                </p>

                {session.scheduleRuleId && (
                  <p className="text-xs text-slate-400">
                    Generated session
                  </p>
                )}
              </td>

              <td className="p-4">
                <Link
                  href={`/dashboard/groups/${session.groupId}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {session.groupName}
                </Link>

                <p className="text-sm text-slate-500">
                  {session.groupCode}
                </p>
              </td>

              <td className="p-4 text-sm">
                <p>
                  {new Date(
                    session.scheduledStart,
                  ).toLocaleDateString()}
                </p>

                <p className="text-slate-500">
                  {new Date(
                    session.scheduledStart,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(
                    session.scheduledEnd,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </td>

              <td className="p-4">
                {session.leadStaffName || "—"}
              </td>

              <td className="p-4">
                {session.curriculumUnitTitle ||
                  "—"}
              </td>

              <td className="p-4">
                <SessionStatusBadge
                  status={session.status}
                />
              </td>

              <td className="p-4">
                {canManage && (
                  <SessionActions
                    session={session}
                    onReschedule={onReschedule}
                    onStatusChange={onStatusChange}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionActions({
  session,
  onReschedule,
  onStatusChange,
}: {
  session: LessonSession;
  onReschedule: (
    session: LessonSession,
  ) => void;
  onStatusChange: (
    session: LessonSession,
    status: SessionStatus,
  ) => void;
}) {
  const transitions: Record<
    SessionStatus,
    SessionStatus[]
  > = {
    SCHEDULED: [
      "IN_PROGRESS",
      "POSTPONED",
      "CANCELLED",
    ],
    POSTPONED: [
      "SCHEDULED",
      "CANCELLED",
    ],
    IN_PROGRESS: [
      "COMPLETED",
      "CANCELLED",
    ],
    COMPLETED: [],
    CANCELLED: [],
  };

  const canReschedule = [
    "SCHEDULED",
    "POSTPONED",
  ].includes(session.status);

  return (
    <div className="flex flex-wrap gap-2">
      {canReschedule && (
        <button
          type="button"
          onClick={() => onReschedule(session)}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Reschedule
        </button>
      )}

      {transitions[session.status].length > 0 && (
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              onStatusChange(
                session,
                event.target.value as SessionStatus,
              );

              event.target.value = "";
            }
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Change status</option>

          {transitions[session.status].map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>
      )}
    </div>
  );
}

function SessionStatusBadge({
  status,
}: {
  status: SessionStatus;
}) {
  const styles: Record<
    SessionStatus,
    string
  > = {
    SCHEDULED:
      "bg-blue-100 text-blue-700",
    IN_PROGRESS:
      "bg-amber-100 text-amber-700",
    COMPLETED:
      "bg-green-100 text-green-700",
    CANCELLED:
      "bg-red-100 text-red-700",
    POSTPONED:
      "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
