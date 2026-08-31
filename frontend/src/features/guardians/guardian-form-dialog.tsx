"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { AssignableAccount } from "@/features/people/types";

import {
  guardianFormSchema,
  type GuardianFormValues,
} from "./guardian-form-schema";

import type { Guardian } from "./types";
import { useLocalization } from "../localization/use-localization";

type GuardianFormDialogProps = {
  guardian?: Guardian;
  accounts: AssignableAccount[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: GuardianFormValues,
  ) => Promise<void>;
};

export function GuardianFormDialog({
  guardian,
  accounts,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: GuardianFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: {
      membershipId: "",
      guardianNumber: "",
      phone: "",
      alternatePhone: "",
      occupation: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      countryCode: "",
      notes: "",
    },
  });

  useEffect(() => {
    reset({
      membershipId: guardian?.membershipId ?? "",
      guardianNumber:
        guardian?.guardianNumber ?? "",
      phone: guardian?.phone ?? "",
      alternatePhone:
        guardian?.alternatePhone ?? "",
      occupation: guardian?.occupation ?? "",
      addressLine1:
        guardian?.addressLine1 ?? "",
      addressLine2:
        guardian?.addressLine2 ?? "",
      city: guardian?.city ?? "",
      stateProvince:
        guardian?.stateProvince ?? "",
      postalCode: guardian?.postalCode ?? "",
      countryCode:
        guardian?.countryCode ?? "",
      notes: guardian?.notes ?? "",
    });
  }, [guardian, reset]);

  const selectableAccounts = guardian
    ? [
      {
        membershipId: guardian.membershipId,
        userId: guardian.userId,
        email: guardian.email,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        membershipStatus: "ACTIVE" as const,
      },
    ]
    : accounts;

  const {
    dictionary,
  } = useLocalization();

  const t = dictionary.pages.guardians;
  const common = dictionary.common;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {guardian ? t.edit : t.create}
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
          <FormField
            id="membershipId"
            label={t.guardianAccount}
            error={errors.membershipId?.message}
          >
            <select
              id="membershipId"
              disabled={Boolean(guardian)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              {...register("membershipId")}
            >
              <option value="">
                {t.selectGuardianAccount}
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
          </FormField>

          {!guardian && accounts.length === 0 && (
            <p className="text-sm text-amber-700">
              {t.noEligibleAccount}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="guardianNumber"
              label={t.guardianNumber}
              registration={register(
                "guardianNumber",
              )}
              error={
                errors.guardianNumber?.message
              }
            />

            <TextField
              id="occupation"
              label={t.occupation}
              registration={register("occupation")}
              error={errors.occupation?.message}
            />

            <TextField
              id="phone"
              label={common.fields.phone}
              registration={register("phone")}
              error={errors.phone?.message}
            />

            <TextField
              id="alternatePhone"
              label={t.alternatePhone}
              registration={register(
                "alternatePhone",
              )}
              error={
                errors.alternatePhone?.message
              }
            />

            <TextField
              id="addressLine1"
              label={common.fields.addressLine1}
              registration={register(
                "addressLine1",
              )}
              error={errors.addressLine1?.message}
            />

            <TextField
              id="addressLine2"
              label={common.fields.addressLine2}
              registration={register(
                "addressLine2",
              )}
              error={errors.addressLine2?.message}
            />

            <TextField
              id="city"
              label={common.fields.city}
              registration={register("city")}
              error={errors.city?.message}
            />

            <TextField
              id="stateProvince"
              label={common.fields.stateProvince}
              registration={register(
                "stateProvince",
              )}
              error={
                errors.stateProvince?.message
              }
            />

            <TextField
              id="postalCode"
              label={common.fields.postalCode}
              registration={register("postalCode")}
              error={errors.postalCode?.message}
            />

            <TextField
              id="countryCode"
              label={common.fields.countryCode}
              registration={register(
                "countryCode",
              )}
              error={errors.countryCode?.message}
              maxLength={2}
            />
          </div>

          <FormField
            id="notes"
            label={t.notes}
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
              disabled={
                submitting ||
                (!guardian && accounts.length === 0)
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

type TextFieldProps = {
  id: string;
  label: string;
  registration: ReturnType<
    ReturnType<
      typeof useForm<GuardianFormValues>
    >["register"]
  >;
  error?: string;
  maxLength?: number;
};

function TextField({
  id,
  label,
  registration,
  error,
  maxLength,
}: TextFieldProps) {
  return (
    <FormField
      id={id}
      label={label}
      error={error}
    >
      <input
        id={id}
        maxLength={maxLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        {...registration}
      />
    </FormField>
  );
}
