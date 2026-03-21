import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  PremiumTooltip,
  Sparkline,
  StatCardWithSparkline,
} from "./PremiumCharts";

// Mock recharts ResponsiveContainer since it doesn't work in jsdom
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual as any,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 200, height: 100 }}>
        {children}
      </div>
    ),
  };
});

const mockSparklineData = [10, 20, 15, 25, 30, 28, 35];

describe("PremiumCharts Components", () => {
  describe("Sparkline", () => {
    it("renderiza sem erros", () => {
      const { container } = render(<Sparkline data={mockSparklineData} />);
      expect(container).toBeInTheDocument();
    });

    it("renderiza com cor personalizada", () => {
      const { container } = render(
        <Sparkline data={mockSparklineData} color="#ff0000" />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com dimensões personalizadas", () => {
      const { container } = render(
        <Sparkline data={mockSparklineData} width={200} height={60} />
      );
      expect(container).toBeInTheDocument();
    });

    it("lida com array vazio sem crash", () => {
      const { container } = render(<Sparkline data={[]} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe("StatCardWithSparkline", () => {
    it("renderiza com sparklineData", () => {
      const { getByText } = render(
        <StatCardWithSparkline
          title="Total Contratos"
          value="R$ 1.000.000"
          change={5.2}
          sparklineData={mockSparklineData}
        />
      );
      expect(getByText("Total Contratos")).toBeInTheDocument();
      expect(getByText("R$ 1.000.000")).toBeInTheDocument();
    });

    it("renderiza sem sparklineData", () => {
      const { getByText } = render(
        <StatCardWithSparkline title="Contratos" value="42" />
      );
      expect(getByText("Contratos")).toBeInTheDocument();
      expect(getByText("42")).toBeInTheDocument();
    });

    it("mostra variação negativa", () => {
      const { getByText } = render(
        <StatCardWithSparkline
          title="Custos"
          value="R$ 50.000"
          change={-3.5}
        />
      );
      expect(getByText("Custos")).toBeInTheDocument();
    });
  });

  describe("PremiumTooltip", () => {
    it("retorna null quando inativo", () => {
      const { container } = render(
        <PremiumTooltip active={false} payload={[]} label="Test" />
      );
      expect(container.innerHTML).toBe("");
    });

    it("renderiza quando ativo com payload", () => {
      const payload = [{ name: "Valor", value: 1000, color: "#8884d8" }];
      const { getByText } = render(
        <PremiumTooltip active={true} payload={payload} label="Jan" />
      );
      expect(getByText("Jan")).toBeInTheDocument();
    });

    it("retorna null com payload vazio", () => {
      const { container } = render(
        <PremiumTooltip active={true} payload={[]} label="Test" />
      );
      expect(container.innerHTML).toBe("");
    });
  });
});
