"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Branch } from "@/features/branches/types";

import {
  studentFormSchema,
  type StudentFormValues,
} from "./student-form-schema";

import type { Student } from "./types";
import { useLocalization } from "../localization/use-localization";

type StudentFormDialogProps = {
  student?: Student;
  branches: Branch[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: StudentFormValues,
  ) => Promise<void>;
};

export function StudentFormDialog({
  student,
  branches,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: StudentFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      branchId: "",
      studentNumber: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      gender: "UNSPECIFIED",
      enrollmentDate: "",
      medicalNotes: "",
      allergies: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
  });

  useEffect(() => {
    reset({
      branchId: student?.branchId ?? "",
      studentNumber:
        student?.studentNumber ?? "",
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      birthDate: student?.birthDate ?? "",
      gender:
        student?.gender ?? "UNSPECIFIED",
      enrollmentDate:
        student?.enrollmentDate ?? "",
      medicalNotes:
        student?.medicalNotes ?? "",
      allergies: student?.allergies ?? "",
      emergencyContactName:
        student?.emergencyContactName ?? "",
      emergencyContactPhone:
        student?.emergencyContactPhone ?? "",
      notes: student?.notes ?? "",
    });
  }, [reset, student]);

  const {
    dictionary,
    statusLabel,
    formatDateTime,
  } = useLocalization();

  const t = dictionary.pages.students;
  const common = dictionary.common;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-form-title"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2
            id="student-form-title"
            className="text-xl font-semibold"
          >
            {student
              ? t.edit
              : t.create}
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
          className="mt-6 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <section>
            <h3 className="font-semibold">
              {dictionary.pages.settings.generalInformation}
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField
                id="studentNumber"
                label={t.studentNumber}
                error={
                  errors.studentNumber?.message
                }
              >
                <input
                  id="studentNumber"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                  {...register("studentNumber")}
                />
              </FormField>

              <FormField
                id="branchId"
                label={common.fields.branch}
                error={errors.branchId?.message}
              >
                <select
                  id="branchId"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("branchId")}
                >
                  <option value="">
                    {dictionary.pages.branches.notAssigned}
                  </option>

                  {branches
                    .filter(
                      (branch) =>
                        branch.status === "ACTIVE",
                    )
                    .map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ))}
                </select>
              </FormField>

              <FormField
                id="firstName"
                label={common.fields.firstName}
                error={errors.firstName?.message}
              >
                <input
                  id="firstName"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("firstName")}
                />
              </FormField>

              <FormField
                id="lastName"
                label={common.fields.lastName}
                error={errors.lastName?.message}
              >
                <input
                  id="lastName"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("lastName")}
                />
              </FormField>

              <FormField
                id="birthDate"
                label={t.birthDate}
                error={errors.birthDate?.message}
              >
                <input
                  id="birthDate"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("birthDate")}
                />
              </FormField>

              <FormField
                id="gender"
                label={t.gender}
                error={errors.gender?.message}
              >
                <select
                  id="gender"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("gender")}
                >
                  <option value="UNSPECIFIED">
                    {common.statuses.UNSPECIFIED}
                  </option>
                  <option value="FEMALE">
                    {common.statuses.FEMALE}
                  </option>
                  <option value="MALE">
                    {common.statuses.MALE}
                  </option>
                </select>
              </FormField>

              <FormField
                id="enrollmentDate"
                label="Enrollment date"
                error={
                  errors.enrollmentDate?.message
                }
              >
                <input
                  id="enrollmentDate"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register("enrollmentDate")}
                />
              </FormField>
            </div>
          </section>

          <section>
            <h3 className="font-semibold">
              {t.medicalInformation}
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField
                id="emergencyContactName"
                label={t.emergencyContact}
                error={
                  errors.emergencyContactName
                    ?.message
                }
              >
                <input
                  id="emergencyContactName"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register(
                    "emergencyContactName",
                  )}
                />
              </FormField>

              <FormField
                id="emergencyContactPhone"
                label={t.emergencyPhone}
                error={
                  errors.emergencyContactPhone
                    ?.message
                }
              >
                <input
                  id="emergencyContactPhone"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...register(
                    "emergencyContactPhone",
                  )}
                />
              </FormField>

              <FormField
                id="allergies"
                label={t.allergies}
                error={errors.allergies?.message}
              >
                <textarea
                  id="allergies"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
                  {...register("allergies")}
                />
              </FormField>

              <FormField
                id="medicalNotes"
                label={t.medicalNotes}
                error={
                  errors.medicalNotes?.message
                }
              >
                <textarea
                  id="medicalNotes"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
                  {...register("medicalNotes")}
                />
              </FormField>
            </div>
          </section>

          <FormField
            id="notes"
            label={t.generalNotes}
            error={errors.notes?.message}
          >
            <textarea
              id="notes"
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
              {...register("notes")}
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
                : t.create}
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
