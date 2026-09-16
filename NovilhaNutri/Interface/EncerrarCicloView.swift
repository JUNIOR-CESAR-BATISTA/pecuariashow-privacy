import SwiftUI

/// Formulário de encerramento: o que aconteceu de fato com o lote abatido.
struct EncerrarCicloView: View {
    @EnvironmentObject private var estado: AppEstado
    @Environment(\.dismiss) private var fechar

    private let lote: Lote
    @State private var resultado: ResultadoAbate
    @State private var confirmando = false

    init(lote: Lote) {
        self.lote = lote
        _resultado = State(initialValue: ResultadoAbate(
            pesoFinalReal: lote.pesoAtual >= lote.pesoAlvoAbate ? lote.pesoAtual : lote.pesoAlvoAbate,
            animaisAbatidos: lote.quantidadeAnimais))
    }

    private var rendimentoCalculado: Double? {
        guard resultado.pesoCarcacaReal > 0, resultado.pesoFinalReal > 0 else { return nil }
        return resultado.pesoCarcacaReal / resultado.pesoFinalReal
    }

    private var ganhoDiarioCalculado: Double {
        let dias = resultado.dataAbate.timeIntervalSince(lote.dataEntrada) / 86_400
        guard dias >= 1 else { return 0 }
        return (resultado.pesoFinalReal - lote.pesoMedioInicial) / dias
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Data do abate", selection: $resultado.dataAbate,
                               displayedComponents: .date)
                    CampoNumerico(titulo: "Peso vivo médio", valor: $resultado.pesoFinalReal,
                                  casas: 1, sufixo: "kg")
                    CampoInteiro(titulo: "Animais abatidos", valor: $resultado.animaisAbatidos,
                                 sufixo: "cab")
                } header: {
                    Text("Abate")
                } footer: {
                    Text("O lote entrou com \(lote.quantidadeAnimais) animais em \(Formatadores.data(lote.dataEntrada)), pesando \(Formatadores.kg(lote.pesoMedioInicial)). Meta de ganho: \(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia.")
                }
                .listRowBackground(Tema.superficie)

                Section {
                    CampoNumerico(titulo: "Carcaça média", valor: $resultado.pesoCarcacaReal,
                                  casas: 1, sufixo: "kg")
                    if let rendimento = rendimentoCalculado {
                        LinhaDado(rotulo: "Rendimento de carcaça",
                                  valor: Formatadores.percentual(rendimento * 100),
                                  destaque: true,
                                  cor: Tema.ouro)
                        LinhaDado(rotulo: "Arrobas por animal",
                                  valor: Formatadores.arroba(resultado.pesoCarcacaReal / 15))
                    }
                } header: {
                    Text("Carcaça")
                } footer: {
                    Text("Peso médio de carcaça informado pelo frigorífico. Sem ele não dá para calcular rendimento, arrobas produzidas nem custo por arroba. Pode ficar em branco e ser preenchido depois.")
                }
                .listRowBackground(Tema.superficie)

                Section {
                    CampoNumerico(titulo: "Concentrado usado", valor: $resultado.concentradoReal,
                                  casas: 0, sufixo: "kg")
                    CampoNumerico(titulo: "Custo total do ciclo", valor: $resultado.custoReal,
                                  casas: 2, sufixo: "R$")
                    CampoNumerico(titulo: "Preço recebido", valor: $resultado.precoArroba,
                                  casas: 2, sufixo: "R$/@")
                } header: {
                    Text("Consumo e dinheiro")
                } footer: {
                    Text("Some as sacas de concentrado que saíram do estoque para este lote. Esses dados são opcionais, mas é com eles que a análise compara o gasto planejado com o real e mostra o custo por arroba.")
                }
                .listRowBackground(Tema.superficie)

                Section {
                    LinhaDado(rotulo: "Ganho médio observado",
                              valor: "\(Formatadores.numero(ganhoDiarioCalculado, casas: 3)) kg/dia",
                              destaque: true,
                              cor: corDoGanho)
                    LinhaDado(rotulo: "Meta planejada",
                              valor: "\(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia")
                    if lote.ganhoMetaDiario > 0 {
                        LinhaDado(rotulo: "Aderência à meta",
                                  valor: Formatadores.percentual(ganhoDiarioCalculado / lote.ganhoMetaDiario * 100, casas: 0))
                    }
                } header: {
                    Text("Prévia do desempenho")
                }
                .listRowBackground(Tema.superficie)

                Section("Observações") {
                    TextField("Sanidade, clima, manejo, o que explicou o resultado",
                              text: $resultado.observacoes, axis: .vertical)
                        .lineLimit(1...4)
                }
                .listRowBackground(Tema.superficie)

                Section {
                    Button {
                        confirmando = true
                    } label: {
                        Label("Encerrar ciclo e arquivar", systemImage: "flag.checkered")
                            .foregroundStyle(Tema.ouro)
                    }
                } footer: {
                    Text("O lote sai do rebanho e passa a fazer parte do histórico, servindo de base de cálculo para os próximos lotes.")
                }
                .listRowBackground(Tema.superficie)
            }
            .listaEscura()
            .barraEscura()
            .navigationTitle("Encerrar ciclo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
            }
            .confirmationDialog("Encerrar o ciclo deste lote?",
                                isPresented: $confirmando,
                                titleVisibility: .visible) {
                Button("Encerrar e arquivar") { encerrar() }
                Button("Cancelar", role: .cancel) { }
            } message: {
                Text("\(lote.nome) sai da lista de lotes ativos e vira histórico. Os dados continuam no aparelho, na aba Análise.")
            }
        }
    }

    private var corDoGanho: Color {
        guard lote.ganhoMetaDiario > 0 else { return Tema.texto }
        let aderencia = ganhoDiarioCalculado / lote.ganhoMetaDiario
        if aderencia < 0.90 { return Tema.vermelho }
        if aderencia > 1.10 { return Tema.laranja }
        return Tema.verdeClaro
    }

    private func encerrar() {
        var ajustado = resultado
        ajustado.pesoFinalReal = max(lote.pesoMedioInicial, ajustado.pesoFinalReal)
        ajustado.animaisAbatidos = min(max(1, ajustado.animaisAbatidos), lote.quantidadeAnimais)
        ajustado.pesoCarcacaReal = max(0, ajustado.pesoCarcacaReal)
        ajustado.concentradoReal = max(0, ajustado.concentradoReal)
        ajustado.custoReal = max(0, ajustado.custoReal)
        ajustado.precoArroba = max(0, ajustado.precoArroba)
        estado.encerrarCiclo(lote: lote, resultado: ajustado)
        fechar()
    }
}

/// Detalhe de um ciclo já encerrado, comparando previsto e realizado.
struct CicloDetalheView: View {
    @EnvironmentObject private var estado: AppEstado
    let ciclo: CicloEncerrado
    @State private var confirmandoExclusao = false

    var body: some View {
        List {
            Section("Ciclo") {
                LinhaDado(rotulo: "Início", valor: Formatadores.data(ciclo.dataInicio))
                LinhaDado(rotulo: "Abate", valor: Formatadores.data(ciclo.dataAbate))
                LinhaDado(rotulo: "Duração", valor: Formatadores.duracao(dias: ciclo.diasReais))
                LinhaDado(rotulo: "Categoria",
                          valor: "\(ciclo.grupoGenetico.nomeCurto) - \(ciclo.sistema.nome)")
            }
            .listRowBackground(Tema.superficie)

            Section {
                ComparacaoLinha(rotulo: "Ganho diário",
                                previsto: "\(Formatadores.numero(ciclo.ganhoMeta, casas: 3)) kg",
                                realizado: "\(Formatadores.numero(ciclo.ganhoRealDiario, casas: 3)) kg",
                                aderencia: ciclo.aderenciaGanho)
                ComparacaoLinha(rotulo: "Peso final",
                                previsto: Formatadores.kg(ciclo.pesoAlvo),
                                realizado: Formatadores.kg(ciclo.pesoFinalReal),
                                aderencia: ciclo.pesoAlvo > 0 ? ciclo.pesoFinalReal / ciclo.pesoAlvo : 1)
                if ciclo.diasPlanejados > 0 {
                    ComparacaoLinha(rotulo: "Dias de ciclo",
                                    previsto: Formatadores.numero(ciclo.diasPlanejados, casas: 0),
                                    realizado: Formatadores.numero(ciclo.diasReais, casas: 0),
                                    aderencia: ciclo.diasPlanejados / max(ciclo.diasReais, 1))
                }
                if let concentrado = ciclo.aderenciaConcentrado {
                    ComparacaoLinha(rotulo: "Concentrado",
                                    previsto: Formatadores.numero(ciclo.concentradoPrevisto, casas: 0) + " kg",
                                    realizado: Formatadores.numero(ciclo.concentradoReal, casas: 0) + " kg",
                                    aderencia: concentrado)
                }
                if ciclo.custoPrevisto > 0, ciclo.custoReal > 0 {
                    ComparacaoLinha(rotulo: "Custo",
                                    previsto: Formatadores.moeda(ciclo.custoPrevisto),
                                    realizado: Formatadores.moeda(ciclo.custoReal),
                                    aderencia: ciclo.custoPrevisto / max(ciclo.custoReal, 1))
                }
            } header: {
                Text("Previsto contra realizado")
            } footer: {
                Text("A porcentagem mostra quanto do planejado foi entregue. Perto de 100% significa plano e realidade batendo.")
            }
            .listRowBackground(Tema.superficie)

            Section("Resultado") {
                LinhaDado(rotulo: "Animais abatidos",
                          valor: "\(ciclo.animaisAbatidos) de \(ciclo.animaisIniciais)")
                if let rendimento = ciclo.rendimentoReal {
                    LinhaDado(rotulo: "Rendimento de carcaça",
                              valor: Formatadores.percentual(rendimento * 100))
                    LinhaDado(rotulo: "Carcaça por animal",
                              valor: "\(Formatadores.kg(ciclo.pesoCarcacaReal)) - \(Formatadores.arroba(ciclo.arrobasPorAnimal))")
                    LinhaDado(rotulo: "Arrobas produzidas",
                              valor: Formatadores.arroba(ciclo.arrobasProduzidasLote),
                              destaque: true)
                }
                if let custo = ciclo.custoPorArroba {
                    LinhaDado(rotulo: "Custo por arroba", valor: Formatadores.moeda(custo))
                }
                if let margem = ciclo.margem {
                    LinhaDado(rotulo: "Margem do ciclo",
                              valor: Formatadores.moeda(margem),
                              destaque: true,
                              cor: margem >= 0 ? Tema.verdeClaro : Tema.vermelho)
                }
            }
            .listRowBackground(Tema.superficie)

            Section("Dieta do ciclo") {
                LinhaDado(rotulo: "Volumoso", valor: ciclo.volumosoNome)
                LinhaDado(rotulo: "Energético", valor: ciclo.energeticoNome)
                LinhaDado(rotulo: "Proteico", valor: ciclo.proteicoNome)
                LinhaDado(rotulo: "Dieta planejada",
                          valor: "\(Formatadores.percentual(ciclo.pbDietaMedia)) PB - \(Formatadores.percentual(ciclo.ndtDietaMedia)) NDT")
                if let fator = AnalisadorHistorico.fatorConsumo(do: ciclo) {
                    LinhaDado(rotulo: "Consumo que explica o ganho",
                              valor: Formatadores.numero(fator, casas: 2) + "x",
                              cor: fator < 0.95 ? Tema.laranja : Tema.verdeClaro)
                }
            }
            .listRowBackground(Tema.superficie)

            if !ciclo.observacoes.isEmpty {
                Section("Observações") {
                    Text(ciclo.observacoes)
                        .font(.footnote)
                        .foregroundStyle(Tema.textoSuave)
                }
                .listRowBackground(Tema.superficie)
            }

            Section {
                Button(role: .destructive) {
                    confirmandoExclusao = true
                } label: {
                    Label("Excluir do histórico", systemImage: "trash")
                }
            } footer: {
                Text("Excluir remove este ciclo da base de cálculo dos próximos lotes.")
            }
            .listRowBackground(Tema.superficie)
        }
        .listaEscura()
        .barraEscura()
        .navigationTitle(ciclo.nome)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Excluir este ciclo do histórico?",
                            isPresented: $confirmandoExclusao,
                            titleVisibility: .visible) {
            Button("Excluir", role: .destructive) { estado.remover(cicloID: ciclo.id) }
            Button("Cancelar", role: .cancel) { }
        }
    }
}

/// Linha com valor previsto, realizado e aderência.
struct ComparacaoLinha: View {
    let rotulo: String
    let previsto: String
    let realizado: String
    let aderencia: Double

    private var cor: Color {
        if aderencia < 0.90 { return Tema.vermelho }
        if aderencia > 1.10 { return Tema.laranja }
        return Tema.verdeClaro
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(rotulo)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Tema.texto)
                Spacer()
                Text(Formatadores.percentual(aderencia * 100, casas: 0))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(cor)
            }
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Previsto")
                        .font(.caption2)
                        .foregroundStyle(Tema.textoTenue)
                    Text(previsto)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Tema.textoSuave)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("Realizado")
                        .font(.caption2)
                        .foregroundStyle(Tema.textoTenue)
                    Text(realizado)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Tema.texto)
                }
                Spacer()
            }
        }
        .padding(.vertical, 3)
    }
}
