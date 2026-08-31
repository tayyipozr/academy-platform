"use client";

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  getSessions,
  rescheduleSession,
  updateSessionStatus,
} from "@/features/scheduling/api";

import { RescheduleSessionDialog } from "@/features/scheduling/reschedule-session-dialog";
import type {
  RescheduleSessionFormValues,
} from "@/features/scheduling/reschedule-session-schema";

import { SessionStatusDialog } from "@/features/scheduling/session-status-dialog";
import type {
  SessionStatusFormValues,
} from "@/features/scheduling/session-status-schema";

import { SessionTable } from "@/features/scheduling/session-table";
import { schedulingQueryKeys } from "@/features/scheduling/query-keys";

import type {
  LessonSession,
  SessionStatus,
} from "@/features/scheduling/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { useLocalization } from "@/features/localization/use-localization";

type DialogState =
  | {
    type: "reschedule";
    session: LessonSession;
  }
  | {
    type: "status";
    session: LessonSession;
    targetStatus: SessionStatus;
  }
  | null;

export default function SessionsPage() {
  const queryClient = useQueryClient();

  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(
    thirtyDaysLater.getDate() + 30,
  );

  const [dateFrom, setDateFrom] = useState(
    toDateInput(today),
  );

  const [dateTo, setDateTo] = useState(
    toDateInput(thirtyDaysLater),
  );

  const [status, setStatus] =
    useState<SessionStatus | "">("");

  const [dialog, setDialog] =
    useState<DialogState>(null);

  const [dialogError, setDialogError] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "sessions.read",
  );

  const canManage = hasPermission(
    currentUser,
    "sessions.manage",
  );

  const canReadAttendance = hasPermission(
    currentUser,
    "attendance.read",
  );

  const filters = {
    status,
    dateFrom: startOfDayIso(dateFrom),
    dateTo: endOfDayIso(dateTo),
  };

  const sessionsQuery = useQuery({
    queryKey:
      schedulingQueryKeys.sessions(filters),
    queryFn: () => getSessions(filters),
    enabled:
      currentUserQuery.isSuccess && canRead,
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      session,
      values,
    }: {
      session: LessonSession;
      values: RescheduleSessionFormValues;
    }) =>
      rescheduleSession(session.id, {
        scheduledStart: new Date(
          values.scheduledStart,
        ).toISOString(),

        scheduledEnd: new Date(
          values.scheduledEnd,
        ).toISOString(),

        location: values.location || null,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      session,
      values,
    }: {
      session: LessonSession;
      values: SessionStatusFormValues;
    }) =>
      updateSessionStatus(session.id, {
        status: values.status,
        completionNotes:
          values.completionNotes || null,
        cancellationReason:
          values.cancellationReason || null,
      }),
  });

  const submitting =
    rescheduleMutation.isPending ||
    statusMutation.isPending;

  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.schedule;
  const common = dictionary.common;

  async function refreshSessions() {
    await queryClient.invalidateQueries({
      queryKey: schedulingQueryKeys.all,
    });
  }

  async function submitReschedule(
    session: LessonSession,
    values: RescheduleSessionFormValues,
  ) {
    try {
      await rescheduleMutation.mutateAsync({
        session,
        values,
      });

      await refreshSessions();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The session could not be rescheduled.",
        ),
      );
    }
  }

  async function submitStatus(
    session: LessonSession,
    values: SessionStatusFormValues,
  ) {
    try {
      await statusMutation.mutateAsync({
        session,
        values,
      });

      await refreshSessions();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The session status could not be updated.",
        ),
      );
    }
  }

  if (currentUserQuery.isPending) {
    return <main className="p-8">Loading...</main>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        {!canRead ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {common.messages.noPermission}
          </div>
        ) : (
          <>
            <header>
              <h1 className="text-2xl font-bold">
                {t.mySchedule}
              </h1>

              <p className="mt-1 text-slate-600">
                {t.description}
              </p>
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                className="rounded-lg border px-3 py-2"
              />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                    | SessionStatus
                    | "",
                  )
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="">
                  {common.filters.allStatuses}
                </option>
                <option value="SCHEDULED">
                  {common.statuses.SCHEDULED}
                </option>
                <option value="IN_PROGRESS">
                  {common.statuses.IN_PROGRESS}
                </option>
                <option value="COMPLETED">
                  {common.statuses.COMPLETED}
                </option>
                <option value="POSTPONED">
                  {common.statuses.POSTPONED}
                </option>
                <option value="CANCELLED">
                  {common.statuses.CANCELLED}
                </option>
              </select>
            </section>

            <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
              {sessionsQuery.isPending ? (
                <div className="p-10 text-center">
                  {t.loading}
                </div>
              ) : sessionsQuery.isError ? (
                <div className="p-10 text-center text-red-600">
                  {getApiErrorMessage(
                    sessionsQuery.error,
                  )}
                </div>
              ) : (
                <SessionTable
                  sessions={
                    sessionsQuery.data ?? []
                  }
                  canManage={canManage}
                  canReadAttendance={canReadAttendance}
                  onReschedule={(session) => {
                    setDialogError(null);
                    setDialog({
                      type: "reschedule",
                      session,
                    });
                  }}
                  onStatusChange={(
                    session,
                    targetStatus,
                  ) => {
                    setDialogError(null);
                    setDialog({
                      type: "status",
                      session,
                      targetStatus,
                    });
                  }}
                />
              )}
            </section>
          </>
        )}
      </main>

      {dialog?.type === "reschedule" && (
        <RescheduleSessionDialog
          session={dialog.session}
          submitting={submitting}
          errorMessage={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(values) =>
            submitReschedule(
              dialog.session,
              values,
            )
          }
        />
      )}

      {dialog?.type === "status" && (
        <SessionStatusDialog
          session={dialog.session}
          targetStatus={dialog.targetStatus}
          submitting={submitting}
          errorMessage={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(values) =>
            submitStatus(dialog.session, values)
          }
        />
      )}
    </div>
  );
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDayIso(date: string): string {
  return new Date(
    `${date}T00:00:00`,
  ).toISOString();
}

function endOfDayIso(date: string): string {
  return new Date(
    `${date}T23:59:59.999`,
  ).toISOString();
}
