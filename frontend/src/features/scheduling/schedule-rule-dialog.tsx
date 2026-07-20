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
  scheduleRuleFormSchema,
  type ScheduleRuleFormValues,
} from "./schedule-rule-form-schema";

import type { ScheduleRule } from "./types";

const dayOptions = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

const commonTimezones = [
  "UTC",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

type ScheduleRuleDialogProps = {
  rule?: ScheduleRule;
  units: CurriculumUnitProgress[];
  staffAssignments: GroupStaffAssignment[];
  minimumDate: string;
  maximumDate: string;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: ScheduleRuleFormValues,
  ) => Promise<void>;
};

export function ScheduleRuleDialog({
  rule,
  units,
  staffAssignments,
  minimumDate,
  maximumDate,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: ScheduleRuleDialogProps) {
  const browserTimezone =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone || "UTC";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleRuleFormValues>({
    resolver: zodResolver(
      scheduleRuleFormSchema,
    ),
    defaultValues: {
      curriculumUnitId: "",
      leadStaffId: "",
      title: "",
      description: "",
      dayOfWeek: "1",
      startTime: "18:00",
      endTime: "19:00",
      effectiveFrom: minimumDate,
      effectiveUntil: maximumDate,
      timezone: browserTimezone,
      location: "",
    },
  });

  useEffect(() => {
    reset({
      curriculumUnitId:
        rule?.curriculumUnitId ?? "",
      leadStaffId: rule?.leadStaffId ?? "",
      title: rule?.title ?? "",
      description: rule?.description ?? "",
      dayOfWeek:
        rule?.dayOfWeek.toString() as
          | "1"
          | "2"
          | "3"
          | "4"
          | "5"
          | "6"
          | "7" ?? "1",
      startTime:
        rule?.startTime.slice(0, 5) ?? "18:00",
      endTime:
        rule?.endTime.slice(0, 5) ?? "19:00",
      effectiveFrom:
        rule?.effectiveFrom ?? minimumDate,
      effectiveUntil:
        rule?.effectiveUntil ?? maximumDate,
      timezone:
        rule?.timezone ?? browserTimezone,
      location: rule?.location ?? "",
    });
  }, [
    browserTimezone,
    maximumDate,
    minimumDate,
    reset,
    rule,
  ]);

  const activeStaffAssignments =
    staffAssignments.filter(
      (assignment) =>
        assignment.status === "ACTIVE",
    );

  const timezoneOptions = Array.from(
    new Set([
      browserTimezone,
      ...commonTimezones,
      rule?.timezone,
    ].filter(Boolean) as string[]),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {rule
              ? "Edit schedule rule"
              : "Create schedule rule"}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500"
          >
            Close
          </button>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-6"
        >
          <section className="grid gap-4 md:grid-cols-2">
            <FormField
              id="scheduleTitle"
              label="Title"
              error={errors.title?.message}
            >
              <input
                id="scheduleTitle"
                className="w-full rounded-lg border px-3 py-2"
                {...register("title")}
              />
            </FormField>

            <FormField
              id="scheduleLocation"
              label="Location"
              error={errors.location?.message}
            >
              <input
                id="scheduleLocation"
                placeholder="Main Field, Room 102"
                className="w-full rounded-lg border px-3 py-2"
                {...register("location")}
              />
            </FormField>

            <FormField
              id="scheduleUnit"
              label="Curriculum unit"
              error={
                errors.curriculumUnitId?.message
              }
            >
              <select
                id="scheduleUnit"
                className="w-full rounded-lg border px-3 py-2"
                {...register("curriculumUnitId")}
              >
                <option value="">
                  No curriculum-unit link
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
              id="scheduleStaff"
              label="Lead instructor"
              error={errors.leadStaffId?.message}
            >
              <select
                id="scheduleStaff"
                className="w-full rounded-lg border px-3 py-2"
                {...register("leadStaffId")}
              >
                <option value="">
                  No lead instructor
                </option>

                {activeStaffAssignments.map(
                  (assignment) => (
                    <option
                      key={assignment.id}
                      value={assignment.staffId}
                    >
                      {assignment.firstName}{" "}
                      {assignment.lastName} —{" "}
                      {assignment.assignmentRole
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </option>
                  ),
                )}
              </select>
            </FormField>
          </section>

          <section>
            <h3 className="font-semibold">
              Weekly timing
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <FormField
                id="scheduleDay"
                label="Day"
                error={errors.dayOfWeek?.message}
              >
                <select
                  id="scheduleDay"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("dayOfWeek")}
                >
                  {dayOptions.map((day) => (
                    <option
                      key={day.value}
                      value={day.value}
                    >
                      {day.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="scheduleStartTime"
                label="Start time"
                error={errors.startTime?.message}
              >
                <input
                  id="scheduleStartTime"
                  type="time"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("startTime")}
                />
              </FormField>

              <FormField
                id="scheduleEndTime"
                label="End time"
                error={errors.endTime?.message}
              >
                <input
                  id="scheduleEndTime"
                  type="time"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("endTime")}
                />
              </FormField>
            </div>
          </section>

          <section>
            <h3 className="font-semibold">
              Effective period
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <FormField
                id="effectiveFrom"
                label="Effective from"
                error={
                  errors.effectiveFrom?.message
                }
              >
                <input
                  id="effectiveFrom"
                  type="date"
                  min={minimumDate}
                  max={maximumDate}
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("effectiveFrom")}
                />
              </FormField>

              <FormField
                id="effectiveUntil"
                label="Effective until"
                error={
                  errors.effectiveUntil?.message
                }
              >
                <input
                  id="effectiveUntil"
                  type="date"
                  min={minimumDate}
                  max={maximumDate}
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("effectiveUntil")}
                />
              </FormField>

              <FormField
                id="scheduleTimezone"
                label="Timezone"
                error={errors.timezone?.message}
              >
                <select
                  id="scheduleTimezone"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("timezone")}
                >
                  {timezoneOptions.map((timezone) => (
                    <option
                      key={timezone}
                      value={timezone}
                    >
                      {timezone}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>

          <FormField
            id="scheduleDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="scheduleDescription"
              rows={4}
              className="w-full resize-y rounded-lg border px-3 py-2"
              {...register("description")}
            />
          </FormField>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
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
                ? "Saving..."
                : "Save schedule rule"}
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
