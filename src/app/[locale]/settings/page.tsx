// ABOUTME: Settings page server component.
// ABOUTME: Displays settings UI for managing hidden stocks.

import { createClient } from "@/lib/supabase/server";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out";
import { SettingsClient } from "./settings-client";
import Link from "next/link";

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's role
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
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Link href={`/${locale}/pulse`} style={{ textDecoration: "none", color: "inherit", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Nasdaq Pulse
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LocaleSwitcher locale={locale} />
            {user?.email && (
              <span className="badge">{user.email}</span>
            )}
            <SignOutButton label={dict.app.logout} />
          </div>
        </nav>

        <SettingsClient dict={dict} locale={locale} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
