"use client";

import { useContext } from "react";

import {
  LocalizationContext,
} from "./localization-provider";

export function useLocalization() {
  const context = useContext(
    LocalizationContext,
  );

  if (!context) {
    throw new Error(
      "useLocalization must be used within LocalizationProvider.",
    );
  }

  return context;
}

export function formatMessage(
  message: string,
  values: Record<
    string,
    string | number
  >,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(
        `{${key}}`,
        String(value),
      ),
    message,
  );
}