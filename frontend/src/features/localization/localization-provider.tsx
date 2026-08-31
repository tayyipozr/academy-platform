"use client";

import {
    createContext,
    useEffect,
    useMemo,
    type ReactNode,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import {
    dictionaries,
} from "./messages";

import {
    getOrganizationLocalization,
} from "./api";

import type {
    OrganizationTerminology,
    SupportedLocale,
    TranslationDictionary,
} from "./types";

export type LocalizationContextValue = {
    locale: SupportedLocale;
    dictionary: TranslationDictionary;
    terminology: OrganizationTerminology;

    statusLabel: (status: string) => string;

    mediaLabel: (mediaType: string) => string;

    formatDate: (
        value: string | Date | null | undefined,
    ) => string;

    formatDateTime: (
        value: string | Date | null | undefined,
    ) => string;

    formatNumber: (
        value: number | null | undefined,
        options?: Intl.NumberFormatOptions,
    ) => string;
};

export const LocalizationContext =
    createContext<LocalizationContextValue | null>(
        null,
    );

const terminologyByLocale: Record<
    SupportedLocale,
    OrganizationTerminology
> = {
    "en-US": {
        studentLabel: "Student",
        staffLabel: "Instructor",
        groupLabel: "Group",
        sessionLabel: "Session",
        programLabel: "Program",
    },

    "tr-TR": {
        studentLabel: "Öğrenci",
        staffLabel: "Eğitmen",
        groupLabel: "Grup",
        sessionLabel: "Ders",
        programLabel: "Program",
    },
};

type LocalizationProviderProps = Readonly<{
    children: ReactNode;
}>;

export function LocalizationProvider({
    children,
}: LocalizationProviderProps) {
    const localizationQuery = useQuery({
        queryKey: [
            "organization",
            "localization",
        ],

        queryFn: getOrganizationLocalization,

        staleTime: 5 * 60 * 1000,

        retry: false,
    });

    const locale: SupportedLocale =
        isSupportedLocale(
            localizationQuery.data?.locale,
        )
            ? localizationQuery.data.locale
            : "en-US";

    const dictionary = dictionaries[locale];

    const terminology =
        localizationQuery.data?.terminology ??
        terminologyByLocale[locale];

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const value =
        useMemo<LocalizationContextValue>(
            () => {
                const statusTranslations =
                    dictionary.common.statuses as Record<
                        string,
                        string
                    >;

                type MediaTypeTranslations = Record<
                    string,
                    string
                >;

                const mediaTypeTranslations: MediaTypeTranslations = {
                    IMAGE: dictionary.common.fields.image,
                    VIDEO: dictionary.common.fields.video,
                    DOCUMENT: dictionary.common.fields.document
                }

                return {
                    locale,
                    dictionary,
                    terminology,

                    statusLabel: (
                        status: string,
                    ): string => {
                        return (
                            statusTranslations[status] ??
                            humanize(status, locale)
                        );
                    },

                    mediaLabel: (
                        mediaType: string,
                    ): string => {
                        return mediaTypeTranslations[mediaType]
                            ;
                    },

                    formatDate: (
                        input:
                            | string
                            | Date
                            | null
                            | undefined,
                    ): string => {
                        const date = parseDate(input);

                        if (!date) {
                            return "—";
                        }

                        return new Intl.DateTimeFormat(
                            locale,
                            {
                                dateStyle: "medium",
                            },
                        ).format(date);
                    },

                    formatDateTime: (
                        input:
                            | string
                            | Date
                            | null
                            | undefined,
                    ): string => {
                        const date = parseDateTime(input);

                        if (!date) {
                            return "—";
                        }

                        return new Intl.DateTimeFormat(
                            locale,
                            {
                                dateStyle: "medium",
                                timeStyle: "short",
                            },
                        ).format(date);
                    },

                    formatNumber: (
                        input:
                            | number
                            | null
                            | undefined,

                        options?: Intl.NumberFormatOptions,
                    ): string => {
                        if (
                            input === null ||
                            input === undefined ||
                            !Number.isFinite(input)
                        ) {
                            return "—";
                        }

                        return new Intl.NumberFormat(
                            locale,
                            options,
                        ).format(input);
                    },
                };
            },
            [dictionary, locale, terminology],
        );

    return (
        <LocalizationContext.Provider
            value={value}
        >
            {children}
        </LocalizationContext.Provider>
    );
}

function isSupportedLocale(
    locale: string | null | undefined,
): locale is SupportedLocale {
    return (
        locale !== null &&
        locale !== undefined &&
        Object.prototype.hasOwnProperty.call(
            dictionaries,
            locale,
        )
    );
}

function parseDate(
    input:
        | string
        | Date
        | null
        | undefined,
): Date | null {
    if (!input) {
        return null;
    }

    if (input instanceof Date) {
        return isValidDate(input)
            ? input
            : null;
    }

    /*
     * A backend LocalDate normally arrives as YYYY-MM-DD.
     * Parsing it as midnight UTC can show the previous day
     * in some timezones. We therefore construct it in the
     * browser's local timezone.
     */
    const localDateMatch = input.match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
    );

    if (localDateMatch) {
        const [, year, month, day] =
            localDateMatch;

        const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
        );

        return isValidDate(date)
            ? date
            : null;
    }

    const date = new Date(input);

    return isValidDate(date)
        ? date
        : null;
}

function parseDateTime(
    input:
        | string
        | Date
        | null
        | undefined,
): Date | null {
    if (!input) {
        return null;
    }

    const date =
        input instanceof Date
            ? input
            : new Date(input);

    return isValidDate(date)
        ? date
        : null;
}

function isValidDate(
    date: Date,
): boolean {
    return !Number.isNaN(date.getTime());
}

function humanize(
    value: string,
    locale: SupportedLocale,
): string {
    const normalized = value
        .replaceAll("_", " ")
        .trim()
        .toLocaleLowerCase(locale);

    if (!normalized) {
        return "";
    }

    return (
        normalized.charAt(0)
            .toLocaleUpperCase(locale) +
        normalized.slice(1)
    );
}