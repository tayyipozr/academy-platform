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
import { useLocalization } from "@/features/localization/use-localization";

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

  const {
    dictionary,
    formatDate,
    formatDateTime,
    statusLabel
  } = useLocalization();

  const t = dictionary.pages.reports;
  const common = dictionary.common;

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
    return <main className="p-8">{common.messages.loading}</main>;
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
            {common.messages.permissionDenied}
          </div>
        ) : (
          <>
            <header>
              <h1 className="text-2xl font-bold">
                {t.title}
              </h1>

              <p className="mt-1 text-slate-600">
                {t.description}
              </p>
            </header>

            <section className="mt-6 rounded-xl bg-white p-4">
              <label
                htmlFor="reportStatus"
                className="block text-sm font-medium"
              >
                {common.fields.status}
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
                  {common.filters.allStatuses}
                </option>
                <option value="PENDING">
                  {common.statuses.PENDING}
                </option>
                <option value="PROCESSING">
                  {common.statuses.PROCESSING}
                </option>
                <option value="COMPLETED">
                  {common.statuses.COMPLETED}
                </option>
                <option value="FAILED">
                  {common.statuses.FAILED}
                </option>
                <option value="EXPIRED">
                  {common.statuses.EXPIRED}
                </option>
              </select>
            </section>

            {exportsQuery.isPending && (
              <div className="mt-6 rounded-xl bg-white p-8 text-center">
                {t.loading}
              </div>
            )}

            {exportsQuery.isError && (
              <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                {getApiErrorMessage(
                  exportsQuery.error,
                  common.messages.operationFailed,
                )}
              </div>
            )}

            {exportsQuery.data?.length ===
              0 && (
                <div className="mt-6 rounded-xl bg-white p-8 text-center text-slate-500">
                  {t.empty}
                </div>
              )}

            {exportsQuery.data &&
              exportsQuery.data.length > 0 && (
                <section className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
                  <table className="w-full min-w-[1000px] text-left">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="p-4">
                          {common.fields.student}
                        </th>
                        <th className="p-4">
                          {common.fields.group}
                        </th>
                        <th className="p-4">
                          {t.period}
                        </th>
                        <th className="p-4">
                          {t.requested}
                        </th>
                        <th className="p-4">
                          {common.fields.status}
                        </th>
                        <th className="p-4">
                          {t.fileSize}
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
                              {formatDate(item.dateFrom) || "—"}
                              {" – "}
                              {formatDate(item.dateTo) || "—"}
                            </td>

                            <td className="p-4">
                              {formatDateTime(item.requestedAt)}
                            </td>

                            <td className="p-4">
                              {statusLabel(item.status)}
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
