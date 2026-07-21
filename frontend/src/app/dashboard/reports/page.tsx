"use client";

import { useState } from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  getReportExports,
} from "@/features/reporting/api";

import {
  reportingQueryKeys,
} from "@/features/reporting/query-keys";

import type {
  ReportExportStatus,
} from "@/features/reporting/types";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

import {
  hasPermission,
} from "@/lib/permissions";

export default function ReportsPage() {
  const [status, setStatus] =
    useState<ReportExportStatus | "">("");

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canExport = hasPermission(
    currentUser,
    "reports.export",
  );

  const filters = { status };

  const exportsQuery = useQuery({
    queryKey:
      reportingQueryKeys.exports(filters),

    queryFn: () =>
      getReportExports({
        status,
      }),

    enabled:
      currentUserQuery.isSuccess &&
      canExport,

    refetchInterval: (query) => {
      const data = query.state.data;

      const active =
        data?.some((item) =>
          ["PENDING", "PROCESSING"].includes(
            item.status,
          ),
        ) ?? false;

      return active ? 1500 : false;
    },
  });

  if (currentUserQuery.isPending) {
    return <main className="p-8">Loading...</main>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        {!canExport ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            You do not have permission to view report
            exports.
          </div>
        ) : (
          <>
            <header>
              <h1 className="text-2xl font-bold">
                Report exports
              </h1>

              <p className="mt-1 text-slate-600">
                View PDF generation history and export
                status.
              </p>
            </header>

            <section className="mt-6 rounded-xl bg-white p-4">
              <label
                htmlFor="reportStatus"
                className="block text-sm font-medium"
              >
                Export status
              </label>

              <select
                id="reportStatus"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | ReportExportStatus
                      | "",
                  )
                }
                className="mt-1 w-full max-w-sm rounded-lg border px-3 py-2"
              >
                <option value="">
                  All statuses
                </option>
                <option value="PENDING">
                  Pending
                </option>
                <option value="PROCESSING">
                  Processing
                </option>
                <option value="COMPLETED">
                  Completed
                </option>
                <option value="FAILED">
                  Failed
                </option>
                <option value="EXPIRED">
                  Expired
                </option>
              </select>
            </section>

            {exportsQuery.isPending && (
              <div className="mt-6 rounded-xl bg-white p-8 text-center">
                Loading report exports...
              </div>
            )}

            {exportsQuery.isError && (
              <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                {getApiErrorMessage(
                  exportsQuery.error,
                  "Report exports could not be loaded.",
                )}
              </div>
            )}

            {exportsQuery.data?.length ===
              0 && (
              <div className="mt-6 rounded-xl bg-white p-8 text-center text-slate-500">
                No report exports were found.
              </div>
            )}

            {exportsQuery.data &&
              exportsQuery.data.length > 0 && (
                <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
                  <table className="w-full min-w-[1000px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          Student
                        </th>
                        <th className="p-4">
                          Group
                        </th>
                        <th className="p-4">
                          Period
                        </th>
                        <th className="p-4">
                          Requested
                        </th>
                        <th className="p-4">
                          Status
                        </th>
                        <th className="p-4">
                          Size
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {exportsQuery.data.map(
                        (item) => (
                          <tr key={item.id}>
                            <td className="p-4">
                              <p className="font-medium">
                                {item.studentName ||
                                  "Unknown"}
                              </p>

                              <p className="text-sm text-slate-500">
                                {item.studentNumber}
                              </p>
                            </td>

                            <td className="p-4">
                              {item.groupName || "—"}
                            </td>

                            <td className="p-4">
                              {item.dateFrom || "—"}
                              {" – "}
                              {item.dateTo || "—"}
                            </td>

                            <td className="p-4">
                              {new Date(
                                item.requestedAt,
                              ).toLocaleString()}
                            </td>

                            <td className="p-4">
                              {item.status}
                            </td>

                            <td className="p-4">
                              {item.fileSize === null
                                ? "—"
                                : formatFileSize(
                                    item.fileSize,
                                  )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </section>
              )}
          </>
        )}
      </main>
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
