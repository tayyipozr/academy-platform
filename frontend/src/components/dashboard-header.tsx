"use client";

import { useRouter } from "next/navigation";

import { logout } from "@/features/auth/api";
import type { AuthenticatedUser } from "@/features/auth/types";

import { AppNavigation } from "./app-navigation";

export function DashboardHeader({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="font-bold text-slate-900">
              {user.organization.name}
            </p>

            <p className="text-xs text-slate-500">
              Academy Management Platform
            </p>
          </div>

          <AppNavigation user={user} />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </p>

              <p className="text-xs text-slate-500">
                {user.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
