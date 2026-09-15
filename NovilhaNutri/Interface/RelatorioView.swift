import SwiftUI

/// Relatórios de planejamento do abate e de compra de insumos.
struct RelatorioView: View {
    @EnvironmentObject private var estado: AppEstado

    private let colunas = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if let lote = estado.loteSelecionado {
                conteudo(lote: lote)
            } else {
                SemLoteView()
            }
        }
        .navigationTitle("Relatórios")
        .barraEscura()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { SeletorLoteBotao() }
        }
    }

    @ViewBuilder
    private func conteudo(lote: Lote) -> some View {
        let relatorio = estado.relatorio(para: lote)

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if relatorio.viavel {
                    cabecalho(relatorio: relatorio)
                    indicadores(relatorio: relatorio)
                    grafico(relatorio: relatorio)
                    abate(relatorio: relatorio)
                    insumosDoCiclo(relatorio: relatorio)
                    if relatorio.custoTotal > 0 { custos(relatorio: relatorio) }
                    periodos(relatorio: relatorio)
                    compartilhar(relatorio: relatorio)
                } else {
                    EstadoVazio(simbolo: "doc.text.magnifyingglass",
                                titulo: "Sem projeção",
                                mensagem: relatorio.alertas.first ?? "Ajuste os dados do lote para gerar o planejamento.")
                }
                if !relatorio.alertas.isEmpty && relatorio.viavel {
                    avisos(relatorio.alertas)
                }
            }
            .padding(16)
            .padding(.bottom, 20)
        }
        .fundoTela()
    }

    // MARK: - Blocos

    private func cabecalho(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(relatorio.lote.nome)
                .font(.title2.weight(.bold))
                .foregroundStyle(Tema.texto)
            Text("De \(Formatadores.kg(relatorio.pesoInicial)) até \(Formatadores.kg(relatorio.pesoAlvo)) com \(Formatadores.numero(relatorio.lote.ganhoMetaDiario, casas: 3)) kg/dia")
                .font(.footnote)
                .foregroundStyle(Tema.textoSuave)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func indicadores(relatorio: RelatorioPlanejamento) -> some View {
        LazyVGrid(columns: colunas, spacing: 10) {
            CartaoIndicador(titulo: "Dias até o abate",
                            valor: Formatadores.numero(relatorio.diasTotais, casas: 0),
                            detalhe: Formatadores.duracao(dias: relatorio.diasTotais),
                            simbolo: "calendar",
                            cor: Paleta.terra)
            CartaoIndicador(titulo: "Data prevista",
                            valor: Formatadores.data(relatorio.dataAbate),
                            detalhe: "Início em \(Formatadores.data(relatorio.dataInicio))",
                            simbolo: "flag.checkered",
                            cor: Paleta.verde)
            CartaoIndicador(titulo: "Arrobas produzidas",
                            valor: Formatadores.arroba(relatorio.arrobasProduzidasLote),
                            detalhe: "\(Formatadores.arroba(relatorio.arrobasProduzidasPorAnimal)) por animal",
                            simbolo: "scalemass",
                            cor: Paleta.proteina)
            CartaoIndicador(titulo: "Conversão alimentar",
                            valor: Formatadores.numero(relatorio.conversaoAlimentar),
                            detalhe: "kg de MS por kg de ganho",
                            simbolo: "arrow.triangle.2.circlepath",
                            cor: Paleta.energia)
        }
    }

    private func grafico(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TituloSecao(texto: "Evolução do peso")
            let pontos = pontosDoGrafico(relatorio)
            GraficoEvolucao(pontos: pontos)
                .frame(height: 140)
            HStack {
                Text(Formatadores.data(relatorio.dataInicio))
                Spacer()
                Text(Formatadores.data(relatorio.dataAbate))
            }
            .font(.caption2)
            .foregroundStyle(Tema.textoSuave)
        }
        .cartao(espacamento: 14)
    }

    private func pontosDoGrafico(_ relatorio: RelatorioPlanejamento) -> [PontoGrafico] {
        var lista = [PontoGrafico(dia: 0, peso: relatorio.pesoInicial)]
        var dias = 0.0
        for periodo in relatorio.periodos {
            dias += periodo.dias
            lista.append(PontoGrafico(dia: dias, peso: periodo.pesoFinal))
        }
        return lista
    }

    private func abate(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TituloSecao(texto: "Planejamento do abate")
            VStack(spacing: 8) {
                LinhaDado(rotulo: "Peso vivo no abate", valor: Formatadores.kg(relatorio.pesoAlvo))
                LinhaDado(rotulo: "Rendimento de carcaça",
                          valor: Formatadores.percentual(relatorio.lote.rendimentoCarcaca * 100))
                LinhaDado(rotulo: "Carcaça por animal",
                          valor: "\(Formatadores.kg(relatorio.pesoCarcacaFinal)) - \(Formatadores.arroba(relatorio.arrobasFinais))")
                LinhaDado(rotulo: "Carcaça do lote",
                          valor: "\(Formatadores.kg(relatorio.pesoCarcacaFinal * Double(relatorio.animais))) - \(Formatadores.arroba(relatorio.arrobasTotaisLote))")
                Divider()
                LinhaDado(rotulo: "Ganho por animal", valor: Formatadores.kg(relatorio.ganhoPorAnimal))
                LinhaDado(rotulo: "Ganho do lote", valor: Formatadores.kg(relatorio.ganhoTotalLote))
                LinhaDado(rotulo: "Arrobas produzidas no ciclo",
                          valor: Formatadores.arroba(relatorio.arrobasProduzidasLote),
                          destaque: true)
            }
            .cartao(espacamento: 14)
        }
    }

    private func insumosDoCiclo(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TituloSecao(texto: "Insumos do ciclo completo")
            Text("Quantidade total para \(relatorio.animais) animais durante \(Formatadores.numero(relatorio.diasTotais, casas: 0)) dias.")
                .font(.caption)
                .foregroundStyle(Tema.textoSuave)

            VStack(spacing: 12) {
                ForEach(relatorio.totais) { total in
                    CartaoConsumo(consumo: total)
                    if total.id != relatorio.totais.last?.id { Divider() }
                }
                Divider()
                LinhaDado(rotulo: "Matéria seca total do lote",
                          valor: Formatadores.kg(relatorio.materiaSecaTotal),
                          destaque: true)
                LinhaDado(rotulo: "Consumo médio por animal por dia",
                          valor: Formatadores.kg(relatorio.consumoMedioMateriaSeca))
            }
            .cartao(espacamento: 14)
        }
    }

    private func custos(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TituloSecao(texto: "Custos do ciclo")
            VStack(spacing: 8) {
                LinhaDado(rotulo: "Custo total", valor: Formatadores.moeda(relatorio.custoTotal), destaque: true)
                LinhaDado(rotulo: "Por animal", valor: Formatadores.moeda(relatorio.custoPorAnimal))
                LinhaDado(rotulo: "Por animal por dia", valor: Formatadores.moeda(relatorio.custoPorAnimalDia))
                LinhaDado(rotulo: "Por quilo de ganho", valor: Formatadores.moeda(relatorio.custoPorKgGanho))
                LinhaDado(rotulo: "Por arroba produzida",
                          valor: Formatadores.moeda(relatorio.custoPorArroba),
                          destaque: true)
            }
            .cartao(espacamento: 14)
            Text("Considera apenas os alimentos com preço cadastrado. Pastejo não entra no custo.")
                .font(.caption2)
                .foregroundStyle(Tema.textoSuave)
        }
    }

    private func periodos(relatorio: RelatorioPlanejamento) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TituloSecao(texto: "Períodos de \(relatorio.lote.diasPorPeriodo) dias")
            VStack(spacing: 0) {
                ForEach(relatorio.periodos) { periodo in
                    NavigationLink {
                        PeriodoDetalheView(periodo: periodo, lote: relatorio.lote)
                    } label: {
                        LinhaPeriodo(periodo: periodo)
                    }
                    .buttonStyle(.plain)
                    if periodo.id != relatorio.periodos.last?.id { Divider() }
                }
            }
            .cartao(espacamento: 14)
        }
    }

    private func compartilhar(relatorio: RelatorioPlanejamento) -> some View {
        BotaoCompartilhar {
            // O return é obrigatório: sem ele o Swift lê o colchete que abre
            // como lista de captura da closure, não como início do vetor.
            return [RelatorioTexto.gerar(relatorio)]
        } rotulo: {
            Label("Compartilhar relatório completo", systemImage: "square.and.arrow.up")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Paleta.verde, in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.white)
        }
    }

    private func avisos(_ alertas: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            TituloSecao(texto: "Observações")
            ForEach(Array(alertas.enumerated()), id: \.offset) { _, texto in
                Aviso(texto: texto)
            }
        }
        .cartao(cor: Tema.laranja.opacity(0.10), espacamento: 14)
    }
}

/// Cartão com o total de um insumo em quilos e sacas.
struct CartaoConsumo: View {
    let consumo: ConsumoInsumo

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Circle()
                    .fill(Paleta.cor(de: consumo.insumo.categoria))
                    .frame(width: 8, height: 8)
                Text(consumo.insumo.nome)
                    .font(.subheadline.weight(.medium))
                Spacer()
                Text(Formatadores.numero(consumo.kgMateriaNatural, casas: 0) + " kg")
                    .font(.subheadline.weight(.semibold).monospacedDigit())
            }
            if let conversao = consumo.conversao {
                HStack(spacing: 6) {
                    Image(systemName: "shippingbox.fill")
                        .font(.caption2)
                        .foregroundStyle(Tema.textoSuave)
                    Text(conversao.descricao)
                        .font(.caption)
                    Spacer()
                    Etiqueta(texto: "comprar \(conversao.descricaoCompra)", cor: Paleta.terra)
                }
                Text("\(Formatadores.numero(conversao.unidadesExatas, casas: 2)) \(conversao.nomeUnidadePlural) - \(Formatadores.numero(consumo.toneladas, casas: 2)) t")
                    .font(.caption2)
                    .foregroundStyle(Tema.textoSuave)
            } else {
                Text("Fornecido no pastejo - \(Formatadores.numero(consumo.toneladas, casas: 2)) t de matéria natural")
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
            }
            if consumo.custo > 0 {
                Text("Custo \(Formatadores.moeda(consumo.custo))")
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
            }
        }
    }
}

/// Linha resumida de um período.
struct LinhaPeriodo: View {
    let periodo: PeriodoPlano

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text("\(periodo.titulo) - \(Formatadores.numero(periodo.dias, casas: 0)) dias")
                    .font(.subheadline.weight(.medium))
                Text("\(Formatadores.numero(periodo.pesoInicial, casas: 0)) a \(Formatadores.numero(periodo.pesoFinal, casas: 0)) kg - \(Formatadores.data(periodo.dataInicio))")
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                Text("MS \(Formatadores.kg(periodo.exigencia.consumoMateriaSeca))/dia - PB \(Formatadores.gramas(periodo.exigencia.proteinaBrutaGramas))/dia")
                    .font(.caption2)
                    .foregroundStyle(Tema.textoSuave)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(Tema.textoTenue)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

/// Detalhe de um período do planejamento.
struct PeriodoDetalheView: View {
    let periodo: PeriodoPlano
    let lote: Lote

    var body: some View {
        List {
            Section("Período") {
                LinhaDado(rotulo: "Início", valor: Formatadores.data(periodo.dataInicio))
                LinhaDado(rotulo: "Fim", valor: Formatadores.data(periodo.dataFim))
                LinhaDado(rotulo: "Duração", valor: "\(Formatadores.numero(periodo.dias, casas: 0)) dias")
                LinhaDado(rotulo: "Peso médio", valor: Formatadores.kg(periodo.pesoMedio))
                LinhaDado(rotulo: "Ganho no período", valor: Formatadores.kg(periodo.ganhoNoPeriodo))
                LinhaDado(rotulo: "Animais", valor: "\(periodo.animais)")
            }
            .listRowBackground(Tema.superficie)

            Section("Exigência diária por animal") {
                LinhaDado(rotulo: "Matéria seca", valor: Formatadores.kg(periodo.exigencia.consumoMateriaSeca))
                LinhaDado(rotulo: "Proteína bruta",
                          valor: "\(Formatadores.gramas(periodo.exigencia.proteinaBrutaGramas)) (\(Formatadores.percentual(periodo.exigencia.proteinaBrutaPercentualDieta)))")
                LinhaDado(rotulo: "NDT",
                          valor: "\(Formatadores.kg(periodo.exigencia.ndtKg)) (\(Formatadores.percentual(periodo.exigencia.ndtPercentualDieta)))")
            }
            .listRowBackground(Tema.superficie)

            Section("Ração diária por animal") {
                ForEach(periodo.composicao.itens) { item in
                    LinhaDado(rotulo: item.insumo.nome,
                              valor: "\(Formatadores.kg(item.kgMateriaNatural)) natural")
                }
            }
            .listRowBackground(Tema.superficie)

            Section {
                ForEach(periodo.consumos) { consumo in
                    VStack(alignment: .leading, spacing: 4) {
                        LinhaDado(rotulo: consumo.insumo.nome,
                                  valor: Formatadores.numero(consumo.kgMateriaNatural, casas: 0) + " kg",
                                  destaque: true)
                        if let conversao = consumo.conversao {
                            Text("\(conversao.descricao) - comprar \(conversao.descricaoCompra)")
                                .font(.caption)
                                .foregroundStyle(Tema.textoSuave)
                        } else {
                            Text("Fornecido no pastejo")
                                .font(.caption)
                                .foregroundStyle(Tema.textoSuave)
                        }
                    }
                    .padding(.vertical, 2)
                }
            } header: {
                Text("Total do período para o lote")
            } footer: {
                if periodo.custo > 0 {
                    Text("Custo do período: \(Formatadores.moeda(periodo.custo)) - \(Formatadores.moeda(periodo.custoPorAnimalDia)) por animal por dia.")
                }
            }
            .listRowBackground(Tema.superficie)
        }
        .navigationTitle(periodo.titulo)
        .navigationBarTitleDisplayMode(.inline)
        .listaEscura()
        .barraEscura()
    }
}
