/** Peças de interface reaproveitadas pelas telas. */
import type { ReactNode } from "react";

import type { CategoriaInsumo } from "../nucleo/classificacoes.js";

/** As cores por categoria de alimento, iguais às do aplicativo de iPhone. */
export const CORES_CATEGORIA: Record<CategoriaInsumo, string> = {
  volumoso: "text-verdeClaro",
  energetico: "text-laranja",
  proteico: "text-azul",
  mineral: "text-textoSuave",
};

export function TituloSecao({ texto, acao }: { texto: string; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="h-4 w-1 rounded-full bg-ouro" aria-hidden="true" />
        {texto}
      </h2>
      {acao}
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
