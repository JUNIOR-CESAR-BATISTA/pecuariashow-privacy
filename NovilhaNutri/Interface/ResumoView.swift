import SwiftUI

/// Resumo diario do lote: exigencias, racao e balanco.
struct ResumoView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var mostrarDetalhes = false

    private let colunas = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if let lote = estado.loteSelecionado {
                conteudo(lote: lote)
            } else {
                SemLoteView()
            }
        }
        .navigationTitle("Resumo diario")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { SeletorLoteBotao() }
        }
    }

    @ViewBuilder
    private func conteudo(lote: Lote) -> some View {
        let exigencia = estado.exigencia(para: lote)
        let composicao = estado.composicao(para: lote)
        let ganho = estado.ganhoEsperado(para: lote)

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                cabecalho(lote: lote)
                indicadores(lote: lote, exigencia: exigencia)
                racaoDiaria(lote: lote, composicao: composicao)
                racaoDoLote(lote: lote, composicao: composicao)
                balanco(composicao: composicao, ganho: ganho, lote: lote)
                detalhamento(exigencia: exigencia, lote: lote)
                avisos(exigencia: exigencia, composicao: composicao)
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Blocos

    private func cabecalho(lote: Lote) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(lote.nome)
                .font(.title2.weight(.bold))
            HStack(spacing: 8) {
                Etiqueta(texto: lote.fase.nome)
                Etiqueta(texto: lote.sistema.nome, cor: Paleta.terra)
                Etiqueta(texto: "\(lote.quantidadeAnimais) cab", cor: Paleta.proteina)
            }
            Text("Peso medio atual \(Formatadores.kg(lote.pesoAtual)) - meta de ganho \(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func indicadores(lote: Lote, exigencia: ExigenciaDiaria) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Exigencias por animal por dia")
                .font(.headline)
            LazyVGrid(columns: colunas, spacing: 10) {
                CartaoIndicador(titulo: "Proteina bruta",
                                valor: Formatadores.gramas(exigencia.proteinaBrutaGramas),
                                detalhe: "\(Formatadores.percentual(exigencia.proteinaBrutaPercentualDieta)) da materia seca",
                                simbolo: "bolt.fill",
                                cor: Paleta.proteina)
                CartaoIndicador(titulo: "NDT",
                                valor: Formatadores.kg(exigencia.ndtKg),
                                detalhe: "\(Formatadores.percentual(exigencia.ndtPercentualDieta)) da materia seca",
                                simbolo: "flame.fill",
                                cor: Paleta.energia)
                CartaoIndicador(titulo: "Materia seca",
                                valor: Formatadores.kg(exigencia.consumoMateriaSeca),
                                detalhe: "\(Formatadores.percentual(exigencia.consumoPercentualPeso)) do peso vivo",
                                simbolo: "leaf.fill",
                                cor: Paleta.verde)
                CartaoIndicador(titulo: "Ganho considerado",
                                valor: "\(Formatadores.numero(exigencia.ganhoDiario, casas: 3)) kg/d",
                                detalhe: exigencia.metaAtingivel ? "Meta viavel neste peso" : "Meta reduzida ao maximo possivel",
                                simbolo: "arrow.up.right",
                                cor: exigencia.metaAtingivel ? Paleta.verde : Paleta.alerta)
            }
            Text("Total do lote: \(Formatadores.kg(exigencia.proteinaBrutaKg * Double(lote.quantidadeAnimais))) de PB e \(Formatadores.kg(exigencia.ndtKg * Double(lote.quantidadeAnimais))) de NDT por dia.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func racaoDiaria(lote: Lote, composicao: ComposicaoRacao) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Composicao da racao diaria")
                    .font(.headline)
                Spacer()
                Etiqueta(texto: composicao.status.nome,
                         cor: composicao.status == .balanceada ? Paleta.verde : Paleta.alerta)
            }

            if composicao.itens.isEmpty {
                Text("Selecione os insumos da racao na edicao do lote.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                BarraComposicao(partes: composicao.itens.map {
                    ParteComposicao(id: $0.insumo.id,
                                    nome: $0.insumo.nome,
                                    valor: $0.kgMateriaSeca,
                                    cor: Paleta.cor(de: $0.insumo.categoria))
                })

                VStack(spacing: 0) {
                    CabecalhoTabelaRacao()
                    ForEach(composicao.itens) { item in
                        LinhaRacao(item: item, participacao: composicao.participacaoMS(item))
                    }
                    Divider()
                    HStack {
                        Text("Total por animal")
                            .font(.footnote.weight(.semibold))
                        Spacer()
                        Text(Formatadores.kg(composicao.totalMateriaNatural))
                            .font(.footnote.weight(.semibold))
                            .frame(width: 84, alignment: .trailing)
                        Text(Formatadores.kg(composicao.consumoMateriaSeca))
                            .font(.footnote.weight(.semibold))
                            .frame(width: 74, alignment: .trailing)
                    }
                    .padding(.top, 8)
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground),
                            in: RoundedRectangle(cornerRadius: 12))

                Text("Volumoso \(Formatadores.percentual(composicao.percentualVolumoso, casas: 0)) e concentrado \(Formatadores.percentual(composicao.percentualConcentrado, casas: 0)) da materia seca.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func racaoDoLote(lote: Lote, composicao: ComposicaoRacao) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Quantidade a fornecer por dia (\(lote.quantidadeAnimais) animais)")
                .font(.headline)

            VStack(spacing: 10) {
                ForEach(composicao.itens) { item in
                    let totalDia = item.kgMateriaNatural * Double(lote.quantidadeAnimais)
                    let conversao = ConversorSacas.converter(kg: totalDia, embalagem: item.insumo.embalagem)
                    HStack(alignment: .top) {
                        Circle()
                            .fill(Paleta.cor(de: item.insumo.categoria))
                            .frame(width: 8, height: 8)
                            .padding(.top, 6)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.insumo.nome)
                                .font(.subheadline)
                            if let conversao {
                                Text(conversao.descricao)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            } else {
                                Text("Fornecido no pastejo")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Text(Formatadores.kg(totalDia))
                            .font(.subheadline.weight(.semibold))
                    }
                }
                if composicao.custoDiario > 0 {
                    Divider()
                    LinhaDado(rotulo: "Custo diario do lote",
                              valor: Formatadores.moeda(composicao.custoDiario * Double(lote.quantidadeAnimais)),
                              destaque: true)
                    LinhaDado(rotulo: "Custo por animal por dia",
                              valor: Formatadores.moeda(composicao.custoDiario))
                }
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground),
                        in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func balanco(composicao: ComposicaoRacao, ganho: GanhoEsperado, lote: Lote) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Balanco da dieta")
                .font(.headline)
            VStack(spacing: 8) {
                LinhaDado(rotulo: "PB fornecida",
                          valor: "\(Formatadores.gramas(composicao.proteinaFornecidaKg * 1000)) (\(Formatadores.percentual(composicao.proteinaPercentual)))")
                LinhaDado(rotulo: "PB exigida",
                          valor: Formatadores.gramas(composicao.proteinaExigidaKg * 1000))
                LinhaDado(rotulo: "Saldo de PB",
                          valor: Formatadores.gramas(composicao.balancoProteina * 1000),
                          cor: composicao.balancoProteina < -0.005 ? Paleta.alerta : Paleta.verde)
                Divider()
                LinhaDado(rotulo: "NDT fornecido",
                          valor: "\(Formatadores.kg(composicao.ndtFornecidoKg)) (\(Formatadores.percentual(composicao.ndtPercentual)))")
                LinhaDado(rotulo: "NDT exigido",
                          valor: Formatadores.kg(composicao.ndtExigidoKg))
                LinhaDado(rotulo: "Saldo de NDT",
                          valor: Formatadores.kg(composicao.balancoNDT),
                          cor: composicao.balancoNDT < -0.02 ? Paleta.alerta : Paleta.verde)
                Divider()
                LinhaDado(rotulo: "Ganho esperado com esta racao",
                          valor: "\(Formatadores.numero(ganho.ganho, casas: 3)) kg/dia",
                          destaque: true)
                LinhaDado(rotulo: "Nutriente limitante", valor: ganho.nutrienteLimitante)
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground),
                        in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func detalhamento(exigencia: ExigenciaDiaria, lote: Lote) -> some View {
        DisclosureGroup(isExpanded: $mostrarDetalhes) {
            VStack(spacing: 8) {
                LinhaDado(rotulo: "Energia liquida de mantenca",
                          valor: "\(Formatadores.numero(exigencia.energiaLiquidaMantenca)) Mcal/d")
                LinhaDado(rotulo: "Energia retida no ganho",
                          valor: "\(Formatadores.numero(exigencia.energiaLiquidaGanho)) Mcal/d")
                LinhaDado(rotulo: "Energia metabolizavel",
                          valor: "\(Formatadores.numero(exigencia.energiaMetabolizavel)) Mcal/d")
                LinhaDado(rotulo: "PM de mantenca",
                          valor: Formatadores.gramas(exigencia.proteinaMetabolizavelMantenca))
                LinhaDado(rotulo: "PM para ganho",
                          valor: Formatadores.gramas(exigencia.proteinaMetabolizavelGanho))
                LinhaDado(rotulo: "PM total",
                          valor: Formatadores.gramas(exigencia.proteinaMetabolizavelTotal))
                LinhaDado(rotulo: "Peso equivalente",
                          valor: Formatadores.kg(MotorExigencias.pesoEquivalente(lote.perfilAtual)))
                LinhaDado(rotulo: "Ganho maximo neste peso",
                          valor: "\(Formatadores.numero(MotorExigencias.ganhoMaximo(lote.perfilAtual), casas: 3)) kg/d")
            }
            .padding(.top, 8)
        } label: {
            Text("Detalhamento tecnico")
                .font(.headline)
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground),
                    in: RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func avisos(exigencia: ExigenciaDiaria, composicao: ComposicaoRacao) -> some View {
        let todos = exigencia.alertas + composicao.alertas
        if !todos.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Observacoes")
                    .font(.headline)
                ForEach(Array(todos.enumerated()), id: \.offset) { _, texto in
                    Aviso(texto: texto)
                }
            }
            .padding(12)
            .background(Paleta.alerta.opacity(0.08),
                        in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

/// Cabecalho da tabela de racao.
struct CabecalhoTabelaRacao: View {
    var body: some View {
        HStack {
            Text("Alimento")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Spacer()
            Text("kg natural")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(width: 84, alignment: .trailing)
            Text("kg MS")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(width: 74, alignment: .trailing)
        }
        .padding(.bottom, 6)
    }
}

/// Linha de um alimento na racao diaria.
struct LinhaRacao: View {
    let item: ItemRacao
    let participacao: Double

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.insumo.nome)
                    .font(.subheadline)
                    .lineLimit(2)
                Text("\(Formatadores.percentual(participacao, casas: 0)) da MS - \(item.insumo.resumoBromatologico)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            Text(Formatadores.numero(item.kgMateriaNatural, casas: 2))
                .font(.subheadline.monospacedDigit())
                .frame(width: 84, alignment: .trailing)
            Text(Formatadores.numero(item.kgMateriaSeca, casas: 2))
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 74, alignment: .trailing)
        }
        .padding(.vertical, 6)
    }
}
