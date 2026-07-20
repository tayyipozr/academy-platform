"use client";

import { useMemo, useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getCurricula } from "@/features/curricula/api";
import { curriculumQueryKeys } from "@/features/curricula/query-keys";
import type {
  AcademyGroup,
} from "@/features/groups/types";

import {
  assignCurriculumToGroup,
  endGroupCurriculumAssignment,
  getGroupCurriculumAssignments,
  getGroupCurriculumProgress,
  replaceGroupCurriculum,
  updateCurriculumUnitProgress,
} from "./api";

import { CurriculumAssignmentDialog } from "./curriculum-assignment-dialog";
import type {
  CurriculumAssignmentFormValues,
} from "./assignment-form-schema";

import {
  EndCurriculumAssignmentDialog,
  type EndCurriculumAssignmentFormValues,
} from "./end-assignment-dialog";

import { groupCurriculumQueryKeys } from "./query-keys";

import { UnitProgressDialog } from "./unit-progress-dialog";
import type {
  UnitProgressFormValues,
} from "./unit-progress-schema";

import type {
  CurriculumUnitProgress,
  GroupCurriculumAssignment,
} from "./types";

import { getApiErrorMessage } from "@/lib/api/error-message";

type DialogState =
  | {
      type: "assign";
    }
  | {
      type: "replace";
      assignment: GroupCurriculumAssignment;
    }
  | {
      type: "end";
      assignment: GroupCurriculumAssignment;
    }
  | {
      type: "progress";
      unit: CurriculumUnitProgress;
    }
  | null;

type GroupCurriculumPanelProps = {
  group: AcademyGroup;
  canRead: boolean;
  canManage: boolean;
};

export function GroupCurriculumPanel({
  group,
  canRead,
  canManage,
}: GroupCurriculumPanelProps) {
  const queryClient = useQueryClient();

  const [includeHistory, setIncludeHistory] =
    useState(false);

  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState<string | null>(null);

  const [dialog, setDialog] =
    useState<DialogState>(null);

  const [dialogError, setDialogError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const assignmentsQuery = useQuery({
    queryKey:
      groupCurriculumQueryKeys.assignments(
        group.id,
        includeHistory,
      ),
    queryFn: () =>
      getGroupCurriculumAssignments(
        group.id,
        includeHistory,
      ),
    enabled: canRead,
  });

  const curriculaQuery = useQuery({
    queryKey: curriculumQueryKeys.list({
      search: "",
      programId: group.programId,
      includeArchived: false,
    }),
    queryFn: () =>
      getCurricula({
        search: "",
        programId: group.programId,
        includeArchived: false,
      }),
    enabled: canManage,
  });

  const activeAssignment = useMemo(
    () =>
      assignmentsQuery.data?.find(
        (assignment) =>
          assignment.status === "ACTIVE",
      ) ?? null,
    [assignmentsQuery.data],
  );

  const effectiveAssignmentId = useMemo(() => {
    const assignments =
      assignmentsQuery.data ?? [];

    if (
      selectedAssignmentId &&
      assignments.some(
        (assignment) =>
          assignment.id === selectedAssignmentId,
      )
    ) {
      return selectedAssignmentId;
    }

    return (
      activeAssignment?.id ??
      assignments[0]?.id ??
      null
    );
  }, [
    activeAssignment,
    assignmentsQuery.data,
    selectedAssignmentId,
  ]);

  const progressQuery = useQuery({
    queryKey: groupCurriculumQueryKeys.progress(
      group.id,
      effectiveAssignmentId ?? "",
    ),
    queryFn: () =>
      getGroupCurriculumProgress(
        group.id,
        effectiveAssignmentId!,
      ),
    enabled:
      canRead &&
      Boolean(effectiveAssignmentId),
  });

  const assignMutation = useMutation({
    mutationFn: (
      values: CurriculumAssignmentFormValues,
    ) =>
      assignCurriculumToGroup(group.id, {
        curriculumId: values.curriculumId,
        startDate: values.operationDate,
      }),
  });

  const replaceMutation = useMutation({
    mutationFn: (
      values: CurriculumAssignmentFormValues,
    ) =>
      replaceGroupCurriculum(group.id, {
        curriculumId: values.curriculumId,
        replacementDate:
          values.operationDate,
        reason: values.reason || null,
      }),
  });

  const endMutation = useMutation({
    mutationFn: ({
      assignment,
      values,
    }: {
      assignment: GroupCurriculumAssignment;
      values: EndCurriculumAssignmentFormValues;
    }) =>
      endGroupCurriculumAssignment(
        group.id,
        assignment.id,
        {
          status: values.status,
          endDate: values.endDate,
          reason: values.reason || null,
        },
      ),
  });

  const progressMutation = useMutation({
    mutationFn: ({
      unit,
      values,
    }: {
      unit: CurriculumUnitProgress;
      values: UnitProgressFormValues;
    }) =>
      updateCurriculumUnitProgress(
        group.id,
        unit.assignmentId,
        unit.unitId,
        {
          status: values.status,
          completedSessions: Number(
            values.completedSessions,
          ),
        },
      ),
  });

  const dialogSubmitting =
    assignMutation.isPending ||
    replaceMutation.isPending ||
    endMutation.isPending ||
    progressMutation.isPending;

  const groupAcceptsAssignments = [
    "DRAFT",
    "ACTIVE",
  ].includes(group.status);

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          groupCurriculumQueryKeys.all,
      }),

      queryClient.invalidateQueries({
        queryKey: ["groups"],
      }),
    ]);
  }

  function openDialog(nextDialog: DialogState) {
    setDialogError(null);
    setPageError(null);
    setDialog(nextDialog);
  }

  function closeDialog() {
    if (dialogSubmitting) {
      return;
    }

    setDialog(null);
    setDialogError(null);
  }

  async function submitAssignment(
    values: CurriculumAssignmentFormValues,
  ) {
    setDialogError(null);

    try {
      const result =
        await assignMutation.mutateAsync(values);

      setSelectedAssignmentId(
        result.assignment.id,
      );

      await refreshData();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The curriculum could not be assigned.",
        ),
      );
    }
  }

  async function submitReplacement(
    values: CurriculumAssignmentFormValues,
  ) {
    setDialogError(null);

    try {
      const result =
        await replaceMutation.mutateAsync(
          values,
        );

      setSelectedAssignmentId(
        result.assignment.id,
      );

      await refreshData();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The curriculum could not be replaced.",
        ),
      );
    }
  }

  async function submitEndAssignment(
    assignment: GroupCurriculumAssignment,
    values: EndCurriculumAssignmentFormValues,
  ) {
    setDialogError(null);

    try {
      await endMutation.mutateAsync({
        assignment,
        values,
      });

      setSelectedAssignmentId(
        assignment.id,
      );

      await refreshData();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The curriculum assignment could not be ended.",
        ),
      );
    }
  }

  async function submitProgress(
    unit: CurriculumUnitProgress,
    values: UnitProgressFormValues,
  ) {
    setDialogError(null);

    try {
      await progressMutation.mutateAsync({
        unit,
        values,
      });

      await refreshData();
      setDialog(null);
    } catch (error) {
      setDialogError(
        getApiErrorMessage(
          error,
          "The curriculum progress could not be updated.",
        ),
      );
    }
  }

  if (!canRead) {
    return null;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <h2 className="text-lg font-semibold">
            Group curriculum
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Manage curriculum assignment and unit-level
            progress.
          </p>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(event) =>
                setIncludeHistory(
                  event.target.checked,
                )
              }
            />

            Include assignment history
          </label>
        </div>

        {canManage &&
          groupAcceptsAssignments && (
            <div className="flex flex-wrap gap-2">
              {!activeAssignment && (
                <button
                  type="button"
                  onClick={() =>
                    openDialog({
                      type: "assign",
                    })
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                >
                  Assign curriculum
                </button>
              )}

              {activeAssignment && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      openDialog({
                        type: "replace",
                        assignment:
                          activeAssignment,
                      })
                    }
                    className="rounded-lg border border-blue-300 px-4 py-2 font-medium text-blue-700"
                  >
                    Replace curriculum
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openDialog({
                        type: "end",
                        assignment:
                          activeAssignment,
                      })
                    }
                    className="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700"
                  >
                    End assignment
                  </button>
                </>
              )}
            </div>
          )}
      </header>

      {pageError && (
        <div className="m-6 rounded-lg bg-red-50 p-4 text-red-700">
          {pageError}
        </div>
      )}

      {assignmentsQuery.isPending && (
        <div className="p-8 text-center text-slate-500">
          Loading curriculum assignments...
        </div>
      )}

      {assignmentsQuery.isError && (
        <div className="p-8 text-center text-red-600">
          {getApiErrorMessage(
            assignmentsQuery.error,
            "The curriculum assignments could not be loaded.",
          )}
        </div>
      )}

      {assignmentsQuery.data?.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No curriculum has been assigned to this group.
        </div>
      )}

      {assignmentsQuery.data &&
        assignmentsQuery.data.length > 0 && (
          <div className="border-b border-slate-200 p-6">
            <h3 className="font-semibold">
              Assignments
            </h3>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {assignmentsQuery.data.map(
                (assignment) => {
                  const selected =
                    assignment.id ===
                    effectiveAssignmentId;

                  return (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() =>
                        setSelectedAssignmentId(
                          assignment.id,
                        )
                      }
                      className={`rounded-lg border p-4 text-left ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {
                              assignment.curriculumName
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              assignment.curriculumCode
                            }{" "}
                            · Version{" "}
                            {
                              assignment.curriculumVersion
                            }
                          </p>
                        </div>

                        <AssignmentStatusBadge
                          status={
                            assignment.status
                          }
                        />
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        {assignment.startDate}
                        {assignment.endDate
                          ? ` – ${assignment.endDate}`
                          : " – Present"}
                      </p>

                      {assignment.endReason && (
                        <p className="mt-2 text-xs text-slate-500">
                          Reason:{" "}
                          {assignment.endReason}
                        </p>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        )}

      {effectiveAssignmentId &&
        progressQuery.isPending && (
          <div className="p-8 text-center text-slate-500">
            Loading curriculum progress...
          </div>
        )}

      {effectiveAssignmentId &&
        progressQuery.isError && (
          <div className="p-8 text-center text-red-600">
            {getApiErrorMessage(
              progressQuery.error,
              "The curriculum progress could not be loaded.",
            )}
          </div>
        )}

      {progressQuery.data && (
        <CurriculumProgressSection
          progress={progressQuery.data}
          canManage={
            canManage &&
            progressQuery.data.assignment
              .status === "ACTIVE"
          }
          onEditUnit={(unit) =>
            openDialog({
              type: "progress",
              unit,
            })
          }
        />
      )}

      {dialog?.type === "assign" && (
        <CurriculumAssignmentDialog
          mode="assign"
          curricula={
            curriculaQuery.data ?? []
          }
          defaultDate={group.termStartDate}
          minimumDate={group.termStartDate}
          maximumDate={group.termEndDate}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={submitAssignment}
        />
      )}

      {dialog?.type === "replace" && (
        <CurriculumAssignmentDialog
          mode="replace"
          curricula={
            curriculaQuery.data ?? []
          }
          currentCurriculumId={
            dialog.assignment.curriculumId
          }
          defaultDate={
            dialog.assignment.startDate
          }
          minimumDate={
            dialog.assignment.startDate
          }
          maximumDate={group.termEndDate}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={submitReplacement}
        />
      )}

      {dialog?.type === "end" && (
        <EndCurriculumAssignmentDialog
          assignment={dialog.assignment}
          defaultEndDate={group.termEndDate}
          maximumEndDate={group.termEndDate}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={(values) =>
            submitEndAssignment(
              dialog.assignment,
              values,
            )
          }
        />
      )}

      {dialog?.type === "progress" && (
        <UnitProgressDialog
          unit={dialog.unit}
          submitting={dialogSubmitting}
          errorMessage={dialogError}
          onClose={closeDialog}
          onSubmit={(values) =>
            submitProgress(
              dialog.unit,
              values,
            )
          }
        />
      )}
    </section>
  );
}

function CurriculumProgressSection({
  progress,
  canManage,
  onEditUnit,
}: {
  progress: NonNullable<
    Awaited<
      ReturnType<
        typeof getGroupCurriculumProgress
      >
    >
  >;
  canManage: boolean;
  onEditUnit: (
    unit: CurriculumUnitProgress,
  ) => void;
}) {
  return (
    <div>
      <div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <ProgressSummary
          label="Completion"
          value={`${progress.completionPercentage}%`}
        />

        <ProgressSummary
          label="Total units"
          value={progress.totalUnitCount.toString()}
        />

        <ProgressSummary
          label="Completed"
          value={progress.completedUnitCount.toString()}
        />

        <ProgressSummary
          label="In progress"
          value={progress.inProgressUnitCount.toString()}
        />

        <ProgressSummary
          label="Completed sessions"
          value={`${progress.completedSessionCount}/${progress.totalEstimatedSessions}`}
        />
      </div>

      <div className="p-6">
        <div
          className="h-3 overflow-hidden rounded-full bg-slate-200"
          aria-label={`Curriculum completion ${progress.completionPercentage}%`}
        >
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{
              width: `${Math.min(
                progress.completionPercentage,
                100,
              )}%`,
            }}
          />
        </div>
      </div>

      {progress.units.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          No curriculum-unit progress records exist.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="border-y border-slate-200 bg-slate-50">
              <tr>
                <th className="p-4">Unit</th>
                <th className="p-4">
                  Estimated sessions
                </th>
                <th className="p-4">
                  Completed sessions
                </th>
                <th className="p-4">Status</th>
                <th className="p-4">
                  Completed at
                </th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {progress.units.map((unit) => (
                <tr key={unit.id}>
                  <td className="p-4">
                    <p className="font-medium">
                      {unit.sequenceNumber}.{" "}
                      {unit.unitTitle}
                    </p>

                    <p className="text-sm text-slate-500">
                      {unit.unitCode}
                    </p>
                  </td>

                  <td className="p-4">
                    {unit.estimatedSessions ?? "—"}
                  </td>

                  <td className="p-4">
                    {unit.completedSessions}
                  </td>

                  <td className="p-4">
                    <UnitProgressStatusBadge
                      status={unit.status}
                    />
                  </td>

                  <td className="p-4 text-sm">
                    {unit.completedAt
                      ? new Date(
                          unit.completedAt,
                        ).toLocaleString()
                      : "—"}
                  </td>

                  <td className="p-4">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          onEditUnit(unit)
                        }
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                      >
                        Update progress
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProgressSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-slate-900">
        {value}
      </p>
    </article>
  );
}

function AssignmentStatusBadge({
  status,
}: {
  status: "ACTIVE" | "ENDED" | "CANCELLED";
}) {
  const styles = {
    ACTIVE: "bg-green-100 text-green-700",
    ENDED: "bg-blue-100 text-blue-700",
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

function UnitProgressStatusBadge({
  status,
}: {
  status:
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "COMPLETED";
}) {
  const styles = {
    NOT_STARTED:
      "bg-slate-200 text-slate-700",
    IN_PROGRESS:
      "bg-amber-100 text-amber-700",
    COMPLETED:
      "bg-green-100 text-green-700",
  } as const;

  const labels = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
  } as const;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
