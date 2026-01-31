// ABOUTME: Main pulse page server component for the stock screener.
// ABOUTME: Fetches initial data and renders the screener UI with locale support.

import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out";
import { BrandLogo } from "@/components/brand-logo";
import { PulseWrapper } from "./components/pulse-wrapper";
import { getScreenerData } from "@/lib/market-data/mock";
import type { ScreenerParams } from "@/lib/market-data/types";
import { createClient } from "@/lib/supabase/server";
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

  const initialData = await getInitialScreenerData();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <div className="page-shell" dir={rtl ? "rtl" : "ltr"} data-dir={rtl ? "rtl" : "ltr"}>
      <div className="container">
        <nav className="pulseNav">
          <BrandLogo size="sm" />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href={`/${locale}/settings`}
              className="nav-icon-btn"
              title={dict.settings.title}
            >
              ⚙
            </Link>
            <LocaleSwitcher locale={locale} />
            <SignOutButton label={dict.app.logout} />
          </div>
        </nav>

        <PulseWrapper
          initialData={initialData}
          dict={dict}
          locale={locale}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
