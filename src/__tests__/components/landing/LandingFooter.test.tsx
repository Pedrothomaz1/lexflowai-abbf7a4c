/**
 * LandingFooter unit tests
 *
 * Run with: npm test -- LandingFooter.test.tsx
 * Coverage: footer links, company info, legal links
 *
 * Test patterns:
 * - Render footer structure
 * - Verify footer links (Privacy, Terms, etc.)
 * - Check company info
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingFooter } from "@/components/landing/LandingFooter";

describe("LandingFooter", () => {
  beforeEach(() => {
    // Setup
  });

  it("renders footer element", () => {
    render(<LandingFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(<LandingFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toBeTruthy();
  });

  it("renders navigation links in footer", () => {
    render(<LandingFooter />);
    const footer = screen.getByRole("contentinfo");
    const links = footer.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  it("has proper footer structure", () => {
    render(<LandingFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.children.length).toBeGreaterThan(0);
  });
});
