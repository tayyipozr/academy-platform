"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Branch } from "@/features/branches/types";
import type { AssignableAccount } from "@/features/people/types";

import {
  staffFormSchema,
  type StaffFormValues,
} from "./staff-form-schema";

import type { StaffMember } from "./types";
import { useLocalization } from "../localization/use-localization";

type StaffFormDialogProps = {
  staff?: StaffMember;
  accounts: AssignableAccount[];
  branches: Branch[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: StaffFormValues,
  ) => Promise<void>;
};

export function StaffFormDialog({
  staff,
  accounts,
  branches,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: StaffFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      membershipId: "",
      branchId: "",
      staffNumber: "",
      title: "",
      specialization: "",
      biography: "",
      hiredAt: "",
      endedAt: "",
    },
  });

  useEffect(() => {
    reset({
      membershipId: staff?.membershipId ?? "",
      branchId: staff?.branchId ?? "",
      staffNumber: staff?.staffNumber ?? "",
      title: staff?.title ?? "",
      specialization:
        staff?.specialization ?? "",
      biography: staff?.biography ?? "",
      hiredAt: staff?.hiredAt ?? "",
      endedAt: staff?.endedAt ?? "",
    });
  }, [reset, staff]);

  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.staff;
  const common = dictionary.common;


  const selectableAccounts = staff
    ? [
      {
        membershipId: staff.membershipId,
        userId: staff.userId,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        membershipStatus: "ACTIVE" as const,
      },
    ]
    : accounts;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {staff ? t.edit : t.create}
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
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="membershipId"
              className="block text-sm font-medium"
            >
              {t.instructorAccount}
            </label>

            <select
              id="membershipId"
              disabled={Boolean(staff)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              {...register("membershipId")}
            >
              <option value="">
                {t.selectInstructorAccount}
              </option>

              {selectableAccounts.map((account) => (
                <option
                  key={account.membershipId}
                  value={account.membershipId}
                >
                  {account.firstName}{" "}
                  {account.lastName} — {account.email}
                </option>
              ))}
            </select>

            {errors.membershipId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.membershipId.message}
              </p>
            )}

            {!staff && accounts.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                {t.noEligibleAccount}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="staffNumber"
              label={t.staffNumber}
              error={errors.staffNumber?.message}
            >
              <input
                id="staffNumber"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                {...register("staffNumber")}
              />
            </FormField>

            <FormField
              id="branchId"
              label={t.branch}
              error={errors.branchId?.message}
            >
              <select
                id="branchId"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("branchId")}
              >
                <option value="">
                  {t.noBranchAssignment}
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
              id="title"
              label={t.titleField}
              error={errors.title?.message}
            >
              <input
                id="title"
                placeholder={t.titlePlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("title")}
              />
            </FormField>

            <FormField
              id="specialization"
              label={t.specialization}
              error={errors.specialization?.message}
            >
              <input
                id="specialization"
                placeholder={t.specializationPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("specialization")}
              />
            </FormField>

            <FormField
              id="hiredAt"
              label={t.hireDate}
              error={errors.hiredAt?.message}
            >
              <input
                id="hiredAt"
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("hiredAt")}
              />
            </FormField>

            <FormField
              id="endedAt"
              label={t.employmentEndDate}
              error={errors.endedAt?.message}
            >
              <input
                id="endedAt"
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("endedAt")}
              />
            </FormField>
          </div>

          <FormField
            id="biography"
            label={t.biography}
            error={errors.biography?.message}
          >
            <textarea
              id="biography"
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
              {...register("biography")}
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
              disabled={
                submitting ||
                (!staff && accounts.length === 0)
              }
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
