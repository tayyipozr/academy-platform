"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserFormSchema,
  type UserFormMode,
  type UserFormValues,
} from "./user-form-schema";

import type {
  OrganizationUser,
  Role,
} from "./types";

type UserFormDialogProps = {
  mode: UserFormMode;
  roles: Role[];
  user?: OrganizationUser;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: UserFormValues,
  ) => Promise<void>;
};

export function UserFormDialog({
  mode,
  roles,
  user,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const schema = useMemo(
    () => createUserFormSchema(mode),
    [mode],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      temporaryPassword: "",
      roleIds: [],
    },
  });

  useEffect(() => {
    reset({
      email: user?.email ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      temporaryPassword: "",
      roleIds:
        user?.roles.map((role) => role.id) ?? [],
    });
  }, [reset, user]);

  const availableRoles = roles.filter((role) => {
    if (mode === "edit") {
      return true;
    }

    return ["INSTRUCTOR", "GUARDIAN"].includes(
      role.name,
    );
  });

  const title = {
    create: "Create active user",
    invite: "Invite user",
    edit: "Edit organization user",
  }[mode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2
            id="user-form-title"
            className="text-xl font-semibold"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              disabled={mode === "edit"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              {...register("email")}
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium"
              >
                First name
              </label>

              <input
                id="firstName"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("firstName")}
              />

              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium"
              >
                Last name
              </label>

              <input
                id="lastName"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("lastName")}
              />

              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label
                htmlFor="temporaryPassword"
                className="block text-sm font-medium"
              >
                Temporary password
              </label>

              <input
                id="temporaryPassword"
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register("temporaryPassword")}
              />

              {errors.temporaryPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {
                    errors.temporaryPassword
                      .message
                  }
                </p>
              )}
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium">
              Roles
            </legend>

            <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start gap-3"
                >
                  <input
                    type="checkbox"
                    value={role.id}
                    className="mt-1"
                    {...register("roleIds")}
                  />

                  <span>
                    <span className="block font-medium">
                      {role.name}
                    </span>

                    {role.description && (
                      <span className="block text-sm text-slate-500">
                        {role.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {errors.roleIds && (
              <p className="mt-1 text-sm text-red-600">
                {errors.roleIds.message}
              </p>
            )}
          </fieldset>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
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
                : "Save"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
