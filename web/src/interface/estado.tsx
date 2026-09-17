/** O estado compartilhado do aplicativo, ligado ao repositório. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { depositoPadrao } from "../armazenamento/deposito.js";
import { Repositorio } from "../armazenamento/repositorio.js";
import { CATALOGO_PADRAO } from "../nucleo/catalogoInsumos.js";
import type { CicloEncerrado } from "../nucleo/cicloEncerrado.js";
import { dadosIniciais, type DadosApp } from "../nucleo/dadosApp.js";
import { RESTRICOES_PADRAO, type SelecaoInsumos } from "../nucleo/formuladorRacao.js";
import type { Insumo } from "../nucleo/insumo.js";
import { criarLote, dietaAtual, selecaoDaDieta, type Lote } from "../nucleo/lote.js";

const { deposito, persistente } = depositoPadrao();
const repositorio = new Repositorio(deposito);

interface Contexto {
  dados: DadosApp;
  pronto: boolean;
  persistente: boolean;
  erro: string | null;
  loteSelecionado: Lote | undefined;
  selecionarLote: (id: string | null) => void;
  salvarLote: (lote: Lote) => void;
  removerLote: (id: string) => void;
  salvarInsumo: (insumo: Insumo) => void;
  removerInsumo: (id: string) => void;
  restaurarCatalogo: () => void;
  encerrarCiclo: (ciclo: CicloEncerrado) => void;
  removerCiclo: (id: string) => void;
  alternarCalibracao: (usar: boolean) => void;
  exportar: () => string;
  restaurar: (texto: string) => Promise<void>;
  apagarTudo: () => Promise<void>;
  repositorio: Repositorio;
}

const ContextoApp = createContext<Contexto | null>(null);

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosApp>(dadosIniciais());
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void repositorio.carregar().then((carregados) => {
      if (!vivo) return;
      setDados(carregados);
      setErro(repositorio.erro);
      setIdSelecionado(carregados.lotes[0]?.id ?? null);
      setPronto(true);
    });
    const parar = repositorio.aoMudar((novos) => {
      setDados(novos);
      setErro(repositorio.erro);
    });
    return () => {
      vivo = false;
      parar();
    };
  }, []);

  const valor = useMemo<Contexto>(() => {
    const alterar = (mudanca: (d: DadosApp) => DadosApp) => repositorio.alterar(mudanca);

    return {
      dados,
      pronto,
      persistente,
      erro,
      loteSelecionado:
        dados.lotes.find((l) => l.id === idSelecionado) ?? dados.lotes[0] ?? undefined,
      selecionarLote: setIdSelecionado,

      salvarLote: (lote) => {
        alterar((d) => {
          const existe = d.lotes.some((l) => l.id === lote.id);
          return {
            ...d,
            lotes: existe ? d.lotes.map((l) => (l.id === lote.id ? lote : l)) : [...d.lotes, lote],
          };
        });
        setIdSelecionado(lote.id);
      },

      removerLote: (id) => {
        alterar((d) => ({ ...d, lotes: d.lotes.filter((l) => l.id !== id) }));
        setIdSelecionado((atual) => (atual === id ? null : atual));
      },

      salvarInsumo: (insumo) =>
        alterar((d) => {
          const existe = d.insumos.some((i) => i.id === insumo.id);
          return {
            ...d,
            insumos: existe
              ? d.insumos.map((i) => (i.id === insumo.id ? insumo : i))
              : [...d.insumos, insumo],
          };
        }),

      removerInsumo: (id) =>
        alterar((d) => ({ ...d, insumos: d.insumos.filter((i) => i.id !== id) })),

      restaurarCatalogo: () =>
        alterar((d) => ({ ...d, insumos: CATALOGO_PADRAO.map((i) => ({ ...i })) })),

      encerrarCiclo: (ciclo) =>
        alterar((d) => ({
          ...d,
          ciclos: [...d.ciclos, ciclo],
          lotes: d.lotes.filter((l) => l.id !== ciclo.loteID),
        })),

      removerCiclo: (id) => alterar((d) => ({ ...d, ciclos: d.ciclos.filter((c) => c.id !== id) })),

      alternarCalibracao: (usar) => alterar((d) => ({ ...d, usarCalibracao: usar })),

      exportar: () => repositorio.exportar(),
      restaurar: async (texto) => {
        await repositorio.restaurar(texto);
        setIdSelecionado(repositorio.atual().lotes[0]?.id ?? null);
      },
      apagarTudo: async () => {
        await repositorio.apagarTudo();
        setIdSelecionado(null);
      },
      repositorio,
    };
  }, [dados, pronto, erro, idSelecionado]);

  return <ContextoApp.Provider value={valor}>{children}</ContextoApp.Provider>;
}

export function useApp(): Contexto {
  const contexto = useContext(ContextoApp);
  if (!contexto) throw new Error("useApp precisa estar dentro do ProvedorApp");
  return contexto;
}

/** Monta um lote novo já com os alimentos mais comuns escolhidos. */
export function loteNovo(dados: DadosApp): Lote {
  const primeiro = (categoria: Insumo["categoria"]) =>
    dados.insumos.find((i) => i.categoria === categoria)?.id;

  return criarLote({
    nome: `Lote ${dados.lotes.length + 1}`,
    volumosoID: primeiro("volumoso"),
    energeticoID: primeiro("energetico"),
    proteicoID: primeiro("proteico"),
    mineralID: primeiro("mineral"),
    restricoes: { ...RESTRICOES_PADRAO },
  });
}

/**
 * Os alimentos da dieta que vale hoje.
 *
 * Com a segunda etapa ligada, um lote que já passou do peso de virada come a
 * dieta de engorda - então a tela de hoje tem de perguntar pela etapa, e não
 * pelos campos de crescimento do lote.
 */
export function selecaoDoLote(lote: Lote, insumos: readonly Insumo[]): SelecaoInsumos | null {
  return selecaoDaDieta(dietaAtual(lote), insumos);
}
