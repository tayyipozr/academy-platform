"use client";

import { useLocalization } from "@/features/localization/use-localization";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const { statusLabel } = useLocalization();

  return (
    <span
      className={`inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
