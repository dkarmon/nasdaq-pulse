// ABOUTME: Modal component for editing recommendation formulas.
// ABOUTME: Includes expression editor, token buttons, and live preview.

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { validateFormulaExpression } from "@/lib/recommendations/engine";
import { filterAndSortByRecommendation } from "@/lib/market-data/recommendation";
import type { Stock } from "@/lib/market-data/types";
import type { RecommendationFormula } from "@/lib/recommendations/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./settings.module.css";

type FormulaFormState = {
  id?: string;
  name: string;
  expression: string;
};

type FormulaEditorModalProps = {
  dict: Dictionary;
  initialData?: FormulaFormState;
  onSave: (data: FormulaFormState) => Promise<void>;
  onClose: () => void;
};

export function FormulaEditorModal({
  dict,
  initialData,
  onSave,
  onClose,
}: FormulaEditorModalProps) {
  const [form, setForm] = useState<FormulaFormState>(
    initialData ?? { name: "", expression: "" }
  );
  const [validation, setValidation] = useState<{ errors: string[]; warnings: string[] }>({
    errors: [],
    warnings: [],
  });
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewStocks, setPreviewStocks] = useState<Stock[]>([]);
  const [previewScores, setPreviewScores] = useState<Stock[]>([]);
  const [previewExchange, setPreviewExchange] = useState<Stock["exchange"]>("nasdaq");
  const { preferences, isLoaded } = usePreferences();

  const expressionRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = !!initialData?.id;
  const title = isEditing ? dict.settings.editFormula : dict.settings.newFormula;

  const screenerLabels = {
    growth1d: "1D",
    growth5d: dict.screener.growth5d,
    growth1m: dict.screener.growth1m,
    growth3m: dict.screener.growth3m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    stock: dict.screener.stock,
  };

  const handleSelectionChange = () => {
    const el = expressionRef.current;
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? el.selectionStart ?? 0,
    };
  };

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

  const hiddenSymbols = useMemo(() => {
    if (!isLoaded) return [];
    return preferences.hiddenSymbols?.[previewExchange] ?? [];
  }, [isLoaded, preferences.hiddenSymbols, previewExchange]);

  const filteredPreviewStocks = useMemo(() => {
    if (hiddenSymbols.length === 0) return previewStocks;
    return previewStocks.filter((stock) => !hiddenSymbols.includes(stock.symbol));
  }, [previewStocks, hiddenSymbols]);

  const previewSampleCount = filteredPreviewStocks.length;
  const previewSampleTitle = previewLoading
    ? "Loading preview stocks..."
    : `${previewSampleCount} stocks evaluated`;

  const fetchPreviewStocks = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewStocks([]);

    try {
      const res = await fetch(`/api/screener?limit=9999&exchange=${previewExchange}`);
      if (res.ok) {
        const data = await res.json();
        const stocks: Stock[] = data.stocks ?? [];
        setPreviewStocks(stocks);
      } else {
        setPreviewStocks([]);
      }
    } catch {
      setPreviewStocks([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewExchange]);

  const computePreviewScores = useCallback(() => {
    if (!form.expression.trim()) {
      setPreviewScores([]);
      return;
    }

    const formulaInput = { expression: form.expression } as RecommendationFormula;
    const scored = filterAndSortByRecommendation(filteredPreviewStocks, formulaInput).slice(0, 15);
    setPreviewScores(scored);
  }, [form.expression, filteredPreviewStocks]);

  useEffect(() => {
    fetchPreviewStocks();
  }, [fetchPreviewStocks]);

  useEffect(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    previewTimeoutRef.current = setTimeout(() => {
      computePreviewScores();
    }, 300);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [computePreviewScores]);

  const handleSubmit = async () => {
    const result = validateFormulaExpression(form.expression);
    setValidation({ errors: result.errors, warnings: result.warnings });

    if (!result.valid) {
      return;
    }

    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  const formatGrowth = (value?: number) => {
    if (value === undefined || value === null) return "—";
    if (!Number.isFinite(value)) return "—";
    return `${value.toFixed(1)}%`;
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.recoField}>
          <label>{dict.settings.recommendationsName}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={styles.recoInput}
            placeholder="Acceleration v2"
          />
        </div>

        <div className={styles.recoField}>
          <label>{dict.settings.recommendationsExpression}</label>
          <textarea
            ref={expressionRef}
            value={form.expression}
            onChange={(e) => setForm({ ...form, expression: e.target.value })}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            className={styles.recoTextarea}
            rows={5}
            placeholder="(3*(g1m-g5d)/25 + 2*(g3m-g1m)/60 + 2*(g6m-g3m)/90 + (g12m-g6m)/182) * avg(g5d,g1m,g3m,g6m,g12m)"
          />
          <div className={styles.tokenRow}>
            {["g1d", "g5d", "g1m", "g3m", "g6m", "g12m", "price", "marketCap"].map((token) => (
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

        {validation.errors.length > 0 && (
          <div className={styles.errorBox}>
            <strong>{dict.settings.errors}</strong>
            <ul>
              {validation.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div className={styles.warningBox}>
            <strong>{dict.settings.warnings}</strong>
            <ul>
              {validation.warnings.map((warn) => (
                <li key={warn}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.previewBlock}>
          <div className={styles.previewHeader}>
            <h4>{dict.settings.preview}</h4>
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
              <span className={styles.previewSampleInfo} title={previewSampleTitle}>
                ⓘ
              </span>
            </div>
          </div>
          {previewScores.length === 0 ? (
            <p className={styles.empty}>{dict.settings.previewEmpty}</p>
          ) : (
            <>
              {/* Desktop: Grid table */}
              <div className={styles.previewTable} role="table">
                <div className={styles.previewHead} role="row">
                  <span role="columnheader">{screenerLabels.stock}</span>
                  <span role="columnheader">Score</span>
                  <span role="columnheader">{screenerLabels.growth1d}</span>
                  <span role="columnheader">{screenerLabels.growth5d}</span>
                  <span role="columnheader">{screenerLabels.growth1m}</span>
                  <span role="columnheader">{screenerLabels.growth3m}</span>
                  <span role="columnheader">{screenerLabels.growth6m}</span>
                  <span role="columnheader">{screenerLabels.growth12m}</span>
                </div>
                {previewScores.map((stock) => (
                  <div key={stock.symbol} className={styles.previewRow} role="row">
                    <span role="cell">
                      {stock.exchange === "tlv" || stock.symbol.endsWith(".TA")
                        ? (stock.nameHebrew ?? stock.name ?? stock.symbol)
                        : stock.symbol}
                    </span>
                    <span role="cell" className={styles.previewScore}>
                      {(stock.recommendationScore ?? 0).toFixed(2)}
                    </span>
                    <span role="cell">{formatGrowth(stock.growth1d)}</span>
                    <span role="cell">{formatGrowth(stock.growth5d)}</span>
                    <span role="cell">{formatGrowth(stock.growth1m)}</span>
                    <span role="cell">{formatGrowth(stock.growth3m)}</span>
                    <span role="cell">{formatGrowth(stock.growth6m)}</span>
                    <span role="cell">{formatGrowth(stock.growth12m)}</span>
                  </div>
                ))}
              </div>

              {/* Mobile: Stacked cards */}
              <div className={styles.previewCards}>
                {previewScores.map((stock) => {
                  const stockName = stock.exchange === "tlv" || stock.symbol.endsWith(".TA")
                    ? (stock.nameHebrew ?? stock.name ?? stock.symbol)
                    : stock.symbol;
                  return (
                    <div key={stock.symbol} className={styles.previewCard}>
                      <div className={styles.previewCardHeader}>
                        <span className={styles.previewCardName}>{stockName}</span>
                        <span className={styles.previewCardScore}>
                          {(stock.recommendationScore ?? 0).toFixed(2)} ★
                        </span>
                      </div>
                      <div className={styles.previewCardMetrics}>
                        <span>1D:{formatGrowth(stock.growth1d)}</span>
                        <span>5D:{formatGrowth(stock.growth5d)}</span>
                        <span>1M:{formatGrowth(stock.growth1m)}</span>
                        <span>3M:{formatGrowth(stock.growth3m)}</span>
                        <span>6M:{formatGrowth(stock.growth6m)}</span>
                        <span>12M:{formatGrowth(stock.growth12m)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose} disabled={loading}>
            {dict.settings.cancel}
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.expression}
          >
            {dict.settings.saveFormula}
          </button>
        </div>
      </div>
    </div>
  );
}
