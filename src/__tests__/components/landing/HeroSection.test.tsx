/**
 * HeroSection unit tests
 *
 * Run with: npm test -- HeroSection.test.tsx
 * Coverage: rendering, navigation, highlights
 *
 * Test patterns:
 * - Render with mocked navigate
 * - Click CTA buttons
 * - Verify highlights are rendered
 * - Verify inline behavior (scroll to features)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HeroSection } from "@/components/landing/HeroSection";
import { ROUTES } from "@/constants/routes";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("HeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders headline", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    expect(
      screen.getByText(/Contratos sob controle. Decisões no tempo certo./i)
    ).toBeInTheDocument();
  });

  it("renders subheadline", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    expect(screen.getByText(/Tudo o que exige sua atenção/i)).toBeInTheDocument();
  });

  it("renders all 3 quick highlights", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    expect(screen.getByText(/Vencimentos antecipados/)).toBeInTheDocument();
    expect(screen.getByText(/Riscos visíveis em tempo real/)).toBeInTheDocument();
    expect(screen.getByText(/Decisões no seu tempo/)).toBeInTheDocument();
  });

  it("renders primary CTA with label", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    const primaryBtn = screen.getByRole("button", { name: /Começar agora/i });
    expect(primaryBtn).toBeInTheDocument();
  });

  it("renders secondary CTA", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    const secondaryBtn = screen.getByRole("button", { name: /Ver como funciona/i });
    expect(secondaryBtn).toBeInTheDocument();
  });

  it("secondary CTA scrolls to features on click", () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );

    // Mock element with id "features"
    const mockElement = { scrollIntoView: vi.fn() };
    vi.spyOn(document, "getElementById").mockReturnValue(mockElement as any);

    const secondaryBtn = screen.getByRole("button", { name: /Ver como funciona/i });
    fireEvent.click(secondaryBtn);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});
