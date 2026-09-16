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
  IconeFolha,
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
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                   border border-ouro/25 bg-ouro/[0.07] text-ouro"
        aria-hidden="true"
      >
        <IconeFolha className="h-[18px] w-[18px]" />
      </span>
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
function CartaoLoteAtivo({
  lote,
  exigencia,
  aoTocar,
}: {
  lote: Lote;
  exigencia: ReturnType<typeof calcular>;
  aoTocar: () => void;
}) {
  const total = lote.pesoAlvoAbate - lote.pesoMedioInicial;
  const progresso =
    total > 0 ? Math.min(Math.max((pesoAtual(lote) - lote.pesoMedioInicial) / total, 0), 1) : 1;

  return (
    <button onClick={aoTocar} className="cartao w-full space-y-5 p-6 text-left">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 rotulo-secao text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-verdeClaro" aria-hidden="true" />
            Lote ativo
          </p>
          <p className="mt-2 truncate font-display text-[22px] leading-tight text-texto">
            {lote.nome}
          </p>
          <p className="mt-1 text-xs text-textoTenue">
            {lote.quantidadeAnimais} novilhas · {FASES[lote.fase].nome}
          </p>
        </div>
        <Etiqueta texto={`${numero(lote.ganhoMetaDiario, 3)} kg/d`} />
      </div>

      <div className="flex gap-4 border-t border-realce pt-4">
        <MiniIndicador titulo="PB" valor={gramas(exigencia.proteinaBrutaGramas)} cor="text-azul" />
        <MiniIndicador titulo="NDT" valor={formatarKg(exigencia.ndtKg)} cor="text-ouro" />
        <MiniIndicador
          titulo="Matéria seca"
          valor={formatarKg(exigencia.consumoMateriaSeca)}
          cor="text-verdeClaro"
        />
      </div>

      <div className="space-y-2">
        {/* Fio de 2 px no lugar da barra grossa: mede a mesma coisa e não
            disputa atenção com os números. */}
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-superficieAlta">
          <div className="h-full rounded-full bg-ouro" style={{ width: `${progresso * 100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-textoTenue">
          <span className="tabular-nums">{numero(pesoAtual(lote), 0)} kg hoje</span>
          <span className="tabular-nums">faltam {numero(ganhoRestante(lote), 0)} kg</span>
        </div>
      </div>
    </button>
  );
}

export function TelaInicio({ irPara }: { irPara: (aba: string) => void }) {
  const { loteSelecionado } = useApp();
  const calculo = useCalculo(loteSelecionado);
  const lote = loteSelecionado;

  return (
    <div className="space-y-9 pb-4">
      <Cabecalho irPara={irPara} />

      {lote && calculo ? (
        <CartaoLoteAtivo
          lote={lote}
          exigencia={calculo.exigencia}
          aoTocar={() => irPara("racao")}
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

      <section className="space-y-4">
        <TituloSecao texto="Categorias" />
        <div className="grid grid-cols-4 gap-3">
          <CartaoCategoria icone={<IconeLista />} titulo="Rebanho" aoTocar={() => irPara("rebanho")} />
          <CartaoCategoria icone={<IconePizza />} titulo="Ração" aoTocar={() => irPara("racao")} />
          <CartaoCategoria icone={<IconeCaixa />} titulo="Insumos" aoTocar={() => irPara("insumos")} />
          <CartaoCategoria icone={<IconeDocumento />} titulo="Abate" aoTocar={() => irPara("abate")} />
        </div>
      </section>

      <section className="space-y-4">
        <TituloSecao texto="Ações rápidas" />
        <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2.5">
            <Chip texto="Novo lote" icone={<IconeMais className="h-4 w-4" />} aoTocar={() => irPara("novo-lote")} />
            <Chip texto="Conversor de sacas" icone={<IconeTroca className="h-4 w-4" />} aoTocar={() => irPara("conversor")} />
            <Chip texto="Cadastrar insumo" icone={<IconeCaixa className="h-4 w-4" />} aoTocar={() => irPara("insumos")} />
            <Chip texto="Planejar abate" icone={<IconeDocumento className="h-4 w-4" />} aoTocar={() => irPara("abate")} />
            <Chip texto="Análise do histórico" icone={<IconeBarras className="h-4 w-4" />} aoTocar={() => irPara("analise")} />
          </div>
        </div>
      </section>

      <section className="space-y-1">
        <TituloSecao texto="Acesso rápido" />
        <div className="divide-y divide-realce">
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
          <LinhaAtalho
            icone={<IconeTroca className="h-[18px] w-[18px]" />}
            titulo="Conversor de quilos e sacas"
            detalhe="60, 50, 40, 30, 25 e 20 kg"
            aoTocar={() => irPara("conversor")}
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
