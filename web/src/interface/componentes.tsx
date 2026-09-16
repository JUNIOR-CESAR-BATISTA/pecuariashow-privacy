/** Peças de interface reaproveitadas pelas telas. */
import type { ReactNode } from "react";

import type { CategoriaInsumo } from "../nucleo/classificacoes.js";
import { IconeMais, IconeSeta } from "./icones.js";

/** As cores por categoria de alimento, iguais às do aplicativo de iPhone. */
export const CORES_CATEGORIA: Record<CategoriaInsumo, string> = {
  volumoso: "text-verdeClaro",
  energetico: "text-laranja",
  proteico: "text-azul",
  mineral: "text-textoSuave",
};

export function TituloSecao({
  texto,
  acao,
  textoAcao,
  aoAgir,
}: {
  texto: string;
  acao?: ReactNode;
  /** Atalho para a pílula "Ver todos →" do aplicativo de iPhone. */
  textoAcao?: string;
  aoAgir?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-bold">
        <span className="h-5 w-1 rounded-full bg-ouro" aria-hidden="true" />
        {texto}
      </h2>
      {acao ??
        (textoAcao && aoAgir ? (
          <button
            onClick={aoAgir}
            className="flex shrink-0 items-center gap-1 rounded-full border border-ouro/45
                       px-3 py-1.5 text-xs font-bold text-ouro transition hover:bg-ouro/10"
          >
            {textoAcao}
            <IconeSeta className="h-3.5 w-3.5" />
          </button>
        ) : null)}
    </div>
  );
}

export function CartaoIndicador({
  titulo,
  valor,
  detalhe,
  cor = "text-texto",
  compacto = false,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  cor?: string;
  /** Para as fileiras de três, onde "5,82 kg" não cabe no tamanho cheio. */
  compacto?: boolean;
}) {
  return (
    <div className={compacto ? "cartao p-3" : "cartao"}>
      <p className="text-xs text-textoSuave">{titulo}</p>
      <p
        className={`mt-1 font-bold tabular-nums ${cor} ${
          compacto ? "whitespace-nowrap text-lg" : "text-xl"
        }`}
      >
        {valor}
      </p>
      {detalhe ? <p className="mt-0.5 text-xs text-textoTenue">{detalhe}</p> : null}
    </div>
  );
}

export function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-textoSuave">{rotulo}</span>
      <span className="text-sm font-semibold tabular-nums">{valor}</span>
    </div>
  );
}

export function Aviso({ texto, tom = "laranja" }: { texto: string; tom?: "laranja" | "vermelho" | "verde" }) {
  const cores = {
    laranja: "border-laranja/60 bg-laranja/10 text-laranja",
    vermelho: "border-vermelho/60 bg-vermelho/10 text-vermelho",
    verde: "border-verdeClaro/60 bg-verdeClaro/10 text-verdeClaro",
  }[tom];
  return <p className={`rounded-xl border px-3 py-2 text-sm ${cores}`}>{texto}</p>;
}

export function EstadoVazio({
  titulo,
  mensagem,
  acao,
}: {
  titulo: string;
  mensagem: string;
  acao?: ReactNode;
}) {
  return (
    <div className="cartao flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-base font-semibold">{titulo}</p>
      <p className="max-w-sm text-sm text-textoSuave">{mensagem}</p>
      {acao}
    </div>
  );
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  sufixo,
  passo = 1,
  tipo = "number",
}: {
  rotulo: string;
  valor: string | number;
  aoMudar: (valor: string) => void;
  sufixo?: string;
  passo?: number;
  tipo?: "number" | "text" | "date";
}) {
  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <div className="relative">
        <input
          className="campo"
          type={tipo}
          step={tipo === "number" ? passo : undefined}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
        {sufixo ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-textoTenue">
            {sufixo}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function Selecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: readonly { valor: T; texto: string }[];
  aoMudar: (valor: T) => void;
}) {
  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <select className="campo" value={valor} onChange={(e) => aoMudar(e.target.value as T)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-superficieAlta">
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Barra de proporção, usada para volumoso contra concentrado. */
export function Barra({ fracao, cor = "bg-verdeClaro" }: { fracao: number; cor?: string }) {
  const largura = Math.max(0, Math.min(1, fracao)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-superficieAlta">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

// ------------------------------------------- Peças copiadas do Tema do iPhone

/** Pílula de ação com borda dourada, das "Ações rápidas". */
export function Chip({
  texto,
  icone,
  aoTocar,
}: {
  texto: string;
  icone?: ReactNode;
  aoTocar: () => void;
}) {
  return (
    <button
      onClick={aoTocar}
      className="flex shrink-0 items-center gap-2 rounded-full border border-ouro/55 bg-ouro/[0.08]
                 px-4 py-2.5 text-sm font-semibold text-ouro transition active:scale-[0.98]
                 hover:bg-ouro/15"
    >
      {icone}
      {texto}
    </button>
  );
}

/** Botão redondo do cabeçalho. */
export function BotaoCircular({
  rotulo,
  icone,
  aoTocar,
}: {
  rotulo: string;
  icone: ReactNode;
  aoTocar: () => void;
}) {
  return (
    <button
      aria-label={rotulo}
      onClick={aoTocar}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border
                 border-ouro/50 bg-superficie text-ouro transition active:scale-95 hover:bg-superficieAlta"
    >
      {icone}
    </button>
  );
}

/** Bloco quadrado de categoria com emoji. */
export function CartaoCategoria({
  emoji,
  titulo,
  aoTocar,
}: {
  emoji: string;
  titulo: string;
  aoTocar: () => void;
}) {
  return (
    <button
      onClick={aoTocar}
      className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-superficie
                 py-4 transition active:scale-[0.98] hover:border-ouro/40"
    >
      <span className="text-[30px] leading-none">{emoji}</span>
      <span className="text-xs font-bold">{titulo}</span>
    </button>
  );
}

/** Linha de atalho com ícone dourado, título e descrição. */
export function LinhaAtalho({
  icone,
  titulo,
  detalhe,
  aoTocar,
}: {
  icone: ReactNode;
  titulo: string;
  detalhe: string;
  aoTocar: () => void;
}) {
  return (
    <button
      onClick={aoTocar}
      className="flex w-full items-center gap-3 rounded-2xl border border-borda bg-superficie
                 p-3 text-left transition active:scale-[0.99] hover:border-ouro/40"
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-ouro/[0.12] text-ouro">
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block truncate text-xs text-textoSuave">{detalhe}</span>
      </span>
      <span className="shrink-0 text-textoTenue" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

/** Número pequeno com rótulo, usado dentro de cartões. */
export function MiniIndicador({
  titulo,
  valor,
  cor = "text-ouro",
}: {
  titulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[11px] text-textoSuave">{titulo}</p>
      <p className={`truncate text-sm font-bold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}

/** Etiqueta discreta, como a da fase no cartão em destaque. */
export function Etiqueta({ texto }: { texto: string }) {
  return (
    <span className="shrink-0 rounded-full border border-ouroEscuro bg-ouro/10 px-2.5 py-0.5 text-[11px] font-semibold text-ouro">
      {texto}
    </span>
  );
}

/** Botão flutuante de ação principal, com o rótulo embaixo. */
export function BotaoFlutuante({ titulo, aoTocar }: { titulo: string; aoTocar: () => void }) {
  return (
    <button
      onClick={aoTocar}
      className="flex flex-col items-center gap-1.5 transition active:scale-95"
      aria-label={titulo}
    >
      <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-verde text-white shadow-lg shadow-black/35">
        <IconeMais className="h-7 w-7" />
      </span>
      <span className="text-xs font-bold text-ouro">{titulo}</span>
    </button>
  );
}
