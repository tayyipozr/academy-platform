"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createStudentEvaluation,
  getEvaluationCriteria,
  getEvaluationTemplates,
  publishStudentEvaluation,
  submitStudentEvaluation,
  updateStudentEvaluation,
} from "./api";

import { EvaluationStatusBadge } from "./evaluation-status-badge";
import { evaluationQueryKeys } from "./query-keys";

import type {
  EvaluationCriterion,
  EvaluationTemplate,
  SaveStudentEvaluationRequest,
  StudentEvaluation,
} from "./types";

import type {
  EditableScoreMap,
} from "./evaluation-editor-types";

import {
  getGroup,
  getGroupEnrollments,
  getGroups,
} from "@/features/groups/api";

import { getSessions } from "@/features/scheduling/api";

import { getApiErrorMessage } from "@/lib/api/error-message";

type EvaluationEditorProps = {
  initialEvaluation?: StudentEvaluation;
  canManage: boolean;
  canPublish: boolean;
};

export function EvaluationEditor({
  initialEvaluation,
  canManage,
  canPublish,
}: EvaluationEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const editable =
    canManage &&
    (
      initialEvaluation === undefined ||
      initialEvaluation.status === "DRAFT"
    );

  const [groupId, setGroupId] = useState(
    initialEvaluation?.groupId ?? "",
  );

  const [studentId, setStudentId] = useState(
    initialEvaluation?.studentId ?? "",
  );

  const [sessionId, setSessionId] = useState(
    initialEvaluation?.sessionId ?? "",
  );

  const [templateId, setTemplateId] = useState(
    initialEvaluation?.templateId ?? "",
  );

  const [evaluationDate, setEvaluationDate] =
    useState(
      initialEvaluation?.evaluationDate ??
        todayDate(),
    );

  const [evaluatorComment, setEvaluatorComment] =
    useState(
      initialEvaluation?.evaluatorComment ?? "",
    );

  const [scoreMap, setScoreMap] =
    useState<EditableScoreMap>(() => {
      const result: EditableScoreMap = {};

      for (
        const score of
        initialEvaluation?.scores ?? []
      ) {
        result[score.criterionId] = {
          score: score.score.toString(),
          comment:
            score.evaluatorComment ?? "",
        };
      }

      return result;
    });

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: [
      "groups",
      "evaluation-editor-options",
    ],

    queryFn: () =>
      getGroups({
        includeArchived: true,
      }),

    enabled: canManage || Boolean(initialEvaluation),
  });

  const selectedGroup =
    groupsQuery.data?.find(
      (group) => group.id === groupId,
    ) ?? null;

  const groupQuery = useQuery({
    queryKey: [
      "groups",
      "evaluation-editor",
      groupId,
    ],

    queryFn: () => getGroup(groupId),

    enabled:
      Boolean(groupId) &&
      selectedGroup === null,
  });

  const effectiveGroup =
    selectedGroup ?? groupQuery.data ?? null;

  const enrollmentsQuery = useQuery({
    queryKey: [
      "groups",
      groupId,
      "evaluation-enrollment-options",
    ],

    queryFn: () =>
      getGroupEnrollments(groupId, false),

    enabled: Boolean(groupId),
  });

  const templatesQuery = useQuery({
    queryKey:
      evaluationQueryKeys.templateList({
        search: "",
        programId:
          effectiveGroup?.programId ?? "",
        includeArchived: false,
      }),

    queryFn: () =>
      getEvaluationTemplates({
        programId:
          effectiveGroup!.programId,
        includeArchived: false,
      }),

    enabled:
      Boolean(effectiveGroup?.programId),
  });

  const criteriaQuery = useQuery({
    queryKey:
      evaluationQueryKeys.criteria(
        templateId,
      ),

    queryFn: () =>
      getEvaluationCriteria(templateId),

    enabled: Boolean(templateId),
  });

  const sessionsQuery = useQuery({
    queryKey: [
      "sessions",
      "evaluation-options",
      groupId,
      effectiveGroup?.termStartDate,
      effectiveGroup?.termEndDate,
    ],

    queryFn: () =>
      getSessions({
        groupId,
        dateFrom: dateStartIso(
          effectiveGroup!.termStartDate,
        ),
        dateTo: dateEndIso(
          effectiveGroup!.termEndDate,
        ),
      }),

    enabled:
      Boolean(groupId) &&
      Boolean(effectiveGroup),
  });

  const selectedTemplate =
    templatesQuery.data?.find(
      (template) =>
        template.id === templateId,
    ) ??
    existingTemplate(initialEvaluation) ??
    null;

  const criteria =
    criteriaQuery.data ??
    criteriaFromEvaluation(initialEvaluation);

  const availableStudents = useMemo(
    () =>
      enrollmentsQuery.data?.enrollments
        .filter(
          (enrollment) =>
            enrollment.status === "ACTIVE",
        )
        .map((enrollment) => ({
          id: enrollment.studentId,
          number: enrollment.studentNumber,
          firstName: enrollment.firstName,
          lastName: enrollment.lastName,
        })) ?? [],
    [enrollmentsQuery.data],
  );

  const liveCalculation = useMemo(
    () =>
      calculateWeightedScore(
        criteria,
        scoreMap,
      ),
    [criteria, scoreMap],
  );

  const createMutation = useMutation({
    mutationFn: createStudentEvaluation,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      evaluationId,
      request,
    }: {
      evaluationId: string;
      request: SaveStudentEvaluationRequest;
    }) =>
      updateStudentEvaluation(
        evaluationId,
        request,
      ),
  });

  const submitMutation = useMutation({
    mutationFn: submitStudentEvaluation,
  });

  const publishMutation = useMutation({
    mutationFn: publishStudentEvaluation,
  });

  const saving =
    createMutation.isPending ||
    updateMutation.isPending;

  const submitting =
    submitMutation.isPending;

  const publishing =
    publishMutation.isPending;

  function changeGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    setStudentId("");
    setSessionId("");
    setTemplateId("");
    setScoreMap({});
    setPageError(null);

    const nextGroup =
      groupsQuery.data?.find(
        (group) => group.id === nextGroupId,
      );

    if (nextGroup) {
      setEvaluationDate(
        nextGroup.termStartDate,
      );
    }
  }

  function changeTemplate(
    nextTemplateId: string,
  ) {
    setTemplateId(nextTemplateId);
    setScoreMap({});
    setPageError(null);
  }

  function changeSession(
    nextSessionId: string,
  ) {
    setSessionId(nextSessionId);

    const session =
      sessionsQuery.data?.find(
        (candidate) =>
          candidate.id === nextSessionId,
      );

    if (session) {
      setEvaluationDate(
        session.scheduledStart.slice(0, 10),
      );
    }
  }

  function updateScore(
    criterionId: string,
    patch: Partial<{
      score: string;
      comment: string;
    }>,
  ) {
    setScoreMap((current) => ({
      ...current,
      [criterionId]: {
        score:
          current[criterionId]?.score ?? "",
        comment:
          current[criterionId]?.comment ?? "",
        ...patch,
      },
    }));
  }

  function createRequest():
  SaveStudentEvaluationRequest {
    return {
      studentId,
      groupId,
      sessionId: sessionId || null,
      templateId,
      evaluationDate,
      evaluatorComment:
        evaluatorComment.trim() || null,

      scores: criteria.flatMap(
        (criterion) => {
          const value =
            scoreMap[criterion.id];

          if (
            !value ||
            value.score.trim() === ""
          ) {
            return [];
          }

          return [
            {
              criterionId: criterion.id,
              score: Number(value.score),
              comment:
                value.comment.trim() || null,
            },
          ];
        },
      ),
    };
  }

  function validateRequiredFields(): string | null {
    if (!groupId) {
      return "Select a group.";
    }

    if (!studentId) {
      return "Select a student.";
    }

    if (!templateId) {
      return "Select an evaluation template.";
    }

    if (!evaluationDate) {
      return "Select an evaluation date.";
    }

    return null;
  }

  async function saveDraft():
  Promise<StudentEvaluation | null> {
    const validationError =
      validateRequiredFields();

    if (validationError) {
      setPageError(validationError);
      return null;
    }

    setPageError(null);
    setSuccessMessage(null);

    try {
      const request = createRequest();

      const result = initialEvaluation
        ? await updateMutation.mutateAsync({
            evaluationId:
              initialEvaluation.id,
            request,
          })
        : await createMutation.mutateAsync(
            request,
          );

      await queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.all,
      });

      setSuccessMessage(
        "Evaluation draft was saved.",
      );

      if (!initialEvaluation) {
        router.replace(
          `/dashboard/evaluations/${result.id}`,
        );
      }

      return result;
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The evaluation could not be saved.",
        ),
      );

      return null;
    }
  }

  async function submitEvaluation() {
    if (!liveCalculation.complete) {
      setPageError(
        "Every criterion must be scored before submission.",
      );

      return;
    }

    const saved = await saveDraft();

    if (!saved) {
      return;
    }

    try {
      const result =
        await submitMutation.mutateAsync(
          saved.id,
        );

      await queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.all,
      });

      router.replace(
        `/dashboard/evaluations/${result.id}`,
      );

      router.refresh();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The evaluation could not be submitted.",
        ),
      );
    }
  }

  async function publishEvaluation() {
    if (!initialEvaluation) {
      return;
    }

    const confirmed = window.confirm(
      "Publish this evaluation? It will become visible in student and guardian reports.",
    );

    if (!confirmed) {
      return;
    }

    setPageError(null);

    try {
      await publishMutation.mutateAsync(
        initialEvaluation.id,
      );

      await queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.all,
      });

      router.refresh();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The evaluation could not be published.",
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      {initialEvaluation && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">
              Evaluation status
            </p>

            <div className="mt-2">
              <EvaluationStatusBadge
                status={
                  initialEvaluation.status
                }
              />
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">
              Evaluator
            </p>

            <p className="mt-1 font-medium">
              {initialEvaluation.evaluatorName}
            </p>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Evaluation context
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <EditorField
            label="Group"
            id="evaluationGroupEditor"
          >
            <select
              id="evaluationGroupEditor"
              value={groupId}
              disabled={!editable}
              onChange={(event) =>
                changeGroup(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                Select a group
              </option>

              {groupsQuery.data
                ?.filter((group) =>
                  ["ACTIVE", "COMPLETED"].includes(
                    group.status,
                  ),
                )
                .map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name} — {group.programName}
                  </option>
                ))}
            </select>
          </EditorField>

          <EditorField
            label="Student"
            id="evaluationStudent"
          >
            <select
              id="evaluationStudent"
              value={studentId}
              disabled={!editable || !groupId}
              onChange={(event) =>
                setStudentId(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                Select a student
              </option>

              {availableStudents.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.firstName}{" "}
                  {student.lastName} —{" "}
                  {student.number}
                </option>
              ))}

              {initialEvaluation &&
                !availableStudents.some(
                  (student) =>
                    student.id ===
                    initialEvaluation.studentId,
                ) && (
                  <option
                    value={
                      initialEvaluation.studentId
                    }
                  >
                    {
                      initialEvaluation.studentFirstName
                    }{" "}
                    {
                      initialEvaluation.studentLastName
                    }{" "}
                    —{" "}
                    {
                      initialEvaluation.studentNumber
                    }
                  </option>
                )}
            </select>
          </EditorField>

          <EditorField
            label="Evaluation template"
            id="evaluationTemplate"
          >
            <select
              id="evaluationTemplate"
              value={templateId}
              disabled={!editable || !groupId}
              onChange={(event) =>
                changeTemplate(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                Select a template
              </option>

              {templatesQuery.data
                ?.filter(
                  (template) =>
                    template.status === "ACTIVE",
                )
                .map((template) => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name} — Version{" "}
                    {template.versionLabel}
                  </option>
                ))}

              {initialEvaluation &&
                !templatesQuery.data?.some(
                  (template) =>
                    template.id ===
                    initialEvaluation.templateId,
                ) && (
                  <option
                    value={
                      initialEvaluation.templateId
                    }
                  >
                    {
                      initialEvaluation.templateName
                    }{" "}
                    — Version{" "}
                    {
                      initialEvaluation.templateVersion
                    }
                  </option>
                )}
            </select>
          </EditorField>

          <EditorField
            label="Session (optional)"
            id="evaluationSession"
          >
            <select
              id="evaluationSession"
              value={sessionId}
              disabled={!editable || !groupId}
              onChange={(event) =>
                changeSession(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                No session context
              </option>

              {sessionsQuery.data
                ?.filter(
                  (session) =>
                    session.status !== "CANCELLED",
                )
                .map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {new Date(
                      session.scheduledStart,
                    ).toLocaleDateString()}
                    {" — "}
                    {session.title}
                  </option>
                ))}
            </select>
          </EditorField>

          <EditorField
            label="Evaluation date"
            id="evaluationDate"
          >
            <input
              id="evaluationDate"
              type="date"
              value={evaluationDate}
              disabled={!editable}
              onChange={(event) =>
                setEvaluationDate(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
            />
          </EditorField>
        </div>
      </section>

      {selectedTemplate && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Minimum score"
            value={formatNumber(
              selectedTemplate.minimumScore,
            )}
          />

          <SummaryCard
            label="Maximum score"
            value={formatNumber(
              selectedTemplate.maximumScore,
            )}
          />

          <SummaryCard
            label="Passing score"
            value={
              selectedTemplate.passingScore ===
              null
                ? "Not defined"
                : formatNumber(
                    selectedTemplate.passingScore,
                  )
            }
          />

          <SummaryCard
            label="Weighted score"
            value={
              liveCalculation.complete
                ? liveCalculation.overall.toFixed(
                    2,
                  )
                : "Incomplete"
            }
          />
        </section>
      )}

      {templateId && (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <header className="border-b p-6">
            <h2 className="text-lg font-semibold">
              Criterion scores
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Complete all criteria before submitting the
              evaluation.
            </p>
          </header>

          {criteriaQuery.isPending && (
            <div className="p-8 text-center">
              Loading evaluation criteria...
            </div>
          )}

          {criteria.length === 0 &&
            !criteriaQuery.isPending && (
              <div className="p-8 text-center text-slate-500">
                The selected template has no criteria.
              </div>
            )}

          {criteria.length > 0 && (
            <div className="divide-y">
              {criteria.map((criterion) => {
                const value =
                  scoreMap[criterion.id] ?? {
                    score: "",
                    comment: "",
                  };

                const scoreNumber =
                  value.score === ""
                    ? null
                    : Number(value.score);

                const weighted =
                  scoreNumber === null
                    ? null
                    : (
                        scoreNumber *
                        criterion.weightPercentage
                      ) / 100;

                return (
                  <article
                    key={criterion.id}
                    className="p-6"
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs">
                            {criterion.sequenceNumber}
                          </span>

                          <h3 className="font-semibold">
                            {criterion.name}
                          </h3>

                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                            {
                              criterion.weightPercentage
                            }
                            %
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {criterion.code}
                        </p>

                        {criterion.description && (
                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                            {criterion.description}
                          </p>
                        )}
                      </div>

                      <EditorField
                        label="Score"
                        id={`score-${criterion.id}`}
                      >
                        <input
                          id={`score-${criterion.id}`}
                          type="number"
                          step="0.01"
                          min={
                            selectedTemplate
                              ?.minimumScore
                          }
                          max={
                            selectedTemplate
                              ?.maximumScore
                          }
                          value={value.score}
                          disabled={!editable}
                          onChange={(event) =>
                            updateScore(
                              criterion.id,
                              {
                                score:
                                  event.target
                                    .value,
                              },
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
                        />
                      </EditorField>

                      <div>
                        <p className="text-sm font-medium">
                          Weighted score
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {weighted === null
                            ? "—"
                            : weighted.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor={`criterion-comment-${criterion.id}`}
                        className="block text-sm font-medium"
                      >
                        Criterion comment
                      </label>

                      <textarea
                        id={`criterion-comment-${criterion.id}`}
                        rows={2}
                        maxLength={2000}
                        value={value.comment}
                        disabled={!editable}
                        onChange={(event) =>
                          updateScore(
                            criterion.id,
                            {
                              comment:
                                event.target.value,
                            },
                          )
                        }
                        className="mt-1 w-full resize-y rounded-lg border px-3 py-2 disabled:bg-slate-100"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <label
          htmlFor="evaluationComment"
          className="block text-lg font-semibold"
        >
          Overall evaluator comment
        </label>

        <textarea
          id="evaluationComment"
          rows={5}
          maxLength={5000}
          value={evaluatorComment}
          disabled={!editable}
          onChange={(event) =>
            setEvaluatorComment(
              event.target.value,
            )
          }
          className="mt-4 w-full resize-y rounded-lg border px-3 py-2 disabled:bg-slate-100"
        />
      </section>

      {pageError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-red-700"
        >
          {pageError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-4 text-green-700"
        >
          {successMessage}
        </div>
      )}

      <footer className="flex flex-wrap justify-end gap-3">
        <Link
          href="/dashboard/evaluations"
          className="rounded-lg border px-4 py-2"
        >
          Back to evaluations
        </Link>

        {editable && (
          <>
            <button
              type="button"
              disabled={saving || submitting}
              onClick={() => void saveDraft()}
              className="rounded-lg border border-blue-300 px-4 py-2 font-medium text-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save draft"}
            </button>

            <button
              type="button"
              disabled={
                saving ||
                submitting ||
                !liveCalculation.complete
              }
              onClick={submitEvaluation}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : "Submit evaluation"}
            </button>
          </>
        )}

        {initialEvaluation?.status ===
          "SUBMITTED" &&
          canPublish && (
            <button
              type="button"
              disabled={publishing}
              onClick={publishEvaluation}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {publishing
                ? "Publishing..."
                : "Publish evaluation"}
            </button>
          )}
      </footer>
    </div>
  );
}

function EditorField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <div className="mt-1">{children}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </article>
  );
}

function calculateWeightedScore(
  criteria: EvaluationCriterion[],
  scores: EditableScoreMap,
): {
  complete: boolean;
  overall: number;
} {
  if (criteria.length === 0) {
    return {
      complete: false,
      overall: 0,
    };
  }

  let overall = 0;

  for (const criterion of criteria) {
    const value = scores[criterion.id];

    if (
      !value ||
      value.score.trim() === ""
    ) {
      return {
        complete: false,
        overall: 0,
      };
    }

    const score = Number(value.score);

    if (!Number.isFinite(score)) {
      return {
        complete: false,
        overall: 0,
      };
    }

    overall +=
      score *
      (criterion.weightPercentage / 100);
  }

  return {
    complete: true,
    overall,
  };
}

function criteriaFromEvaluation(
  evaluation?: StudentEvaluation,
): EvaluationCriterion[] {
  return (
    evaluation?.scores.map((score) => ({
      id: score.criterionId,
      templateId:
        evaluation.templateId,
      code: score.criterionCode,
      name: score.criterionName,
      description:
        score.criterionDescription,
      weightPercentage:
        score.weightPercentage,
      sequenceNumber:
        score.sequenceNumber,
      createdAt: score.createdAt,
      updatedAt: score.updatedAt,
    })) ?? []
  );
}

function existingTemplate(
  evaluation?: StudentEvaluation,
): EvaluationTemplate | null {
  if (!evaluation) {
    return null;
  }

  return {
    id: evaluation.templateId,
    programId: "",
    programCode: "",
    programName: "",
    code: evaluation.templateCode,
    name: evaluation.templateName,
    description: null,
    versionLabel:
      evaluation.templateVersion,
    minimumScore:
      evaluation.minimumScore,
    maximumScore:
      evaluation.maximumScore,
    passingScore:
      evaluation.passingScore,
    status: "ACTIVE",
    criterionCount:
      evaluation.criterionCount,
    totalWeight: 100,
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.updatedAt,
  };
}

function todayDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function dateStartIso(date: string): string {
  return new Date(
    `${date}T00:00:00`,
  ).toISOString();
}

function dateEndIso(date: string): string {
  return new Date(
    `${date}T23:59:59.999`,
  ).toISOString();
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
}
