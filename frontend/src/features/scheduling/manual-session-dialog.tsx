"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type {
  CurriculumUnitProgress,
} from "@/features/group-curricula/types";

import type {
  GroupStaffAssignment,
} from "@/features/groups/types";

import {
  manualSessionSchema,
  type ManualSessionFormValues,
} from "./manual-session-schema";

type ManualSessionDialogProps = {
  units: CurriculumUnitProgress[];
  staffAssignments: GroupStaffAssignment[];
  defaultStart: string;
  defaultEnd: string;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: ManualSessionFormValues,
  ) => Promise<void>;
};

export function ManualSessionDialog({
  units,
  staffAssignments,
  defaultStart,
  defaultEnd,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: ManualSessionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualSessionFormValues>({
    resolver: zodResolver(
      manualSessionSchema,
    ),
    defaultValues: {
      curriculumUnitId: "",
      leadStaffId: "",
      title: "",
      description: "",
      scheduledStart: defaultStart,
      scheduledEnd: defaultEnd,
      location: "",
    },
  });

  useEffect(() => {
    reset({
      curriculumUnitId: "",
      leadStaffId: "",
      title: "",
      description: "",
      scheduledStart: defaultStart,
      scheduledEnd: defaultEnd,
      location: "",
    });
  }, [defaultEnd, defaultStart, reset]);

  const activeStaff = staffAssignments.filter(
    (assignment) =>
      assignment.status === "ACTIVE",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Create manual session
        </h2>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="manualSessionTitle"
              label="Title"
              error={errors.title?.message}
            >
              <input
                id="manualSessionTitle"
                className="w-full rounded-lg border px-3 py-2"
                {...register("title")}
              />
            </FormField>

            <FormField
              id="manualSessionLocation"
              label="Location"
              error={errors.location?.message}
            >
              <input
                id="manualSessionLocation"
                className="w-full rounded-lg border px-3 py-2"
                {...register("location")}
              />
            </FormField>

            <FormField
              id="manualCurriculumUnit"
              label="Curriculum unit"
              error={
                errors.curriculumUnitId?.message
              }
            >
              <select
                id="manualCurriculumUnit"
                className="w-full rounded-lg border px-3 py-2"
                {...register("curriculumUnitId")}
              >
                <option value="">
                  No curriculum unit
                </option>

                {units.map((unit) => (
                  <option
                    key={unit.unitId}
                    value={unit.unitId}
                  >
                    {unit.sequenceNumber}.{" "}
                    {unit.unitTitle}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="manualLeadStaff"
              label="Lead instructor"
              error={errors.leadStaffId?.message}
            >
              <select
                id="manualLeadStaff"
                className="w-full rounded-lg border px-3 py-2"
                {...register("leadStaffId")}
              >
                <option value="">
                  No lead instructor
                </option>

                {activeStaff.map((assignment) => (
                  <option
                    key={assignment.id}
                    value={assignment.staffId}
                  >
                    {assignment.firstName}{" "}
                    {assignment.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="manualScheduledStart"
              label="Scheduled start"
              error={
                errors.scheduledStart?.message
              }
            >
              <input
                id="manualScheduledStart"
                type="datetime-local"
                className="w-full rounded-lg border px-3 py-2"
                {...register("scheduledStart")}
              />
            </FormField>

            <FormField
              id="manualScheduledEnd"
              label="Scheduled end"
              error={errors.scheduledEnd?.message}
            >
              <input
                id="manualScheduledEnd"
                type="datetime-local"
                className="w-full rounded-lg border px-3 py-2"
                {...register("scheduledEnd")}
              />
            </FormField>
          </div>

          <FormField
            id="manualSessionDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="manualSessionDescription"
              rows={4}
              className="w-full rounded-lg border px-3 py-2"
              {...register("description")}
            />
          </FormField>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Creating..."
                : "Create session"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
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

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
