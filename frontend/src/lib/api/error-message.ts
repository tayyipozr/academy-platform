import { ApiError } from "./api-client";

export function getApiErrorMessage(
  error: unknown,
  fallback = "The operation could not be completed.",
): string {
  if (error instanceof ApiError) {
    if (
      error.body?.fieldErrors &&
      error.body.fieldErrors.length > 0
    ) {
      return error.body.fieldErrors
        .map(
          (fieldError) =>
            `${fieldError.field}: ${fieldError.message}`,
        )
        .join(" ");
    }

    return error.body?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
