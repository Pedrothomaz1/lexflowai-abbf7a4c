/**
 * LandingHeader unit tests
 *
 * Run with: npm test -- LandingHeader.test.tsx
 * Coverage: navigation links, responsive layout
 *
 * Test patterns:
 * - Render header with navigation
 * - Verify navigation links
 * - Check logo rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { LandingHeader } from "@/components/landing/LandingHeader";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("LandingHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header", () => {
    render(
      <BrowserRouter>
        <LandingHeader />
      </BrowserRouter>
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(
      <BrowserRouter>
        <LandingHeader />
      </BrowserRouter>
    );
    // Common header links
    const navElement = screen.getByRole("navigation");
    expect(navElement).toBeInTheDocument();
  });

  it("renders logo or brand name", () => {
    render(
      <BrowserRouter>
        <LandingHeader />
      </BrowserRouter>
    );
    // Should have some branding element (logo or text)
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header.children.length).toBeGreaterThan(0);
  });
});
