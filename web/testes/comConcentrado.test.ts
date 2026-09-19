/**
 * Dieta sem concentrado: só volumoso (o pasto) e mineral no cocho, sem
 * energético nem proteico. Independe do sistema de criação - é uma escolha
 * do usuário (`comConcentrado`), não uma consequência de estar no pasto.
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

describe("selecaoDaDieta e o comConcentrado", () => {
  it("sem concentrado, volumoso e mineral bastam - energético e proteico não são exigidos", () => {
    const lote = criarLote({
      comConcentrado: false,
      volumosoID: pasto.id,
      mineralID: mineral.id,
      // De propósito, sem energeticoID nem proteicoID.
    });
    const selecao = selecaoDaDieta(dietaAtual(lote), insumos, lote.comConcentrado);
    expect(selecao).toEqual({ volumoso: pasto, energetico: undefined, mineral });
  });

  it("sem concentrado, sem volumoso escolhido ainda falta alimento", () => {
    const lote = criarLote({ comConcentrado: false, volumosoID: undefined });
    expect(selecaoDaDieta(dietaAtual(lote), insumos, lote.comConcentrado)).toBeNull();
  });

  it("com concentrado, energético e proteico continuam obrigatórios", () => {
    const lote = criarLote({
      comConcentrado: true,
      volumosoID: pasto.id,
      mineralID: mineral.id,
      // Sem energético nem proteico: com concentrado ligado, isso é "faltam alimentos".
    });
    expect(selecaoDaDieta(dietaAtual(lote), insumos, lote.comConcentrado)).toBeNull();
  });

  it("o mesmo lote, só trocando comConcentrado, muda o que é exigido", () => {
    const base = { volumosoID: pasto.id, mineralID: mineral.id };
    const semConcentrado = criarLote({ ...base, comConcentrado: false });
    const comConcentrado = criarLote({ ...base, comConcentrado: true });

    expect(
      selecaoDaDieta(dietaAtual(semConcentrado), insumos, semConcentrado.comConcentrado),
    ).not.toBeNull();
    expect(
      selecaoDaDieta(dietaAtual(comConcentrado), insumos, comConcentrado.comConcentrado),
    ).toBeNull();
  });

  it("independe do sistema: pasto com concentrado exige os quatro, confinamento sem concentrado não", () => {
    const pastoComConcentrado = criarLote({
      sistema: "pasto",
      comConcentrado: true,
      volumosoID: pasto.id,
      mineralID: mineral.id,
    });
    const confinamentoSemConcentrado = criarLote({
      sistema: "confinamento",
      comConcentrado: false,
      volumosoID: pasto.id,
      mineralID: mineral.id,
    });

    expect(
      selecaoDaDieta(dietaAtual(pastoComConcentrado), insumos, pastoComConcentrado.comConcentrado),
    ).toBeNull();
    expect(
      selecaoDaDieta(
        dietaAtual(confinamentoSemConcentrado),
        insumos,
        confinamentoSemConcentrado.comConcentrado,
      ),
    ).not.toBeNull();
  });

  it("de ponta a ponta: um lote sem concentrado forma ração real, só com pasto e mineral", () => {
    const lote = criarLote({
      comConcentrado: false,
      volumosoID: pasto.id,
      mineralID: mineral.id,
      pesoMedioInicial: 300,
      ganhoMetaDiario: 0.5,
    });
    const selecao = selecaoDaDieta(dietaAtual(lote), insumos, lote.comConcentrado)!;
    const exigencia = calcular(perfilAtual(lote), dietaAtual(lote).ganhoMetaDiario);
    const racao = formular(exigencia, selecao, dietaAtual(lote).restricoes);

    expect(racao.status).not.toBe("invalida");
    expect(racao.itens.every((i) => i.insumo === pasto || i.insumo === mineral)).toBe(true);
  });
});
