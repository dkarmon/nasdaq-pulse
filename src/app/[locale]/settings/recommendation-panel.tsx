// ABOUTME: Admin UI for managing recommendation formulas (list, edit, activate).
// ABOUTME: Provides inline validation and a lightweight preview on sample stocks.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validateFormulaExpression } from "@/lib/recommendations/engine";
import {
  filterAndSortByRecommendation,
} from "@/lib/market-data/recommendation";
import type { Stock } from "@/lib/market-data/types";
import type { RecommendationFormula, RecommendationFormulaSummary } from "@/lib/recommendations/types";
import styles from "./settings.module.css";

type RecommendationPanelProps = {
  labels: {
    title: string;
    activeLabel: string;
    save: string;
    creating: string;
    name: string;
    description: string;
    expression: string;
    status: string;
    draft: string;
    published: string;
    archived: string;
    validate: string;
    validationPassed: string;
    errors: string;
    warnings: string;
    preview: string;
    previewEmpty: string;
    add: string;
    update: string;
    duplicate: string;
    edit: string;
    archive: string;
    activeSaved: string;
    saved: string;
    fetchError: string;
  };
};

type FormulaFormState = {
  id?: string;
  name: string;
  description: string;
  expression: string;
  status: "draft" | "published" | "archived";
};

const emptyForm: FormulaFormState = {
  name: "",
  description: "",
  expression: "",
  status: "draft",
};

export function RecommendationPanel({ labels }: RecommendationPanelProps) {
  const [formulas, setFormulas] = useState<RecommendationFormulaSummary[]>([]);
  const [activeFormulaId, setActiveFormulaId] = useState<string | null>(null);
  const [form, setForm] = useState<FormulaFormState>(emptyForm);
  const [validation, setValidation] = useState<{ errors: string[]; warnings: string[] }>({
    errors: [],
    warnings: [],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewStocks, setPreviewStocks] = useState<Stock[]>([]);
  const [previewScores, setPreviewScores] = useState<Stock[]>([]);
  const [previewExchange, setPreviewExchange] = useState<Stock["exchange"]>("nasdaq");
  const expressionRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const activeFormula = useMemo(
    () => formulas.find((f) => f.id === activeFormulaId) ?? null,
    [formulas, activeFormulaId]
  );

  async function fetchFormulas() {
    const [formulasRes, settingsRes] = await Promise.all([
      fetch("/api/admin/recommendation-formulas"),
      fetch("/api/admin/recommendation-settings"),
    ]);

    if (formulasRes.ok) {
      const data = await formulasRes.json();
      setFormulas(data.formulas ?? []);
    } else {
      setMessage(labels.fetchError);
    }

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setActiveFormulaId(data.activeFormula?.id ?? null);
    }
  }

  useEffect(() => {
    fetchFormulas();
  }, []);

  const appendToken = (token: string) => {
    setForm((prev) => {
      const expr = prev.expression ?? "";
      const { start, end } = selectionRef.current ?? { start: expr.length, end: expr.length };

      const before = expr.slice(0, start);
      const after = expr.slice(end);

      const needsSpaceBefore = before.length > 0 && !/[\s(+\-*/]/.test(before.slice(-1));
      const needsSpaceAfter = after.length > 0 && !/^[\s)+\-*/,]/.test(after[0]);

      const insertion = `${needsSpaceBefore ? " " : ""}${token}${needsSpaceAfter ? " " : ""}`;
      const nextExpr = `${before}${insertion}${after}`;

      const newPos = (before + insertion).length;
      selectionRef.current = { start: newPos, end: newPos };

      requestAnimationFrame(() => {
        const elNext = expressionRef.current;
        if (elNext) {
          elNext.focus();
          elNext.setSelectionRange(newPos, newPos);
        }
      });

      return { ...prev, expression: nextExpr };
    });
  };

  const handleSelectionChange = () => {
    const el = expressionRef.current;
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? el.selectionStart ?? 0,
    };
  };

  const handleValidate = () => {
    const result = validateFormulaExpression(form.expression);
    setValidation({ errors: result.errors, warnings: result.warnings });
    setMessage(result.valid ? labels.validationPassed : null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id
        ? `/api/admin/recommendation-formulas/${form.id}`
        : "/api/admin/recommendation-formulas";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Error");
      } else {
        setMessage(labels.saved);
        setForm(emptyForm);
        setValidation({ errors: [], warnings: [] });
        fetchFormulas();
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this formula?")) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/recommendation-formulas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Error");
    } else {
      setMessage(labels.saved);
      fetchFormulas();
    }
    setLoading(false);
  };

  const handleSetActive = async () => {
    if (!activeFormulaId) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/recommendation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeFormulaId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error");
    } else {
      setMessage(labels.activeSaved);
    }
    setLoading(false);
  };

  const handlePreview = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/screener?limit=50&includeScores=true&exchange=${previewExchange}`);
      if (res.ok) {
        const data = await res.json();
        const stocks: Stock[] = data.stocks ?? [];
        setPreviewStocks(stocks);
        const formulaInput = form.expression
          ? (form as unknown as RecommendationFormula)
          : activeFormula ?? undefined;
        const scored = filterAndSortByRecommendation(stocks, formulaInput).slice(0, 15);
        setPreviewScores(scored);
      } else {
        setPreviewStocks([]);
        setPreviewScores([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.recoPanel}>
      <div className={styles.recoHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{labels.title}</h3>
          <p className={styles.recoHint}>{labels.creating}</p>
        </div>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            setForm(emptyForm);
            setValidation({ errors: [], warnings: [] });
          }}
        >
          {labels.add}
        </button>
      </div>

      <div className={styles.recoGrid}>
        <div className={styles.recoCard}>
          <div className={styles.recoField}>
            <label>{labels.activeLabel}</label>
            <select
              value={activeFormulaId ?? ""}
              onChange={(e) => setActiveFormulaId(e.target.value || null)}
              className={styles.recoSelect}
            >
              <option value="">{labels.previewEmpty}</option>
              {formulas
                .filter((f) => f.status === "published")
                .map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name} (v{formula.version})
                  </option>
                ))}
            </select>
            <button className={styles.primaryButton} onClick={handleSetActive} disabled={!activeFormulaId || loading}>
              {labels.save}
            </button>
            {message === labels.activeSaved && <span className={styles.message}>{labels.activeSaved}</span>}
          </div>

          <div className={styles.recoList}>
            {formulas.length === 0 ? (
              <p className={styles.empty}>{labels.previewEmpty}</p>
            ) : (
              formulas.map((formula) => (
                <div key={formula.id} className={styles.recoRow}>
                  <div>
                    <div className={styles.recoName}>{formula.name}</div>
                    <div className={styles.recoMeta}>
                      v{formula.version} · {formula.status}
                    </div>
                  </div>
                  <div className={styles.recoActions}>
                    <button
                      className={styles.linkButton}
                      onClick={() => setForm({
                        id: formula.id,
                        name: formula.name,
                        description: formula.description ?? "",
                        expression: formula.expression,
                        status: (formula.status as FormulaFormState["status"]),
                      })}
                    >
                      {labels.edit}
                    </button>
                    <button
                      className={styles.linkButton}
                      onClick={() => setForm({
                        id: undefined,
                        name: `${formula.name} copy`,
                        description: formula.description ?? "",
                        expression: formula.expression,
                        status: "draft",
                      })}
                    >
                      {labels.duplicate}
                    </button>
                    <button
                      className={styles.dangerButton}
                      onClick={() => handleArchive(formula.id)}
                    >
                      {labels.archive}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.recoCard}>
          <div className={styles.recoField}>
            <label>{labels.name}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={styles.recoInput}
              placeholder="Acceleration v2"
            />
          </div>
          <div className={styles.recoField}>
            <label>{labels.description}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={styles.recoInput}
              placeholder="Short summary"
            />
          </div>
          <div className={styles.recoField}>
            <label>{labels.expression}</label>
            <textarea
              ref={expressionRef}
              value={form.expression}
              onChange={(e) => setForm({ ...form, expression: e.target.value })}
              onSelect={handleSelectionChange}
              onClick={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              className={styles.recoTextarea}
              rows={5}
              placeholder="(3*(g1m-g5d)/25 + 2*(g6m-g1m)/150 + (g12m-g6m)/182) * avg(g5d,g1m,g6m,g12m)"
            />
            <div className={styles.tokenRow}>
              {["g1d", "g5d", "g1m", "g6m", "g12m", "price", "marketCap"].map((token) => (
                <button
                  key={token}
                  type="button"
                  className={styles.tokenButton}
                  onClick={() => appendToken(token)}
                >
                  {token}
                </button>
              ))}
              {["min", "max", "avg", "clamp"].map((fn) => (
                <button
                  key={fn}
                  type="button"
                  className={styles.tokenButton}
                  onClick={() => appendToken(`${fn}()`)}
                >
                  {fn}()
                </button>
              ))}
            </div>
          </div>
          <div className={styles.recoField}>
            <label>{labels.status}</label>
            <div className={styles.roleToggle}>
              {(["draft", "published", "archived"] as FormulaFormState["status"][]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`${styles.roleOption} ${form.status === status ? styles.roleOptionActive : ""}`}
                  onClick={() => setForm({ ...form, status })}
                >
                  {status === "draft" ? labels.draft : status === "published" ? labels.published : labels.archived}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.recoActionsRow}>
            <button className={styles.secondaryButton} onClick={handleValidate} disabled={loading}>
              {labels.validate}
            </button>
            <button className={styles.primaryButton} onClick={handleSubmit} disabled={loading || !form.name || !form.expression}>
              {form.id ? labels.update : labels.save}
            </button>
            <button className={styles.secondaryButton} onClick={handlePreview} disabled={loading}>
              {labels.preview}
            </button>
          </div>

          {message && <p className={styles.message}>{message}</p>}
          {validation.errors.length > 0 && (
            <div className={styles.errorBox}>
              <strong>{labels.errors}</strong>
              <ul>
                {validation.errors.map((err) => <li key={err}>{err}</li>)}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className={styles.warningBox}>
              <strong>{labels.warnings}</strong>
              <ul>
                {validation.warnings.map((warn) => <li key={warn}>{warn}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.previewBlock}>
            <div className={styles.previewHeader}>
              <h4>{labels.preview}</h4>
              <div className={styles.previewControls}>
                <div className={styles.roleToggle}>
                  {(["nasdaq", "tlv"] as Stock["exchange"][]).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className={`${styles.roleOption} ${previewExchange === ex ? styles.roleOptionActive : ""}`}
                      onClick={() => setPreviewExchange(ex)}
                    >
                      {ex === "nasdaq" ? "NASDAQ" : "TLV"}
                    </button>
                  ))}
                </div>
                <span className={styles.previewHint}>{previewStocks.length} stocks sampled</span>
              </div>
            </div>
            {previewScores.length === 0 ? (
              <p className={styles.empty}>{labels.previewEmpty}</p>
            ) : (
              <div className={styles.previewTable} role="table">
                <div className={styles.previewHead} role="row">
                  <span role="columnheader">Symbol</span>
                  <span role="columnheader">Score</span>
                  <span role="columnheader">1D</span>
                  <span role="columnheader">5D</span>
                  <span role="columnheader">1M</span>
                  <span role="columnheader">6M</span>
                  <span role="columnheader">12M</span>
                </div>
                {previewScores.map((stock) => (
                  <div key={stock.symbol} className={styles.previewRow} role="row">
                    <span role="cell">{stock.symbol}</span>
                    <span role="cell" className={styles.previewScore}>
                      {(stock.recommendationScore ?? 0).toFixed(2)}
                    </span>
                    <span role="cell">{stock.growth1d !== undefined ? `${stock.growth1d.toFixed(1)}%` : "—"}</span>
                    <span role="cell">{stock.growth5d !== undefined ? `${stock.growth5d.toFixed(1)}%` : "—"}</span>
                    <span role="cell">{`${stock.growth1m.toFixed(1)}%`}</span>
                    <span role="cell">{`${stock.growth6m.toFixed(1)}%`}</span>
                    <span role="cell">{`${stock.growth12m.toFixed(1)}%`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
