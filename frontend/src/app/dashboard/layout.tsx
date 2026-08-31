import {
  ConfirmDialogProvider,
} from "@/components/confirm-dialog-provider";

import {
  LocalizationProvider,
} from "@/features/localization/localization-provider";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LocalizationProvider>
      <ConfirmDialogProvider>
        {children}
      </ConfirmDialogProvider>
    </LocalizationProvider>
  );
}