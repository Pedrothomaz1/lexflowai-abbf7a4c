import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  PremiumTooltip,
  PremiumAreaChart,
  PremiumBarChart,
  PremiumDonutChart,
  Sparkline,
  StatCardWithSparkline,
} from "./PremiumCharts";

// Mock data for tests
const mockChartData = [
  { name: "Jan", value: 100, previous: 80 },
  { name: "Feb", value: 150, previous: 120 },
  { name: "Mar", value: 200, previous: 180 },
];

const mockSparklineData = [10, 20, 15, 25, 30, 28, 35];

const mockDonutData = [
  { name: "Category A", value: 400, color: "#8884d8" },
  { name: "Category B", value: 300, color: "#82ca9d" },
  { name: "Category C", value: 200, color: "#ffc658" },
];

describe("PremiumCharts Components", () => {
  describe("Sparkline", () => {
    it("renderiza sem erros", () => {
      const { container } = render(<Sparkline data={mockSparklineData} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renderiza com cor personalizada", () => {
      const { container } = render(
        <Sparkline data={mockSparklineData} color="#ff0000" />
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renderiza com dimensões personalizadas", () => {
      const { container } = render(
        <Sparkline data={mockSparklineData} width={200} height={60} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("lida com array vazio sem crash", () => {
      const { container } = render(<Sparkline data={[]} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe("PremiumAreaChart", () => {
    it("renderiza com dados válidos", () => {
      const { container } = render(
        <PremiumAreaChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com compareKey", () => {
      const { container } = render(
        <PremiumAreaChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
          compareKey="previous"
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com showLegend", () => {
      const { container } = render(
        <PremiumAreaChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
          showLegend={true}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza sem dots quando showDots é false", () => {
      const { container } = render(
        <PremiumAreaChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
          showDots={false}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("PremiumBarChart", () => {
    it("renderiza com dados válidos", () => {
      const { container } = render(
        <PremiumBarChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com layout horizontal", () => {
      const { container } = render(
        <PremiumBarChart
          data={mockChartData}
          dataKey="value"
          xAxisKey="name"
          layout="horizontal"
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com layout vertical", () => {
      const { container } = render(
        <PremiumBarChart
          data={mockChartData}
          dataKey="value"
          yAxisKey="name"
          layout="vertical"
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com cores customizadas", () => {
      const { container } = render(
        <PremiumBarChart
          data={mockChartData}
          dataKey="value"
          colors={["#ff0000", "#00ff00", "#0000ff"]}
          gradient={false}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("PremiumDonutChart", () => {
    it("renderiza com dados válidos", () => {
      const { container } = render(
        <PremiumDonutChart data={mockDonutData} />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com centerLabel", () => {
      const { container } = render(
        <PremiumDonutChart
          data={mockDonutData}
          centerLabel={{ value: "900", label: "Total" }}
        />
      );
      expect(container.textContent).toContain("900");
      expect(container.textContent).toContain("Total");
    });

    it("renderiza sem labels", () => {
      const { container } = render(
        <PremiumDonutChart data={mockDonutData} showLabels={false} />
      );
      expect(container).toBeInTheDocument();
    });

    it("renderiza com innerRadius e outerRadius customizados", () => {
      const { container } = render(
        <PremiumDonutChart
          data={mockDonutData}
          innerRadius={50}
          outerRadius={80}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("StatCardWithSparkline", () => {
    it("renderiza com todos os props obrigatórios", () => {
      const { container } = render(
        <StatCardWithSparkline
          title="Contratos Ativos"
          value="42"
        />
      );
      expect(container.textContent).toContain("Contratos Ativos");
      expect(container.textContent).toContain("42");
    });

    it("exibe tendência positiva corretamente", () => {
      const { container } = render(
        <StatCardWithSparkline
          title="Métrica"
          value="100"
          change={15}
        />
      );
      expect(container.textContent).toContain("+15%");
    });

    it("exibe tendência negativa corretamente", () => {
      const { container } = render(
        <StatCardWithSparkline
          title="Métrica"
          value="100"
          change={-10}
        />
      );
      expect(container.textContent).toContain("-10%");
    });

    it("renderiza com sparklineData", () => {
      const { container } = render(
        <StatCardWithSparkline
          title="Com Sparkline"
          value="50"
          sparklineData={mockSparklineData}
        />
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renderiza como clicável quando onClick é fornecido", () => {
      const mockClick = vi.fn();
      const { container } = render(
        <StatCardWithSparkline
          title="Clicável"
          value="50"
          onClick={mockClick}
        />
      );
      expect(container.firstChild).toHaveClass("cursor-pointer");
    });
  });

  describe("PremiumTooltip", () => {
    it("renderiza quando active e com payload", () => {
      const payload = [{ value: 100, name: "Valor", color: "#8884d8" }];
      const { container } = render(
        <PremiumTooltip active={true} payload={payload} label="Janeiro" />
      );
      expect(container.textContent).toContain("Janeiro");
    });

    it("não renderiza quando inactive", () => {
      const { container } = render(
        <PremiumTooltip active={false} payload={[]} label="Test" />
      );
      expect(container.firstChild).toBeNull();
    });

    it("não renderiza quando payload está vazio", () => {
      const { container } = render(
        <PremiumTooltip active={true} payload={[]} label="Test" />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
