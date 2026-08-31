"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";

import type {
  AuthenticatedUser,
} from "@/features/auth/types";

import {
  useLocalization,
} from "@/features/localization/use-localization";

import {
  hasPermission,
} from "@/lib/permissions";

type NavigationKey =
  | "dashboard"
  | "myChildren"
  | "users"
  | "students"
  | "guardians"
  | "staff"
  | "branches"
  | "programs"
  | "terms"
  | "curricula"
  | "groups"
  | "schedule"
  | "evaluationModels"
  | "evaluations"
  | "media"
  | "reports"
  | "settings";

type NavigationItem = {
  href: string;
  labelKey: NavigationKey;
  permission?: string;
  excludedRoles?: string[];
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    labelKey: "dashboard",
  },
  {
    href: "/dashboard/my-children",
    labelKey: "myChildren",
    permission:
      "guardian.linked-students.read",
  },
  {
    href: "/dashboard/users",
    labelKey: "users",
    permission: "users.read",
  },
  {
    href: "/dashboard/students",
    labelKey: "students",
    permission: "students.read",
  },
  {
    href: "/dashboard/guardians",
    labelKey: "guardians",
    permission: "guardians.read",
  },
  {
    href: "/dashboard/staff",
    labelKey: "staff",
    permission: "staff.read",
  },
  {
    href: "/dashboard/branches",
    labelKey: "branches",
    permission: "branches.read",
  },
  {
    href: "/dashboard/programs",
    labelKey: "programs",
    permission: "programs.read",
  },
  {
    href: "/dashboard/terms",
    labelKey: "terms",
    permission: "terms.read",
  },
  {
    href: "/dashboard/curricula",
    labelKey: "curricula",
    permission: "curricula.read",
  },
  {
    href: "/dashboard/groups",
    labelKey: "groups",
    permission: "groups.read",
  },
  {
    href: "/dashboard/sessions",
    labelKey: "schedule",
    permission: "sessions.read",
  },
  {
    href: "/dashboard/evaluation-templates",
    labelKey: "evaluationModels",
    permission: "evaluations.read",
  },
  {
    href: "/dashboard/evaluations",
    labelKey: "evaluations",
    permission: "evaluations.read",
  },
  {
    href: "/dashboard/media",
    labelKey: "media",
    permission: "media.read",
    excludedRoles: ["GUARDIAN"],
  },
  {
    href: "/dashboard/reports",
    labelKey: "reports",
    permission: "reports.read",
  },
  {
    href: "/dashboard/settings",
    labelKey: "settings",
    permission:
      "organization.settings.read",
  },
];

export function AppNavigation({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();

  const {
    dictionary,
  } = useLocalization();

  const isGuardian =
    user.roles.includes("GUARDIAN");

  const visibleItems =
    navigationItems.filter((item) => {
      if (
        item.href === "/dashboard" &&
        isGuardian
      ) {
        return false;
      }

      const permitted =
        !item.permission ||
        hasPermission(
          user,
          item.permission,
        );

      const excluded =
        item.excludedRoles?.some(
          (role) =>
            user.roles.includes(role),
        ) ?? false;

      return permitted && !excluded;
    });

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="hidden min-w-0 flex-1 items-center overflow-x-auto lg:flex"
      >
        <div className="flex min-w-max items-center gap-1 rounded-xl bg-slate-50 p-1">
          {visibleItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(
                  item.href,
                );

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
              >
                {
                  dictionary.navigation[
                  item.labelKey
                  ]
                }
              </Link>
            );
          })}
        </div>
      </nav>

      <details className="relative lg:hidden">
        <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">
          {dictionary.navigation.menu}
        </summary>

        <nav className="absolute right-0 top-12 z-50 max-h-[70vh] w-72 overflow-y-auto rounded-xl border bg-white p-2 shadow-xl">
          {visibleItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(
                  item.href,
                );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {
                  dictionary.navigation[
                  item.labelKey
                  ]
                }
              </Link>
            );
          })}
        </nav>
      </details>
    </>
  );
}