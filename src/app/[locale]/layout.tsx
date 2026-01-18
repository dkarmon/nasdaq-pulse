import { Locale, defaultLocale, isRTL, locales } from "@/lib/i18n";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: { locale: Locale };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children, params }: Props) {
  const locale = locales.includes(params.locale) ? params.locale : defaultLocale;
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <div data-locale={locale} data-dir={dir} style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
