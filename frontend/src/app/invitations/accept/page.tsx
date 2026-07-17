"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { acceptInvitation } from "@/features/users/api";
import { getApiErrorMessage } from "@/lib/api/error-message";

function InvitationAcceptanceForm() {
  const searchParameters = useSearchParams();
  const token = searchParameters.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] =
    useState("");

  const invitationMutation = useMutation({
    mutationFn: acceptInvitation,
  });

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (password.length < 12) {
      return;
    }

    if (password !== passwordConfirmation) {
      return;
    }

    await invitationMutation.mutateAsync({
      token,
      password,
    });
  }

  if (!token) {
    return (
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-red-700">
          Invalid invitation
        </h1>

        <p className="mt-2 text-slate-600">
          The invitation URL does not contain a token.
        </p>
      </div>
    );
  }

  if (invitationMutation.isSuccess) {
    return (
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-green-700">
          Invitation accepted
        </h1>

        <p className="mt-3 text-slate-600">
          Your account is now active.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Organization:{" "}
          {invitationMutation.data.organizationSlug}
        </p>

        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Continue to login
        </a>
      </div>
    );
  }

  const passwordsMatch =
    password === passwordConfirmation;

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">
        Accept invitation
      </h1>

      <p className="mt-2 text-slate-600">
        Choose a secure password to activate your account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
      >
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          {password.length > 0 &&
            password.length < 12 && (
              <p className="mt-1 text-sm text-red-600">
                The password must contain at least 12
                characters.
              </p>
            )}
        </div>

        <div>
          <label
            htmlFor="passwordConfirmation"
            className="block text-sm font-medium"
          >
            Confirm password
          </label>

          <input
            id="passwordConfirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(event) =>
              setPasswordConfirmation(
                event.target.value,
              )
            }
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          {passwordConfirmation.length > 0 &&
            !passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">
                The passwords do not match.
              </p>
            )}
        </div>

        {invitationMutation.isError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {getApiErrorMessage(
              invitationMutation.error,
              "The invitation could not be accepted.",
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={
            invitationMutation.isPending ||
            password.length < 12 ||
            !passwordsMatch
          }
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {invitationMutation.isPending
            ? "Activating account..."
            : "Activate account"}
        </button>
      </form>
    </div>
  );
}

export default function InvitationAcceptancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Suspense fallback={<p>Loading invitation...</p>}>
        <InvitationAcceptanceForm />
      </Suspense>
    </main>
  );
}
