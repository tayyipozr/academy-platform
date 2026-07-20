"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  unitFormSchema,
  type UnitFormValues,
} from "./unit-form-schema";

import type { CurriculumUnit } from "./types";

type UnitFormDialogProps = {
  unit?: CurriculumUnit;
  units: CurriculumUnit[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: UnitFormValues,
  ) => Promise<void>;
};

export function UnitFormDialog({
  unit,
  units,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: UnitFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      parentUnitId: "",
      code: "",
      title: "",
      description: "",
      sequenceNumber: "1",
      estimatedSessions: "",
    },
  });

  useEffect(() => {
    reset({
      parentUnitId:
        unit?.parentUnitId ?? "",
      code: unit?.code ?? "",
      title: unit?.title ?? "",
      description: unit?.description ?? "",
      sequenceNumber:
        unit?.sequenceNumber.toString() ??
        String(units.length + 1),
      estimatedSessions:
        unit?.estimatedSessions?.toString() ??
        "",
    });
  }, [reset, unit, units.length]);

  const parentOptions = units.filter(
    (candidate) =>
      candidate.id !== unit?.id &&
      candidate.parentUnitId !== unit?.id,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          {unit ? "Edit unit" : "Create unit"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="parentUnitId"
              className="block text-sm font-medium"
            >
              Parent unit
            </label>

            <select
              id="parentUnitId"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("parentUnitId")}
            >
              <option value="">
                No parent unit
              </option>

              {parentOptions.map((parent) => (
                <option
                  key={parent.id}
                  value={parent.id}
                >
                  {parent.sequenceNumber}.{" "}
                  {parent.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="unitCode"
              label="Unit code"
              error={errors.code?.message}
            >
              <input
                id="unitCode"
                className="w-full rounded-lg border px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="unitSequence"
              label="Sequence"
              error={
                errors.sequenceNumber?.message
              }
            >
              <input
                id="unitSequence"
                type="number"
                min={1}
                className="w-full rounded-lg border px-3 py-2"
                {...register("sequenceNumber")}
              />
            </FormField>
          </div>

          <FormField
            id="unitTitle"
            label="Title"
            error={errors.title?.message}
          >
            <input
              id="unitTitle"
              className="w-full rounded-lg border px-3 py-2"
              {...register("title")}
            />
          </FormField>

          <FormField
            id="estimatedSessions"
            label="Estimated sessions"
            error={
              errors.estimatedSessions?.message
            }
          >
            <input
              id="estimatedSessions"
              type="number"
              min={1}
              className="w-full rounded-lg border px-3 py-2"
              {...register("estimatedSessions")}
            />
          </FormField>

          <FormField
            id="unitDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="unitDescription"
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
                ? "Saving..."
                : "Save unit"}
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
