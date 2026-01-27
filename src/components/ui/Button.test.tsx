import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "./button";

describe("Button Component", () => {
  it("renderiza com texto correto", () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.querySelector("button")).toBeInTheDocument();
    expect(container.textContent).toContain("Click me");
  });

  it("aplica variante default corretamente", () => {
    const { container } = render(<Button>Default</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("bg-primary");
  });

  it("aplica variante destructive", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("aplica variante outline", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("border");
  });

  it("aplica variante ghost", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("hover:bg-accent");
  });

  it("aplica tamanho sm", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("h-9");
  });

  it("aplica tamanho lg", () => {
    const { container } = render(<Button size="lg">Large</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("h-11");
  });

  it("aplica tamanho icon", () => {
    const { container } = render(<Button size="icon">🔍</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("h-10", "w-10");
  });

  it("pode ser desabilitado", () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const button = container.querySelector("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none");
  });

  it("aceita className customizada", () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("custom-class");
  });

  it("renderiza como Slot quando asChild é true", () => {
    const { container } = render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = container.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });
});
