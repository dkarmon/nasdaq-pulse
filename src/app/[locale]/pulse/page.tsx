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
    <div className="page-shell" dir={rtl ? "rtl" : "ltr"} data-dir={rtl ? "rtl" : "ltr"} style={{ position: "relative" }}>
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-indigo" />
        <div className="bg-orb bg-orb-green" />
      </div>
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, whiteSpace: "nowrap" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                color: "#fff",
              }}
            >
              N
            </div>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Nasdaq Pulse</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href={`/${locale}/settings`}
              style={{
                color: "var(--muted)",
                textDecoration: "none",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass)",
                transition: "border-color 150ms ease, color 150ms ease",
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
