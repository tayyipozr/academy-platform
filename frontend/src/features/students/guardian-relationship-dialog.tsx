"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Guardian } from "@/features/guardians/types";

import {
  guardianRelationshipSchema,
  type GuardianRelationshipFormValues,
} from "./guardian-relationship-schema";

import type {
  StudentGuardianRelationship,
} from "./types";

type GuardianRelationshipDialogProps = {
  relationship?: StudentGuardianRelationship;
  guardians: Guardian[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: GuardianRelationshipFormValues,
  ) => Promise<void>;
};

export function GuardianRelationshipDialog({
  relationship,
  guardians,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: GuardianRelationshipDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuardianRelationshipFormValues>({
    resolver: zodResolver(
      guardianRelationshipSchema,
    ),
    defaultValues: {
      guardianId: "",
      relationshipType: "OTHER",
      primaryContact: false,
      legalGuardian: false,
      pickupAuthorized: false,
      receivesNotifications: true,
      internalMediaConsent: false,
      marketingMediaConsent: false,
    },
  });

  useEffect(() => {
    reset({
      guardianId:
        relationship?.guardianId ?? "",
      relationshipType:
        relationship?.relationshipType ??
        "OTHER",
      primaryContact:
        relationship?.primaryContact ?? false,
      legalGuardian:
        relationship?.legalGuardian ?? false,
      pickupAuthorized:
        relationship?.pickupAuthorized ?? false,
      receivesNotifications:
        relationship?.receivesNotifications ??
        true,
      internalMediaConsent:
        relationship?.internalMediaConsent ??
        false,
      marketingMediaConsent:
        relationship?.marketingMediaConsent ??
        false,
    });
  }, [relationship, reset]);

  const selectableGuardians = relationship
    ? guardians.filter(
        (guardian) =>
          guardian.id === relationship.guardianId,
      )
    : guardians;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {relationship
              ? "Edit guardian relationship"
              : "Link guardian"}
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
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="guardianId"
              className="block text-sm font-medium"
            >
              Guardian
            </label>

            <select
              id="guardianId"
              disabled={Boolean(relationship)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              {...register("guardianId")}
            >
              <option value="">
                Select a guardian
              </option>

              {selectableGuardians.map(
                (guardian) => (
                  <option
                    key={guardian.id}
                    value={guardian.id}
                  >
                    {guardian.firstName}{" "}
                    {guardian.lastName} —{" "}
                    {guardian.email}
                  </option>
                ),
              )}
            </select>

            {errors.guardianId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.guardianId.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="relationshipType"
              className="block text-sm font-medium"
            >
              Relationship
            </label>

            <select
              id="relationshipType"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register("relationshipType")}
            >
              <option value="MOTHER">
                Mother
              </option>
              <option value="FATHER">
                Father
              </option>
              <option value="LEGAL_GUARDIAN">
                Legal guardian
              </option>
              <option value="RELATIVE">
                Relative
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>
          </div>

          <fieldset>
            <legend className="font-medium">
              Permissions and preferences
            </legend>

            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-4">
              <CheckboxField
                label="Primary contact"
                description="Use this guardian as the student's main contact."
                registration={register(
                  "primaryContact",
                )}
              />

              <CheckboxField
                label="Legal guardian"
                description="This person has legal guardian responsibility."
                registration={register(
                  "legalGuardian",
                )}
              />

              <CheckboxField
                label="Pickup authorized"
                description="This person may collect the student."
                registration={register(
                  "pickupAuthorized",
                )}
              />

              <CheckboxField
                label="Receives notifications"
                description="Send operational notifications to this guardian."
                registration={register(
                  "receivesNotifications",
                )}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium">
              Media consent
            </legend>

            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-4">
              <CheckboxField
                label="Internal media consent"
                description="Allow authorized portal users to view student media."
                registration={register(
                  "internalMediaConsent",
                )}
              />

              <CheckboxField
                label="Marketing media consent"
                description="Allow media to be used for approved marketing purposes."
                registration={register(
                  "marketingMediaConsent",
                )}
              />
            </div>
          </fieldset>

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
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : relationship
                  ? "Save relationship"
                  : "Link guardian"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

type CheckboxFieldProps = {
  label: string;
  description: string;
  registration: ReturnType<
    ReturnType<
      typeof useForm<GuardianRelationshipFormValues>
    >["register"]
  >;
};

function CheckboxField({
  label,
  description,
  registration,
}: CheckboxFieldProps) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1"
        {...registration}
      />

      <span>
        <span className="block text-sm font-medium">
          {label}
        </span>

        <span className="block text-xs text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}
