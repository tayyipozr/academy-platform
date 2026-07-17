"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AuthenticatedUser } from "@/features/auth/types";
import { hasPermission } from "@/lib/permissions";

type NavigationItem = {
  href: string;
  label: string;
  permission?: string;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/dashboard/users",
    label: "Users",
    permission: "users.read",
  },
  {
    href: "/dashboard/students",
    label: "Students",
    permission: "students.read",
  },
  {
    href: "/dashboard/groups",
    label: "Groups",
    permission: "groups.read",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    permission: "reports.read",
  },
  {
    href: "/dashboard/branches",
    label: "Branches",
    permission: "branches.read",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    permission: "organization.settings.read",
  },
];

export function AppNavigation({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();

  const visibleItems = navigationItems.filter(
    (item) =>
      !item.permission ||
      hasPermission(user, item.permission),
  );

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-wrap items-center gap-1"
    >
      {visibleItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

}
