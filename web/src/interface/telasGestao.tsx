/** Telas de cadastro e de memória: Rebanho, Insumos, Análise e Dados. */
import { useEffect, useMemo, useRef, useState } from "react";

import {
  analisar,
  confiancaDosFatores,
  custoMedioPorArroba,
  DADOS_CONFIANCA,
  diasMedios,
  totalAnimais,
  totalArrobas,
  type Severidade,
} from "../nucleo/analisadorHistorico.js";
import {
  CATEGORIAS,
  FASES,
  GRUPOS,
  MODOS_COMPRA,
  SISTEMAS,
  TODAS_AS_FASES,
  TODOS_OS_GRUPOS,
  TODOS_OS_MODOS_COMPRA,
  TODOS_OS_SISTEMAS,
  type CategoriaInsumo,
} from "../nucleo/classificacoes.js";
import {
  arroba,
  data as formatarData,
  kg as formatarKg,
  moeda,
  numero,
  paraNumero,
  percentual,
} from "../nucleo/formatadores.js";
import {
  descricaoEmbalagem,
  criarInsumo,
  precoPorKg,
  resumoBromatologico,
  type Insumo,
} from "../nucleo/insumo.js";
import {
  arrobasCompra,
  criarPesagem,
  custoCompraPorAnimal,
  pesoAtual,
  type DietaEtapa,
  type Lote,
} from "../nucleo/lote.js";
import type { RestricoesFormulacao } from "../nucleo/formuladorRacao.js";
import {
  Aviso,
  Campo,
  CORES_CATEGORIA,
  CartaoIndicador,
  EstadoVazio,
  LinhaDado,
  Selecao,
  TituloSecao,
} from "./componentes.js";
import { loteNovo, useApp } from "./estado.js";

// ------------------------------------------------------------------ Rebanho

export function TelaRebanho({
  abrirNovo = false,
  aoAbrirNovo,
}: {
  /** Vem do atalho "Novo lote" do Início, que troca de aba e já abre o editor. */
  abrirNovo?: boolean;
  aoAbrirNovo?: () => void;
} = {}) {
  const { dados, loteSelecionado, selecionarLote, salvarLote } = useApp();
  const [editando, setEditando] = useState<Lote | null>(null);

  useEffect(() => {
    if (!abrirNovo) return;
    setEditando(loteNovo(dados));
    aoAbrirNovo?.();
    // Só o pedido importa: os dados mudam a cada gravação e reabririam o editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirNovo]);

  if (editando) {
    return (
      <EditorLote
        lote={editando}
        aoSalvar={(l) => {
          salvarLote(l);
          setEditando(null);
        }}
        aoCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <TituloSecao
        texto="Rebanho"
        acao={
          <button className="botao-ouro text-sm" onClick={() => setEditando(loteNovo(dados))}>
            + Novo lote
          </button>
        }
      />

      {dados.lotes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum lote ainda"
          mensagem="Cadastre um lote com o peso médio das novilhas, a meta de ganho e os alimentos disponíveis."
          acao={
            <button className="botao-ouro" onClick={() => setEditando(loteNovo(dados))}>
              Cadastrar o primeiro
            </button>
          }
        />
      ) : (
        dados.lotes.map((lote) => {
          const ativo = lote.id === loteSelecionado?.id;
          return (
            <div
              key={lote.id}
              className={`cartao space-y-2 ${ativo ? "border-ouroEscuro" : ""}`}
              onClick={() => selecionarLote(lote.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{lote.nome}</p>
                  <p className="text-xs text-textoSuave">
                    {lote.quantidadeAnimais} animais · {FASES[lote.fase].nome} ·{" "}
                    {GRUPOS[lote.grupoGenetico].nomeCurto}
                  </p>
                </div>
                {ativo ? (
                  <span className="rounded-full border border-ouroEscuro px-2 py-0.5 text-[10px] font-bold text-ouro">
                    Em uso
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-textoSuave">
                <span>{formatarKg(pesoAtual(lote))} hoje</span>
                <span>alvo {formatarKg(lote.pesoAlvoAbate)}</span>
                <span>{numero(lote.ganhoMetaDiario, 3)} kg/dia</span>
              </div>
              <button
                className="botao-ouro w-full text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditando(lote);
                }}
              >
                Editar
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function EditorLote({
  lote,
  aoSalvar,
  aoCancelar,
}: {
  lote: Lote;
  aoSalvar: (lote: Lote) => void;
  aoCancelar: () => void;
}) {
  const { dados, removerLote } = useApp();
  const [rascunho, setRascunho] = useState<Lote>(lote);
  const [pesoNovo, setPesoNovo] = useState("");

  const mudar = <C extends keyof Lote>(campo: C, valor: Lote[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }));

  const mudarEngorda = <C extends keyof DietaEtapa>(campo: C, valor: DietaEtapa[C]) =>
    setRascunho((r) => ({ ...r, engorda: { ...r.engorda, [campo]: valor } }));

  const mudarRestricaoEngorda = (campo: keyof RestricoesFormulacao, valor: number) =>
    setRascunho((r) => ({
      ...r,
      engorda: { ...r.engorda, restricoes: { ...r.engorda.restricoes, [campo]: valor } },
    }));

  /** Percentual digitado vira fração, presa entre 0 e 1. */
  const limitarFracao = (percentual: number) => Math.min(Math.max(percentual / 100, 0), 1);

  const viradaValida =
    rascunho.pesoTrocaEtapa > rascunho.pesoMedioInicial &&
    rascunho.pesoTrocaEtapa < rascunho.pesoAlvoAbate;

  const porCategoria = (categoria: CategoriaInsumo) =>
    dados.insumos
      .filter((i) => i.categoria === categoria)
      .map((i) => ({ valor: i.id, texto: i.nome }));

  return (
    <div className="space-y-5">
      <TituloSecao texto={lote.nome ? "Editar lote" : "Novo lote"} />

      <div className="cartao space-y-3">
        <Campo rotulo="Nome" tipo="text" valor={rascunho.nome} aoMudar={(v) => mudar("nome", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Animais"
            valor={rascunho.quantidadeAnimais}
            aoMudar={(v) => mudar("quantidadeAnimais", Math.max(0, Math.round(paraNumero(v, 0))))}
          />
          <Campo
            rotulo="Peso médio de entrada"
            sufixo="kg"
            valor={rascunho.pesoMedioInicial}
            aoMudar={(v) => mudar("pesoMedioInicial", paraNumero(v, 0))}
          />
          <Campo
            rotulo="Meta de ganho"
            sufixo="kg/dia"
           
            valor={rascunho.ganhoMetaDiario}
            aoMudar={(v) => mudar("ganhoMetaDiario", paraNumero(v, 0))}
          />
          <Campo
            rotulo="Peso de abate"
            sufixo="kg"
            valor={rascunho.pesoAlvoAbate}
            aoMudar={(v) => mudar("pesoAlvoAbate", paraNumero(v, 0))}
          />
        </div>
        <Selecao
          rotulo="Fase"
          valor={rascunho.fase}
          aoMudar={(v) => mudar("fase", v)}
          opcoes={TODAS_AS_FASES.map((f) => ({ valor: f, texto: FASES[f].nome }))}
        />
        <Selecao
          rotulo="Grupo genético"
          valor={rascunho.grupoGenetico}
          aoMudar={(v) => mudar("grupoGenetico", v)}
          opcoes={TODOS_OS_GRUPOS.map((g) => ({ valor: g, texto: GRUPOS[g].nome }))}
        />
        <Selecao
          rotulo="Sistema"
          valor={rascunho.sistema}
          aoMudar={(v) => mudar("sistema", v)}
          opcoes={TODOS_OS_SISTEMAS.map((s) => ({ valor: s, texto: SISTEMAS[s].nome }))}
        />
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Etapas da dieta" />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-verde"
            checked={rascunho.duasEtapas}
            onChange={(e) => mudar("duasEtapas", e.target.checked)}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm">Crescimento e engorda</span>
            <span className="mt-0.5 block text-xs text-textoSuave">
              Duas dietas no mesmo ciclo: recria até o peso de virada, engorda daí ao abate.
            </span>
          </span>
        </label>

        {rascunho.duasEtapas ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                rotulo="Vira a dieta em"
                sufixo="kg"
                valor={rascunho.pesoTrocaEtapa}
                aoMudar={(v) => mudar("pesoTrocaEtapa", Math.max(0, paraNumero(v, 0)))}
              />
              <Campo
                rotulo="Ganho na engorda"
                sufixo="kg/dia"
                valor={rascunho.engorda.ganhoMetaDiario}
                aoMudar={(v) => mudarEngorda("ganhoMetaDiario", Math.max(0, paraNumero(v, 0)))}
              />
            </div>

            <p className="text-xs text-textoSuave">
              {viradaValida
                ? `Crescimento de ${formatarKg(rascunho.pesoMedioInicial)} a ` +
                  `${formatarKg(rascunho.pesoTrocaEtapa)} a ${numero(rascunho.ganhoMetaDiario, 3)} kg/dia, ` +
                  `depois engorda até ${formatarKg(rascunho.pesoAlvoAbate)} a ` +
                  `${numero(rascunho.engorda.ganhoMetaDiario, 3)} kg/dia.`
                : "O peso de virada está fora do intervalo do ciclo, então o lote faz uma etapa só."}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Campo
                rotulo="Volumoso mín. na engorda"
                sufixo="%"
                valor={numero(rascunho.engorda.restricoes.volumosoMinimo * 100, 0)}
                aoMudar={(v) =>
                  mudarRestricaoEngorda("volumosoMinimo", limitarFracao(paraNumero(v, 25)))
                }
              />
              <Campo
                rotulo="Volumoso máx. na engorda"
                sufixo="%"
                valor={numero(rascunho.engorda.restricoes.volumosoMaximo * 100, 0)}
                aoMudar={(v) =>
                  mudarRestricaoEngorda("volumosoMaximo", limitarFracao(paraNumero(v, 55)))
                }
              />
            </div>

            <Campo
              rotulo="Mineral por animal na engorda"
              sufixo="g/dia"
              valor={rascunho.engorda.restricoes.mineralGramasDia}
              aoMudar={(v) =>
                mudarRestricaoEngorda("mineralGramasDia", Math.max(0, paraNumero(v, 0)))
              }
            />

            <p className="rotulo-secao pt-1">Alimentos da engorda</p>
            <p className="text-xs text-textoSuave">
              O que ficar em &quot;o mesmo do crescimento&quot; é herdado. Troque só o que muda —
              quem passa o pasto para silagem, por exemplo.
            </p>
            {(
              [
                ["volumosoID", "Volumoso", "volumoso"],
                ["energeticoID", "Energético", "energetico"],
                ["proteicoID", "Proteico", "proteico"],
                ["mineralID", "Mineral", "mineral"],
              ] as const
            ).map(([campo, rotulo, categoria]) => (
              <Selecao
                key={campo}
                rotulo={rotulo}
                valor={rascunho.engorda[campo] ?? ""}
                aoMudar={(v) => mudarEngorda(campo, v === "" ? undefined : v)}
                opcoes={[{ valor: "", texto: "O mesmo do crescimento" }, ...porCategoria(categoria)]}
              />
            ))}
          </>
        ) : null}
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Compra e venda" />
        <Selecao
          rotulo="Como o animal foi comprado"
          valor={rascunho.modoCompra}
          aoMudar={(v) => mudar("modoCompra", v)}
          opcoes={TODOS_OS_MODOS_COMPRA.map((m) => ({ valor: m, texto: MODOS_COMPRA[m].nome }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Preço pago"
            sufixo={MODOS_COMPRA[rascunho.modoCompra].unidade}
           
            valor={rascunho.precoCompra}
            aoMudar={(v) => mudar("precoCompra", Math.max(0, paraNumero(v, 0)))}
          />
          <Campo
            rotulo="Arroba na venda"
            sufixo="R$/@"
           
            valor={rascunho.precoArrobaVenda}
            aoMudar={(v) => mudar("precoArrobaVenda", Math.max(0, paraNumero(v, 0)))}
          />
        </div>
        <p className="text-xs text-textoSuave">
          {MODOS_COMPRA[rascunho.modoCompra].descricao}
          {rascunho.modoCompra === "porArroba" && rascunho.precoCompra > 0
            ? ` São ${arroba(arrobasCompra(rascunho))} de carcaça na entrada, ` +
              `${moeda(custoCompraPorAnimal(rascunho))} por animal.`
            : ""}
        </p>
        <p className="text-xs text-textoTenue">
          Com os dois preços preenchidos, a aba Abate mostra o lucro previsto do ciclo.
        </p>
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Alimentos da ração" />
        <Selecao
          rotulo="Volumoso"
          valor={rascunho.volumosoID ?? ""}
          aoMudar={(v) => mudar("volumosoID", v)}
          opcoes={porCategoria("volumoso")}
        />
        <Selecao
          rotulo="Energético"
          valor={rascunho.energeticoID ?? ""}
          aoMudar={(v) => mudar("energeticoID", v)}
          opcoes={porCategoria("energetico")}
        />
        <Selecao
          rotulo="Proteico"
          valor={rascunho.proteicoID ?? ""}
          aoMudar={(v) => mudar("proteicoID", v)}
          opcoes={porCategoria("proteico")}
        />
        <Selecao
          rotulo="Mineral"
          valor={rascunho.mineralID ?? ""}
          aoMudar={(v) => mudar("mineralID", v)}
          opcoes={porCategoria("mineral")}
        />
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Pesagens" />
        {rascunho.pesagens.length === 0 ? (
          <p className="text-sm text-textoSuave">
            Sem pesagem registrada. O cálculo usa o peso de entrada até a primeira pesada.
          </p>
        ) : (
          rascunho.pesagens.map((p) => (
            <LinhaDado key={p.id} rotulo={formatarData(p.data)} valor={formatarKg(p.pesoMedio)} />
          ))
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <Campo
              rotulo="Nova pesagem"
              sufixo="kg"
              valor={pesoNovo}
              aoMudar={setPesoNovo}
            />
          </div>
          <button
            className="botao-ouro mt-5 shrink-0"
            disabled={paraNumero(pesoNovo, 0) <= 0}
            onClick={() => {
              setRascunho((r) => ({
                ...r,
                pesagens: [...r.pesagens, criarPesagem({ pesoMedio: paraNumero(pesoNovo, 0) })],
              }));
              setPesoNovo("");
            }}
          >
            Registrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="botao-ouro" onClick={aoCancelar}>
          Cancelar
        </button>
        <button className="botao-verde" onClick={() => aoSalvar(rascunho)}>
          Salvar
        </button>
      </div>

      {dados.lotes.some((l) => l.id === lote.id) ? (
        <button
          className="botao w-full border border-vermelho/60 text-vermelho"
          onClick={() => {
            removerLote(lote.id);
            aoCancelar();
          }}
        >
          Excluir lote
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Insumos

export function TelaInsumos() {
  const { dados, salvarInsumo, removerInsumo, restaurarCatalogo } = useApp();
  const [editando, setEditando] = useState<Insumo | null>(null);

  if (editando) {
    return (
      <EditorInsumo
        insumo={editando}
        aoSalvar={(i) => {
          salvarInsumo(i);
          setEditando(null);
        }}
        aoCancelar={() => setEditando(null)}
        aoExcluir={
          dados.insumos.some((i) => i.id === editando.id)
            ? () => {
                removerInsumo(editando.id);
                setEditando(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <TituloSecao
        texto="Insumos"
        acao={
          <button
            className="botao-ouro text-sm"
            onClick={() =>
              setEditando(
                criarInsumo({
                  nome: "",
                  categoria: "energetico",
                  materiaSeca: 88,
                  proteinaBruta: 9,
                  ndt: 80,
                }),
              )
            }
          >
            + Novo
          </button>
        }
      />
      <p className="text-sm text-textoSuave">
        Os teores são médias de tabela. Ajuste conforme a análise do que você tem na propriedade —
        é o que separa uma previsão da realidade do cocho.
      </p>

      {dados.insumos.map((insumo) => (
        <button
          key={insumo.id}
          className="cartao w-full text-left"
          onClick={() => setEditando(insumo)}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className={`font-semibold ${CORES_CATEGORIA[insumo.categoria]}`}>
              {insumo.nome}
            </span>
            <span className="text-xs text-textoTenue">{CATEGORIAS[insumo.categoria].nome}</span>
          </div>
          <p className="mt-1 text-xs text-textoSuave">{resumoBromatologico(insumo)}</p>
          <p className="text-xs text-textoTenue">
            {descricaoEmbalagem(insumo.embalagem)}
            {insumo.precoUnitario > 0
              ? ` · ${moeda(insumo.precoUnitario)} · ${moeda(precoPorKg(insumo))}/kg`
              : " · sem preço cadastrado"}
          </p>
        </button>
      ))}

      <button className="botao-ouro w-full text-sm" onClick={restaurarCatalogo}>
        Restaurar alimentos padrão
      </button>
    </div>
  );
}

function EditorInsumo({
  insumo,
  aoSalvar,
  aoCancelar,
  aoExcluir,
}: {
  insumo: Insumo;
  aoSalvar: (insumo: Insumo) => void;
  aoCancelar: () => void;
  aoExcluir?: () => void;
}) {
  const [rascunho, setRascunho] = useState<Insumo>(insumo);
  const mudar = <C extends keyof Insumo>(campo: C, valor: Insumo[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }));
  return (
    <div className="space-y-5">
      <TituloSecao texto={insumo.nome ? "Editar alimento" : "Novo alimento"} />

      <div className="cartao space-y-3">
        <Campo rotulo="Nome" tipo="text" valor={rascunho.nome} aoMudar={(v) => mudar("nome", v)} />
        <Selecao
          rotulo="Categoria"
          valor={rascunho.categoria}
          aoMudar={(v) => mudar("categoria", v)}
          opcoes={(Object.keys(CATEGORIAS) as CategoriaInsumo[]).map((c) => ({
            valor: c,
            texto: CATEGORIAS[c].nome,
          }))}
        />
        <div className="grid grid-cols-3 gap-3">
          <Campo
            rotulo="MS"
            sufixo="%"
            valor={rascunho.materiaSeca}
            aoMudar={(v) => mudar("materiaSeca", paraNumero(v))}
          />
          <Campo
            rotulo="PB"
            sufixo="%"
            valor={rascunho.proteinaBruta}
            aoMudar={(v) => mudar("proteinaBruta", paraNumero(v))}
          />
          <Campo
            rotulo="NDT"
            sufixo="%"
            valor={rascunho.ndt}
            aoMudar={(v) => mudar("ndt", paraNumero(v))}
          />
        </div>
        <p className="text-xs text-textoTenue">PB e NDT são percentuais da matéria seca.</p>
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Compra" />
        <Selecao
          rotulo="Embalagem"
          valor={rascunho.embalagem.tipo}
          aoMudar={(v) => mudar("embalagem", { ...rascunho.embalagem, tipo: v })}
          opcoes={[
            { valor: "saca" as const, texto: "Saca" },
            { valor: "granel" as const, texto: "Granel (tonelada)" },
            { valor: "pastejo" as const, texto: "Pastejo (não comprado)" },
          ]}
        />
        {rascunho.embalagem.tipo === "saca" ? (
          <Campo
            rotulo="Quilos por saca"
            sufixo="kg"
            valor={rascunho.embalagem.kgPorSaca}
            aoMudar={(v) => mudar("embalagem", { ...rascunho.embalagem, kgPorSaca: paraNumero(v) })}
          />
        ) : null}
        {rascunho.embalagem.tipo !== "pastejo" ? (
          <Campo
            rotulo={rascunho.embalagem.tipo === "saca" ? "Preço da saca" : "Preço da tonelada"}
            sufixo="R$"
            valor={rascunho.precoUnitario}
            aoMudar={(v) => mudar("precoUnitario", paraNumero(v))}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="botao-ouro" onClick={aoCancelar}>
          Cancelar
        </button>
        <button className="botao-verde" disabled={!rascunho.nome.trim()} onClick={() => aoSalvar(rascunho)}>
          Salvar
        </button>
      </div>

      {aoExcluir ? (
        <button className="botao w-full border border-vermelho/60 text-vermelho" onClick={aoExcluir}>
          Excluir alimento
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Análise

const CORES_SEVERIDADE: Record<Severidade, string> = {
  bom: "border-verdeClaro/60 bg-verdeClaro/10",
  atencao: "border-laranja/60 bg-laranja/10",
  critico: "border-vermelho/60 bg-vermelho/10",
};

export function TelaAnalise() {
  const { dados } = useApp();
  const analise = useMemo(() => analisar(dados.ciclos), [dados.ciclos]);

  if (dados.ciclos.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum ciclo encerrado"
        mensagem="Quando um lote for abatido e você registrar o resultado, esta tela passa a comparar o planejado com o que aconteceu e a corrigir a previsão dos próximos lotes."
      />
    );
  }

  const f = analise.fatores;
  const confianca = confiancaDosFatores(f);
  const custo = custoMedioPorArroba(analise);

  return (
    <div className="space-y-6">
      <header>
        <p className="rotulo-secao text-ouroEscuro">Memória da fazenda</p>
        <h1 className="mt-2 font-display text-[26px] leading-tight text-texto">{analise.ciclos.length} ciclos encerrados</h1>
        <p className="text-sm text-textoSuave">
          {DADOS_CONFIANCA[confianca].nome} · {DADOS_CONFIANCA[confianca].explicacao}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <CartaoIndicador
          titulo="Ganho médio real"
          valor={`${numero(f.ganhoRealMedio, 3)} kg/dia`}
          detalhe={`${percentual(f.aderenciaGanhoMedia * 100, 0)} da meta`}
          cor="text-verdeClaro"
        />
        <CartaoIndicador
          titulo="Ajuste de consumo"
          valor={`${numero(f.ajusteConsumo, 2)}x`}
          detalhe="aplicado aos novos lotes"
          cor="text-ouro"
        />
        <CartaoIndicador
          titulo="Arrobas produzidas"
          valor={arroba(totalArrobas(analise))}
          detalhe={`${totalAnimais(analise)} animais`}
        />
        <CartaoIndicador
          titulo="Custo por arroba"
          valor={custo === null ? "—" : moeda(custo)}
          detalhe={`${numero(diasMedios(analise), 0)} dias em média`}
        />
      </div>

      <div className="space-y-3">
        <TituloSecao texto="O que o histórico diz" />
        {analise.recomendacoes.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-4 ${CORES_SEVERIDADE[r.severidade]}`}>
            <p className="font-semibold">{r.titulo}</p>
            <p className="mt-1 text-sm text-textoSuave">{r.detalhe}</p>
          </div>
        ))}
      </div>

      {analise.porProteico.length > 0 ? (
        <div className="cartao space-y-3">
          <TituloSecao texto="Proteicos usados" />
          {analise.porProteico.map((d) => (
            <LinhaDado
              key={d.nome}
              rotulo={`${d.nome} (${d.ciclos}x)`}
              valor={`${numero(d.ganhoDiario, 3)} kg/dia`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------------- Dados

export function TelaDados() {
  const { dados, persistente, erro, exportar, restaurar, apagarTudo, alternarCalibracao } =
    useApp();
  const entrada = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const baixar = () => {
    const blob = new Blob([exportar()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "novilhanutri-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setMensagem("Backup gerado.");
  };

  const lerArquivo = async (arquivo: File) => {
    setFalha(null);
    setMensagem(null);
    try {
      await restaurar(await arquivo.text());
      setMensagem("Backup restaurado.");
    } catch (causa) {
      setFalha(causa instanceof Error ? causa.message : String(causa));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="rotulo-secao text-ouroEscuro">Dados e privacidade</p>
        <h1 className="mt-2 font-display text-[26px] leading-tight text-texto">Tudo fica neste aparelho</h1>
      </header>

      <div className="cartao space-y-2">
        <p className="text-sm text-textoSuave">
          Não há servidor, conta de usuário nem sincronização. Lotes, insumos e pesagens ficam
          gravados dentro do próprio navegador e só saem daqui se você exportar.
        </p>
        {!persistente ? (
          <Aviso
            tom="vermelho"
            texto="Este navegador está sem armazenamento disponível. O que você digitar vale só enquanto a aba estiver aberta — exporte um backup antes de fechar."
          />
        ) : null}
        {erro ? <Aviso texto={erro} /> : null}
      </div>

      <div className="cartao">
        <TituloSecao texto="Armazenamento" />
        <div className="mt-2">
          <LinhaDado rotulo="Lotes" valor={String(dados.lotes.length)} />
          <LinhaDado rotulo="Insumos" valor={String(dados.insumos.length)} />
          <LinhaDado rotulo="Ciclos encerrados" valor={String(dados.ciclos.length)} />
        </div>
        <label className="mt-3 flex items-center gap-3 border-t border-borda pt-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#2E7D57]"
            checked={dados.usarCalibracao}
            onChange={(e) => alternarCalibracao(e.target.checked)}
          />
          Calibrar novos lotes pelo histórico
        </label>
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Backup manual" />
        <p className="text-sm text-textoSuave">
          Um arquivo JSON com tudo o que está aqui. Serve para guardar por fora, levar para outro
          aparelho ou voltar atrás depois de um engano.
        </p>
        <button className="botao-verde w-full" onClick={baixar}>
          Gerar arquivo de backup
        </button>
        <button className="botao-ouro w-full" onClick={() => entrada.current?.click()}>
          Restaurar de um arquivo
        </button>
        <input
          ref={entrada}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void lerArquivo(arquivo);
            e.target.value = "";
          }}
        />
        {mensagem ? <Aviso tom="verde" texto={mensagem} /> : null}
        {falha ? <Aviso tom="vermelho" texto={falha} /> : null}
      </div>

      <div className="cartao space-y-3">
        <TituloSecao texto="Apagar" />
        {confirmando ? (
          <>
            <Aviso
              tom="vermelho"
              texto="Isto remove lotes, pesagens e ciclos deste aparelho, e não pode ser desfeito."
            />
            <div className="grid grid-cols-2 gap-3">
              <button className="botao-ouro" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button
                className="botao border border-vermelho/60 text-vermelho"
                onClick={() => {
                  void apagarTudo();
                  setConfirmando(false);
                  setMensagem("Dados apagados.");
                }}
              >
                Apagar tudo
              </button>
            </div>
          </>
        ) : (
          <button
            className="botao w-full border border-vermelho/60 text-vermelho"
            onClick={() => setConfirmando(true)}
          >
            Apagar todos os dados
          </button>
        )}
      </div>
    </div>
  );
}
