import { describe, it, expect } from "vitest";
import {
  cleanDocument,
  validateCPF,
  validateCNPJ,
  formatCPF,
  formatCNPJ,
  detectDocumentType,
  validateDocument,
  formatDocument,
} from "./documentValidation";

describe("cleanDocument", () => {
  it("remove pontuação de CPF", () => {
    expect(cleanDocument("529.982.247-25")).toBe("52998224725");
  });

  it("remove pontuação de CNPJ", () => {
    expect(cleanDocument("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(cleanDocument("")).toBe("");
  });
});

describe("validateCPF", () => {
  it("valida CPF correto com formatação", () => {
    expect(validateCPF("529.982.247-25")).toBe(true);
  });

  it("valida CPF correto sem formatação", () => {
    expect(validateCPF("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígitos repetidos", () => {
    expect(validateCPF("111.111.111-11")).toBe(false);
    expect(validateCPF("000.000.000-00")).toBe(false);
    expect(validateCPF("999.999.999-99")).toBe(false);
  });

  it("rejeita CPF com dígitos verificadores incorretos", () => {
    expect(validateCPF("529.982.247-00")).toBe(false);
    expect(validateCPF("529.982.247-26")).toBe(false);
  });

  it("rejeita CPF com tamanho incorreto", () => {
    expect(validateCPF("123.456.789")).toBe(false);
    expect(validateCPF("123")).toBe(false);
    expect(validateCPF("")).toBe(false);
  });

  it("valida outros CPFs válidos conhecidos", () => {
    expect(validateCPF("191.615.260-02")).toBe(true);
    expect(validateCPF("885.610.280-33")).toBe(true);
  });
});

describe("validateCNPJ", () => {
  it("valida CNPJ correto com formatação", () => {
    expect(validateCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("valida CNPJ correto sem formatação", () => {
    expect(validateCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígitos repetidos", () => {
    expect(validateCNPJ("11.111.111/1111-11")).toBe(false);
    expect(validateCNPJ("00.000.000/0000-00")).toBe(false);
  });

  it("rejeita CNPJ com dígitos verificadores incorretos", () => {
    expect(validateCNPJ("11.222.333/0001-00")).toBe(false);
    expect(validateCNPJ("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita CNPJ com tamanho incorreto", () => {
    expect(validateCNPJ("11.222.333/0001")).toBe(false);
    expect(validateCNPJ("123")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("formata CPF completo", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("formata CPF parcial (3 dígitos)", () => {
    expect(formatCPF("529")).toBe("529");
  });

  it("formata CPF parcial (6 dígitos)", () => {
    expect(formatCPF("529982")).toBe("529.982");
  });

  it("formata CPF parcial (9 dígitos)", () => {
    expect(formatCPF("529982247")).toBe("529.982.247");
  });

  it("limita a 11 dígitos", () => {
    expect(formatCPF("529982247251234")).toBe("529.982.247-25");
  });
});

describe("formatCNPJ", () => {
  it("formata CNPJ completo", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formata CNPJ parcial (5 dígitos)", () => {
    expect(formatCNPJ("11222")).toBe("11.222");
  });

  it("formata CNPJ parcial (8 dígitos)", () => {
    expect(formatCNPJ("11222333")).toBe("11.222.333");
  });

  it("formata CNPJ parcial (12 dígitos)", () => {
    expect(formatCNPJ("112223330001")).toBe("11.222.333/0001");
  });

  it("limita a 14 dígitos", () => {
    expect(formatCNPJ("11222333000181999")).toBe("11.222.333/0001-81");
  });
});

describe("detectDocumentType", () => {
  it("detecta CPF (11 dígitos)", () => {
    expect(detectDocumentType("52998224725")).toBe("cpf");
    expect(detectDocumentType("529.982.247-25")).toBe("cpf");
  });

  it("detecta CNPJ (14 dígitos)", () => {
    expect(detectDocumentType("11222333000181")).toBe("cnpj");
    expect(detectDocumentType("11.222.333/0001-81")).toBe("cnpj");
  });

  it("retorna invalid para outros tamanhos", () => {
    expect(detectDocumentType("123456")).toBe("invalid");
    expect(detectDocumentType("")).toBe("invalid");
    expect(detectDocumentType("1234567890123456")).toBe("invalid");
  });
});

describe("validateDocument", () => {
  it("valida CPF válido", () => {
    const result = validateDocument("529.982.247-25");
    expect(result.valid).toBe(true);
    expect(result.type).toBe("cpf");
    expect(result.formatted).toBe("529.982.247-25");
    expect(result.error).toBeUndefined();
  });

  it("valida CNPJ válido", () => {
    const result = validateDocument("11.222.333/0001-81");
    expect(result.valid).toBe(true);
    expect(result.type).toBe("cnpj");
    expect(result.formatted).toBe("11.222.333/0001-81");
  });

  it("rejeita CPF inválido com erro específico", () => {
    const result = validateDocument("529.982.247-00");
    expect(result.valid).toBe(false);
    expect(result.type).toBe("cpf");
    expect(result.error).toContain("inválido");
  });

  it("rejeita documento incompleto", () => {
    const result = validateDocument("123456");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("incompleto");
  });

  it("rejeita documento vazio", () => {
    const result = validateDocument("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("não informado");
  });
});

describe("formatDocument", () => {
  it("formata CPF automaticamente", () => {
    expect(formatDocument("52998224725")).toBe("529.982.247-25");
  });

  it("formata CNPJ automaticamente", () => {
    expect(formatDocument("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("tenta formatar como CPF quando tamanho <= 11", () => {
    expect(formatDocument("123456")).toBe("123.456");
  });
});
