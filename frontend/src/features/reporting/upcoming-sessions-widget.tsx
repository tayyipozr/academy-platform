import Link from "next/link";

import type {
  UpcomingSessionSummary,
} from "./types";
import { useLocalization } from "../localization/use-localization";

export function UpcomingSessionsWidget({
  sessions
}: {
  sessions: UpcomingSessionSummary[];
}) {

  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.dashboard;
  const common = dictionary.common;

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex items-center justify-between border-b p-5">
        <div>
          <h2 className="text-lg font-semibold">
            {t.upcomingSessions}
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {t.upcomingSessionsDescription}
          </p>
        </div>

        <Link
          href="/dashboard/sessions"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          {common.actions.viewSchedule}
        </Link>
      </header>

      {sessions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          {t.noUpcomingSessions}
        </div>
      ) : (
        <div className="divide-y">
          {sessions.map((session) => (
            <article
              key={session.sessionId}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-medium">
                  {session.title}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {session.groupName} ·{" "}
                  {session.groupCode}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {new Date(
                    session.scheduledStart,
                  ).toLocaleString()}
                </p>

                {session.location && (
                  <p className="mt-1 text-xs text-slate-500">
                    {session.location}
                  </p>
                )}
              </div>

              <div className="text-right">
                <SessionStatusBadge
                  status={session.status}
                />

                {session.leadStaffName && (
                  <p className="mt-2 text-xs text-slate-500">
                    {session.leadStaffName}
                  </p>
                )}

                <Link
                  href={`/dashboard/groups/${session.groupId}/schedule`}
                  className="mt-2 block text-sm font-medium text-blue-700 hover:underline"
                >
                  Open group
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SessionStatusBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "IN_PROGRESS"
      ? "bg-amber-100 text-amber-700"
      : status === "POSTPONED"
        ? "bg-purple-100 text-purple-700"
        : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
