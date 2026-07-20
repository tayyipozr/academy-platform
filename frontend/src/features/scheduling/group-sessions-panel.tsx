"use client";

import { useMemo, useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  CurriculumUnitProgress,
} from "@/features/group-curricula/types";

import type {
  AcademyGroup,
  GroupStaffAssignment,
} from "@/features/groups/types";

import {
  createManualSession,
  getSessions,
  rescheduleSession,
  updateSessionStatus,
} from "./api";

import { ManualSessionDialog } from "./manual-session-dialog";
import type {
  ManualSessionFormValues,
} from "./manual-session-schema";

import { RescheduleSessionDialog } from "./reschedule-session-dialog";
import type {
  RescheduleSessionFormValues,
} from "./reschedule-session-schema";

import {
  SessionStatusDialog,
} from "./session-status-dialog";

import type {
  SessionStatusFormValues,
} from "./session-status-schema";

import { SessionTable } from "./session-table";
import { schedulingQueryKeys } from "./query-keys";

import type {
  LessonSession,
  SessionStatus,
} from "./types";

import { getApiErrorMessage } from "@/lib/api/error-message";

type DialogState =
  | { type: "create" }
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

type GroupSessionsPanelProps = {
  group: AcademyGroup;
  units: CurriculumUnitProgress[];
  staffAssignments: GroupStaffAssignment[];
  canRead: boolean;
  canManage: boolean;
  canReadAttendance: boolean;
};

export function GroupSessionsPanel({
  group,
  units,
  staffAssignments,
  canRead,
  canManage,
  canReadAttendance,
}: GroupSessionsPanelProps) {
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] =
    useState(group.termStartDate);

  const [dateTo, setDateTo] =
    useState(group.termEndDate);

  const [status, setStatus] =
    useState<SessionStatus | "">("");

  const [dialog, setDialog] =
    useState<DialogState>(null);

  const [dialogError, setDialogError] =
    useState<string | null>(null);

  const filters = {
    groupId: group.id,
    status,
    dateFrom: startOfDayIso(dateFrom),
    dateTo: endOfDayIso(dateTo),
  };

  const sessionsQuery = useQuery({
    queryKey:
      schedulingQueryKeys.sessions(filters),
    queryFn: () => getSessions(filters),
    enabled: canRead,
  });

  const createMutation = useMutation({
    mutationFn: (
      values: ManualSessionFormValues,
    ) =>
      createManualSession({
        groupId: group.id,
        curriculumUnitId:
          values.curriculumUnitId || null,
        leadStaffId:
          values.leadStaffId || null,
        title: values.title,
        description:
          values.description || null,
        scheduledStart: localToIso(
          values.scheduledStart,
        ),
        scheduledEnd: localToIso(
          values.scheduledEnd,
        ),
        location: values.location || null,
      }),
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
        scheduledStart: localToIso(
          values.scheduledStart,
        ),
        scheduledEnd: localToIso(
          values.scheduledEnd,
        ),
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

  const dialogSubmitting =
    createMutation.isPending ||
    rescheduleMutation.isPending ||
    statusMutation.isPending;

  const defaultTimes = useMemo(() => {
    const date = group.termStartDate;

    return {
      start: `${date}T18:00`,
      end: `${date}T19:00`,
    };
  }, [group.termStartDate]);

  async function refreshSessions() {
    await queryClient.invalidateQueries({
      queryKey: schedulingQueryKeys.all,
    });
  }

  function openDialog(next: DialogState) {
    setDialogError(null);
    setDialog(next);
  }

  function closeDialog() {
    if (!dialogSubmitting) {
      setDialog(null);
      setDialogError(null);
    }
  }

  async function submitCreate(
    values: ManualSessionFormValues,
  ) {
    try {
      await createMutation.mutateAsync(values);
      await refreshSessions();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The session could not be created.",
        ),
      );
    }
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

  if (!canRead) {
    return null;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
        <div>
          <h2 className="text-lg font-semibold">
            Sessions
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Manage generated and manually created sessions.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              openDialog({ type: "create" })
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Create manual session
          </button>
        )}
      </header>

      <div className="grid gap-3 border-b p-4 md:grid-cols-3">
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
          <option value="">All statuses</option>
          <option value="SCHEDULED">
            Scheduled
          </option>
          <option value="IN_PROGRESS">
            In progress
          </option>
          <option value="COMPLETED">
            Completed
          </option>
          <option value="POSTPONED">
            Postponed
          </option>
          <option value="CANCELLED">
            Cancelled
          </option>
        </select>
      </div>

      {sessionsQuery.isPending ? (
        <div className="p-10 text-center">
          Loading sessions...
        </div>
      ) : sessionsQuery.isError ? (
        <div className="p-10 text-center text-red-600">
          {getApiErrorMessage(
            sessionsQuery.error,
          )}
        </div>
      ) : (
        <SessionTable
          sessions={sessionsQuery.data ?? []}
          canManage={canManage}
          canReadAttendance={canReadAttendance}
          onReschedule={(session) =>
            openDialog({
              type: "reschedule",
              session,
            })
          }
          onStatusChange={(
            session,
            targetStatus,
          ) =>
            openDialog({
              type: "status",
              session,
              targetStatus,
            })
          }
        />
      )}

      {dialog?.type === "create" && (
        <ManualSessionDialog
          units={units}
          staffAssignments={staffAssignments}
          defaultStart={defaultTimes.start}
          defaultEnd={defaultTimes.end}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={submitCreate}
        />
      )}

      {dialog?.type === "reschedule" && (
        <RescheduleSessionDialog
          session={dialog.session}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
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
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={(values) =>
            submitStatus(dialog.session, values)
          }
        />
      )}
    </section>
  );
}

function localToIso(value: string): string {
  return new Date(value).toISOString();
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
