// ABOUTME: Client component for settings page.
// ABOUTME: Displays hidden stocks list per exchange with unhide functionality.

"use client";

import { useState, useEffect } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import type { Dictionary, Locale } from "@/lib/i18n";
import Link from "next/link";
import { RecommendationPanel } from "./recommendation-panel";
import styles from "./settings.module.css";

type Invitation = {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  created_at: string;
  last_login: string | null;
};

type SettingsClientProps = {
  dict: Dictionary;
  locale: Locale;
  isAdmin: boolean;
};

export function SettingsClient({ dict, locale, isAdmin }: SettingsClientProps) {
  const { preferences, unhideStock } = usePreferences();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchInvitations();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchInvitations = async () => {
    const res = await fetch("/api/admin/invitations");
    if (res.ok) {
      const data = await res.json();
      setInvitations(data.invitations || []);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    setUpdatingUserId(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (res.ok) {
      fetchUsers();
    }
    setUpdatingUserId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const res = await fetch(`/api/admin/users?id=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
    });

    if (res.ok) {
      setMessage(dict.settings.inviteSent);
      setNewEmail("");
      setNewRole("user");
      fetchInvitations();
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/invitations?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchInvitations();
    }
  };

  const getInvitationStatus = (inv: Invitation) => {
    if (inv.used_at) return dict.settings.used;
    if (new Date(inv.expires_at) < new Date()) return dict.settings.expired;
    return dict.settings.pending;
  };

  const nasdaqHidden = preferences.hiddenSymbols.nasdaq;
  const tlvHidden = preferences.hiddenSymbols.tlv;
  const hasHiddenStocks = nasdaqHidden.length > 0 || tlvHidden.length > 0;

  const recommendationLabels = {
    title: dict.settings.recommendations,
    activeLabel: dict.settings.recommendationsActive,
    save: dict.settings.save,
    creating: dict.settings.recommendationsSubtitle,
    name: dict.settings.recommendationsName,
    description: dict.settings.recommendationsDescription,
    expression: dict.settings.recommendationsExpression,
    status: dict.settings.status,
    draft: dict.settings.draft,
    published: dict.settings.published,
    archived: dict.settings.archived,
    validate: dict.settings.validate,
    validationPassed: dict.settings.validationPassed,
    errors: dict.settings.errors,
    warnings: dict.settings.warnings,
    preview: dict.settings.preview,
    previewEmpty: dict.settings.previewEmpty,
    add: dict.settings.add,
    update: dict.settings.update,
    duplicate: dict.settings.duplicate,
    edit: dict.settings.edit,
    archive: dict.settings.archive,
    activeSaved: dict.settings.activeSaved,
    saved: dict.settings.saved,
    fetchError: dict.settings.fetchError,
  };

  const screenerLabels = {
    growth1d: dict.screener.growth5d.replace("5D", "1D") || "1D",
    growth5d: dict.screener.growth5d,
    growth1m: dict.screener.growth1m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    stock: dict.screener.stock,
  };

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1 className={styles.title}>{dict.settings.title}</h1>
        <Link href={`/${locale}/pulse`} className={styles.backLink}>
          ← {dict.screener.backToList}
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.settings.hiddenStocks}</h2>

        {!hasHiddenStocks ? (
          <p className={styles.empty}>{dict.settings.noHiddenStocks}</p>
        ) : (
          <>
            {nasdaqHidden.length > 0 && (
              <div className={styles.exchangeSection}>
                <h3 className={styles.exchangeLabel}>{dict.screener.nasdaq}</h3>
                <ul className={styles.stockList}>
                  {nasdaqHidden.map((symbol) => (
                    <li key={symbol} className={styles.stockItem}>
                      <span className={styles.symbol}>{symbol}</span>
                      <button
                        className={styles.unhideButton}
                        onClick={() => unhideStock(symbol, "nasdaq")}
                      >
                        {dict.settings.unhide}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tlvHidden.length > 0 && (
              <div className={styles.exchangeSection}>
                <h3 className={styles.exchangeLabel}>{dict.screener.tlv}</h3>
                <ul className={styles.stockList}>
                  {tlvHidden.map((symbol) => (
                    <li key={symbol} className={styles.stockItem}>
                      <span className={styles.symbol}>{symbol}</span>
                      <button
                        className={styles.unhideButton}
                        onClick={() => unhideStock(symbol, "tlv")}
                      >
                        {dict.settings.unhide}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {isAdmin && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{dict.settings.admin}</h2>

          <div className={styles.adminSubsection}>
            <h3 className={styles.exchangeLabel}>{dict.settings.invitations}</h3>

            <form onSubmit={handleInvite} className={styles.inviteForm}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={dict.settings.inviteEmail}
                disabled={loading}
                className={styles.inviteInput}
              />
              <div className={styles.roleToggle}>
                <button
                  type="button"
                  className={`${styles.roleOption} ${newRole === "user" ? styles.roleOptionActive : ""}`}
                  onClick={() => setNewRole("user")}
                  disabled={loading}
                >
                  {dict.settings.user}
                </button>
                <button
                  type="button"
                  className={`${styles.roleOption} ${newRole === "admin" ? styles.roleOptionActive : ""}`}
                  onClick={() => setNewRole("admin")}
                  disabled={loading}
                >
                  {dict.settings.adminRole}
                </button>
              </div>
              <button type="submit" disabled={loading} className={styles.inviteButton}>
                {dict.settings.invite}
              </button>
            </form>

            {message && <p className={styles.message}>{message}</p>}

            {invitations.length === 0 ? (
              <p className={styles.empty}>{dict.settings.noInvitations}</p>
            ) : (
              <ul className={styles.stockList}>
                {invitations.map((inv) => (
                  <li key={inv.id} className={styles.stockItem}>
                    <span className={styles.symbol}>{inv.email}</span>
                    <span className={styles.role}>
                      {inv.role === "admin" ? dict.settings.adminRole : dict.settings.user}
                    </span>
                    <span className={styles.status}>{getInvitationStatus(inv)}</span>
                    {!inv.used_at && (
                      <button
                        className={styles.unhideButton}
                        onClick={() => handleDelete(inv.id)}
                      >
                        {dict.settings.delete}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.adminSubsection}>
            <h3 className={styles.exchangeLabel}>{dict.settings.users}</h3>

            {users.length === 0 ? (
              <p className={styles.empty}>{dict.settings.noUsers}</p>
            ) : (
              <ul className={styles.stockList}>
                {users.map((user) => (
                  <li key={user.id} className={styles.stockItem}>
                    <span className={styles.symbol}>{user.email}</span>
                    <div className={styles.roleToggle}>
                      <button
                        type="button"
                        className={`${styles.roleOption} ${user.role === "user" ? styles.roleOptionActive : ""}`}
                        onClick={() => handleRoleChange(user.id, "user")}
                        disabled={updatingUserId === user.id}
                      >
                        {dict.settings.user}
                      </button>
                      <button
                        type="button"
                        className={`${styles.roleOption} ${user.role === "admin" ? styles.roleOptionActive : ""}`}
                        onClick={() => handleRoleChange(user.id, "admin")}
                        disabled={updatingUserId === user.id}
                      >
                        {dict.settings.adminRole}
                      </button>
                    </div>
                    {user.role !== "admin" && (
                      <button
                        className={styles.unhideButton}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        {dict.settings.delete}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.adminSubsection}>
            <RecommendationPanel labels={recommendationLabels} screenerLabels={screenerLabels} />
          </div>
        </section>
      )}
    </div>
  );
}
