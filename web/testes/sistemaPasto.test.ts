/**
 * Sistema de criação "Pasto": sem concentrado no cocho, a dieta é só
 * volumoso (o próprio pasto) e mineral - energético e proteico deixam de
 * ser obrigatórios.
 */
import { describe, expect, it } from "vitest";

import { formular } from "../src/nucleo/formuladorRacao.js";
import { PASTEJO, SACA_25, SACA_60, criarInsumo } from "../src/nucleo/insumo.js";
import { calcular } from "../src/nucleo/motorExigencias.js";
import { criarLote, dietaAtual, perfilAtual, selecaoDaDieta } from "../src/nucleo/lote.js";

const pasto = criarInsumo({
  nome: "Pasto",
  categoria: "volumoso",
  materiaSeca: 28,
  proteinaBruta: 9,
  ndt: 58,
  embalagem: PASTEJO,
});
const milho = criarInsumo({
  nome: "Milho",
  categoria: "energetico",
  materiaSeca: 88,
  proteinaBruta: 9,
  ndt: 87,
  embalagem: SACA_60,
});
const mineral = criarInsumo({
  nome: "Núcleo",
  categoria: "mineral",
  materiaSeca: 99,
  proteinaBruta: 0,
  ndt: 0,
  embalagem: SACA_25,
});
const insumos = [pasto, milho, mineral];

describe("selecaoDaDieta e o sistema de criação", () => {
  it("no pasto, volumoso e mineral bastam - energético e proteico não são exigidos", () => {
    const lote = criarLote({
      sistema: "pasto",
      volumosoID: pasto.id,
      mineralID: mineral.id,
      // De propósito, sem energeticoID nem proteicoID.
    });
    const selecao = selecaoDaDieta(dietaAtual(lote), insumos, lote.sistema);
    expect(selecao).toEqual({ volumoso: pasto, energetico: undefined, mineral });
  });

  it("no pasto, sem volumoso escolhido ainda falta alimento", () => {
    const lote = criarLote({ sistema: "pasto", volumosoID: undefined });
    expect(selecaoDaDieta(dietaAtual(lote), insumos, lote.sistema)).toBeNull();
  });

  it("fora do pasto, energético e proteico continuam obrigatórios", () => {
    const lote = criarLote({
      sistema: "semiconfinamento",
      volumosoID: pasto.id,
      mineralID: mineral.id,
      // Sem energético nem proteico: em semiconfinamento isso é "faltam alimentos".
    });
    expect(selecaoDaDieta(dietaAtual(lote), insumos, lote.sistema)).toBeNull();
  });

  it("o mesmo lote, só trocando o sistema para confinamento, volta a exigir os quatro", () => {
    const base = { volumosoID: pasto.id, mineralID: mineral.id };
    const noPasto = criarLote({ ...base, sistema: "pasto" });
    const noConfinamento = criarLote({ ...base, sistema: "confinamento" });

    expect(selecaoDaDieta(dietaAtual(noPasto), insumos, noPasto.sistema)).not.toBeNull();
    expect(selecaoDaDieta(dietaAtual(noConfinamento), insumos, noConfinamento.sistema)).toBeNull();
  });

  it("de ponta a ponta: um lote de pasto forma ração real, só com pasto e mineral", () => {
    const lote = criarLote({
      sistema: "pasto",
      volumosoID: pasto.id,
      mineralID: mineral.id,
      pesoMedioInicial: 300,
      ganhoMetaDiario: 0.5,
    });
    const selecao = selecaoDaDieta(dietaAtual(lote), insumos, lote.sistema)!;
    const exigencia = calcular(perfilAtual(lote), dietaAtual(lote).ganhoMetaDiario);
    const racao = formular(exigencia, selecao, dietaAtual(lote).restricoes);

    expect(racao.status).not.toBe("invalida");
    expect(racao.itens.every((i) => i.insumo === pasto || i.insumo === mineral)).toBe(true);
  });
});
