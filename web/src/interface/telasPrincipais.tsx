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
  CORES_FUNDO_CATEGORIA,
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

/** "Bom dia!", "Boa tarde!" ou "Boa noite!". */
function saudacao(agora = new Date()): string {
  const hora = agora.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function Cabecalho({ irPara }: { irPara: (destino: string) => void }) {
  return (
    <header className="flex items-center gap-3.5">
      <img
        src="/pecuariashow-privacy/icone-192.png"
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-ouro/30"
      />
      <div className="min-w-0 flex-1">
        <p className="rotulo-secao text-[10px] text-textoTenue">{saudacao()}</p>
        <h1 className="mt-1 whitespace-nowrap font-display text-[26px] leading-none text-texto">
          NovilhaNutri
        </h1>
      </div>
      <BotaoCircular rotulo="Análise" icone={<IconeTendencia className="h-[18px] w-[18px]" />} aoTocar={() => irPara("analise")} />
      <BotaoCircular rotulo="Dados" icone={<IconeEscudo className="h-[18px] w-[18px]" />} aoTocar={() => irPara("dados")} />
    </header>
  );
}

/**
 * O lote ativo, num cartão só.
 *
 * Antes o mesmo lote aparecia duas vezes no painel: numa faixa fina no alto e
 * de novo no cartão "Em destaque", com os mesmos números. Repetir não é
 * riqueza, é ruído - juntar os dois deixa um bloco com peso de verdade e abre
 * espaço em volta, que é o que faz uma tela parecer cara.
 */
/**
 * O lote ativo.
 *
 * Um cartão só, com as três exigências, o caminho até o abate e a data
 * prevista. Antes a data só aparecia na aba Abate - mas é ela que o
 * pecuarista quer saber de relance, mais que o peso de hoje.
 */
function CartaoLoteAtivo({
  lote,
  exigencia,
  relatorio,
  aoTocar,
}: {
  lote: Lote;
  exigencia: ReturnType<typeof calcular>;
  relatorio: RelatorioPlanejamento | null;
  aoTocar: () => void;
}) {
  const total = lote.pesoAlvoAbate - lote.pesoMedioInicial;
  const progresso =
    total > 0 ? Math.min(Math.max((pesoAtual(lote) - lote.pesoMedioInicial) / total, 0), 1) : 1;
  const temPrazo = relatorio !== null && viavel(relatorio);

  return (
    <button onClick={aoTocar} className="cartao relative w-full overflow-hidden p-6 text-left">
      {/*
        Um claro dourado no canto de cima. É degradê radial, não imagem: não
        tem borda para ficar dura nem textura para embolar com os números.
        Uma fotografia aqui, por mais apagada, virava mancha atrás do texto.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(228,192,83,0.16) 0%, rgba(228,192,83,0.05) 45%, transparent 70%)",
        }}
      />
      {/* Fio dourado que nasce à esquerda e some à direita, no lugar do
          contorno branco de sempre: marca o cartão principal sem cercá-lo. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(228,192,83,0.5) 22%, rgba(228,192,83,0.12) 62%, transparent 100%)",
        }}
      />

      <div className="relative space-y-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="rotulo-secao flex items-center gap-2 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-verdeClaro" aria-hidden="true" />
            Lote ativo
          </p>
          <p className="mt-2.5 truncate font-display text-[26px] leading-tight text-texto">
            {lote.nome}
          </p>
          <p className="mt-1.5 text-xs text-textoTenue">
            {lote.quantidadeAnimais} novilhas · {FASES[lote.fase].nome}
          </p>
        </div>
        <Etiqueta texto={`${numero(lote.ganhoMetaDiario, 3)} kg/d`} />
      </div>

      <div className="flex gap-4 border-t border-realce pt-5">
        <MiniIndicador titulo="PB" valor={gramas(exigencia.proteinaBrutaGramas)} cor="text-azul" />
        <MiniIndicador titulo="NDT" valor={formatarKg(exigencia.ndtKg)} cor="text-ouro" />
        <MiniIndicador
          titulo="Matéria seca"
          valor={formatarKg(exigencia.consumoMateriaSeca)}
          cor="text-verdeClaro"
        />
      </div>

      <div className="space-y-3 border-t border-realce pt-5">
        <div className="flex items-end justify-between">
          <span className="font-display text-lg leading-none tabular-nums text-texto">
            {numero(pesoAtual(lote), 0)} kg
          </span>
          <span className="text-xs tabular-nums text-textoTenue">
            alvo {numero(lote.pesoAlvoAbate, 0)} kg
          </span>
        </div>

        {/* Fio de 2 px: mede a mesma coisa que a barra grossa e não disputa
            atenção com os números. O mínimo de 3 px existe porque no primeiro
            dia o progresso é zero, e uma barra de largura zero não se vê -
            some a régua inteira junto. */}
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-ouro"
            style={{ width: `max(3px, ${progresso * 100}%)` }}
          />
        </div>

        {temPrazo ? (
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-textoTenue">Abate previsto</span>
            <span className="tabular-nums text-textoSuave">
              {formatarData(relatorio.dataAbate)} · {numero(relatorio.diasTotais, 0)} dias
            </span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-textoTenue">Falta ganhar</span>
            <span className="tabular-nums text-textoSuave">
              {numero(ganhoRestante(lote), 0)} kg
            </span>
          </div>
        )}
      </div>
      </div>
    </button>
  );
}

/**
 * O que vai no cocho hoje, por animal.
 *
 * Isto é o que se abre o aplicativo para ver. Estava a duas telas de
 * distância, atrás da aba Ração, enquanto o painel gastava espaço com blocos
 * de categoria que só repetiam a barra de abas.
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
      <div className="cartao divide-y divide-realce py-1">
        {racao.itens.map((item) => {
          const porAnimal = itemMateriaNatural(item);
          return (
            <div key={item.insumo.id} className="space-y-2 py-3.5">
              <div className="flex items-baseline gap-3">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${CORES_FUNDO_CATEGORIA[item.insumo.categoria]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-texto">
                  {item.insumo.nome}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-base leading-none tabular-nums text-texto">
                    {formatarKg(porAnimal)}
                  </span>
                  <span className="mt-1 block text-[11px] tabular-nums text-textoTenue">
                    {numero(porAnimal * animais, 0)} kg no lote
                  </span>
                </span>
              </div>
              {/* A fatia de cada alimento na matéria seca. Dá ritmo à lista e
                  mostra de relance quem é volumoso e quem é acerto fino. */}
              <div className="ml-[18px] h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${CORES_FUNDO_CATEGORIA[item.insumo.categoria]} opacity-70`}
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
    <div className="space-y-9 pb-4">
      <div className="entra">
        <Cabecalho irPara={irPara} />
      </div>

      <div className="entra" style={{ animationDelay: "60ms" }}>
      {lote && calculo ? (
        <CartaoLoteAtivo
          lote={lote}
          exigencia={calculo.exigencia}
          relatorio={calculo.relatorio}
          aoTocar={() => irPara("abate")}
        />
      ) : (
        <EstadoVazio
          titulo="Nenhum lote por aqui ainda"
          mensagem="Cadastre o primeiro lote de novilhas e o aplicativo calcula PB, NDT e a ração diária."
          acao={
            <button className="botao-ouro" onClick={() => irPara("novo-lote")}>
              Cadastrar lote
            </button>
          }
        />
      )}
      </div>

      {lote && calculo?.racao ? (
        <div className="entra" style={{ animationDelay: "120ms" }}>
          <CochoHoje
            racao={calculo.racao}
            animais={lote.quantidadeAnimais}
            aoTocar={() => irPara("racao")}
          />
        </div>
      ) : null}

      <section className="entra space-y-1" style={{ animationDelay: "180ms" }}>
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
