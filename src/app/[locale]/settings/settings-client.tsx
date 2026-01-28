// ABOUTME: Client component for settings page with tabbed navigation.
// ABOUTME: Routes between Stocks, Users, and Formulas tabs based on URL.

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";
import Link from "next/link";
import { StocksTab } from "./stocks-tab";
import { UsersTab } from "./users-tab";
import { FormulasTab } from "./formulas-tab";
import styles from "./settings.module.css";

type Tab = "stocks" | "users" | "formulas";

type SettingsClientProps = {
  dict: Dictionary;
  locale: Locale;
  isAdmin: boolean;
};

export function SettingsClient({ dict, locale, isAdmin }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const currentTab: Tab =
    tabParam === "users" && isAdmin ? "users" :
    tabParam === "formulas" && isAdmin ? "formulas" :
    "stocks";

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "stocks") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const tabs: { id: Tab; label: string; adminOnly: boolean }[] = [
    { id: "stocks", label: dict.settings.tabStocks, adminOnly: false },
    { id: "users", label: dict.settings.tabUsers, adminOnly: true },
    { id: "formulas", label: dict.settings.tabFormulas, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1 className={styles.title}>{dict.settings.title}</h1>
        <Link href={`/${locale}/pulse`} className={styles.backLink}>
          ← {dict.screener.backToList}
        </Link>
      </div>

      <div className={styles.tabs}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${currentTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === "stocks" && <StocksTab dict={dict} />}
      {currentTab === "users" && isAdmin && <UsersTab dict={dict} />}
      {currentTab === "formulas" && isAdmin && <FormulasTab dict={dict} />}
    </div>
  );
}
