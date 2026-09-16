/**
 * O catálogo veio do Swift por extração automática. Estes testes conferem o
 * resultado dessa extração: quantidade, categorias, identificadores fixos e
 * teores dentro de faixas possíveis.
 */
import { describe, expect, it } from "vitest";

import {
  CATALOGO_PADRAO,
  ID_FARELO_SOJA,
  ID_MILHO,
  ID_MINERAL,
  ID_PASTO_AGUAS,
  ID_SILAGEM_MILHO,
} from "../src/nucleo/catalogoInsumos.js";
import { TODAS_AS_CATEGORIAS } from "../src/nucleo/classificacoes.js";

describe("catálogo padrão", () => {
  it("traz os 20 alimentos do aplicativo de iPhone", () => {
    expect(CATALOGO_PADRAO).toHaveLength(20);
  });

  it("cobre as quatro categorias", () => {
    for (const categoria of TODAS_AS_CATEGORIAS) {
      expect(CATALOGO_PADRAO.some((i) => i.categoria === categoria)).toBe(true);
    }
  });

  it("mantém os identificadores fixos, que ligam backup e catálogo", () => {
    for (const id of [ID_PASTO_AGUAS, ID_SILAGEM_MILHO, ID_MILHO, ID_FARELO_SOJA, ID_MINERAL]) {
      expect(CATALOGO_PADRAO.some((i) => i.id === id)).toBe(true);
    }
  });

  it("não repete identificador nem nome", () => {
    expect(new Set(CATALOGO_PADRAO.map((i) => i.id)).size).toBe(CATALOGO_PADRAO.length);
    expect(new Set(CATALOGO_PADRAO.map((i) => i.nome)).size).toBe(CATALOGO_PADRAO.length);
  });

  it("tem teores dentro de faixas possíveis", () => {
    for (const i of CATALOGO_PADRAO) {
      expect(i.materiaSeca).toBeGreaterThan(0);
      expect(i.materiaSeca).toBeLessThanOrEqual(100);
      expect(i.proteinaBruta).toBeGreaterThanOrEqual(0);
      expect(i.ndt).toBeGreaterThanOrEqual(0);
      expect(i.ndt).toBeLessThanOrEqual(100);
    }
  });

  it("a ureia passa de 100% de PB, e isso está certo", () => {
    // Não é proteína verdadeira: é equivalente proteico de nitrogênio não
    // proteico, nitrogênio vezes 6,25. Por isso o teto de 100% vale para o
    // NDT e para a matéria seca, mas não para a PB.
    const ureia = CATALOGO_PADRAO.find((i) => i.nome.startsWith("Ureia"));
    expect(ureia?.proteinaBruta).toBeGreaterThan(200);
    expect(ureia?.ndt).toBe(0);
  });

  it("começa com preço zerado: preço é coisa de região e safra", () => {
    expect(CATALOGO_PADRAO.every((i) => i.precoUnitario === 0)).toBe(true);
  });
});
