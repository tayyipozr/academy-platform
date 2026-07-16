"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/api-client";
import { login } from "@/features/auth/api";

export default function LoginPage() {
  const router = useRouter();

  const [organizationSlug, setOrganizationSlug] =
    useState("demo-academy");

  const [email, setEmail] =
    useState("admin@example.com");

  const [password, setPassword] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await login({
        organizationSlug,
        email,
        password,
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      if (
        requestError instanceof ApiError &&
        requestError.status === 401
      ) {
        setError(
          "The organization, email, or password is incorrect.",
        );
      } else {
        setError(
          "Login failed. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Academy Platform
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to your organization
          </p>
        </div>

        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="organizationSlug"
              className="block text-sm font-medium text-slate-700"
            >
              Organization
            </label>

            <input
              id="organizationSlug"
              type="text"
              required
              value={organizationSlug}
              onChange={(event) =>
                setOrganizationSlug(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              autoComplete="organization"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
