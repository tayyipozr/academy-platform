"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { getGroups } from "@/features/groups/api";
import { getTerms } from "@/features/terms/api";

import {
  getStudentAttendanceHistory,
} from "./api";

import {
  AttendancePercentageCard,
} from "./attendance-percentage-card";

import {
  AttendanceSummaryCards,
} from "./attendance-summary-cards";

import {
  AttendanceStatusBadge,
} from "./attendance-status-badge";

import { attendanceQueryKeys } from "./query-keys";

import { getApiErrorMessage } from "@/lib/api/error-message";

type StudentAttendancePanelProps = {
  studentId: string;
  showOrganizationFilters?: boolean;
};

export function StudentAttendancePanel({
  studentId,
  showOrganizationFilters = true,
}: StudentAttendancePanelProps) {
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState(
    `${currentYear}-01-01`,
  );

  const [dateTo, setDateTo] = useState(
    `${currentYear}-12-31`,
  );

  const [groupId, setGroupId] = useState("");
  const [termId, setTermId] = useState("");

  const filters = {
    dateFrom,
    dateTo,
    groupId,
    termId,
  };

  const attendanceQuery = useQuery({
    queryKey:
      attendanceQueryKeys.studentHistory(
        studentId,
        filters,
      ),

    queryFn: () =>
      getStudentAttendanceHistory(
        studentId,
        {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          groupId: groupId || undefined,
          termId: termId || undefined,
        },
      ),

    enabled: Boolean(studentId),
  });

  const groupsQuery = useQuery({
    queryKey: [
      "groups",
      "attendance-filter-options",
    ],

    queryFn: () =>
      getGroups({
        includeArchived: true,
      }),

    enabled: showOrganizationFilters,
  });

  const termsQuery = useQuery({
    queryKey: [
      "terms",
      "attendance-filter-options",
    ],

    queryFn: () =>
      getTerms({
        includeArchived: true,
      }),

    enabled: showOrganizationFilters,
  });

  return (
    <section>
      <header>
        <h2 className="text-xl font-semibold">
          Attendance history
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Only finalized attendance is included.
        </p>
      </header>

      <div
        className={`mt-5 grid gap-3 rounded-xl bg-white p-4 ${
          showOrganizationFilters
            ? "md:grid-cols-4"
            : "md:grid-cols-2"
        }`}
      >
        <FilterField
          label="Date from"
          id={`attendance-from-${studentId}`}
        >
          <input
            id={`attendance-from-${studentId}`}
            type="date"
            value={dateFrom}
            onChange={(event) =>
              setDateFrom(event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </FilterField>

        <FilterField
          label="Date to"
          id={`attendance-to-${studentId}`}
        >
          <input
            id={`attendance-to-${studentId}`}
            type="date"
            value={dateTo}
            onChange={(event) =>
              setDateTo(event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </FilterField>

        {showOrganizationFilters && (
          <>
            <FilterField
              label="Group"
              id={`attendance-group-${studentId}`}
            >
              <select
                id={`attendance-group-${studentId}`}
                value={groupId}
                onChange={(event) =>
                  setGroupId(event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">
                  All groups
                </option>

                {groupsQuery.data?.map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField
              label="Term"
              id={`attendance-term-${studentId}`}
            >
              <select
                id={`attendance-term-${studentId}`}
                value={termId}
                onChange={(event) =>
                  setTermId(event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">
                  All terms
                </option>

                {termsQuery.data?.map((term) => (
                  <option
                    key={term.id}
                    value={term.id}
                  >
                    {term.name}
                  </option>
                ))}
              </select>
            </FilterField>
          </>
        )}
      </div>

      {attendanceQuery.isPending && (
        <div className="mt-5 rounded-xl bg-white p-8 text-center">
          Loading attendance history...
        </div>
      )}

      {attendanceQuery.isError && (
        <div className="mt-5 rounded-xl bg-red-50 p-5 text-red-700">
          {getApiErrorMessage(
            attendanceQuery.error,
            "Attendance history could not be loaded.",
          )}
        </div>
      )}

      {attendanceQuery.data && (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <AttendancePercentageCard
              percentage={
                attendanceQuery.data
                  .attendancePercentage
              }
            />

            <AttendanceSummaryCards
              total={
                attendanceQuery.data
                  .totalFinalizedSessions
              }
              present={
                attendanceQuery.data.presentCount
              }
              late={
                attendanceQuery.data.lateCount
              }
              absent={
                attendanceQuery.data.absentCount
              }
              excused={
                attendanceQuery.data.excusedCount
              }
            />
          </div>

          <section className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm">
            {attendanceQuery.data.records.length ===
            0 ? (
              <div className="p-8 text-center text-slate-500">
                No finalized attendance records were found
                for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-4">
                        Session
                      </th>
                      <th className="p-4">
                        Group
                      </th>
                      <th className="p-4">
                        Date
                      </th>
                      <th className="p-4">
                        Status
                      </th>
                      <th className="p-4">
                        Time
                      </th>
                      <th className="p-4">
                        Note
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {attendanceQuery.data.records.map(
                      (record) => (
                        <tr
                          key={
                            record.attendanceRecordId
                          }
                        >
                          <td className="p-4">
                            <p className="font-medium">
                              {record.sessionTitle}
                            </p>

                            <p className="text-sm text-slate-500">
                              {record.termName}
                            </p>
                          </td>

                          <td className="p-4">
                            {record.groupName}
                          </td>

                          <td className="p-4">
                            {new Date(
                              `${record.sessionDate}T00:00:00`,
                            ).toLocaleDateString()}
                          </td>

                          <td className="p-4">
                            <AttendanceStatusBadge
                              status={record.status}
                            />
                          </td>

                          <td className="p-4 text-sm">
                            {record.arrivalTime ||
                            record.departureTime ? (
                              <>
                                {formatTime(
                                  record.arrivalTime,
                                )}
                                {" – "}
                                {formatTime(
                                  record.departureTime,
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="max-w-sm whitespace-pre-wrap p-4 text-sm">
                            {record.note || "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <div className="mt-1">{children}</div>
    </div>
  );
}

function formatTime(
  value: string | null,
): string {
  return value?.slice(0, 5) ?? "—";
}
