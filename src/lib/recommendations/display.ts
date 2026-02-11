// ABOUTME: Helpers for normalizing formula title/subtitle display.
// ABOUTME: Supports extraction of trailing numeric-slash subtitles from legacy names.

const TRAILING_NUMERIC_SUBTITLE_REGEX =
  /\s+((?:\d+(?:\.\d+)?)(?:\s*\/\s*(?:\d+(?:\.\d+)?))+)\s*$/;

export type FormulaTitleSubtitle = {
  title: string;
  subtitle: string | null;
};

function normalizeSubtitle(subtitle: string): string {
  return subtitle.trim().replace(/\s*\/\s*/g, "/");
}

export function splitFormulaTitleAndSubtitle(
  name: string,
  description?: string | null
): FormulaTitleSubtitle {
  const trimmedName = name.trim();
  const trimmedDescription = description?.trim() ?? "";

  if (trimmedDescription) {
    return { title: trimmedName, subtitle: trimmedDescription };
  }

  const match = trimmedName.match(TRAILING_NUMERIC_SUBTITLE_REGEX);
  if (!match || match.index === undefined) {
    return { title: trimmedName, subtitle: null };
  }

  const subtitle = normalizeSubtitle(match[1] ?? "");
  const title = trimmedName.slice(0, match.index).trimEnd();
  if (!title || !subtitle) {
    return { title: trimmedName, subtitle: null };
  }

  return { title, subtitle };
}

export function formatFormulaSelectLabel(
  name: string,
  description?: string | null
): string {
  const { title, subtitle } = splitFormulaTitleAndSubtitle(name, description);
  return subtitle ? `${title} - ${subtitle}` : title;
}
