"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentUser,
  logout,
} from "@/features/auth/api";

import type {
  AuthenticatedUser,
} from "@/features/auth/types";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<AuthenticatedUser | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    void loadCurrentUser();
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="p-8">
        Loading...
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between rounded-xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user.organization.name}
            </h1>

            <p className="mt-1 text-slate-600">
              Welcome, {user.firstName} {user.lastName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Sign out
          </button>
        </header>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Authentication information
          </h2>

          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Email
              </dt>
              <dd className="font-medium">
                {user.email}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Organization
              </dt>
              <dd className="font-medium">
                {user.organization.slug}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Roles
              </dt>
              <dd className="font-medium">
                {user.roles.join(", ")}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Permission count
              </dt>
              <dd className="font-medium">
                {user.permissions.length}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
