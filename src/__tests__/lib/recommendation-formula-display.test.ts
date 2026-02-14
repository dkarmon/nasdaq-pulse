import { describe, expect, it } from "vitest";
import {
  formatFormulaSelectLabel,
  splitFormulaTitleAndSubtitle,
} from "@/lib/recommendations/display";

describe("splitFormulaTitleAndSubtitle", () => {
  it("uses description when provided", () => {
    expect(splitFormulaTitleAndSubtitle("NASDQ Com", "10/25/4.5/2/0.2/0.15")).toEqual({
      title: "NASDQ Com",
      subtitle: "10/25/4.5/2/0.2/0.15",
    });
  });

  it("extracts trailing numeric/slash suffix from legacy names", () => {
    expect(
      splitFormulaTitleAndSubtitle("NASDQ Com 10 / 25 / 4.5 / 2 / 0.2 / 0.15")
    ).toEqual({
      title: "NASDQ Com",
      subtitle: "10/25/4.5/2/0.2/0.15",
    });
  });

  it("does not extract when sequence is not trailing", () => {
    expect(splitFormulaTitleAndSubtitle("NASDQ 10/25 Com")).toEqual({
      title: "NASDQ 10/25 Com",
      subtitle: null,
    });
  });
});

describe("formatFormulaSelectLabel", () => {
  it("returns title-subtitle format when subtitle exists", () => {
    expect(
      formatFormulaSelectLabel("NASDQ Com", "10/25/4.5/2/0.2/0.15")
    ).toBe("NASDQ Com - 10/25/4.5/2/0.2/0.15");
  });

  it("returns title-only when subtitle is empty", () => {
    expect(formatFormulaSelectLabel("NASDAQ Simp", "")).toBe("NASDAQ Simp");
  });
});
