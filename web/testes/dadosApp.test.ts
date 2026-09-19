/**
 * A compatibilidade do arquivo entre o aplicativo de iPhone e a web é o que
 * estes testes protegem. Um backup exportado lá precisa abrir aqui, e o que
 * sai daqui precisa abrir lá.
 */
import { describe, expect, it } from "vitest";

import { CATALOGO_PADRAO, ID_MILHO } from "../src/nucleo/catalogoInsumos.js";
import { criarCiclo } from "../src/nucleo/cicloEncerrado.js";
import {
  ErroBackup,
  VERSAO_ATUAL,
  dadosIniciais,
  desserializar,
  paraISO,
  serializar,
  type DadosApp,
} from "../src/nucleo/dadosApp.js";
import { criarLote, criarPesagem } from "../src/nucleo/lote.js";

/** Um arquivo no formato exato que o aplicativo de iPhone grava. */
const BACKUP_DO_IPHONE = `{
  "ciclos" : [
    {
      "animaisAbatidos" : 38,
      "animaisIniciais" : 40,
      "concentradoPrevisto" : 40000,
      "concentradoReal" : 39000,
      "consumoPrevistoDiario" : 7.9000000000000004,
      "custoPrevisto" : 50000,
      "custoReal" : 52000,
      "dataAbate" : "2026-04-14T00:00:00Z",
      "dataInicio" : "2025-09-01T00:00:00Z",
      "energeticoNome" : "Milho",
      "ganhoMeta" : 0.75,
      "grupoGenetico" : "zebuino",
      "id" : "8B1C0A6E-1111-4222-8333-444455556666",
      "loteID" : "7A2B3C4D-5555-4666-8777-888899990000",
      "ndtDietaMedia" : 67,
      "nome" : "Lote 2024",
      "observacoes" : "",
      "pbDietaMedia" : 11,
      "pesoAcabamentoPlanejado" : 430,
      "pesoAlvo" : 430,
      "pesoCarcacaReal" : 228,
      "pesoFinalReal" : 431,
      "pesoInicial" : 260,
      "precoArroba" : 310,
      "proteicoNome" : "Farelo de soja",
      "sistema" : "semiconfinamento",
      "volumosoNome" : "Pasto"
    }
  ],
  "insumos" : [
    {
      "categoria" : "energetico",
      "embalagem" : {
        "kgPorSaca" : 60,
        "tipo" : "saca"
      },
      "id" : "11111111-0000-4000-A000-000000000010",
      "materiaSeca" : 88,
      "ndt" : 87,
      "nome" : "Milho em grão moído",
      "observacao" : "",
      "precoUnitario" : 72,
      "proteinaBruta" : 9
    }
  ],
  "lotes" : [
    {
      "ajusteConsumo" : 1,
      "dataEntrada" : "2026-01-10T00:00:00Z",
      "diasPorPeriodo" : 30,
      "energeticoID" : "11111111-0000-4000-A000-000000000010",
      "fase" : "recriaInicial",
      "ganhoMetaDiario" : 0.75,
      "grupoGenetico" : "zebuino",
      "id" : "1A2B3C4D-0000-4111-8222-333344445555",
      "nome" : "Lote 1 - Novilhas Nelore",
      "observacoes" : "",
      "pesagens" : [
        {
          "data" : "2026-03-01T00:00:00Z",
          "id" : "9F8E7D6C-0000-4111-8222-333344445555",
          "observacao" : "primeira pesada",
          "pesoMedio" : 285
        }
      ],
      "pesoAlvoAbate" : 430,
      "pesoFinalMaturidade" : 430,
      "pesoMedioInicial" : 260,
      "quantidadeAnimais" : 40,
      "rendimentoCarcaca" : 0.53000000000000003,
      "restricoes" : {
        "mineralGramasDia" : 100,
        "volumosoMaximo" : 0.94999999999999996,
        "volumosoMinimo" : 0.29999999999999999
      },
      "sistema" : "semiconfinamento"
    }
  ],
  "usarCalibracao" : true,
  "versao" : 2
}`;

describe("lendo um backup do iPhone", () => {
  it("abre o arquivo e recupera lote, insumo e ciclo", () => {
    const dados = desserializar(BACKUP_DO_IPHONE);

    expect(dados.versao).toBe(2);
    expect(dados.lotes).toHaveLength(1);
    expect(dados.insumos).toHaveLength(1);
    expect(dados.ciclos).toHaveLength(1);
    expect(dados.usarCalibracao).toBe(true);
    expect(dados.lotes[0]?.nome).toBe("Lote 1 - Novilhas Nelore");
    expect(dados.insumos[0]?.id).toBe(ID_MILHO);
  });

  it("transforma as datas em Date de verdade", () => {
    const dados = desserializar(BACKUP_DO_IPHONE);
    const lote = dados.lotes[0]!;

    expect(lote.dataEntrada).toBeInstanceOf(Date);
    expect(lote.dataEntrada.toISOString()).toBe("2026-01-10T00:00:00.000Z");
    expect(lote.pesagens[0]?.data.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(dados.ciclos[0]?.dataAbate.toISOString()).toBe("2026-04-14T00:00:00.000Z");
  });

  it("preenche as restrições que faltarem com o padrão", () => {
    const dados = desserializar(BACKUP_DO_IPHONE);
    // O arquivo não traz volumosoFixo, e isso é o normal.
    expect(dados.lotes[0]?.restricoes.volumosoFixo).toBeUndefined();
    expect(dados.lotes[0]?.restricoes.volumosoMinimo).toBeCloseTo(0.3, 6);
  });
});

describe("escrevendo para o iPhone ler", () => {
  it("grava a data sem milissegundos, que é o que o Swift aceita", () => {
    const data = new Date("2026-03-01T12:34:56.789Z");
    expect(paraISO(data)).toBe("2026-03-01T12:34:56Z");
    // O toISOString cru traria a fração, e o decodificador do Swift recusaria.
    expect(data.toISOString()).toContain(".789");
  });

  it("nenhuma data do arquivo gerado tem fração de segundo", () => {
    const dados: DadosApp = {
      ...dadosIniciais(),
      lotes: [
        criarLote({
          nome: "Lote com pesagem",
          dataEntrada: new Date("2026-01-10T08:15:30.123Z"),
          pesagens: [criarPesagem({ pesoMedio: 285, data: new Date() })],
        }),
      ],
      ciclos: [
        criarCiclo({
          loteID: crypto.randomUUID(),
          nome: "Ciclo",
          grupoGenetico: "zebuino",
          sistema: "semiconfinamento",
          dataInicio: new Date("2025-09-01T00:00:00.500Z"),
          pesoInicial: 260,
          ganhoMeta: 0.75,
          pesoAlvo: 430,
          animaisIniciais: 40,
          pesoAcabamentoPlanejado: 430,
          consumoPrevistoDiario: 7.9,
          ndtDietaMedia: 67,
          pbDietaMedia: 11,
          concentradoPrevisto: 40_000,
          custoPrevisto: 50_000,
          volumosoNome: "Pasto",
          energeticoNome: "Milho",
          proteicoNome: "Farelo de soja",
          dataAbate: new Date(),
          pesoFinalReal: 430,
          animaisAbatidos: 40,
        }),
      ],
    };

    const texto = serializar(dados);
    const datas = texto.match(/"\d{4}-\d{2}-\d{2}T[^"]*"/g) ?? [];

    expect(datas.length).toBeGreaterThan(0);
    for (const d of datas) {
      expect(d).toMatch(/^"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"$/);
    }
  });

  it("omite volumosoFixo quando não há, como o Swift faz", () => {
    const texto = serializar({ ...dadosIniciais(), lotes: [criarLote({ nome: "Sem fixo" })] });
    expect(texto).not.toContain("volumosoFixo");
  });
});

describe("ida e volta", () => {
  it("o que sai volta igual", () => {
    const original: DadosApp = {
      ...dadosIniciais(),
      lotes: [
        criarLote({
          nome: "Lote 1",
          quantidadeAnimais: 42,
          dataEntrada: new Date("2026-01-10T00:00:00Z"),
          pesagens: [
            criarPesagem({ pesoMedio: 285, data: new Date("2026-03-01T00:00:00Z") }),
          ],
        }),
      ],
    };

    const voltou = desserializar(serializar(original));

    expect(voltou.lotes[0]?.nome).toBe("Lote 1");
    expect(voltou.lotes[0]?.quantidadeAnimais).toBe(42);
    expect(voltou.lotes[0]?.dataEntrada.getTime()).toBe(
      original.lotes[0]!.dataEntrada.getTime(),
    );
    expect(voltou.lotes[0]?.pesagens[0]?.pesoMedio).toBe(285);
    expect(voltou.insumos).toHaveLength(CATALOGO_PADRAO.length);
    expect(voltou.versao).toBe(VERSAO_ATUAL);
  });
});

describe("recusando o que não é backup", () => {
  it("arquivo da versão 1 continua abrindo", () => {
    const antigo = `{"versao": 1, "lotes": [], "insumos": []}`;
    const dados = desserializar(antigo);

    expect(dados.versao).toBe(1);
    expect(dados.ciclos).toHaveLength(0);
    expect(dados.usarCalibracao).toBe(true);
  });

  it("JSON de outro programa é recusado", () => {
    expect(() => desserializar(`{"nome":"outra coisa","itens":[1,2,3]}`)).toThrow(ErroBackup);
  });

  it("objeto vazio é recusado", () => {
    expect(() => desserializar("{}")).toThrow(ErroBackup);
  });

  it("texto solto é recusado", () => {
    expect(() => desserializar("isto não é json")).toThrow(ErroBackup);
  });

  it("lista em vez de objeto é recusada", () => {
    expect(() => desserializar("[1,2,3]")).toThrow(ErroBackup);
  });

  it("data corrompida é apontada com o campo", () => {
    const ruim = `{"versao":2,"lotes":[{"dataEntrada":"não é data","pesagens":[]}],"insumos":[]}`;
    expect(() => desserializar(ruim)).toThrow(/dataEntrada/);
  });
});

describe("preço da arroba do dia", () => {
  it("começa em null, para um aplicativo recém-instalado", () => {
    expect(dadosIniciais().precoArrobaHoje).toBeNull();
  });

  it("sobrevive a exportar e restaurar, com o preço e a data intactos", () => {
    const registrado = new Date("2026-03-10T12:00:00Z");
    const dados: DadosApp = {
      ...dadosIniciais(),
      precoArrobaHoje: { preco: 312.5, data: registrado },
    };
    const voltou = desserializar(serializar(dados)).precoArrobaHoje;

    expect(voltou?.preco).toBe(312.5);
    expect(voltou?.data.getTime()).toBe(registrado.getTime());
  });

  it("backup sem o campo abre com null, não com erro", () => {
    // É o caso do backup do iPhone: o conceito não existia lá.
    const dados = desserializar(BACKUP_DO_IPHONE);
    expect(dados.precoArrobaHoje).toBeNull();
  });

  it("campo corrompido também vira null, em vez de derrubar o backup inteiro", () => {
    const casos = [
      `{"versao":2,"lotes":[],"insumos":[],"precoArrobaHoje":"312,50"}`,
      `{"versao":2,"lotes":[],"insumos":[],"precoArrobaHoje":{"preco":"não é número","data":"2026-03-10T00:00:00Z"}}`,
      `{"versao":2,"lotes":[],"insumos":[],"precoArrobaHoje":{"preco":312.5,"data":"não é data"}}`,
      `{"versao":2,"lotes":[],"insumos":[],"precoArrobaHoje":{"preco":312.5}}`,
    ];
    for (const bruto of casos) {
      expect(desserializar(bruto).precoArrobaHoje).toBeNull();
    }
  });
});
