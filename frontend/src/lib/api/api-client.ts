export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
  fieldErrors?: ApiFieldError[];
  timestamp?: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody,
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
  const response = await fetch(
    "/backend/api/v1/auth/csrf",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "Could not initialize the security token.",
    );
  }

  const result =
    (await response.json()) as CsrfResponse;

  csrfToken = result.token;

  return result.token;
}

async function parseErrorBody(
  response: Response,
): Promise<ApiErrorBody | undefined> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method =
    options.method?.toUpperCase() ?? "GET";

  if (requiresCsrf(method) && csrfToken === null) {
    await initializeCsrf();
  }

  const headers = new Headers(options.headers);

  if (
    options.body !== undefined &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresCsrf(method) && csrfToken !== null) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(
    `/backend/api/v1${path}`,
    {
      ...options,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await parseErrorBody(response);

    if (
      response.status === 401 &&
      body?.code === "SESSION_INVALIDATED"
    ) {
      csrfToken = null;
    }

    throw new ApiError(
      response.status,
      body?.message ??
      `API request failed with status ${response.status}.`,
      body,
    );
  }

  if (
    response.status === 204 ||
    response.headers.get("Content-Length") === "0"
  ) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (responseText.length === 0) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}