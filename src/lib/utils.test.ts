import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (classnames utility)", () => {
  it("combina classes simples", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("ignora valores falsy", () => {
    expect(cn("class1", false && "class2", null, undefined, "class3")).toBe(
      "class1 class3"
    );
  });

  it("mescla classes tailwind conflitantes", () => {
    // tailwind-merge deve manter apenas a última classe de padding
    expect(cn("p-4", "p-6")).toBe("p-6");
  });

  it("mescla cores de texto conflitantes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserva classes não conflitantes", () => {
    expect(cn("p-4", "m-2", "text-center")).toBe("p-4 m-2 text-center");
  });

  it("suporta objetos condicionais", () => {
    expect(cn({ "class-active": true, "class-inactive": false })).toBe(
      "class-active"
    );
  });

  it("suporta arrays", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(cn()).toBe("");
  });

  it("combina classes de borda conflitantes", () => {
    expect(cn("border-2", "border-4")).toBe("border-4");
  });

  it("combina classes de arredondamento conflitantes", () => {
    expect(cn("rounded-sm", "rounded-lg")).toBe("rounded-lg");
  });
});
