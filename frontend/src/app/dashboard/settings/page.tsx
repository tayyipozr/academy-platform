"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "@/features/organization/api";

import {
  organizationSettingsSchema,
  type OrganizationSettingsFormValues,
} from "@/features/organization/settings-schema";

import { organizationQueryKeys } from "@/features/organization/query-keys";
import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { useLocalization } from "@/features/localization/use-localization";

const localeOptions = [
  {
    value: "en-US",
    label: "English — United States",
  },
  {
    value: "tr-TR",
    label: "Türkçe — Türkiye",
  },
];

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

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canReadSettings = hasPermission(
    currentUser,
    "organization.settings.read",
  );

  const canUpdateSettings = hasPermission(
    currentUser,
    "organization.settings.update",
  );

  const settingsQuery = useQuery({
    queryKey: organizationQueryKeys.settings,
    queryFn: getOrganizationSettings,
    enabled:
      currentUserQuery.isSuccess && canReadSettings,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<OrganizationSettingsFormValues>({
    resolver: zodResolver(
      organizationSettingsSchema,
    ),
    defaultValues: {
      name: "",
      defaultLocale: "en-US",
      timezone: "UTC",
      terminology: {
        studentLabel: "Student",
        staffLabel: "Instructor",
        groupLabel: "Group",
        sessionLabel: "Session",
        programLabel: "Program",
      },
    },
  });


  const {
    dictionary,
    mediaLabel,
    statusLabel
  } = useLocalization();

  const t = dictionary.pages.settings;
  const common = dictionary.common;

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    reset({
      name: settingsQuery.data.name,
      defaultLocale:
        settingsQuery.data.defaultLocale,
      timezone: settingsQuery.data.timezone,
      terminology: settingsQuery.data.terminology,
    });
  }, [reset, settingsQuery.data]);

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  const updateMutation = useMutation({
    mutationFn: updateOrganizationSettings,
  });

  async function onSubmit(
    values: OrganizationSettingsFormValues,
  ) {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated =
        await updateMutation.mutateAsync(values);

      reset({
        name: updated.name,
        defaultLocale: updated.defaultLocale,
        timezone: updated.timezone,
        terminology: updated.terminology,
      });

      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.settings,
      });

      await queryClient.invalidateQueries({
        queryKey: [
          "organization",
          "localization",
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: ["current-user"],
      });

      setSuccessMessage(
        t.saved,
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          common.messages.operationFailed,
        ),
      );
    }
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        {common.messages.loading}
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (!canReadSettings) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader user={currentUser} />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {common.messages.permissionDenied}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-5xl p-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.title}
          </h1>

          <p className="mt-1 text-slate-600">
            {t.description}
          </p>
        </header>

        {settingsQuery.isPending && (
          <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
            {common.messages.loading}
          </div>
        )}

        {settingsQuery.isError && (
          <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
            {getApiErrorMessage(
              settingsQuery.error,
              common.messages.operationFailed,
            )}
          </div>
        )}

        {settingsQuery.data && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-6"
          >
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">
                {t.generalInformation}
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium"
                  >
                    {t.organizationName}
                  </label>

                  <input
                    id="name"
                    disabled={!canUpdateSettings}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                    {...register("name")}
                  />

                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="defaultLocale"
                    className="block text-sm font-medium"
                  >
                    {t.defaultLanguage}
                  </label>

                  <select
                    id="defaultLocale"
                    disabled={!canUpdateSettings}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                    {...register("defaultLocale")}
                  >
                    {localeOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="timezone"
                    className="block text-sm font-medium"
                  >
                    {common.fields.timezone}
                  </label>

                  <select
                    id="timezone"
                    disabled={!canUpdateSettings}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
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

                  {errors.timezone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.timezone.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">
                    {dictionary.pages.login.organization} {common.fields.code}:{" "}
                    <strong>
                      {settingsQuery.data.slug}
                    </strong>
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">
                {t.terminology}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {t.terminologyDescription}
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <TerminologyField
                  id="studentLabel"
                  label={t.studentLabel}
                  example="Student, Athlete, Participant"
                  disabled={!canUpdateSettings}
                  error={
                    errors.terminology?.studentLabel
                      ?.message
                  }
                  registration={register(
                    "terminology.studentLabel",
                  )}
                />

                <TerminologyField
                  id="staffLabel"
                  label={t.staffLabel}
                  example="Instructor, Coach, Teacher"
                  disabled={!canUpdateSettings}
                  error={
                    errors.terminology?.staffLabel
                      ?.message
                  }
                  registration={register(
                    "terminology.staffLabel",
                  )}
                />

                <TerminologyField
                  id="groupLabel"
                  label={t.groupLabel}
                  example="Group, Team, Class"
                  disabled={!canUpdateSettings}
                  error={
                    errors.terminology?.groupLabel
                      ?.message
                  }
                  registration={register(
                    "terminology.groupLabel",
                  )}
                />

                <TerminologyField
                  id="sessionLabel"
                  label={t.sessionLabel}
                  example="Session, Training, Lesson"
                  disabled={!canUpdateSettings}
                  error={
                    errors.terminology?.sessionLabel
                      ?.message
                  }
                  registration={register(
                    "terminology.sessionLabel",
                  )}
                />

                <TerminologyField
                  id="programLabel"
                  label={t.programLabel}
                  example="Program, Sport, Department"
                  disabled={!canUpdateSettings}
                  error={
                    errors.terminology?.programLabel
                      ?.message
                  }
                  registration={register(
                    "terminology.programLabel",
                  )}
                />
              </div>
            </section>

            {successMessage && (
              <div
                role="status"
                className="rounded-lg bg-green-50 p-4 text-green-700"
              >
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-4 text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {canUpdateSettings && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    !isDirty
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateMutation.isPending
                    ? common.actions.saving
                    : t.save}
                </button>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

type TerminologyFieldProps = {
  id: string;
  label: string;
  example: string;
  disabled: boolean;
  error?: string;
  registration: ReturnType<
    ReturnType<
      typeof useForm<OrganizationSettingsFormValues>
    >["register"]
  >;
};

function TerminologyField({
  id,
  label,
  example,
  disabled,
  error,
  registration,
}: TerminologyFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <input
        id={id}
        disabled={disabled}
        placeholder={example}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
        {...registration}
      />

      <p className="mt-1 text-xs text-slate-500">
        Example: {example}
      </p>

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
