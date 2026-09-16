/** Telas de consulta: Início, Ração e Abate. */
import { useMemo, useState } from "react";

import { FASES } from "../nucleo/classificacoes.js";
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
  consumoConversao,
  conversaoAlimentar,
  custoPorArroba,
  custoTotal,
  ganhoTotalLote,
  projetar,
  viavel,
} from "../nucleo/planejadorAbate.js";
import { gerar as gerarTexto } from "../nucleo/relatorioTexto.js";
import {
  Aviso,
  Barra,
  CartaoIndicador,
  CORES_CATEGORIA,
  EstadoVazio,
  LinhaDado,
  TituloSecao,
} from "./componentes.js";
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

export function TelaInicio({ irPara }: { irPara: (aba: string) => void }) {
  const { dados, loteSelecionado } = useApp();
  const calculo = useCalculo(loteSelecionado);

  if (!loteSelecionado || !calculo) return <SemLote ir={() => irPara("rebanho")} />;

  const lote = loteSelecionado;
  const { exigencia } = calculo;
  const atual = pesoAtual(lote);
  const faltam = ganhoRestante(lote);
  const percorrido = lote.pesoAlvoAbate > lote.pesoMedioInicial
    ? (atual - lote.pesoMedioInicial) / (lote.pesoAlvoAbate - lote.pesoMedioInicial)
    : 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-ouroEscuro">Exigência de hoje</p>
        <h1 className="mt-1 text-2xl font-bold">{lote.nome}</h1>
        <p className="text-sm text-textoSuave">
          {lote.quantidadeAnimais} novilhas · {FASES[lote.fase].nome} · {formatarKg(atual)}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <CartaoIndicador
          compacto
          titulo="PB"
          valor={gramas(exigencia.proteinaBrutaGramas)}
          detalhe={percentual(exigencia.proteinaBrutaPercentualDieta)}
          cor="text-azul"
        />
        <CartaoIndicador
          compacto
          titulo="NDT"
          valor={formatarKg(exigencia.ndtKg)}
          detalhe={percentual(exigencia.ndtPercentualDieta)}
          cor="text-ouro"
        />
        <CartaoIndicador
          compacto
          titulo="Matéria seca"
          valor={formatarKg(exigencia.consumoMateriaSeca)}
          detalhe={`${percentual(exigencia.consumoPercentualPeso)} do peso`}
          cor="text-verdeClaro"
        />
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Caminho até o abate" />
        <Barra fracao={percorrido} />
        <div className="flex justify-between text-sm text-textoSuave">
          <span>{formatarKg(atual)} hoje</span>
          <span>faltam {formatarKg(faltam)}</span>
        </div>
        <LinhaDado rotulo="Meta de ganho" valor={`${numero(lote.ganhoMetaDiario, 3)} kg/dia`} />
        <LinhaDado rotulo="Peso de abate" valor={formatarKg(lote.pesoAlvoAbate)} />
        {calculo.relatorio && viavel(calculo.relatorio) ? (
          <LinhaDado
            rotulo="Abate previsto"
            valor={formatarData(calculo.relatorio.dataAbate)}
          />
        ) : null}
      </div>

      {exigencia.alertas.map((a) => (
        <Aviso key={a} texto={a} />
      ))}

      <div className="grid grid-cols-2 gap-3">
        <button className="botao-ouro" onClick={() => irPara("racao")}>
          Ver a ração
        </button>
        <button className="botao-ouro" onClick={() => irPara("abate")}>
          Planejar o abate
        </button>
      </div>

      <p className="text-center text-xs text-textoTenue">
        {dados.lotes.length} {dados.lotes.length === 1 ? "lote" : "lotes"} ·{" "}
        {dados.ciclos.length} {dados.ciclos.length === 1 ? "ciclo encerrado" : "ciclos encerrados"}
      </p>
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
        <p className="text-xs uppercase tracking-widest text-ouroEscuro">Ração diária</p>
        <h1 className="mt-1 text-2xl font-bold">{loteSelecionado.nome}</h1>
        <p className="text-sm text-textoSuave">
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

      {racao.alertas.map((a) => (
        <Aviso key={a} texto={a} />
      ))}
    </div>
  );
}

// -------------------------------------------------------------------- Abate

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
        <p className="text-xs uppercase tracking-widest text-ouroEscuro">Planejamento de abate</p>
        <h1 className="mt-1 text-2xl font-bold">{relatorio.lote.nome}</h1>
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
