// ABOUTME: Tab component for managing recommendation formulas.
// ABOUTME: Displays formula list with radio selection and modal editor.

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Exchange } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import { splitFormulaTitleAndSubtitle } from "@/lib/recommendations/display";
import type { Dictionary } from "@/lib/i18n";
import { FormulaEditorModal } from "./formula-editor-modal";
import styles from "./settings.module.css";

type FormulasTabProps = {
  dict: Dictionary;
};

type FormulaFormState = {
  id?: string;
  name: string;
  description: string;
  expression: string;
};

type ActiveFormulaSettingsResponse = {
  activeFormula?: { id?: string | null } | null;
  activeFormulaNasdaq?: { id?: string | null } | null;
  activeFormulaTlv?: { id?: string | null } | null;
  activeFormulas?: {
    nasdaq?: { id?: string | null } | null;
    tlv?: { id?: string | null } | null;
  } | null;
};

export function FormulasTab({ dict }: FormulasTabProps) {
  const [formulas, setFormulas] = useState<RecommendationFormulaSummary[]>([]);
  const [activeFormulaIds, setActiveFormulaIds] = useState<Record<Exchange, string | null>>({
    nasdaq: null,
    tlv: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingFormula, setEditingFormula] = useState<FormulaFormState | null>(null);
  const [showModal, setShowModal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  function parseActiveFormulaIds(data: unknown): Record<Exchange, string | null> {
    const parsed = (data ?? {}) as ActiveFormulaSettingsResponse;
    return {
      nasdaq:
        parsed.activeFormulas?.nasdaq?.id ??
        parsed.activeFormulaNasdaq?.id ??
        parsed.activeFormula?.id ??
        null,
      tlv:
        parsed.activeFormulas?.tlv?.id ??
        parsed.activeFormulaTlv?.id ??
        parsed.activeFormula?.id ??
        null,
    };
  }

  const fetchFormulas = useCallback(async () => {
    const [formulasRes, settingsRes] = await Promise.all([
      fetch("/api/admin/recommendation-formulas"),
      fetch("/api/admin/recommendation-settings"),
    ]);

    if (formulasRes.ok) {
      const data = await formulasRes.json();
      setFormulas(data.formulas ?? []);
    } else {
      setMessage(dict.settings.fetchError);
    }

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setActiveFormulaIds(parseActiveFormulaIds(data));
    }
  }, [dict.settings.fetchError]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchFormulas();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchFormulas]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  const handleSetActive = async (exchange: Exchange, id: string) => {
    if (id === activeFormulaIds[exchange]) return;

    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/admin/recommendation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchange, activeFormulaId: id }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error");
    } else {
      setActiveFormulaIds((prev) => ({ ...prev, [exchange]: id }));
      setMessage(dict.settings.activeSaved);
      setTimeout(() => setMessage(null), 3000);

      // Trigger immediate daily badge delta refresh (new top-25 minus old top-25).
      fetch("/api/admin/daily-ai/refresh-delta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousFormulaId: data?.previousActiveFormulaId ?? activeFormulaIds[exchange] ?? null,
          newFormulaId: id,
          exchanges: [exchange],
        }),
      }).catch(() => {});
    }
    setLoading(false);
  };

  const handleEdit = (formula: RecommendationFormulaSummary) => {
    const { title, subtitle } = splitFormulaTitleAndSubtitle(
      formula.name,
      formula.description
    );
    setEditingFormula({
      id: formula.id,
      name: title,
      description: subtitle ?? "",
      expression: formula.expression,
    });
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleNew = () => {
    setEditingFormula(null);
    setShowModal(true);
  };

  const handleDuplicate = (formula: RecommendationFormulaSummary) => {
    const { title, subtitle } = splitFormulaTitleAndSubtitle(
      formula.name,
      formula.description
    );
    setEditingFormula({
      id: undefined,
      name: `${title} copy`,
      description: subtitle ?? "",
      expression: formula.expression,
    });
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.settings.confirmDelete)) return;

    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/admin/recommendation-formulas/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Error");
    } else {
      setMessage(dict.settings.saved);
      fetchFormulas();
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
    setOpenMenuId(null);
  };

  const handleSave = async (data: FormulaFormState) => {
    const method = data.id ? "PATCH" : "POST";
    const url = data.id
      ? `/api/admin/recommendation-formulas/${data.id}`
      : "/api/admin/recommendation-formulas";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description.trim() || null,
        expression: data.expression,
        status: "published",
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Error");
    }

    setShowModal(false);
    setEditingFormula(null);
    setMessage(dict.settings.saved);
    fetchFormulas();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFormula(null);
  };

  return (
    <section className={styles.section}>
      <div className={styles.recoHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{dict.settings.recommendations}</h2>
          <p className={styles.recoHint}>{dict.settings.recommendationsSubtitle}</p>
        </div>
        <button className={styles.primaryButton} onClick={handleNew}>
          {dict.settings.add}
        </button>
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {formulas.length > 0 && (
        <div className={styles.recoField} style={{ marginBottom: "16px" }}>
          <label>{dict.settings.recommendationsActiveNasdaq || `${dict.screener.nasdaq} ${dict.settings.recommendationsActive}`}</label>
          <select
            className={styles.recoInput}
            value={activeFormulaIds.nasdaq ?? ""}
            onChange={(e) => handleSetActive("nasdaq", e.target.value)}
            disabled={loading}
          >
            {formulas.map((formula) => (
              <option key={`nasdaq-${formula.id}`} value={formula.id}>
                {formula.name}
              </option>
            ))}
          </select>
          <label style={{ marginTop: "12px" }}>{dict.settings.recommendationsActiveTlv || `${dict.screener.tlv} ${dict.settings.recommendationsActive}`}</label>
          <select
            className={styles.recoInput}
            value={activeFormulaIds.tlv ?? ""}
            onChange={(e) => handleSetActive("tlv", e.target.value)}
            disabled={loading}
          >
            {formulas.map((formula) => (
              <option key={`tlv-${formula.id}`} value={formula.id}>
                {formula.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.recoList}>
        {formulas.length === 0 ? (
          <p className={styles.empty}>{dict.settings.noFormulas}</p>
        ) : (
          formulas.map((formula) => {
            const isActiveNasdaq = formula.id === activeFormulaIds.nasdaq;
            const isActiveTlv = formula.id === activeFormulaIds.tlv;
            const isActive = isActiveNasdaq || isActiveTlv;
            const { title, subtitle } = splitFormulaTitleAndSubtitle(
              formula.name,
              formula.description
            );
            return (
              <div
                key={formula.id}
                className={`${styles.radioRow} ${isActive ? styles.radioRowActive : ""}`}
              >
                <div
                  className={`${styles.radioIndicator} ${isActive ? styles.radioIndicatorActive : ""}`}
                />
                <div className={styles.radioContent}>
                  <div
                    className={styles.radioName}
                    title={subtitle ? `${title} - ${subtitle}` : title}
                  >
                    {subtitle ? `${title} - ${subtitle}` : title}
                  </div>
                  <div className={styles.radioMeta}>
                    v{formula.version}
                    {isActiveNasdaq ? " • NASDAQ" : ""}
                    {isActiveTlv ? " • TLV" : ""}
                  </div>
                </div>
                <div className={styles.radioActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    className={styles.linkButton}
                    onClick={() => handleEdit(formula)}
                    disabled={loading}
                  >
                    {dict.settings.edit}
                  </button>
                  <div className={styles.dropdownWrapper} ref={openMenuId === formula.id ? menuRef : null}>
                    <button
                      className={styles.overflowButton}
                      onClick={() => setOpenMenuId(openMenuId === formula.id ? null : formula.id)}
                      disabled={loading}
                    >
                      ···
                    </button>
                    {openMenuId === formula.id && (
                      <div className={styles.dropdownMenu}>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => handleDuplicate(formula)}
                        >
                          {dict.settings.duplicate}
                        </button>
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => handleDelete(formula.id)}
                        >
                          {dict.settings.deleteFormula}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <FormulaEditorModal
          dict={dict}
          initialData={editingFormula ?? undefined}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
}
