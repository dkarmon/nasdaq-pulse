// ABOUTME: Tests for the CollapsibleSection component.
// ABOUTME: Verifies expand/collapse behavior and content visibility.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "@/app/[locale]/pulse/components/collapsible-section";

describe("CollapsibleSection", () => {
  it("renders title", () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("shows content when defaultExpanded is true", () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <p>Visible Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("Visible Content")).toBeInTheDocument();
  });

  it("hides content when defaultExpanded is false", () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={false}>
        <p>Hidden Content</p>
      </CollapsibleSection>
    );
    expect(screen.queryByText("Hidden Content")).not.toBeInTheDocument();
  });

  it("toggles content visibility on header click", () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={false}>
        <p>Toggle Content</p>
      </CollapsibleSection>
    );

    // Initially hidden
    expect(screen.queryByText("Toggle Content")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Toggle Content")).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Toggle Content")).not.toBeInTheDocument();
  });

  it("shows expand indicator when collapsed", () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={false}>
        <p>Content</p>
      </CollapsibleSection>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-expanded", "false");
  });

  it("shows collapse indicator when expanded", () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <p>Content</p>
      </CollapsibleSection>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-expanded", "true");
  });
});
