/** Leitura de números digitados à mão, no padrão brasileiro. */
import { describe, expect, it } from "vitest";

import { paraNumero } from "../src/nucleo/formatadores.js";

describe("paraNumero", () => {
  it("lê a vírgula como separador decimal", () => {
    expect(paraNumero("0,750")).toBe(0.75);
    expect(paraNumero("345,5")).toBe(345.5);
  });

  it("lê o ponto como separador decimal quando está sozinho", () => {
    expect(paraNumero("0.750")).toBe(0.75);
    expect(paraNumero("0.9")).toBe(0.9);
  });

  it("trata o ponto como milhar quando a vírgula também aparece", () => {
    expect(paraNumero("1.500,50")).toBe(1500.5);
    expect(paraNumero("12.345.678,90")).toBe(12345678.9);
  });

  it("lê inteiros", () => {
    expect(paraNumero("300")).toBe(300);
    expect(paraNumero("0")).toBe(0);
  });

  it("devolve o padrão para texto vazio ou pela metade", () => {
    // Zero seria pior que o padrão: o campo em branco viraria um dado errado.
    expect(paraNumero("", 7)).toBe(7);
    expect(paraNumero("   ", 7)).toBe(7);
    expect(paraNumero("-", 7)).toBe(7);
    expect(paraNumero("abc", 7)).toBe(7);
    expect(paraNumero("", 0)).toBe(0);
  });

  it("aceita um número pela metade enquanto ainda se digita", () => {
    expect(paraNumero("0,")).toBe(0);
    expect(paraNumero("12,")).toBe(12);
  });

  it("ignora o que não é número, como o R$ colado de outro lugar", () => {
    expect(paraNumero("R$ 1.500,00")).toBe(1500);
    expect(paraNumero("300 kg")).toBe(300);
  });

  it("lê negativos", () => {
    expect(paraNumero("-12,5")).toBe(-12.5);
  });
});
