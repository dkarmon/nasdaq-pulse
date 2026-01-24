// ABOUTME: Redesigned landing page with Stripe-style aesthetics.
// ABOUTME: Features Remotion hero video and Framer Motion animations.

import Link from "next/link";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LandingClient } from "./landing-client";

type LandingProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Landing({ params }: LandingProps) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);

  return <LandingClient locale={locale} dict={dict} rtl={rtl} />;
}
