// ABOUTME: Tab component for managing recommendation formulas.
// ABOUTME: Displays formula list with radio selection and modal editor.

"use client";

import { useEffect, useState, useRef } from "react";
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

export function FormulasTab({ dict }: FormulasTabProps) {
  const [formulas, setFormulas] = useState<RecommendationFormulaSummary[]>([]);
  const [activeFormulaId, setActiveFormulaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingFormula, setEditingFormula] = useState<FormulaFormState | null>(null);
  const [showModal, setShowModal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  async function fetchFormulas() {
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
      setActiveFormulaId(data.activeFormula?.id ?? null);
    }
  }

  useEffect(() => {
    fetchFormulas();
  }, []);

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

  const handleSetActive = async (id: string) => {
    if (id === activeFormulaId) return;

    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/admin/recommendation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeFormulaId: id }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error");
    } else {
      setActiveFormulaId(id);
      setMessage(dict.settings.activeSaved);
      setTimeout(() => setMessage(null), 3000);

      // Trigger immediate daily badge delta refresh (new top-20 minus old top-20).
      fetch("/api/admin/daily-ai/refresh-delta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousFormulaId: data?.previousActiveFormulaId ?? activeFormulaId ?? null,
          newFormulaId: id,
          exchanges: ["nasdaq", "tlv"],
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

      <div className={styles.recoList}>
        {formulas.length === 0 ? (
          <p className={styles.empty}>{dict.settings.noFormulas}</p>
        ) : (
          formulas.map((formula) => {
            const isActive = formula.id === activeFormulaId;
            const { title, subtitle } = splitFormulaTitleAndSubtitle(
              formula.name,
              formula.description
            );
            return (
              <div
                key={formula.id}
                className={`${styles.radioRow} ${isActive ? styles.radioRowActive : ""}`}
                onClick={() => handleSetActive(formula.id)}
              >
                <div
                  className={`${styles.radioIndicator} ${isActive ? styles.radioIndicatorActive : ""}`}
                />
                <div className={styles.radioContent}>
                  <div className={styles.radioName} title={title}>{title}</div>
                  {subtitle && <div className={styles.radioSubtitle}>{subtitle}</div>}
                  <div className={styles.radioMeta}>v{formula.version}</div>
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
