"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Program } from "@/features/programs/types";

import {
  evaluationTemplateFormSchema,
  type EvaluationTemplateFormValues,
} from "./template-form-schema";

import type {
  EvaluationTemplate,
} from "./types";
import { useLocalization } from "../localization/use-localization";

type TemplateFormDialogProps = {
  template?: EvaluationTemplate;
  programs: Program[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: EvaluationTemplateFormValues,
  ) => Promise<void>;
};

export function TemplateFormDialog({
  template,
  programs,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: TemplateFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EvaluationTemplateFormValues>({
    resolver: zodResolver(
      evaluationTemplateFormSchema,
    ),
    defaultValues: {
      programId: "",
      code: "",
      name: "",
      description: "",
      versionLabel: "1.0",
      minimumScore: "0",
      maximumScore: "100",
      passingScore: "",
    },
  });

  useEffect(() => {
    reset({
      programId: template?.programId ?? "",
      code: template?.code ?? "",
      name: template?.name ?? "",
      description:
        template?.description ?? "",
      versionLabel:
        template?.versionLabel ?? "1.0",
      minimumScore:
        template?.minimumScore.toString() ?? "0",
      maximumScore:
        template?.maximumScore.toString() ??
        "100",
      passingScore:
        template?.passingScore?.toString() ??
        "",
    });
  }, [reset, template]);


  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.evaluationTemplates;
  const common = dictionary.common;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-form-title"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2
            id="template-form-title"
            className="text-xl font-semibold"
          >
            {template
              ? t.edit
              : t.create}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500"
          >
            {common.actions.close}
          </button>
        </header>

        <form
          className="mt-6 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <section className="grid gap-4 md:grid-cols-2">
            <FormField
              id="templateProgram"
              label="Program"
              error={errors.programId?.message}
            >
              <select
                id="templateProgram"
                disabled={Boolean(template)}
                className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
                {...register("programId")}
              >
                <option value="">
                  {dictionary.pages.programs.select}
                </option>

                {programs
                  .filter(
                    (program) =>
                      program.status === "ACTIVE",
                  )
                  .map((program) => (
                    <option
                      key={program.id}
                      value={program.id}
                    >
                      {program.name}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField
              id="templateCode"
              label={t.templateCode}
              error={errors.code?.message}
            >
              <input
                id="templateCode"
                className="w-full rounded-lg border px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="templateName"
              label={t.templateName}
              error={errors.name?.message}
            >
              <input
                id="templateName"
                className="w-full rounded-lg border px-3 py-2"
                {...register("name")}
              />
            </FormField>

            <FormField
              id="templateVersion"
              label={common.fields.version}
              error={
                errors.versionLabel?.message
              }
            >
              <input
                id="templateVersion"
                placeholder="1.0"
                className="w-full rounded-lg border px-3 py-2"
                {...register("versionLabel")}
              />
            </FormField>
          </section>

          <section>
            <h3 className="font-semibold">
              {t.scoringRange}
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FormField
                id="minimumScore"
                label={common.fields.minimumScore}
                error={
                  errors.minimumScore?.message
                }
              >
                <input
                  id="minimumScore"
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("minimumScore")}
                />
              </FormField>

              <FormField
                id="maximumScore"
                label={common.fields.maximumScore}
                error={
                  errors.maximumScore?.message
                }
              >
                <input
                  id="maximumScore"
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("maximumScore")}
                />
              </FormField>

              <FormField
                id="passingScore"
                label={common.fields.passingScore}
                error={
                  errors.passingScore?.message
                }
              >
                <input
                  id="passingScore"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  className="w-full rounded-lg border px-3 py-2"
                  {...register("passingScore")}
                />
              </FormField>
            </div>
          </section>

          <FormField
            id="templateDescription"
            label={common.fields.description}
            error={errors.description?.message}
          >
            <textarea
              id="templateDescription"
              rows={5}
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
