import Link from "next/link";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { Dictionary, Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  dict: Dictionary;
  showDemo?: boolean;
  compact?: boolean;
};

export function TopNav({ locale, dict, showDemo = true, compact = false }: Props) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: compact ? "8px 0" : "16px 0",
      }}
    >
      <Brand tagline={compact ? undefined : "Live Nasdaq pulse"} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {showDemo ? (
          <Link href="#demo" className="btn ghost">
            {dict.nav.demo}
          </Link>
        ) : null}
        <Link
          href={`/api/auth/signin?callbackUrl=/${locale}/pulse`}
          className="btn secondary"
        >
          {dict.nav.signIn}
        </Link>
        <LocaleSwitcher locale={locale} />
      </div>
    </header>
  );
}
