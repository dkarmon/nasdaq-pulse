// ABOUTME: Tab component for managing users and invitations.
// ABOUTME: Combines invitation sending and user role management.

"use client";

import { useState, useEffect } from "react";
import type { Dictionary } from "@/lib/i18n";
import styles from "./settings.module.css";

type Invitation = {
  id: string;
  email: string;
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

type UsersTabProps = {
  dict: Dictionary;
};

export function UsersTab({ dict }: UsersTabProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
    fetchUsers();
  }, []);

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
      body: JSON.stringify({ email: newEmail.trim() }),
    });

    if (res.ok) {
      setMessage(dict.settings.inviteSent);
      setNewEmail("");
      fetchInvitations();
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
    setLoading(false);
  };

  const handleDeleteInvitation = async (id: string) => {
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

  return (
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
                <span className={styles.status}>{getInvitationStatus(inv)}</span>
                {!inv.used_at && (
                  <button
                    className={styles.unhideButton}
                    onClick={() => handleDeleteInvitation(inv.id)}
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
    </section>
  );
}
