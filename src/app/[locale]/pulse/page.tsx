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
      max1m: "any",
      max6m: "any",
      max12m: "any",
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
    <div className="page-shell" dir={rtl ? "rtl" : "ltr"} data-dir={rtl ? "rtl" : "ltr"}>
      <div className="container">
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem", color: "var(--accent)" }}>◈</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Nasdaq Pulse</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LocaleSwitcher locale={locale} />
            {session?.user?.email && (
              <span className="badge">{session.user.email}</span>
            )}
            <SignOutButton label={dict.app.logout} />
          </div>
        </nav>

        <PulseWrapper
          initialData={initialData}
          dict={dict}
        />
      </div>
    </div>
  );
}
