"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";
import { ApiError } from "@/lib/api/api-client";

export default function DashboardPage() {
  const router = useRouter();

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        Loading dashboard...
      </main>
    );
  }

  if (
    currentUserQuery.isError ||
    !currentUserQuery.data
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-lg bg-red-50 p-5 text-red-700">
          The dashboard could not be loaded.
        </div>
      </main>
    );
  }

  const user = currentUserQuery.data;

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-7xl p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-slate-600">
            Welcome, {user.firstName} {user.lastName}.
          </p>
        </div>

        <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Organization
            </p>

            <p className="mt-2 text-lg font-semibold">
              {user.organization.name}
            </p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Roles
            </p>

            <p className="mt-2 text-lg font-semibold">
              {user.roles.join(", ")}
            </p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Permissions
            </p>

            <p className="mt-2 text-lg font-semibold">
              {user.permissions.length}
            </p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Status
            </p>

            <p className="mt-2 text-lg font-semibold text-green-600">
              Active
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}