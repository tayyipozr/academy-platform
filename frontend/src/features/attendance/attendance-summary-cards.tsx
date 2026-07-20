type AttendanceSummaryCardsProps = {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

export function AttendanceSummaryCards({
  total,
  present,
  late,
  absent,
  excused,
}: AttendanceSummaryCardsProps) {
  const cards = [
    {
      label: "Finalized sessions",
      value: total,
      style: "text-slate-900",
    },
    {
      label: "Present",
      value: present,
      style: "text-green-700",
    },
    {
      label: "Late",
      value: late,
      style: "text-amber-700",
    },
    {
      label: "Absent",
      value: absent,
      style: "text-red-700",
    },
    {
      label: "Excused",
      value: excused,
      style: "text-blue-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </p>

          <p
            className={`mt-2 text-2xl font-semibold ${card.style}`}
          >
            {card.value}
          </p>
        </article>
      ))}
    </div>
  );
}
