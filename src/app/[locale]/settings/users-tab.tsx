// ABOUTME: Tab component for managing users and invitations.
// ABOUTME: Two-card layout for inviting and managing users.

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
    if (inv.used_at) return { label: dict.settings.used, type: "used" };
    if (new Date(inv.expires_at) < new Date()) return { label: dict.settings.expired, type: "expired" };
    return { label: dict.settings.pending, type: "pending" };
  };

  const pendingInvitations = invitations.filter((inv) => !inv.used_at && new Date(inv.expires_at) >= new Date());

  return (
    <div className={styles.usersGrid}>
      {/* Invite Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.settings.invitations}</h2>

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

        {pendingInvitations.length > 0 && (
          <div className={styles.inviteList}>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className={styles.inviteRow}>
                <span className={styles.inviteEmail}>{inv.email}</span>
                <button
                  className={styles.linkButton}
                  onClick={() => handleDeleteInvitation(inv.id)}
                >
                  {dict.settings.delete}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.settings.users}</h2>

        {users.length === 0 ? (
          <p className={styles.empty}>{dict.settings.noUsers}</p>
        ) : (
          <div className={styles.userList}>
            {users.map((user) => (
              <div key={user.id} className={styles.userRow}>
                <div className={styles.userInfo}>
                  <span className={styles.userEmail}>{user.email}</span>
                  <span className={styles.userRole}>
                    {user.role === "admin" ? dict.settings.adminRole : dict.settings.user}
                  </span>
                </div>
                <div className={styles.userActions}>
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
                      className={styles.deleteButton}
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      {dict.settings.delete}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
