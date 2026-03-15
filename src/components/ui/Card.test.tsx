import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";

describe("Card Components", () => {
  describe("Card", () => {
    it("renderiza conteúdo corretamente", () => {
      const { container } = render(<Card>Card Content</Card>);
      expect(container.textContent).toContain("Card Content");
    });

    it("aplica classes base", () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("rounded-2xl", "border", "bg-card", "shadow-sm");
    });

    it("aceita className customizada", () => {
      const { container } = render(
        <Card className="custom-card">Content</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("custom-card");
    });
  });

  describe("CardHeader", () => {
    it("renderiza com padding correto", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("p-5");
    });

    it("aplica flex column layout", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("flex", "flex-col");
    });
  });

  describe("CardTitle", () => {
    it("renderiza como h3", () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.querySelector("h3");
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe("Title");
    });

    it("aplica estilos de título", () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.querySelector("h3");
      expect(title).toHaveClass("text-2xl", "font-semibold");
    });
  });

  describe("CardDescription", () => {
    it("renderiza texto descritivo", () => {
      const { container } = render(<CardDescription>Description text</CardDescription>);
      expect(container.textContent).toContain("Description text");
    });

    it("aplica cor muted", () => {
      const { container } = render(
        <CardDescription>Description</CardDescription>
      );
      const desc = container.firstChild as HTMLElement;
      expect(desc).toHaveClass("text-muted-foreground");
    });
  });

  describe("CardContent", () => {
    it("renderiza conteúdo", () => {
      const { container } = render(<CardContent>Main content here</CardContent>);
      expect(container.textContent).toContain("Main content here");
    });

    it("aplica padding correto (sem top)", () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass("p-5", "pt-0");
    });
  });

  describe("CardFooter", () => {
    it("renderiza footer", () => {
      const { container } = render(<CardFooter>Footer content</CardFooter>);
      expect(container.textContent).toContain("Footer content");
    });

    it("aplica flex layout", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass("flex", "items-center");
    });
  });

  describe("Card Composition", () => {
    it("renderiza card completo com todas as partes", () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a description</CardDescription>
          </CardHeader>
          <CardContent>Main content</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>
      );

      expect(container.querySelector("h3")?.textContent).toBe("Complete Card");
      expect(container.textContent).toContain("This is a description");
      expect(container.textContent).toContain("Main content");
      expect(container.textContent).toContain("Footer actions");
    });
  });
});
