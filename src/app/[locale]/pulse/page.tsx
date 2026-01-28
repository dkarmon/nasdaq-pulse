// ABOUTME: Main pulse page server component for the stock screener.
// ABOUTME: Fetches initial data and renders the screener UI with locale support.

import { createClient } from "@/lib/supabase/server";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out";
import { PulseWrapper } from "./components/pulse-wrapper";
import { getScreenerData } from "@/lib/market-data/mock";
import type { ScreenerParams } from "@/lib/market-data/types";
import Link from "next/link";

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
      minPrice: null,
    },
    exchange: "nasdaq",
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span className="brand-wordmark" style={{ fontSize: "1.25rem" }}>Nasdaq Pulse</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href={`/${locale}/settings`}
              style={{
                color: "var(--muted)",
                textDecoration: "none",
                fontSize: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                transition: "color 150ms ease",
              }}
              title={dict.settings.title}
            >
              ⚙
            </Link>
            <LocaleSwitcher locale={locale} />
            {user?.email && (
              <span className="badge">{user.email}</span>
            )}
            <SignOutButton label={dict.app.logout} />
          </div>
        </nav>

        <PulseWrapper
          initialData={initialData}
          dict={dict}
          locale={locale}
        />
      </div>
    </div>
  );
}
