/**
 * ValueProposition unit tests
 *
 * Run with: npm test -- ValueProposition.test.tsx
 * Coverage: value prop message, CTA buttons
 *
 * Test patterns:
 * - Render value proposition section
 * - Verify messaging clarity
 * - Check call-to-action buttons
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValueProposition } from "@/components/landing/ValueProposition";

describe("ValueProposition", () => {
  beforeEach(() => {
    // Setup
  });

  it("renders value proposition section", () => {
    render(<ValueProposition />);
    const section = screen.getByRole("region");
    expect(section).toBeInTheDocument();
  });

  it("renders main heading", () => {
    render(<ValueProposition />);
    const heading = screen.getByRole("heading");
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBeTruthy();
  });

  it("renders descriptive content", () => {
    render(<ValueProposition />);
    const content = screen.getByText(/./);
    expect(content).toBeInTheDocument();
  });

  it("renders call-to-action element", () => {
    render(<ValueProposition />);
    const cta = screen.queryByRole("button") || screen.queryByRole("link");
    expect(cta).toBeTruthy();
  });
});
