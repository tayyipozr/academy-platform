"use client";

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getReportDownload,
  getReportExports,
  regenerateReportExport,
  requestStudentProgressExport,
} from "./api";

import {
  reportingQueryKeys,
} from "./query-keys";

import type {
  ReportExport,
} from "./types";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

type ReportExportPanelProps = {
  studentId: string;
  groupId: string | null;
  dateFrom: string;
  dateTo: string;
  canExport: boolean;
};

export function ReportExportPanel({
  studentId,
  groupId,
  dateFrom,
  dateTo,
  canExport,
}: ReportExportPanelProps) {
  const queryClient = useQueryClient();

  const [error, setError] =
    useState<string | null>(null);

  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const exportsQuery = useQuery({
    queryKey:
      reportingQueryKeys.exports({
        studentId,
      }),

    queryFn: () =>
      getReportExports({
        studentId,
      }),

    enabled: canExport,

    refetchInterval: (query) => {
      const exports =
        query.state.data as
          | ReportExport[]
          | undefined;

      const processing =
        exports?.some((item) =>
          ["PENDING", "PROCESSING"].includes(
            item.status,
          ),
        ) ?? false;

      return processing ? 1500 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      requestStudentProgressExport({
        studentId,
        groupId,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      }),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateReportExport,
  });

  async function refreshExports() {
    await queryClient.invalidateQueries({
      queryKey:
        reportingQueryKeys.exports({
          studentId,
        }),
    });
  }

  async function createExport() {
    setError(null);

    try {
      await createMutation.mutateAsync();
      await refreshExports();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The PDF report could not be requested.",
        ),
      );
    }
  }

  async function regenerate(exportId: string) {
    setError(null);

    try {
      await regenerateMutation.mutateAsync(
        exportId,
      );

      await refreshExports();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The report could not be regenerated.",
        ),
      );
    }
  }

  async function download(
    reportExport: ReportExport,
  ) {
    setError(null);
    setDownloadingId(reportExport.id);

    try {
      const result =
        await getReportDownload(
          reportExport.id,
        );

      window.location.assign(
        result.downloadUrl,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The report could not be downloaded.",
        ),
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (!canExport) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <div>
          <h2 className="text-lg font-semibold">
            PDF progress reports
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Generate and download private student progress
            reports.
          </p>
        </div>

        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={createExport}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {createMutation.isPending
            ? "Requesting..."
            : "Generate PDF"}
        </button>
      </header>

      {error && (
        <div className="m-5 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {exportsQuery.isPending && (
        <div className="p-8 text-center">
          Loading report exports...
        </div>
      )}

      {exportsQuery.data?.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No reports have been generated.
        </div>
      )}

      {exportsQuery.data &&
        exportsQuery.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-4">
                    Requested
                  </th>
                  <th className="p-4">
                    Period
                  </th>
                  <th className="p-4">
                    Group
                  </th>
                  <th className="p-4">
                    Status
                  </th>
                  <th className="p-4">
                    Expires
                  </th>
                  <th className="p-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {exportsQuery.data.map(
                  (reportExport) => (
                    <tr key={reportExport.id}>
                      <td className="p-4">
                        {new Date(
                          reportExport.requestedAt,
                        ).toLocaleString()}
                      </td>

                      <td className="p-4">
                        {reportExport.dateFrom ||
                          "—"}
                        {" – "}
                        {reportExport.dateTo ||
                          "—"}
                      </td>

                      <td className="p-4">
                        {reportExport.groupName ||
                          "Most recent"}
                      </td>

                      <td className="p-4">
                        <ExportStatusBadge
                          status={
                            reportExport.status
                          }
                        />

                        {reportExport.errorMessage && (
                          <p className="mt-2 max-w-sm text-xs text-red-600">
                            {
                              reportExport.errorMessage
                            }
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        {reportExport.expiresAt
                          ? new Date(
                              reportExport.expiresAt,
                            ).toLocaleString()
                          : "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {reportExport.status ===
                            "COMPLETED" && (
                            <button
                              type="button"
                              disabled={
                                downloadingId ===
                                reportExport.id
                              }
                              onClick={() =>
                                download(
                                  reportExport,
                                )
                              }
                              className="rounded border border-green-300 px-3 py-1.5 text-sm text-green-700"
                            >
                              {downloadingId ===
                              reportExport.id
                                ? "Opening..."
                                : "Download"}
                            </button>
                          )}

                          {[
                            "FAILED",
                            "EXPIRED",
                          ].includes(
                            reportExport.status,
                          ) && (
                            <button
                              type="button"
                              disabled={
                                regenerateMutation.isPending
                              }
                              onClick={() =>
                                regenerate(
                                  reportExport.id,
                                )
                              }
                              className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700"
                            >
                              Regenerate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}

function ExportStatusBadge({
  status,
}: {
  status: ReportExport["status"];
}) {
  const styles = {
    PENDING:
      "bg-slate-200 text-slate-700",
    PROCESSING:
      "bg-amber-100 text-amber-700",
    COMPLETED:
      "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    EXPIRED:
      "bg-purple-100 text-purple-700",
  } as const;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
