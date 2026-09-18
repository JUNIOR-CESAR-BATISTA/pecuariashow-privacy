/** Ida e volta entre `Date` e o texto que `<input type="date">` usa. */
import { describe, expect, it } from "vitest";
import { deCampoData, paraDataCampo } from "../src/nucleo/formatadores.js";

describe("paraDataCampo", () => {
  it("formata em AAAA-MM-DD, com zeros à esquerda", () => {
    expect(paraDataCampo(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(paraDataCampo(new Date(2026, 8, 18))).toBe("2026-09-18");
  });

  it("usa os componentes locais da data, não o instante em UTC", () => {
    // 23h59 de 31/12 no fuso local ainda é 31/12 aqui, mesmo que já seja
    // outro dia em UTC.
    const data = new Date(2026, 11, 31, 23, 59);
    expect(paraDataCampo(data)).toBe("2026-12-31");
  });
});

describe("deCampoData", () => {
  it("lê AAAA-MM-DD como meia-noite local", () => {
    const data = deCampoData("2026-03-15")!;
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(2);
    expect(data.getDate()).toBe(15);
    expect(data.getHours()).toBe(0);
  });

  it("é o inverso de paraDataCampo para qualquer dia do ano", () => {
    for (const [ano, mes, dia] of [
      [2025, 0, 1],
      [2026, 1, 28],
      [2027, 11, 31],
    ] as const) {
      const original = new Date(ano, mes, dia);
      expect(deCampoData(paraDataCampo(original))).toEqual(original);
    }
  });

  it("devolve null para texto vazio, parcial ou inválido", () => {
    expect(deCampoData("")).toBeNull();
    expect(deCampoData("2026-03")).toBeNull();
    expect(deCampoData("2026-13-40")).toBeNull();
    expect(deCampoData("não é uma data")).toBeNull();
  });
});
