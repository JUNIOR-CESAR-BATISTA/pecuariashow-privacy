/** A casca do aplicativo: barra de abas embaixo e a tela ativa em cima. */
import { useState, type ReactNode } from "react";

import { useApp } from "./estado.js";
import {
  IconeBarras,
  IconeCasa,
  IconeCaixa,
  IconeDocumento,
  IconeLista,
  IconePizza,
} from "./icones.js";
import { TelaAbate, TelaInicio, TelaRacao } from "./telasPrincipais.js";
import { TelaAnalise, TelaDados, TelaInsumos, TelaRebanho } from "./telasGestao.js";
import { TelaConversor, TelaMetodologia } from "./telasExtras.js";

const ABAS = [
  { id: "inicio", nome: "Início", Icone: IconeCasa },
  { id: "rebanho", nome: "Rebanho", Icone: IconeLista },
  { id: "racao", nome: "Ração", Icone: IconePizza },
  { id: "abate", nome: "Abate", Icone: IconeDocumento },
  { id: "insumos", nome: "Insumos", Icone: IconeCaixa },
  { id: "analise", nome: "Análise", Icone: IconeBarras },
] as const;

/**
 * Telas que não são abas: no iPhone elas entram empilhadas por cima, vindas
 * do cabeçalho ou dos atalhos. Aqui cobrem a área de conteúdo e voltam pelo
 * botão da esquerda.
 */
const SOBREPOSICOES: Record<string, () => ReactNode> = {
  dados: () => <TelaDados />,
  metodologia: () => <TelaMetodologia />,
  conversor: () => <TelaConversor />,
};

/** Abas onde o lote em uso muda o que aparece, e vale poder trocar de lote. */
const ABAS_COM_LOTE = new Set(["racao", "abate"]);

export function App() {
  const { pronto, loteSelecionado, dados, selecionarLote } = useApp();
  const [aba, setAba] = useState<string>("inicio");
  const [sobreposicao, setSobreposicao] = useState<string | null>(null);
  const [pedirNovoLote, setPedirNovoLote] = useState(false);

  if (!pronto) {
    return (
      <div className="flex h-full items-center justify-center text-textoSuave">
        Abrindo seus dados…
      </div>
    );
  }

  /** Um destino só para todas as telas, seja aba, sobreposição ou cadastro. */
  const irPara = (destino: string) => {
    if (destino in SOBREPOSICOES) {
      setSobreposicao(destino);
      return;
    }
    setSobreposicao(null);
    if (destino === "novo-lote") {
      setPedirNovoLote(true);
      setAba("rebanho");
      return;
    }
    setAba(destino);
  };

  const tela = () => {
    switch (aba) {
      case "rebanho":
        return (
          <TelaRebanho abrirNovo={pedirNovoLote} aoAbrirNovo={() => setPedirNovoLote(false)} />
        );
      case "racao":
        return <TelaRacao irPara={irPara} />;
      case "abate":
        return <TelaAbate irPara={irPara} />;
      case "insumos":
        return <TelaInsumos />;
      case "analise":
        return <TelaAnalise />;
      default:
        return <TelaInicio irPara={irPara} />;
    }
  };

  const aberta = sobreposicao ? SOBREPOSICOES[sobreposicao] : undefined;

  return (
    <div className="flex h-full flex-col">
      {aberta ? (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-borda bg-fundo px-2 py-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
        >
          {/* Só o botão: cada tela já traz o próprio título logo abaixo. */}
          <button
            onClick={() => setSobreposicao(null)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ouro transition hover:bg-ouro/10"
          >
            ‹ Voltar
          </button>
        </div>
      ) : dados.lotes.length > 1 && ABAS_COM_LOTE.has(aba) ? (
        <div
          className="border-b border-borda bg-fundo px-4 py-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
        >
          <select
            aria-label="Lote em uso"
            className="w-full rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm"
            value={loteSelecionado?.id ?? ""}
            onChange={(e) => selecionarLote(e.target.value)}
          >
            {dados.lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      ) : (
        // Sem barra no topo, o conteúdo passaria por baixo do relógio.
        <div className="shrink-0 bg-fundo" style={{ height: "env(safe-area-inset-top, 0px)" }} />
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
        {aberta ? aberta() : tela()}
      </main>

      <nav
        className="flex shrink-0 border-t border-borda bg-superficie px-0.5 pt-2.5"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {ABAS.map(({ id, nome, Icone }) => {
          const ativa = id === aba && !sobreposicao;
          return (
            <button
              key={id}
              onClick={() => irPara(id)}
              aria-current={ativa ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-0.5"
            >
              <span
                className={`flex h-[30px] w-[42px] items-center justify-center rounded-[11px] transition ${
                  ativa ? "bg-ouro text-fundo" : "text-textoSuave"
                }`}
              >
                <Icone className="h-4 w-4" />
              </span>
              <span
                className={`text-[10px] leading-none ${
                  ativa ? "font-bold text-ouro" : "font-medium text-textoSuave"
                }`}
              >
                {nome}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
