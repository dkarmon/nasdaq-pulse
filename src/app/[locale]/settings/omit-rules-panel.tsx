// ABOUTME: Panel for configuring omit rules that filter stocks by price, marketCap, and growth thresholds.
// ABOUTME: Supports sync with admin defaults or custom user rules, with per-exchange configuration.

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Exchange, OmitRulesConfig, OmitRule, OmitField, UserOmitPrefs } from "@/lib/market-data/types";
import styles from "./settings.module.css";

type OmitRulesPanelProps = {
  dict: Dictionary;
  isAdmin: boolean;
};

const FIELD_OPTIONS: { value: OmitField; labelKey: keyof Dictionary["settings"] | keyof Dictionary["screener"] }[] = [
  { value: "price", labelKey: "price" },
  { value: "marketCap", labelKey: "marketCap" },
  { value: "growth1d", labelKey: "growth1d" },
  { value: "growth5d", labelKey: "growth5d" },
  { value: "growth1m", labelKey: "growth1m" },
  { value: "growth6m", labelKey: "growth6m" },
  { value: "growth12m", labelKey: "growth12m" },
];

const DEFAULT_RULES: OmitRulesConfig = {
  enabled: false,
  rules: { nasdaq: [], tlv: [] },
};

const DEFAULT_USER_PREFS: UserOmitPrefs = {
  syncWithAdmin: true,
  customRules: null,
};

function getFieldLabel(field: OmitField, dict: Dictionary): string {
  switch (field) {
    case "price": return dict.settings.price;
    case "marketCap": return dict.settings.marketCap;
    case "growth1d": return dict.screener.growth1d;
    case "growth5d": return dict.screener.growth5d;
    case "growth1m": return dict.screener.growth1m;
    case "growth6m": return dict.screener.growth6m;
    case "growth12m": return dict.screener.growth12m;
  }
}

export function OmitRulesPanel({ dict, isAdmin }: OmitRulesPanelProps) {
  const [adminRules, setAdminRules] = useState<OmitRulesConfig>(DEFAULT_RULES);
  const [userPrefs, setUserPrefs] = useState<UserOmitPrefs>(DEFAULT_USER_PREFS);
  const [exchange, setExchange] = useState<Exchange>("nasdaq");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch current rules
  useEffect(() => {
    async function fetchRules() {
      try {
        // Fetch admin rules
        const adminRes = await fetch("/api/admin/omit-rules");
        if (adminRes.ok) {
          const data = await adminRes.json();
          if (data.omitRules) {
            setAdminRules(data.omitRules);
          }
        }

        // Fetch user preferences (includes user omit rules)
        if (!isAdmin) {
          const prefsRes = await fetch("/api/preferences");
          if (prefsRes.ok) {
            const data = await prefsRes.json();
            if (data.preferences?.omit_rules) {
              setUserPrefs(data.preferences.omit_rules);
            }
          }
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchRules();
  }, [isAdmin]);

  // The rules we're currently editing
  const editingRules = isAdmin
    ? adminRules
    : (userPrefs.syncWithAdmin ? adminRules : (userPrefs.customRules ?? DEFAULT_RULES));

  const isSynced = !isAdmin && userPrefs.syncWithAdmin;
  const isReadOnly = isSynced;

  const currentExchangeRules = editingRules.rules[exchange] ?? [];

  const handleSyncToggle = useCallback(() => {
    setUserPrefs((prev) => {
      const newSyncWithAdmin = !prev.syncWithAdmin;
      return {
        ...prev,
        syncWithAdmin: newSyncWithAdmin,
        customRules: newSyncWithAdmin ? prev.customRules : (prev.customRules ?? { ...adminRules }),
      };
    });
    setHasChanges(true);
  }, [adminRules]);

  const handleEnabledToggle = useCallback(() => {
    if (isAdmin) {
      setAdminRules((prev) => ({ ...prev, enabled: !prev.enabled }));
    } else {
      setUserPrefs((prev) => ({
        ...prev,
        customRules: {
          ...(prev.customRules ?? DEFAULT_RULES),
          enabled: !(prev.customRules?.enabled ?? false),
        },
      }));
    }
    setHasChanges(true);
  }, [isAdmin]);

  const handleAddRule = useCallback((field: OmitField) => {
    const newRule: OmitRule = { field, min: null, max: null };

    if (isAdmin) {
      setAdminRules((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          [exchange]: [...(prev.rules[exchange] ?? []), newRule],
        },
      }));
    } else {
      setUserPrefs((prev) => {
        const currentRules = prev.customRules ?? DEFAULT_RULES;
        return {
          ...prev,
          customRules: {
            ...currentRules,
            rules: {
              ...currentRules.rules,
              [exchange]: [...(currentRules.rules[exchange] ?? []), newRule],
            },
          },
        };
      });
    }
    setHasChanges(true);
  }, [isAdmin, exchange]);

  const handleRemoveRule = useCallback((index: number) => {
    if (isAdmin) {
      setAdminRules((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          [exchange]: prev.rules[exchange].filter((_, i) => i !== index),
        },
      }));
    } else {
      setUserPrefs((prev) => {
        const currentRules = prev.customRules ?? DEFAULT_RULES;
        return {
          ...prev,
          customRules: {
            ...currentRules,
            rules: {
              ...currentRules.rules,
              [exchange]: currentRules.rules[exchange].filter((_, i) => i !== index),
            },
          },
        };
      });
    }
    setHasChanges(true);
  }, [isAdmin, exchange]);

  const handleRuleChange = useCallback((index: number, field: "min" | "max", value: string) => {
    const numValue = value === "" ? null : parseFloat(value);

    if (isAdmin) {
      setAdminRules((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          [exchange]: prev.rules[exchange].map((rule, i) =>
            i === index ? { ...rule, [field]: numValue } : rule
          ),
        },
      }));
    } else {
      setUserPrefs((prev) => {
        const currentRules = prev.customRules ?? DEFAULT_RULES;
        return {
          ...prev,
          customRules: {
            ...currentRules,
            rules: {
              ...currentRules.rules,
              [exchange]: currentRules.rules[exchange].map((rule, i) =>
                i === index ? { ...rule, [field]: numValue } : rule
              ),
            },
          },
        };
      });
    }
    setHasChanges(true);
  }, [isAdmin, exchange]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (isAdmin) {
        const res = await fetch("/api/admin/omit-rules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ omitRules: adminRules }),
        });
        if (!res.ok) throw new Error("Failed to save");
      } else {
        const res = await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ omit_rules: userPrefs }),
        });
        if (!res.ok) throw new Error("Failed to save");
      }
      setHasChanges(false);
      setMessage(dict.settings.saved);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage(dict.settings.fetchError);
    } finally {
      setSaving(false);
    }
  };

  // Available fields that haven't been added yet
  const usedFields = new Set(currentExchangeRules.map((r) => r.field));
  const availableFields = FIELD_OPTIONS.filter((f) => !usedFields.has(f.value));

  if (loading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.settings.omitRules}</h2>
        <p className={styles.empty}>{dict.screener.loading}...</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.recoHeader}>
        <h2 className={styles.sectionTitle}>
          {isAdmin ? dict.settings.omitRulesAdminDefaults : dict.settings.omitRules}
        </h2>
        <label className={styles.toggleLabel}>
          <span>{dict.settings.enabled}</span>
          <button
            type="button"
            className={styles.toggle}
            data-active={editingRules.enabled}
            onClick={isReadOnly ? undefined : handleEnabledToggle}
            disabled={isReadOnly}
            aria-pressed={editingRules.enabled}
          >
            <span className={styles.toggleThumb} />
          </button>
        </label>
      </div>

      {isAdmin && (
        <p className={styles.recoHint}>{dict.settings.omitRulesAdminHint}</p>
      )}

      {!isAdmin && (
        <div className={styles.syncRow}>
          <label className={styles.syncLabel}>
            <input
              type="checkbox"
              checked={userPrefs.syncWithAdmin}
              onChange={handleSyncToggle}
            />
            <span>{dict.settings.syncWithAdmin}</span>
          </label>
          {isSynced && (
            <span className={styles.syncHint}>{dict.settings.omitRulesSyncHint}</span>
          )}
        </div>
      )}

      <div className={styles.exchangeTabs}>
        <button
          type="button"
          className={styles.exchangeTab}
          data-active={exchange === "nasdaq"}
          onClick={() => setExchange("nasdaq")}
        >
          {dict.screener.nasdaq}
        </button>
        <button
          type="button"
          className={styles.exchangeTab}
          data-active={exchange === "tlv"}
          onClick={() => setExchange("tlv")}
        >
          {dict.screener.tlv}
        </button>
      </div>

      <div className={styles.rulesList}>
        {currentExchangeRules.length === 0 ? (
          <p className={styles.empty}>{dict.settings.noRules}</p>
        ) : (
          currentExchangeRules.map((rule, index) => (
            <div key={`${rule.field}-${index}`} className={styles.ruleRow} data-readonly={isReadOnly}>
              <span className={styles.ruleField}>
                {getFieldLabel(rule.field, dict)}
                {(rule.field === "price" && exchange === "nasdaq") && " (USD)"}
                {(rule.field === "price" && exchange === "tlv") && " (ILS)"}
                {rule.field.startsWith("growth") && " (%)"}
              </span>
              <div className={styles.ruleInputs}>
                <label className={styles.ruleInputLabel}>
                  <span>{dict.settings.min}:</span>
                  <input
                    type="number"
                    className={styles.ruleInput}
                    value={rule.min ?? ""}
                    onChange={(e) => handleRuleChange(index, "min", e.target.value)}
                    disabled={isReadOnly}
                    placeholder="—"
                  />
                </label>
                <label className={styles.ruleInputLabel}>
                  <span>{dict.settings.max}:</span>
                  <input
                    type="number"
                    className={styles.ruleInput}
                    value={rule.max ?? ""}
                    onChange={(e) => handleRuleChange(index, "max", e.target.value)}
                    disabled={isReadOnly}
                    placeholder="—"
                  />
                </label>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  className={styles.ruleRemove}
                  onClick={() => handleRemoveRule(index)}
                  title={dict.settings.delete}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!isReadOnly && availableFields.length > 0 && (
        <div className={styles.addRuleRow}>
          <select
            className={styles.addRuleSelect}
            onChange={(e) => {
              if (e.target.value) {
                handleAddRule(e.target.value as OmitField);
                e.target.value = "";
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              {dict.settings.addRule}...
            </option>
            {availableFields.map((field) => (
              <option key={field.value} value={field.value}>
                {getFieldLabel(field.value, dict)}
              </option>
            ))}
          </select>
        </div>
      )}

      {message && <p className={styles.message}>{message}</p>}

      {!isReadOnly && hasChanges && (
        <div className={styles.saveRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? `${dict.screener.loading}...` : dict.settings.save}
          </button>
        </div>
      )}
    </section>
  );
}
