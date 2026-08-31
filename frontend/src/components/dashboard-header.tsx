"use client";

import { useRouter } from "next/navigation";

import { logout } from "@/features/auth/api";
import type {
  AuthenticatedUser,
} from "@/features/auth/types";

import { AppNavigation } from "./app-navigation";

import {
  useLocalization,
} from "@/features/localization/use-localization";

export function DashboardHeader({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const router = useRouter();

  const {
    dictionary,
  } = useLocalization();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0 shrink-0">
          <p className="max-w-48 truncate font-bold text-slate-900">
            {user.organization.name}
          </p>

          <p className="text-xs text-slate-500">
            {dictionary.common.appName}
          </p>
        </div>

        <AppNavigation user={user} />

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden max-w-48 text-right xl:block">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </p>

            <p className="truncate text-xs text-slate-500">
              {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {dictionary.common.actions.signOut}
          </button>
        </div>
      </div>
    </header>
  );
}