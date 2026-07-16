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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/backend/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
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
      `API request failed with status ${response.status}`,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
