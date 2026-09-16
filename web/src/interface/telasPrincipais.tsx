/** Telas de consulta: Início, Ração e Abate. */
import { useMemo, useState } from "react";

import { FASES, MODOS_COMPRA } from "../nucleo/classificacoes.js";
import { descricao as descricaoSacas, descricaoCompra } from "../nucleo/conversorSacas.js";
import {
  arroba,
  data as formatarData,
  duracao,
  gramas,
  kg as formatarKg,
  moeda,
  numero,
  percentual,
} from "../nucleo/formatadores.js";
import {
  balancoNDT,
  balancoProteina,
  consumoMateriaSeca,
  custoDiario,
  formular,
  itemMateriaNatural,
  ndtFornecidoKg,
  ndtPercentual,
  NOME_STATUS,
  participacaoMS,
  percentualVolumoso,
  proteinaFornecidaKg,
  proteinaPercentual,
  type ComposicaoRacao,
} from "../nucleo/formuladorRacao.js";
import { converterPelaEmbalagem } from "../nucleo/conversorSacas.js";
import { ganhoRestante, perfilAtual, pesoAtual, type Lote } from "../nucleo/lote.js";
import { calcular } from "../nucleo/motorExigencias.js";
import {
  arrobasProduzidasPorAnimal,
  compraTotal,
  consumoConversao,
  conversaoAlimentar,
  custoPorArroba,
  custoTotal,
  ganhoTotalLote,
  investimentoTotal,
  lucroPorAnimal,
  lucroPorArrobaProduzida,
  lucroTotal,
  margemDaEngorda,
  margemSobreReceita,
  precoArrobaEquilibrio,
  projetar,
  receitaTotal,
  retornoSobreInvestimento,
  temPrecos,
  viavel,
  type RelatorioPlanejamento,
} from "../nucleo/planejadorAbate.js";
import { gerar as gerarTexto } from "../nucleo/relatorioTexto.js";
import {
  Aviso,
  Barra,
  BotaoCircular,
  CartaoCategoria,
  CartaoIndicador,
  Chip,
  CORES_CATEGORIA,
  CORES_CATEGORIA_CREME,
  Etiqueta,
  EstadoVazio,
  LinhaAtalho,
  LinhaDado,
  MiniIndicador,
  TituloSecao,
} from "./componentes.js";
import {
  IconeBarras,
  IconeCaixa,
  IconeDocumento,
  IconeEscudo,
  IconeFuncao,
  IconeLista,
  IconeMais,
  IconePizza,
  IconeTendencia,
  IconeTroca,
} from "./icones.js";
import { selecaoDoLote, useApp } from "./estado.js";

function SemLote({ ir }: { ir: () => void }) {
  return (
    <EstadoVazio
      titulo="Nenhum lote cadastrado"
      mensagem="Cadastre o primeiro lote com o peso médio das novilhas e a meta de ganho. O resto o aplicativo calcula."
      acao={
        <button className="botao-ouro" onClick={ir}>
          Cadastrar lote
        </button>
      }
    />
  );
}

/** Exigência diária e ração do lote selecionado, calculadas uma vez só. */
function useCalculo(lote: Lote | undefined) {
  const { dados } = useApp();
  return useMemo(() => {
    if (!lote) return null;
    const exigencia = calcular(perfilAtual(lote), lote.ganhoMetaDiario);
    const selecao = selecaoDoLote(lote, dados.insumos);
    const racao = selecao ? formular(exigencia, selecao, lote.restricoes) : null;
    const relatorio = selecao ? projetar(lote, selecao) : null;
    return { exigencia, selecao, racao, relatorio };
  }, [lote, dados.insumos]);
}

// ------------------------------------------------------------------- Início

/** "Bom dia", "Boa tarde" ou "Boa noite". */
function saudacao(agora = new Date()): string {
  const hora = agora.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * A capa: a fotografia do rebanho com o lote ativo escrito por cima.
 *
 * A imagem sai da margem dos dois lados e é coberta por um véu em degradê,
 * fechado no alto e embaixo. Sem o véu o nome do lote brigava com o capim, e
 * o degradê é o que deixa o texto sempre sobre a parte escura da foto.
 */
function Capa({
  lote,
  irPara,
}: {
  lote: Lote | undefined;
  irPara: (destino: string) => void;
}) {
  return (
    <div className="relative -mx-5 -mt-6 h-[264px] overflow-hidden">
      <img
        src="/pecuariashow-privacy/capa.webp"
        alt=""
        aria-hidden="true"
        className="h-full w-full select-none object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,20,15,.86) 0%, rgba(11,20,15,.30) 34%, rgba(11,20,15,.86) 72%, #0B140F 100%)",
        }}
      />
      {/* Fio dourado fechando a capa, que é o que a liga ao resto da tela. */}
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(228,192,83,.55) 30%, rgba(228,192,83,.15) 70%, transparent)",
        }}
      />

      <header className="absolute inset-x-0 top-0 flex items-center gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="rotulo-secao text-[10px] text-[#C7D3CA]">{saudacao()}</p>
          <h1 className="metal mt-1 whitespace-nowrap font-display text-[25px] leading-none">
            NovilhaNutri
          </h1>
        </div>
        <BotaoCircular
          rotulo="Análise"
          icone={<IconeTendencia className="h-[18px] w-[18px]" />}
          aoTocar={() => irPara("analise")}
        />
        <BotaoCircular
          rotulo="Dados"
          icone={<IconeEscudo className="h-[18px] w-[18px]" />}
          aoTocar={() => irPara("dados")}
        />
      </header>

      {lote ? (
        <div className="absolute inset-x-0 bottom-12 px-5">
          <p className="rotulo-secao flex items-center gap-2 text-[10px] text-[#9FD9BB]">
            <span className="h-1.5 w-1.5 rounded-full bg-verdeClaro" aria-hidden="true" />
            Lote ativo
          </p>
          <p
            className="mt-2 truncate font-display text-[30px] leading-tight"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,.65)" }}
          >
            {lote.nome}
          </p>
          <p className="mt-1 truncate text-xs text-[#C7D3CA]">
            {lote.quantidadeAnimais} novilhas · {FASES[lote.fase].nome} ·{" "}
            {numero(lote.ganhoMetaDiario, 3)} kg/d
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A faixa das três exigências, flutuando sobre a borda da capa. */
function FaixaExigencias({ exigencia }: { exigencia: ReturnType<typeof calcular> }) {
  const celula = "flex-1 border-r border-realce px-2 py-4 text-center last:border-r-0";
  return (
    <div
      className="relative z-10 -mt-8 flex overflow-hidden rounded-[20px] border border-realce"
      style={{
        backgroundImage: "linear-gradient(170deg,#1A2820 0%,#0E1813 100%)",
        boxShadow: "0 24px 46px -22px rgba(0,0,0,.95)",
      }}
    >
      <div className={celula}>
        <p className="rotulo-secao text-[9px]">PB</p>
        <p className="mt-2 font-display text-lg leading-none tabular-nums text-azul">
          {gramas(exigencia.proteinaBrutaGramas)}
        </p>
      </div>
      <div className={celula}>
        <p className="rotulo-secao text-[9px]">NDT</p>
        <p className="metal mt-2 font-display text-lg leading-none tabular-nums">
          {formatarKg(exigencia.ndtKg)}
        </p>
      </div>
      <div className={celula}>
        <p className="rotulo-secao text-[9px]">Mat. seca</p>
        <p className="mt-2 font-display text-lg leading-none tabular-nums text-verdeClaro">
          {formatarKg(exigencia.consumoMateriaSeca)}
        </p>
      </div>
    </div>
  );
}

/**
 * A régua do caminho até o abate.
 *
 * Nove pixels de altura, com sulco e escala embaixo. O fio fino de antes
 * sumia da tela no primeiro dia do lote, quando o preenchimento é zero - e
 * uma régua que desaparece justo no começo não serve de régua.
 */
function ReguaAbate({
  lote,
  relatorio,
}: {
  lote: Lote;
  relatorio: RelatorioPlanejamento | null;
}) {
  const inicio = lote.pesoMedioInicial;
  const alvo = lote.pesoAlvoAbate;
  const total = alvo - inicio;
  const fracao = total > 0 ? Math.min(Math.max((pesoAtual(lote) - inicio) / total, 0), 1) : 1;
  const temPrazo = relatorio !== null && viavel(relatorio);

  return (
    <div className="mt-7">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[22px] leading-none tabular-nums">
          {numero(pesoAtual(lote), 0)} kg
        </span>
        <span className="text-xs text-textoTenue">
          de {numero(inicio, 0)} a {numero(alvo, 0)} kg
        </span>
        <span className="metal ml-auto font-display text-sm tabular-nums">
          {percentual(fracao * 100, 0)}
        </span>
      </div>

      <div
        className="relative mt-3 h-[9px] overflow-hidden rounded-full bg-white/[0.07]"
        style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.04)" }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" aria-hidden="true" />
        <div
          className="relative h-full rounded-full"
          style={{
            width: `max(6px, ${fracao * 100}%)`,
            backgroundImage: "linear-gradient(90deg,#8A6B1F 0%,#E4C053 55%,#F7E6A8 100%)",
            boxShadow: "0 0 12px rgba(228,192,83,.35)",
          }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-textoTenue">
        <span>{numero(inicio, 0)} kg</span>
        <span>{numero(inicio + total / 2, 0)} kg</span>
        <span>{numero(alvo, 0)} kg</span>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-textoTenue">{temPrazo ? "Abate previsto" : "Falta ganhar"}</span>
        <span className="tabular-nums text-textoSuave">
          {temPrazo
            ? `${formatarData(relatorio.dataAbate)} · ${numero(relatorio.diasTotais, 0)} dias`
            : `${numero(ganhoRestante(lote), 0)} kg`}
        </span>
      </div>
    </div>
  );
}

/**
 * O que vai no cocho hoje, por animal.
 *
 * É o único cartão claro da tela, de propósito: é a informação que se lê de
 * manhã, no curral, com sol na tela - e creme com verde profundo tem muito
 * mais contraste ao sol que texto claro sobre fundo escuro. De quebra, sendo
 * a única peça clara, ela vira o destaque do painel sem precisar de ouro.
 */
function CochoHoje({
  racao,
  animais,
  aoTocar,
}: {
  racao: ComposicaoRacao;
  animais: number;
  aoTocar: () => void;
}) {
  return (
    <section className="space-y-4">
      <TituloSecao texto="No cocho hoje" textoAcao="Ver ração" aoAgir={aoTocar} />
      <div className="cartao-creme">
        {racao.itens.map((item, indice) => {
          const porAnimal = itemMateriaNatural(item);
          return (
            <div
              key={item.insumo.id}
              className={`py-4 ${indice > 0 ? "border-t border-cremeFio" : ""}`}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${CORES_CATEGORIA_CREME[item.insumo.categoria]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-cremeTexto">
                  {item.insumo.nome}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[17px] leading-none tabular-nums text-cremeTexto">
                    {formatarKg(porAnimal)}
                  </span>
                  <span className="mt-1 block text-[11px] tabular-nums text-cremeSuave">
                    {numero(porAnimal * animais, 0)} kg no lote
                  </span>
                </span>
              </div>
              <div className="ml-[17px] mt-2.5 h-[3px] overflow-hidden rounded-full bg-cremeTexto/[0.09]">
                <div
                  className={`h-full rounded-full ${CORES_CATEGORIA_CREME[item.insumo.categoria]} opacity-90`}
                  style={{ width: `max(3px, ${participacaoMS(racao, item)}%)` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TelaInicio({ irPara }: { irPara: (aba: string) => void }) {
  const { loteSelecionado } = useApp();
  const calculo = useCalculo(loteSelecionado);
  const lote = loteSelecionado;

  return (
    <div className="pb-4">
      <Capa lote={lote} irPara={irPara} />

      {lote && calculo ? (
        <div className="entra">
          <FaixaExigencias exigencia={calculo.exigencia} />
          <ReguaAbate lote={lote} relatorio={calculo.relatorio} />
        </div>
      ) : (
        <div className="mt-8">
          <EstadoVazio
            titulo="Nenhum lote por aqui ainda"
            mensagem="Cadastre o primeiro lote de novilhas e o aplicativo calcula PB, NDT e a ração diária."
            acao={
              <button className="botao-ouro" onClick={() => irPara("novo-lote")}>
                Cadastrar lote
              </button>
            }
          />
        </div>
      )}

      {lote && calculo?.racao ? (
        <div className="entra mt-9" style={{ animationDelay: "90ms" }}>
          <CochoHoje
            racao={calculo.racao}
            animais={lote.quantidadeAnimais}
            aoTocar={() => irPara("racao")}
          />
        </div>
      ) : null}

      <section className="entra mt-9 space-y-1" style={{ animationDelay: "150ms" }}>
        <TituloSecao texto="Atalhos" />
        <div className="divide-y divide-realce">
          <LinhaAtalho
            icone={<IconeMais className="h-[18px] w-[18px]" />}
            titulo="Novo lote"
            detalhe="Cadastrar outro lote de novilhas"
            aoTocar={() => irPara("novo-lote")}
          />
          <LinhaAtalho
            icone={<IconeTroca className="h-[18px] w-[18px]" />}
            titulo="Conversor de quilos e sacas"
            detalhe="60, 50, 40, 30, 25 e 20 kg"
            aoTocar={() => irPara("conversor")}
          />
          <LinhaAtalho
            icone={<IconeFuncao className="h-[18px] w-[18px]" />}
            titulo="Como os cálculos são feitos"
            detalhe="Equações de PB, NDT e formulação"
            aoTocar={() => irPara("metodologia")}
          />
          <LinhaAtalho
            icone={<IconeEscudo className="h-[18px] w-[18px]" />}
            titulo="Dados e privacidade"
            detalhe="Tudo gravado só neste aparelho"
            aoTocar={() => irPara("dados")}
          />
        </div>
      </section>
    </div>
  );
}

// -------------------------------------------------------------------- Ração

export function TelaRacao({ irPara }: { irPara: (aba: string) => void }) {
  const { loteSelecionado } = useApp();
  const calculo = useCalculo(loteSelecionado);

  if (!loteSelecionado || !calculo) return <SemLote ir={() => irPara("rebanho")} />;

  if (!calculo.racao) {
    return (
      <EstadoVazio
        titulo="Faltam alimentos no lote"
        mensagem="Escolha um volumoso, um energético e um proteico no cadastro do lote para o aplicativo montar a ração."
        acao={
          <button className="botao-ouro" onClick={() => irPara("rebanho")}>
            Abrir o lote
          </button>
        }
      />
    );
  }

  const racao = calculo.racao;
  const ms = consumoMateriaSeca(racao);
  const animais = loteSelecionado.quantidadeAnimais;

  return (
    <div className="space-y-6">
      <header>
        <p className="rotulo-secao text-ouroEscuro">Ração diária</p>
        <h1 className="mt-2 font-display text-[26px] leading-tight text-texto">{loteSelecionado.nome}</h1>
        <p className="mt-1.5 text-sm text-textoSuave">
          Por animal e por dia · {NOME_STATUS[racao.status]}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <CartaoIndicador titulo="Matéria seca" valor={formatarKg(ms)} cor="text-verdeClaro" />
        <CartaoIndicador
          titulo="Custo por animal"
          valor={moeda(custoDiario(racao))}
          detalhe={`${moeda(custoDiario(racao) * animais)} no lote`}
        />
        <CartaoIndicador
          titulo="PB da dieta"
          valor={percentual(proteinaPercentual(racao))}
          detalhe={`${gramas(proteinaFornecidaKg(racao) * 1000)} fornecidos`}
          cor="text-azul"
        />
        <CartaoIndicador
          titulo="NDT da dieta"
          valor={percentual(ndtPercentual(racao))}
          detalhe={`${formatarKg(ndtFornecidoKg(racao))} fornecidos`}
          cor="text-ouro"
        />
      </div>

      <div className="cartao space-y-4">
        <TituloSecao texto="No cocho" />
        {racao.itens.map((item) => {
          const mn = itemMateriaNatural(item);
          const conversao = converterPelaEmbalagem(mn * animais, item.insumo.embalagem);
          return (
            <div key={item.insumo.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-sm font-semibold ${CORES_CATEGORIA[item.insumo.categoria]}`}>
                  {item.insumo.nome}
                </span>
                <span className="text-sm font-bold tabular-nums">{formatarKg(mn)}</span>
              </div>
              <Barra fracao={participacaoMS(racao, item) / 100} cor="bg-ouroEscuro" />
              <p className="text-xs text-textoTenue">
                {percentual(participacaoMS(racao, item))} da matéria seca ·{" "}
                {formatarKg(mn * animais)} para o lote
                {conversao ? ` · ${descricaoSacas(conversao)}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="cartao">
        <TituloSecao texto="Proporção" />
        <div className="mt-3 space-y-2">
          <Barra fracao={percentualVolumoso(racao) / 100} />
          <div className="flex justify-between text-xs text-textoSuave">
            <span>{percentual(percentualVolumoso(racao))} volumoso</span>
            <span>{percentual(100 - percentualVolumoso(racao))} concentrado e mineral</span>
          </div>
        </div>
        <div className="mt-3 border-t border-borda pt-2">
          <LinhaDado
            rotulo="Balanço de PB"
            valor={`${balancoProteina(racao) >= 0 ? "+" : ""}${gramas(balancoProteina(racao) * 1000)}`}
          />
          <LinhaDado
            rotulo="Balanço de NDT"
            valor={`${balancoNDT(racao) >= 0 ? "+" : ""}${formatarKg(balancoNDT(racao))}`}
          />
        </div>
      </div>

      {[...calculo.exigencia.alertas, ...racao.alertas].map((a) => (
        <Aviso key={a} texto={a} />
      ))}
    </div>
  );
}

// -------------------------------------------------------------------- Abate

/**
 * Previsão de resultado do ciclo: compra, dieta e venda.
 *
 * Fica junto do planejamento porque depende dele - é a projeção que responde
 * se o lote fecha no azul com a dieta que o aplicativo montou.
 */
function ResultadoPrevisto({
  relatorio,
  irPara,
}: {
  relatorio: RelatorioPlanejamento;
  irPara: (aba: string) => void;
}) {
  const lote = relatorio.lote;

  if (!temPrecos(relatorio)) {
    return (
      <div className="cartao space-y-3">
        <TituloSecao texto="Resultado previsto" />
        <p className="text-sm text-textoSuave">
          Informe o preço pago pelo animal e o preço esperado da arroba na venda para o
          aplicativo calcular o lucro do ciclo.
        </p>
        <button className="botao-ouro w-full" onClick={() => irPara("rebanho")}>
          Preencher no cadastro do lote
        </button>
      </div>
    );
  }

  const lucro = lucroTotal(relatorio);
  const positivo = lucro >= 0;
  const cor = positivo ? "text-verdeClaro" : "text-vermelho";

  return (
    <div className="cartao space-y-4">
      <TituloSecao texto="Resultado previsto" />

      <div className="grid grid-cols-2 gap-3">
        <CartaoIndicador
          compacto
          titulo={positivo ? "Lucro do lote" : "Prejuízo do lote"}
          valor={moeda(lucro)}
          detalhe={`${moeda(lucroPorAnimal(relatorio))}/animal`}
          cor={cor}
        />
        <CartaoIndicador
          compacto
          titulo="Retorno"
          valor={percentual(retornoSobreInvestimento(relatorio))}
          detalhe={`${percentual(margemSobreReceita(relatorio))} da venda`}
          cor={cor}
        />
      </div>

      <div>
        <LinhaDado rotulo="Compra do lote" valor={moeda(compraTotal(relatorio))} />
        <LinhaDado rotulo="Dieta até o abate" valor={moeda(custoTotal(relatorio))} />
        <LinhaDado rotulo="Investido" valor={moeda(investimentoTotal(relatorio))} />
        <LinhaDado rotulo="Venda prevista" valor={moeda(receitaTotal(relatorio))} />
      </div>

      <div className="border-t border-borda pt-2">
        <LinhaDado
          rotulo="Lucro por arroba produzida"
          valor={moeda(lucroPorArrobaProduzida(relatorio))}
        />
        <LinhaDado
          rotulo="Arroba de equilíbrio"
          valor={moeda(precoArrobaEquilibrio(relatorio))}
        />
        <LinhaDado rotulo="Resultado só da engorda" valor={moeda(margemDaEngorda(relatorio))} />
      </div>

      <p className="text-xs text-textoTenue">
        Compra a {moeda(lote.precoCompra)} {MODOS_COMPRA[lote.modoCompra].porQue}, venda a{" "}
        {moeda(lote.precoArrobaVenda)} por arroba. O resultado só da engorda compara as arrobas
        que a dieta produz com o que ela custa, sem a compra. Não entram sanidade, transporte,
        pastagem, mão de obra nem impostos.
      </p>

      {!(lote.precoCompra > 0) ? (
        <Aviso texto="Sem preço de compra informado: o resultado conta apenas a dieta." />
      ) : null}
      {/* Sem preço nos insumos a dieta entra como zero, e aí o lucro sai
          inflado. Vale avisar: é o erro mais fácil de cometer aqui. */}
      {custoTotal(relatorio) <= 0 ? (
        <Aviso texto="Nenhum alimento do lote tem preço cadastrado, então a dieta está entrando como custo zero. Informe os preços na aba Insumos." />
      ) : null}
      {precoArrobaEquilibrio(relatorio) > lote.precoArrobaVenda ? (
        <Aviso
          tom="vermelho"
          texto={`A arroba precisaria sair a ${moeda(precoArrobaEquilibrio(relatorio))} só para empatar.`}
        />
      ) : null}
    </div>
  );
}

export function TelaAbate({ irPara }: { irPara: (aba: string) => void }) {
  const { loteSelecionado } = useApp();
  const calculo = useCalculo(loteSelecionado);
  const [copiado, setCopiado] = useState(false);

  if (!loteSelecionado || !calculo) return <SemLote ir={() => irPara("rebanho")} />;

  const relatorio = calculo.relatorio;
  if (!relatorio || !viavel(relatorio)) {
    return (
      <EstadoVazio
        titulo="Sem projeção"
        mensagem={
          relatorio?.alertas[0] ??
          "Escolha os alimentos do lote e confira a meta de ganho para gerar o planejamento."
        }
        acao={
          <button className="botao-ouro" onClick={() => irPara("rebanho")}>
            Abrir o lote
          </button>
        }
      />
    );
  }

  const compartilhar = async () => {
    const texto = gerarTexto(relatorio);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Planejamento - ${relatorio.lote.nome}`, text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Compartilhamento cancelado pelo usuário não é erro.
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="rotulo-secao text-ouroEscuro">Planejamento de abate</p>
        <h1 className="mt-2 font-display text-[26px] leading-tight text-texto">{relatorio.lote.nome}</h1>
        <p className="text-sm text-textoSuave">
          De {formatarKg(relatorio.pesoInicial)} até {formatarKg(relatorio.pesoAlvo)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <CartaoIndicador
          titulo="Dias até o abate"
          valor={numero(relatorio.diasTotais, 0)}
          detalhe={duracao(relatorio.diasTotais)}
          cor="text-ouro"
        />
        <CartaoIndicador
          titulo="Abate previsto"
          valor={formatarData(relatorio.dataAbate)}
          detalhe={`${relatorio.animais} animais`}
        />
        <CartaoIndicador
          titulo="Arrobas por animal"
          valor={arroba(arrobasProduzidasPorAnimal(relatorio))}
          detalhe="produzidas no ciclo"
          cor="text-verdeClaro"
        />
        <CartaoIndicador
          titulo="Conversão alimentar"
          valor={`${numero(conversaoAlimentar(relatorio))} kg`}
          detalhe="de MS por kg ganho"
        />
      </div>

      <div className="cartao space-y-4">
        <TituloSecao texto="Insumos do ciclo" />
        {relatorio.totais.map((total) => {
          const conversao = consumoConversao(total);
          return (
            <div key={total.insumo.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-sm font-semibold ${CORES_CATEGORIA[total.insumo.categoria]}`}>
                  {total.insumo.nome}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {numero(total.kgMateriaNatural, 0)} kg
                </span>
              </div>
              <p className="text-xs text-textoTenue">
                {conversao
                  ? `${descricaoSacas(conversao)} · comprar ${descricaoCompra(conversao)}`
                  : "fornecido no pastejo"}
                {total.custo > 0 ? ` · ${moeda(total.custo)}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      {custoTotal(relatorio) > 0 ? (
        <div className="cartao">
          <TituloSecao texto="Custos" />
          <div className="mt-2">
            <LinhaDado rotulo="Total do ciclo" valor={moeda(custoTotal(relatorio))} />
            <LinhaDado
              rotulo="Por animal"
              valor={moeda(custoTotal(relatorio) / relatorio.animais)}
            />
            <LinhaDado rotulo="Por arroba produzida" valor={moeda(custoPorArroba(relatorio))} />
            <LinhaDado
              rotulo="Por quilo ganho"
              valor={moeda(custoTotal(relatorio) / ganhoTotalLote(relatorio))}
            />
          </div>
        </div>
      ) : null}

      <ResultadoPrevisto relatorio={relatorio} irPara={irPara} />

      <div className="cartao space-y-3">
        <TituloSecao texto="Períodos" />
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-textoTenue">
                <th className="pb-2 pr-3 font-medium">Período</th>
                <th className="pb-2 pr-3 font-medium">Peso</th>
                <th className="pb-2 pr-3 font-medium">MS/dia</th>
                <th className="pb-2 font-medium">NDT</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {relatorio.periodos.map((p) => (
                <tr key={p.id} className="border-t border-borda">
                  <td className="py-2 pr-3">{p.id}</td>
                  <td className="py-2 pr-3">
                    {numero(p.pesoInicial, 0)}–{numero(p.pesoFinal, 0)} kg
                  </td>
                  <td className="py-2 pr-3">{formatarKg(p.exigencia.consumoMateriaSeca)}</td>
                  <td className="py-2">{percentual(p.exigencia.ndtPercentualDieta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {relatorio.alertas.map((a) => (
        <Aviso key={a} texto={a} />
      ))}

      <button className="botao-verde w-full" onClick={() => void compartilhar()}>
        {copiado ? "Relatório copiado" : "Compartilhar relatório completo"}
      </button>
    </div>
  );
}
