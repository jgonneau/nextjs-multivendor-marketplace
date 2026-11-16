"use client";

import { MotionConfig } from "motion/react";
import { ToastProvider } from "./ToastProvider";
import { SessionProvider } from "./SessionProvider";
import { BasketProvider } from "./BasketProvider";
import { I18nProvider } from "./I18nProvider";
import type { Locale } from "@/lib/i18n/config";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    // Honors the OS "reduce motion" setting for every animation in the app.
    <MotionConfig reducedMotion="user">
      <I18nProvider initialLocale={locale}>
        <ToastProvider>
          <SessionProvider>
            <BasketProvider>{children}</BasketProvider>
          </SessionProvider>
        </ToastProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
