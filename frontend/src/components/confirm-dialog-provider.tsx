"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConfirmDialogVariant =
  | "danger"
  | "warning"
  | "info";

export type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
};

type ConfirmDialogContextValue = {
  confirm: (
    options: ConfirmDialogOptions,
  ) => Promise<boolean>;
};

const ConfirmDialogContext =
  createContext<ConfirmDialogContextValue | null>(
    null,
  );

export function ConfirmDialogProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [options, setOptions] =
    useState<ConfirmDialogOptions | null>(null);

  const resolverRef = useRef<
    ((confirmed: boolean) => void) | null
  >(null);

  const confirm = useCallback(
    (
      nextOptions: ConfirmDialogOptions,
    ): Promise<boolean> => {
      /*
       * Resolve an existing dialog before replacing it.
       * Normally only one confirmation should be open.
       */
      resolverRef.current?.(false);

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;

        setOptions({
          variant: "warning",
          confirmLabel: "Confirm",
          cancelLabel: "Cancel",
          ...nextOptions,
        });
      });
    },
    [],
  );

  const closeDialog = useCallback(
    (confirmed: boolean) => {
      const resolve = resolverRef.current;

      resolverRef.current = null;
      setOptions(null);

      resolve?.(confirmed);
    },
    [],
  );

  useEffect(() => {
    if (!options) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [closeDialog, options]);

  return (
    <ConfirmDialogContext.Provider
      value={{ confirm }}
    >
      {children}

      {options && (
        <ConfirmDialog
          options={options}
          onCancel={() => closeDialog(false)}
          onConfirm={() => closeDialog(true)}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(
    ConfirmDialogContext,
  );

  if (!context) {
    throw new Error(
      "useConfirmDialog must be used inside ConfirmDialogProvider.",
    );
  }

  return context.confirm;
}

type ConfirmDialogProps = {
  options: ConfirmDialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variant =
    options.variant ?? "warning";

  const styles: Record<
    ConfirmDialogVariant,
    {
      iconBackground: string;
      iconColor: string;
      button: string;
      icon: string;
    }
  > = {
    danger: {
      iconBackground: "bg-red-100",
      iconColor: "text-red-700",
      button:
        "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600",
      icon: "!",
    },

    warning: {
      iconBackground: "bg-amber-100",
      iconColor: "text-amber-700",
      button:
        "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600",
      icon: "!",
    },

    info: {
      iconBackground: "bg-blue-100",
      iconColor: "text-blue-700",
      button:
        "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600",
      icon: "i",
    },
  };

  const selectedStyle = styles[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={
          options.description
            ? "confirm-dialog-description"
            : undefined
        }
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selectedStyle.iconBackground}`}
            aria-hidden="true"
          >
            <span
              className={`text-lg font-bold ${selectedStyle.iconColor}`}
            >
              {selectedStyle.icon}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              {options.title}
            </h2>

            {options.description && (
              <p
                id="confirm-dialog-description"
                className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600"
              >
                {options.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            {options.cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${selectedStyle.button}`}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}