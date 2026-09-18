/** Peças de interface reaproveitadas pelas telas. */
import { useState, type ReactNode } from "react";

import type { CategoriaInsumo } from "../nucleo/classificacoes.js";
import { IconeMais, IconeSeta } from "./icones.js";

/** As cores por categoria de alimento, iguais às do aplicativo de iPhone. */
export const CORES_CATEGORIA: Record<CategoriaInsumo, string> = {
  volumoso: "text-verdeClaro",
  energetico: "text-laranja",
  proteico: "text-azul",
  mineral: "text-textoSuave",
};

/** As mesmas cores de CORES_CATEGORIA, para pontos e marcas. */
export const CORES_FUNDO_CATEGORIA: Record<CategoriaInsumo, string> = {
  volumoso: "bg-verdeClaro",
  energetico: "bg-laranja",
  proteico: "bg-azul",
  mineral: "bg-textoSuave",
};

export function TituloSecao({
  texto,
  acao,
  textoAcao,
  aoAgir,
}: {
  texto: string;
  acao?: ReactNode;
  /** Atalho para o "Ver todos" do painel inicial. */
  textoAcao?: string;
  aoAgir?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="rotulo-secao shrink-0">{texto}</h2>
      {/* O fio ocupa o espaço que sobra: separa sem pesar, e é ele que faz o
          título parecer uma seção em vez de mais uma linha de texto. */}
      <span className="fio min-w-4 flex-1" aria-hidden="true" />
      {acao ??
        (textoAcao && aoAgir ? (
          <button
            onClick={aoAgir}
            className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase
                       tracking-rotulo text-ouro transition hover:text-ouroClaro"
          >
            {textoAcao}
            <IconeSeta className="h-3 w-3" />
          </button>
        ) : null)}
    </div>
  );
}

/**
 * O tamanho cede antes de estourar a borda.
 *
 * "5,82 kg" e "68,6%" nascem pensados para o tamanho cheio, mas um total em
 * reais - a compra de um lote, e mais ainda a soma de vários - pode chegar a
 * "-R$ 398.560,00". Nesse comprimento o texto não cabe lado a lado com outro
 * cartão, e o espaço não-quebrável do `Intl.NumberFormat` entre "R$" e o
 * número não deixa a linha quebrar sozinha para salvar a situação.
 */
function tamanhoIndicador(compacto: boolean, valor: string): string {
  const [cheio, meio, minimo] = compacto
    ? ["text-[22px]", "text-[18px]", "text-[15px]"]
    : ["text-[26px]", "text-[21px]", "text-[17px]"];
  if (valor.length > 13) return minimo;
  if (valor.length > 9) return meio;
  return cheio;
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
    <div className={compacto ? "cartao p-4" : "cartao"}>
      <p className="rotulo-secao text-[10px]">{titulo}</p>
      <p
        className={`mt-2 truncate font-display leading-none tabular-nums ${cor} ${
          compacto ? "whitespace-nowrap" : ""
        } ${tamanhoIndicador(compacto, valor)}`}
      >
        {valor}
      </p>
      {detalhe ? <p className="mt-2 text-xs text-textoTenue">{detalhe}</p> : null}
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

/** Como o número guardado aparece no campo: 0,75 e não 0.75. */
function comoTexto(valor: string | number): string {
  if (typeof valor !== "number") return valor;
  return Number.isFinite(valor) ? String(valor).replace(".", ",") : "";
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  sufixo,
  tipo = "number",
}: {
  rotulo: string;
  valor: string | number;
  aoMudar: (valor: string) => void;
  sufixo?: string;
  tipo?: "number" | "text" | "date";
}) {
  const numerico = tipo === "number";

  /**
   * O que está sendo digitado, enquanto está sendo digitado.
   *
   * Sem isto o campo não deixava apagar o zero: apagar mandava "" para cima,
   * "" virava 0 na leitura, e o 0 voltava para a tela no mesmo instante.
   * Digitar por cima dava "0300". Guardando o texto do usuário até ele sair
   * do campo, o que ele escreveu é o que ele vê; ao sair, o campo volta a
   * mostrar o valor já arrumado.
   */
  const [rascunho, setRascunho] = useState<string | null>(null);
  const exibido = rascunho ?? comoTexto(valor);

  const digitar = (bruto: string) => {
    if (!numerico) {
      aoMudar(bruto);
      return;
    }
    // Só o que pode fazer parte de um número. A tesoura aqui é o que permite
    // usar type="text": sem ela entraria qualquer letra.
    const limpo = bruto.replace(/[^\d.,-]/g, "");
    setRascunho(limpo);
    aoMudar(limpo);
  };

  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <div className="relative">
        <input
          className="campo"
          /*
           * Numérico vai como texto de propósito. Com type="number" o
           * navegador descarta a vírgula sem avisar, e "0,750" chegava aqui
           * como "0750": a meta de ganho virava 750 kg por dia. O
           * inputMode mantém o teclado numérico no celular.
           */
          type={numerico ? "text" : tipo}
          inputMode={numerico ? "decimal" : undefined}
          value={exibido}
          onChange={(e) => digitar(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setRascunho(null)}
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

/**
 * Pílula de ação.
 *
 * O contorno dourado saiu. Cinco pílulas douradas em fila faziam o ouro
 * deixar de ser destaque e virar cor de fundo; agora ele fica só no ícone.
 */
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
      className="flex shrink-0 items-center gap-2 rounded-full border border-realce
                 bg-superficie px-4 py-2.5 text-[13px] font-medium text-texto transition
                 active:scale-[0.98] hover:border-ouro/25"
    >
      <span className="text-ouro">{icone}</span>
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
                 border-realce bg-superficie text-ouro transition active:scale-95
                 hover:border-ouro/25"
    >
      {icone}
    </button>
  );
}

/**
 * Bloco de categoria.
 *
 * Antes era emoji. Emoji é desenhado pelo sistema, muda de aparelho para
 * aparelho e vem em cores que não são as daqui - o boi do Android é malhado,
 * e o nosso gado é nelore. Ícone de traço em dourado fica sob nosso controle
 * e combina com o resto.
 */
export function CartaoCategoria({
  icone,
  titulo,
  aoTocar,
}: {
  icone: ReactNode;
  titulo: string;
  aoTocar: () => void;
}) {
  return (
    <button
      onClick={aoTocar}
      className="cartao flex flex-col items-center gap-3 px-1 py-4 transition
                 active:scale-[0.97] hover:border-ouro/25"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full border border-ouro/20
                   bg-ouro/[0.07] text-ouro"
        aria-hidden="true"
      >
        {icone}
      </span>
      <span className="text-[11px] font-medium tracking-wide text-textoSuave">{titulo}</span>
    </button>
  );
}

/** Linha de atalho: uma lista com fios, não três caixas empilhadas. */
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
      className="flex w-full items-center gap-4 py-3.5 text-left transition active:opacity-70"
    >
      <span className="shrink-0 text-ouro">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-texto">{titulo}</span>
        <span className="mt-0.5 block truncate text-xs text-textoTenue">{detalhe}</span>
      </span>
      <IconeSeta className="h-3.5 w-3.5 shrink-0 text-textoTenue" />
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
      <p className="rotulo-secao text-[9px] text-textoTenue">{titulo}</p>
      <p className={`mt-1.5 truncate font-display text-lg leading-none tabular-nums ${cor}`}>
        {valor}
      </p>
    </div>
  );
}

/** Etiqueta discreta, como a da fase no cartão em destaque. */
export function Etiqueta({ texto }: { texto: string }) {
  return (
    <span className="shrink-0 rounded-full border border-ouro/25 px-3 py-1 text-[11px] font-medium tracking-wide text-ouro">
      {texto}
    </span>
  );
}

/**
 * Botão flutuante de ação principal.
 *
 * Sem o rótulo embaixo: um "+" já diz o que faz, e o texto solto sobre o
 * conteúdo que rola sujava a tela. O nome fica no `aria-label`, para quem usa
 * leitor de tela.
 */
export function BotaoFlutuante({ titulo, aoTocar }: { titulo: string; aoTocar: () => void }) {
  return (
    <button
      onClick={aoTocar}
      aria-label={titulo}
      title={titulo}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-verde text-white
                 ring-1 ring-ouro/25 transition active:scale-95"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
    >
      <IconeMais className="h-6 w-6" />
    </button>
  );
}
