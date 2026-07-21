import Link from "next/link";

type DashboardMetricCardProps = {
  label: string;
  value: number;
  description?: string;
  href?: string;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info";
};

const toneStyles = {
  default: {
    value: "text-slate-900",
    border: "border-slate-200",
  },
  success: {
    value: "text-green-700",
    border: "border-green-200",
  },
  warning: {
    value: "text-amber-700",
    border: "border-amber-200",
  },
  danger: {
    value: "text-red-700",
    border: "border-red-200",
  },
  info: {
    value: "text-blue-700",
    border: "border-blue-200",
  },
} as const;

export function DashboardMetricCard({
  label,
  value,
  description,
  href,
  tone = "default",
}: DashboardMetricCardProps) {
  const content = (
    <article
      className={`h-full rounded-xl border bg-white p-5 shadow-sm transition ${toneStyles[tone].border} ${
        href
          ? "hover:-translate-y-0.5 hover:shadow-md"
          : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${toneStyles[tone].value}`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-slate-500">
          {description}
        </p>
      )}
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}
