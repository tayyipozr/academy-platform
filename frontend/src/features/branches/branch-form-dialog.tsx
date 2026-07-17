"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  branchFormSchema,
  type BranchFormValues,
} from "./branch-form-schema";

import type { Branch } from "./types";

const timezoneOptions = [
  "UTC",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

type BranchFormDialogProps = {
  branch?: Branch;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: BranchFormValues,
  ) => Promise<void>;
};

export function BranchFormDialog({
  branch,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: BranchFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      code: "",
      name: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      countryCode: "",
      timezone: "UTC",
    },
  });

  useEffect(() => {
    reset({
      code: branch?.code ?? "",
      name: branch?.name ?? "",
      email: branch?.email ?? "",
      phone: branch?.phone ?? "",
      addressLine1: branch?.addressLine1 ?? "",
      addressLine2: branch?.addressLine2 ?? "",
      city: branch?.city ?? "",
      stateProvince:
        branch?.stateProvince ?? "",
      postalCode: branch?.postalCode ?? "",
      countryCode: branch?.countryCode ?? "",
      timezone: branch?.timezone ?? "UTC",
    });
  }, [branch, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {branch ? "Edit branch" : "Create branch"}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="code"
              label="Branch code"
              error={errors.code?.message}
            >
              <input
                id="code"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="name"
              label="Branch name"
              error={errors.name?.message}
            >
              <input
                id="name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("name")}
              />
            </FormField>

            <FormField
              id="email"
              label="Email"
              error={errors.email?.message}
            >
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("email")}
              />
            </FormField>

            <FormField
              id="phone"
              label="Phone"
              error={errors.phone?.message}
            >
              <input
                id="phone"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("phone")}
              />
            </FormField>

            <FormField
              id="addressLine1"
              label="Address line 1"
              error={errors.addressLine1?.message}
            >
              <input
                id="addressLine1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("addressLine1")}
              />
            </FormField>

            <FormField
              id="addressLine2"
              label="Address line 2"
              error={errors.addressLine2?.message}
            >
              <input
                id="addressLine2"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("addressLine2")}
              />
            </FormField>

            <FormField
              id="city"
              label="City"
              error={errors.city?.message}
            >
              <input
                id="city"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("city")}
              />
            </FormField>

            <FormField
              id="stateProvince"
              label="State or province"
              error={errors.stateProvince?.message}
            >
              <input
                id="stateProvince"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("stateProvince")}
              />
            </FormField>

            <FormField
              id="postalCode"
              label="Postal code"
              error={errors.postalCode?.message}
            >
              <input
                id="postalCode"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("postalCode")}
              />
            </FormField>

            <FormField
              id="countryCode"
              label="Country code"
              error={errors.countryCode?.message}
            >
              <input
                id="countryCode"
                placeholder="TR"
                maxLength={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                {...register("countryCode")}
              />
            </FormField>

            <FormField
              id="timezone"
              label="Timezone"
              error={errors.timezone?.message}
            >
              <select
                id="timezone"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
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

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save branch"}
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
