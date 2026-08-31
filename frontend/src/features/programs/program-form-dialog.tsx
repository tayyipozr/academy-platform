"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  programFormSchema,
  type ProgramFormValues,
} from "./program-form-schema";

import type { Program } from "./types";
import { useLocalization } from "../localization/use-localization";

type ProgramFormDialogProps = {
  program?: Program;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: ProgramFormValues,
  ) => Promise<void>;
};

export function ProgramFormDialog({
  program,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProgramFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "",
      minimumAge: "",
      maximumAge: "",
    },
  });

  useEffect(() => {
    reset({
      code: program?.code ?? "",
      name: program?.name ?? "",
      description: program?.description ?? "",
      category: program?.category ?? "",
      minimumAge:
        program?.minimumAge?.toString() ?? "",
      maximumAge:
        program?.maximumAge?.toString() ?? "",
    });
  }, [program, reset]);

  const { dictionary } = useLocalization();

  const t = dictionary.pages.programs;
  const common = dictionary.common;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {program ? t.edit : t.create}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            {common.actions.close}
          </button>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="code"
              label={t.programCode}
              error={errors.code?.message}
            >
              <input
                id="code"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="name"
              label={t.programName}
              error={errors.name?.message}
            >
              <input
                id="name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("name")}
              />
            </FormField>

            <FormField
              id="category"
              label={t.category}
              error={errors.category?.message}
            >
              <input
                id="category"
                placeholder={t.categoryPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("category")}
              />
            </FormField>

            <div />

            <FormField
              id="minimumAge"
              label={t.minimumAge}
              error={errors.minimumAge?.message}
            >
              <input
                id="minimumAge"
                type="number"
                min={0}
                max={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("minimumAge")}
              />
            </FormField>

            <FormField
              id="maximumAge"
              label={t.maximumAge}
              error={errors.maximumAge?.message}
            >
              <input
                id="maximumAge"
                type="number"
                min={0}
                max={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("maximumAge")}
              />
            </FormField>
          </div>

          <FormField
            id="description"
            label={common.fields.description}
            error={errors.description?.message}
          >
            <textarea
              id="description"
              rows={5}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
              {...register("description")}
            />
          </FormField>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              {common.actions.cancel}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? common.actions.saving
                : common.actions.save}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
};

function FormField({
  id,
  label,
  error,
  children,
}: FormFieldProps) {
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
