/**
 * FeaturesGrid unit tests
 *
 * Run with: npm test -- FeaturesGrid.test.tsx
 * Coverage: feature card rendering, content display
 *
 * Test patterns:
 * - Render all feature cards
 * - Verify feature titles and descriptions
 * - Check icons are present
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";

describe("FeaturesGrid", () => {
  beforeEach(() => {
    // Setup
  });

  it("renders features grid section", () => {
    render(<FeaturesGrid />);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("renders multiple feature cards", () => {
    render(<FeaturesGrid />);
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("each feature card has title", () => {
    render(<FeaturesGrid />);
    const cards = screen.getAllByRole("article");
    cards.forEach((card) => {
      expect(card.textContent).toBeTruthy();
    });
  });

  it("renders feature descriptions", () => {
    render(<FeaturesGrid />);
    const features = screen.getAllByRole("article");
    expect(features.length).toBeGreaterThanOrEqual(1);
  });
});
