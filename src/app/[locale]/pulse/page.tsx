// ABOUTME: Main pulse page server component for the stock screener.
// ABOUTME: Fetches initial data and renders the screener UI with locale support.

import { auth } from "@/auth";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out";
import { PulseWrapper } from "./components/pulse-wrapper";
import { getScreenerData } from "@/lib/market-data/mock";
import type { ScreenerParams } from "@/lib/market-data/types";

type PulsePageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function getInitialScreenerData() {
  const params: ScreenerParams = {
    sortBy: "1m",
    limit: 50,
    filters: {
      min1m: "any",
      min6m: "any",
      min12m: "any",
    },
  };

  return getScreenerData(params);
}

export default async function PulsePage({ params }: PulsePageProps) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);
  const session = await auth();

  const initialData = await getInitialScreenerData();

  return (
    <div className="page-shell" data-dir={rtl ? "rtl" : "ltr"}>
      <div className="container">
        <nav
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <LocaleSwitcher locale={locale} />
          <SignOutButton label={dict.app.logout} />
        </nav>

        <PulseWrapper
          initialData={initialData}
          dict={dict}
          userEmail={session?.user?.email ?? null}
        />
      </div>
    </div>
  );
}
