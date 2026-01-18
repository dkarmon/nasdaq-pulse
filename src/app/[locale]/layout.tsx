// ABOUTME: Locale-based layout wrapper setting RTL direction.
// ABOUTME: Handles locale validation and direction attribute propagation.

import { Locale, defaultLocale, isRTL, locales } from "@/lib/i18n";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <div data-locale={locale} data-dir={dir} style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
