import {
  ApiError,
} from "@/lib/api/api-client";

import type {
  TranslationDictionary,
} from "./types";

export function getLocalizedApiError(
  error: unknown,
  dictionary: TranslationDictionary,
): string {
  if (!(error instanceof ApiError)) {
    return dictionary.common.messages
      .operationFailed;
  }

  switch (error.body?.code) {
    case "AUTHENTICATION_REQUIRED":
    case "SESSION_INVALIDATED":
      return dictionary.common.messages
        .sessionExpired;

    case "ACCESS_DENIED":
      return dictionary.common.messages
        .permissionDenied;

    default:
      return (
        error.body?.message ??
        dictionary.common.messages
          .operationFailed
      );
  }
}
