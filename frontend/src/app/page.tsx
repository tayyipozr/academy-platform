"use client";

import { useEffect, useState } from "react";

type SystemStatus = {
  status: string;
  application: string;
  timestamp: string;
};

export default function HomePage() {
  const [systemStatus, setSystemStatus] =
    useState<SystemStatus | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch(
          "/backend/api/v1/system/ping",
        );

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const result = (await response.json()) as SystemStatus;
        setSystemStatus(result);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to connect to the backend",
        );
      }
    }

    void loadStatus();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-slate-900">
          Academy Management Platform
        </h1>

        <p className="mt-2 text-slate-600">
          Multi-tenant school and sports academy management
        </p>

        <section className="mt-8 rounded-lg border p-5">
          <h2 className="text-lg font-semibold">
            Infrastructure Status
          </h2>

          {!systemStatus && !error && (
            <p className="mt-3 text-slate-500">
              Checking backend connection...
            </p>
          )}

          {error && (
            <p className="mt-3 text-red-600">
              Backend unavailable: {error}
            </p>
          )}

          {systemStatus && (
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="font-medium">Status</dt>
                <dd className="text-green-600">
                  {systemStatus.status}
                </dd>
              </div>

              <div>
                <dt className="font-medium">Application</dt>
                <dd>{systemStatus.application}</dd>
              </div>

              <div>
                <dt className="font-medium">Server time</dt>
                <dd>
                  {new Date(systemStatus.timestamp).toLocaleString()}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}