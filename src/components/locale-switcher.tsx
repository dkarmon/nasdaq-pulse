"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Locale, locales } from "@/lib/i18n";

type Props = {
  locale: Locale;
};

function getTargetHref(pathname: string | null, target: Locale) {
  if (!pathname) return `/${target}`;
  const sanitized = pathname.replace(/^\/(en|he)/, "");
  return `/${target}${sanitized === "/" ? "" : sanitized}`;
}

export function LocaleSwitcher({ locale }: Props) {
  const pathname = usePathname();
  const target = locales.find((lng) => lng !== locale) ?? "en";
  const href = getTargetHref(pathname, target);

  return (
    <Link href={href} className="pill ghost" aria-label="Switch language">
      <span>{target.toUpperCase()}</span>
    </Link>
  );
}
