// ABOUTME: Tests for the FilterSheet mobile component.
// ABOUTME: Verifies bottom sheet behavior, filter controls, and apply/clear actions.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterSheet } from "@/app/[locale]/pulse/components/filter-sheet";
import { DEFAULT_SORT_OPTIONS } from "@/app/[locale]/pulse/components/controls-bar";

describe("FilterSheet", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    sortBy: "1d" as const,
    sortDirection: "desc" as const,
    limit: 25,
    sortOptions: DEFAULT_SORT_OPTIONS,
    showRecommendedOnly: false,
    controlsDisabled: false,
    onSortChange: vi.fn(),
    onSortDirectionChange: vi.fn(),
    onLimitChange: vi.fn(),
    labels: {
      sortBy: "Sort by",
      show: "Show",
      score: "Score",
      intraday: "Intraday",
      direction: "Direction",
      apply: "Apply Filters",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("Sort by")).toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByText("Apply Filters")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<FilterSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Apply Filters")).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<FilterSheet {...defaultProps} />);
    const backdrop = screen.getByTestId("filter-sheet-backdrop");
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onSortChange when sort button is clicked", () => {
    render(<FilterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText("5D"));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith("5d");
  });

  it("calls onLimitChange when limit button is clicked", () => {
    render(<FilterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText("50"));
    expect(defaultProps.onLimitChange).toHaveBeenCalledWith(50);
  });

  it("calls onClose when Apply button is clicked", () => {
    render(<FilterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText("Apply Filters"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows active state for current sort option", () => {
    render(<FilterSheet {...defaultProps} sortBy="1m" />);
    const sortButton = screen.getByText("1M");
    expect(sortButton).toHaveAttribute("data-active", "true");
  });

  it("shows active state for current limit option", () => {
    render(<FilterSheet {...defaultProps} limit={25} />);
    const limitButton = screen.getByText("25");
    expect(limitButton).toHaveAttribute("data-active", "true");
  });
});
