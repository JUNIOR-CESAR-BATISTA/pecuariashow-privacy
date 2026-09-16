/** A casca do aplicativo: barra de abas embaixo e a tela ativa em cima. */
import { useState } from "react";

import { useApp } from "./estado.js";
import { TelaAbate, TelaInicio, TelaRacao } from "./telasPrincipais.js";
import { TelaAnalise, TelaDados, TelaInsumos, TelaRebanho } from "./telasGestao.js";

const ABAS = [
  { id: "inicio", nome: "Início" },
  { id: "rebanho", nome: "Rebanho" },
  { id: "racao", nome: "Ração" },
  { id: "abate", nome: "Abate" },
  { id: "insumos", nome: "Insumos" },
  { id: "analise", nome: "Análise" },
  { id: "dados", nome: "Dados" },
] as const;

export function App() {
  const { pronto, loteSelecionado, dados, selecionarLote } = useApp();
  const [aba, setAba] = useState<string>("inicio");

  if (!pronto) {
    return (
      <div className="flex h-full items-center justify-center text-textoSuave">
        Abrindo seus dados…
      </div>
    );
  }

  const tela = () => {
    switch (aba) {
      case "rebanho":
        return <TelaRebanho />;
      case "racao":
        return <TelaRacao irPara={setAba} />;
      case "abate":
        return <TelaAbate irPara={setAba} />;
      case "insumos":
        return <TelaInsumos />;
      case "analise":
        return <TelaAnalise />;
      case "dados":
        return <TelaDados />;
      default:
        return <TelaInicio irPara={setAba} />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* O seletor de lote fica no topo porque todas as telas de consulta
          falam do lote ativo; sem ele o usuário teria de voltar ao Rebanho. */}
      {dados.lotes.length > 1 ? (
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
      ) : null}

      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-5">{tela()}</main>

      <nav
        className="flex shrink-0 gap-0.5 border-t border-borda bg-fundo px-1 pt-1.5"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              aria-current={ativa ? "page" : undefined}
              className={`flex-1 rounded-lg px-0.5 py-1.5 text-[10px] font-semibold transition ${
                ativa ? "bg-ouro/15 text-ouro" : "text-textoTenue hover:text-textoSuave"
              }`}
            >
              {a.nome}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
