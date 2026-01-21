// ABOUTME: Tests for formatting utilities used across the application.
// ABOUTME: Ensures growth percentages and other values format correctly for display.

import { describe, it, expect } from "vitest";
import { formatGrowth, formatPrice, formatMarketCap } from "@/lib/format";

describe("formatGrowth", () => {
  it("formats positive values with + sign", () => {
    expect(formatGrowth(23.5)).toBe("+23.5%");
  });

  it("formats negative values with - sign", () => {
    expect(formatGrowth(-12.3)).toBe("-12.3%");
  });

  it("formats zero with + sign", () => {
    expect(formatGrowth(0)).toBe("+0.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatGrowth(12.345)).toBe("+12.3%");
    expect(formatGrowth(12.351)).toBe("+12.4%");
  });
});

describe("formatPrice", () => {
  it("formats USD prices with $ symbol", () => {
    expect(formatPrice(178.5, "USD")).toBe("$178.50");
  });

  it("formats ILS prices with ₪ symbol", () => {
    expect(formatPrice(50.25, "ILS")).toBe("₪50.25");
  });

  it("defaults to USD when no currency specified", () => {
    expect(formatPrice(100)).toBe("$100.00");
  });

  it("includes thousands separators for large values", () => {
    expect(formatPrice(1234.56, "USD")).toBe("$1,234.56");
  });
});

describe("formatMarketCap", () => {
  it("formats trillions", () => {
    expect(formatMarketCap(2_800_000_000_000)).toBe("$2.80T");
  });

  it("formats billions", () => {
    expect(formatMarketCap(450_000_000_000)).toBe("$450.00B");
  });

  it("formats millions", () => {
    expect(formatMarketCap(50_000_000)).toBe("$50.00M");
  });

  it("returns N/A for zero", () => {
    expect(formatMarketCap(0)).toBe("N/A");
  });
});
