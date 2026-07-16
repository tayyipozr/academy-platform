export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type CsrfResponse = {
  headerName: string;
  parameterName: string;
  token: string;
};

let csrfToken: string | null = null;

function requiresCsrf(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(
    method.toUpperCase(),
  );
}

export async function initializeCsrf(): Promise<string> {
  const response = await fetch("/backend/api/v1/auth/csrf", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "Could not initialize the security token.",
    );
  }

  const body = (await response.json()) as CsrfResponse;
  csrfToken = body.token;

  return csrfToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";

  if (requiresCsrf(method) && csrfToken === null) {
    await initializeCsrf();
  }

  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresCsrf(method) && csrfToken !== null) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`/backend/api/v1${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    throw new ApiError(
      response.status,
      `API request failed with status ${response.status}.`,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}