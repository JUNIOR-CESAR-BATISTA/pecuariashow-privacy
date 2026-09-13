import SwiftUI

/// Aba de estatísticas: o que os ciclos já abatidos ensinam para os próximos.
struct AnaliseView: View {
    @EnvironmentObject private var estado: AppEstado
    @Binding var aba: Aba

    private let colunas = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if estado.ciclos.isEmpty {
                vazio
            } else {
                conteudo(analise: estado.analise)
            }
        }
        .navigationTitle("Análise")
        .barraEscura()
    }

    private var vazio: some View {
        ScrollView {
            VStack(spacing: 16) {
                EstadoVazio(simbolo: "chart.bar.xaxis",
                            titulo: "Nenhum ciclo encerrado ainda",
                            mensagem: "Quando um lote for abatido, encerre o ciclo na aba Rebanho informando peso e carcaça. A partir daí o aplicativo compara o previsto com o realizado, calibra os próximos lotes e aponta o que corrigir.",
                            textoBotao: "Ir para o rebanho") { aba = .rebanho }
                    .cartao()

                VStack(alignment: .leading, spacing: 10) {
                    Text("O que o histórico passa a fazer")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Tema.texto)
                    LinhaExplicacao(simbolo: "dial.medium",
                                    texto: "Calibra o consumo previsto pelo ganho que a fazenda realmente entrega.")
                    LinhaExplicacao(simbolo: "arrow.up.arrow.down",
                                    texto: "Compara os proteicos e energéticos usados: qual rendeu mais e qual saiu mais barato por arroba.")
                    LinhaExplicacao(simbolo: "checklist",
                                    texto: "Aponta onde corrigir: fornecimento, formulação, acabamento, prazo e custo.")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .cartao()
            }
            .padding(16)
        }
        .fundoTela()
    }

    @ViewBuilder
    private func conteudo(analise: AnaliseHistorica) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                resumo(analise)
                calibracao(analise)
                if !analise.recomendacoes.isEmpty { diagnostico(analise) }
                if analise.porProteico.count + analise.porEnergetico.count > 1 {
                    comparativos(analise)
                }
                historico(analise)
            }
            .padding(16)
            .padding(.bottom, 20)
        }
        .fundoTela()
    }

    // MARK: - Resumo

    private func resumo(_ analise: AnaliseHistorica) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Números da fazenda")
            LazyVGrid(columns: colunas, spacing: 10) {
                CartaoIndicador(titulo: "Ciclos encerrados",
                                valor: "\(analise.totalCiclos)",
                                detalhe: "\(analise.totalAnimais) animais abatidos",
                                simbolo: "flag.checkered",
                                cor: Tema.ouro)
                CartaoIndicador(titulo: "Ganho real médio",
                                valor: "\(Formatadores.numero(analise.ganhoRealMedio, casas: 3)) kg/d",
                                detalhe: "\(Formatadores.percentual(analise.fatores.aderenciaGanhoMedia * 100, casas: 0)) da meta planejada",
                                simbolo: "arrow.up.right",
                                cor: corDaAderencia(analise.fatores.aderenciaGanhoMedia))
                CartaoIndicador(titulo: "Arrobas produzidas",
                                valor: Formatadores.numero(analise.totalArrobas, casas: 1),
                                detalhe: "Em \(Formatadores.numero(analise.diasMedios, casas: 0)) dias por ciclo, em média",
                                simbolo: "scalemass",
                                cor: Tema.azul)
                if let custo = analise.custoMedioPorArroba {
                    CartaoIndicador(titulo: "Custo por arroba",
                                    valor: Formatadores.moeda(custo),
                                    detalhe: "Média dos ciclos com custo informado",
                                    simbolo: "banknote",
                                    cor: Tema.verdeClaro)
                } else {
                    CartaoIndicador(titulo: "Custo por arroba",
                                    valor: "-",
                                    detalhe: "Informe o custo do ciclo ao encerrar",
                                    simbolo: "banknote",
                                    cor: Tema.textoSuave)
                }
            }
        }
    }

    // MARK: - Calibração

    private func calibracao(_ analise: AnaliseHistorica) -> some View {
        let fatores = analise.fatores
        return VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Calibração dos próximos lotes")
            VStack(spacing: 12) {
                Toggle(isOn: Binding(get: { estado.usarCalibracao },
                                     set: { estado.usarCalibracao = $0 })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Usar o histórico nos novos lotes")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Tema.texto)
                        Text("Base \(fatores.confianca.nome.lowercased()): \(fatores.confianca.explicacao)")
                            .font(.caption)
                            .foregroundStyle(Tema.textoSuave)
                    }
                }
                .tint(Tema.verde)

                Divider().overlay(Tema.borda)

                LinhaDado(rotulo: "Ajuste de consumo",
                          valor: Formatadores.numero(fatores.ajusteConsumo, casas: 2) + "x",
                          destaque: true,
                          cor: fatores.ajusteConsumo < 0.95 ? Tema.laranja : Tema.verdeClaro)
                Text(textoAjusteConsumo(fatores))
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                    .fixedSize(horizontal: false, vertical: true)

                LinhaDado(rotulo: "Rendimento de carcaça",
                          valor: Formatadores.percentual(fatores.rendimentoCarcaca * 100))
                LinhaDado(rotulo: "Peso de acabamento",
                          valor: Formatadores.kg(fatores.pesoAcabamento))
            }
            .cartao(espacamento: 14)
        }
    }

    private func textoAjusteConsumo(_ fatores: FatoresCalibracao) -> String {
        if fatores.ajusteConsumo < 0.97 {
            return "Os animais entregaram menos que a previsão de tabela. Os novos lotes já nascem com o consumo previsto reduzido em \(Formatadores.percentual((1 - fatores.ajusteConsumo) * 100, casas: 0)), o que aproxima o planejamento da realidade do seu cocho."
        }
        if fatores.ajusteConsumo > 1.03 {
            return "Os animais consumiram e ganharam acima da previsão de tabela. Os novos lotes já nascem com o consumo previsto \(Formatadores.percentual((fatores.ajusteConsumo - 1) * 100, casas: 0)) maior."
        }
        return "O desempenho observado bateu com a previsão de tabela. Nenhuma correção relevante de consumo é necessária."
    }

    // MARK: - Diagnóstico

    private func diagnostico(_ analise: AnaliseHistorica) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "O que corrigir")
            VStack(spacing: 10) {
                ForEach(analise.recomendacoes) { item in
                    CartaoRecomendacao(recomendacao: item)
                }
            }
        }
    }

    // MARK: - Comparativos

    private func comparativos(_ analise: AnaliseHistorica) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Desempenho por alimento")
            VStack(spacing: 14) {
                if !analise.porProteico.isEmpty {
                    BlocoDesempenho(titulo: "Proteicos", itens: analise.porProteico)
                }
                if !analise.porEnergetico.isEmpty {
                    BlocoDesempenho(titulo: "Energéticos", itens: analise.porEnergetico)
                }
                if !analise.porVolumoso.isEmpty {
                    BlocoDesempenho(titulo: "Volumosos", itens: analise.porVolumoso)
                }
            }
            .cartao(espacamento: 14)
        }
    }

    // MARK: - Histórico

    private func historico(_ analise: AnaliseHistorica) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Ciclos encerrados")
            VStack(spacing: 10) {
                ForEach(analise.ciclos) { ciclo in
                    NavigationLink {
                        CicloDetalheView(ciclo: ciclo)
                    } label: {
                        LinhaCiclo(ciclo: ciclo)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func corDaAderencia(_ valor: Double) -> Color {
        if valor < 0.90 { return Tema.vermelho }
        if valor > 1.10 { return Tema.laranja }
        return Tema.verdeClaro
    }
}

/// Linha de explicação com ícone, usada no estado vazio.
struct LinhaExplicacao: View {
    let simbolo: String
    let texto: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: simbolo)
                .font(.footnote)
                .foregroundStyle(Tema.ouro)
                .frame(width: 20)
            Text(texto)
                .font(.footnote)
                .foregroundStyle(Tema.textoSuave)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Cartão de uma recomendação do diagnóstico.
struct CartaoRecomendacao: View {
    let recomendacao: Recomendacao

    private var cor: Color {
        switch recomendacao.severidade {
        case .bom: return Tema.verdeClaro
        case .atencao: return Tema.ouro
        case .critico: return Tema.vermelho
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: recomendacao.simbolo)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(cor)
                .frame(width: 38, height: 38)
                .background(cor.opacity(0.14), in: RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text(recomendacao.titulo)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Tema.texto)
                    Spacer(minLength: 4)
                    Etiqueta(texto: recomendacao.severidade.nome, cor: cor)
                }
                Text(recomendacao.detalhe)
                    .font(.footnote)
                    .foregroundStyle(Tema.textoSuave)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .cartao(espacamento: 14)
    }
}

/// Ranking de alimentos de uma categoria.
struct BlocoDesempenho: View {
    let titulo: String
    let itens: [DesempenhoInsumo]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(titulo)
                .font(.caption.weight(.bold))
                .foregroundStyle(Tema.textoSuave)
            ForEach(itens) { item in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.nome)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Tema.texto)
                            .lineLimit(1)
                        Text("\(item.ciclos) ciclo\(item.ciclos == 1 ? "" : "s") - \(Formatadores.numero(item.ganhoDiario, casas: 3)) kg/dia")
                            .font(.caption2)
                            .foregroundStyle(Tema.textoTenue)
                    }
                    Spacer(minLength: 8)
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(Formatadores.percentual(item.aderenciaGanho * 100, casas: 0))
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(item.aderenciaGanho >= 0.95 ? Tema.verdeClaro : Tema.laranja)
                        if let custo = item.custoPorArroba {
                            Text(Formatadores.moeda(custo) + "/@")
                                .font(.caption2)
                                .foregroundStyle(Tema.textoSuave)
                        }
                    }
                }
                .padding(.vertical, 3)
            }
        }
    }
}

/// Linha de um ciclo encerrado.
struct LinhaCiclo: View {
    let ciclo: CicloEncerrado

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(ciclo.nome)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Tema.texto)
                    .lineLimit(1)
                Text("\(Formatadores.data(ciclo.dataAbate)) - \(ciclo.animaisAbatidos) animais - \(Formatadores.numero(ciclo.diasReais, casas: 0)) dias")
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                Text("\(Formatadores.numero(ciclo.pesoInicial, casas: 0)) a \(Formatadores.numero(ciclo.pesoFinalReal, casas: 0)) kg - \(Formatadores.numero(ciclo.ganhoRealDiario, casas: 3)) kg/dia")
                    .font(.caption2)
                    .foregroundStyle(Tema.textoTenue)
            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 4) {
                Etiqueta(texto: Formatadores.percentual(ciclo.aderenciaGanho * 100, casas: 0),
                         cor: ciclo.aderenciaGanho >= 0.95 ? Tema.verdeClaro : Tema.laranja)
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Tema.textoTenue)
            }
        }
        .cartao(espacamento: 14, raio: Tema.raioPequeno)
        .contentShape(Rectangle())
    }
}
