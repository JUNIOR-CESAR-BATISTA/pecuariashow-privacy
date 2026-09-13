import SwiftUI

/// Formulário de cadastro e edição de um lote.
struct LoteEditorView: View {
    @EnvironmentObject private var estado: AppEstado
    @Environment(\.dismiss) private var fechar

    @State private var lote: Lote
    private let novo: Bool
    @State private var adicionandoPesagem = false
    @State private var confirmandoExclusao = false

    init(lote: Lote, novo: Bool) {
        _lote = State(initialValue: lote)
        self.novo = novo
    }

    private var previa: ExigenciaDiaria {
        MotorExigencias.calcular(perfil: lote.perfilAtual, ganhoMeta: lote.ganhoMetaDiario)
    }

    private var rendimentoPercentual: Binding<Double> {
        Binding(get: { lote.rendimentoCarcaca * 100 },
                set: { lote.rendimentoCarcaca = min(max($0 / 100, 0.35), 0.65) })
    }

    var body: some View {
        NavigationStack {
            Form {
                identificacao
                animais
                metas
                racao
                pesagens
                previaSection
                if !novo {
                    Section {
                        Button(role: .destructive) {
                            confirmandoExclusao = true
                        } label: {
                            Label("Excluir lote", systemImage: "trash")
                        }
                    }
                }
            }
            .navigationTitle(novo ? "Novo lote" : "Editar lote")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") { salvar() }
                }
            }
            .sheet(isPresented: $adicionandoPesagem) {
                NovaPesagemView(pesoSugerido: lote.pesoAtual) { pesagem in
                    lote.pesagens.append(pesagem)
                }
            }
            .confirmationDialog("Excluir este lote?",
                                isPresented: $confirmandoExclusao,
                                titleVisibility: .visible) {
                Button("Excluir", role: .destructive) {
                    estado.remover(loteID: lote.id)
                    fechar()
                }
                Button("Cancelar", role: .cancel) { }
            } message: {
                Text("Os dados deste lote serão apagados do aparelho.")
            }
        }
    }

    // MARK: - Seções

    private var identificacao: some View {
        Section("Identificação") {
            TextField("Nome do lote", text: $lote.nome)
            CampoInteiro(titulo: "Número de animais", valor: $lote.quantidadeAnimais, sufixo: "cab")
            DatePicker("Entrada no lote", selection: $lote.dataEntrada, displayedComponents: .date)
        }
    }

    private var animais: some View {
        Section {
            CampoNumerico(titulo: "Peso médio de entrada", valor: $lote.pesoMedioInicial,
                          casas: 1, sufixo: "kg")
            Picker("Fase", selection: $lote.fase) {
                ForEach(FaseAnimal.allCases) { fase in
                    Text(fase.nome).tag(fase)
                }
            }
            Picker("Grupo genético", selection: $lote.grupoGenetico) {
                ForEach(GrupoGenetico.allCases) { grupo in
                    Text(grupo.nomeCurto).tag(grupo)
                }
            }
            Picker("Sistema", selection: $lote.sistema) {
                ForEach(SistemaCriacao.allCases) { sistema in
                    Text(sistema.nome).tag(sistema)
                }
            }
        } header: {
            Text("Dados do rebanho")
        } footer: {
            Text("\(lote.fase.descricao). \(lote.sistema.descricao).")
        }
    }

    private var metas: some View {
        Section {
            CampoNumerico(titulo: "Meta de ganho diário", valor: $lote.ganhoMetaDiario,
                          casas: 3, sufixo: "kg/d")
            CampoNumerico(titulo: "Peso alvo de abate", valor: $lote.pesoAlvoAbate,
                          casas: 0, sufixo: "kg")
            CampoNumerico(titulo: "Rendimento de carcaça", valor: rendimentoPercentual,
                          casas: 1, sufixo: "%")
            CampoNumerico(titulo: "Peso de acabamento", valor: $lote.pesoFinalMaturidade,
                          casas: 0, sufixo: "kg")
            CampoInteiro(titulo: "Dias por período", valor: $lote.diasPorPeriodo, sufixo: "dias")
            CampoNumerico(titulo: "Ajuste de consumo", valor: $lote.ajusteConsumo,
                          casas: 2, sufixo: "x")
        } header: {
            Text("Metas e abate")
        } footer: {
            Text("Ganho sugerido para a fase \(lote.fase.nome.lowercased()): \(Formatadores.numero(lote.fase.gmdSugerido, casas: 3)) kg/dia. O peso de acabamento representa o peso em que a novilha termina e ajusta a exigência de energia. O ajuste de consumo calibra a previsão de consumo ao que você observa no cocho (1,00 = previsão padrão).")
        }
    }

    private var racao: some View {
        Section {
            SeletorInsumo(titulo: "Volumoso", categoria: .volumoso, selecao: $lote.volumosoID)
            SeletorInsumo(titulo: "Energético", categoria: .energetico, selecao: $lote.energeticoID)
            SeletorInsumo(titulo: "Proteico", categoria: .proteico, selecao: $lote.proteicoID)
            SeletorInsumo(titulo: "Mineral", categoria: .mineral, selecao: $lote.mineralID, permiteNenhum: true)
            CampoNumerico(titulo: "Mineral por animal", valor: $lote.restricoes.mineralGramasDia,
                          casas: 0, sufixo: "g/d")

            Toggle("Fixar participação do volumoso", isOn: Binding(
                get: { lote.restricoes.volumosoFixo != nil },
                set: { ligado in
                    lote.restricoes.volumosoFixo = ligado ? lote.fase.volumosoSugerido : nil
                }))

            if let fixo = lote.restricoes.volumosoFixo {
                VStack(alignment: .leading) {
                    HStack {
                        Text("Volumoso na matéria seca")
                        Spacer()
                        Text(Formatadores.percentual(fixo * 100, casas: 0))
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: Binding(get: { fixo },
                                          set: { lote.restricoes.volumosoFixo = $0 }),
                           in: 0.2...0.95, step: 0.05)
                        .tint(Paleta.verde)
                }
            } else {
                VStack(alignment: .leading) {
                    HStack {
                        Text("Volumoso mínimo")
                        Spacer()
                        Text(Formatadores.percentual(lote.restricoes.volumosoMinimo * 100, casas: 0))
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: $lote.restricoes.volumosoMinimo, in: 0.1...0.9, step: 0.05)
                        .tint(Paleta.verde)
                }
            }
        } header: {
            Text("Ração")
        } footer: {
            Text(lote.restricoes.volumosoFixo == nil
                 ? "No modo automático o aplicativo calcula a proporção dos três alimentos que atende exatamente PB e NDT, respeitando o mínimo de volumoso."
                 : "Com a participação do volumoso fixada, o concentrado é ajustado pela proteína e o saldo de energia é mostrado no resumo.")
        }
    }

    private var pesagens: some View {
        Section {
            if lote.pesagens.isEmpty {
                Text("Nenhuma pesagem registrada. O peso de entrada está sendo usado como peso atual.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(lote.pesagensOrdenadas) { pesagem in
                    HStack {
                        Text(Formatadores.data(pesagem.data))
                        Spacer()
                        Text(Formatadores.kg(pesagem.pesoMedio))
                            .foregroundStyle(.secondary)
                    }
                }
                .onDelete { indices in
                    let ordenadas = lote.pesagensOrdenadas
                    let alvos = indices.map { ordenadas[$0].id }
                    lote.pesagens.removeAll { alvos.contains($0.id) }
                }
            }
            Button {
                adicionandoPesagem = true
            } label: {
                Label("Registrar pesagem", systemImage: "plus.circle")
            }
        } header: {
            Text("Pesagens")
        } footer: {
            if let real = lote.ganhoRealDiario {
                Text("Ganho médio observado: \(Formatadores.numero(real, casas: 3)) kg/dia contra a meta de \(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia.")
            } else {
                Text("Registre pesagens para acompanhar o ganho real do lote.")
            }
        }
    }

    private var previaSection: some View {
        Section("Prévia das exigências diárias") {
            LinhaDado(rotulo: "Consumo de matéria seca",
                      valor: Formatadores.kg(previa.consumoMateriaSeca))
            LinhaDado(rotulo: "Proteína bruta",
                      valor: "\(Formatadores.gramas(previa.proteinaBrutaGramas)) (\(Formatadores.percentual(previa.proteinaBrutaPercentualDieta)))")
            LinhaDado(rotulo: "NDT",
                      valor: "\(Formatadores.kg(previa.ndtKg)) (\(Formatadores.percentual(previa.ndtPercentualDieta)))")
            if !previa.metaAtingivel {
                Aviso(texto: "Meta acima do ganho possível neste peso. Considere \(Formatadores.numero(previa.ganhoDiario, casas: 3)) kg/dia.")
            }
        }
    }

    // MARK: - Ações

    private func salvar() {
        var ajustado = lote
        if ajustado.nome.trimmingCharacters(in: .whitespaces).isEmpty {
            ajustado.nome = "Lote \(estado.lotes.count + 1)"
        }
        ajustado.quantidadeAnimais = max(1, ajustado.quantidadeAnimais)
        ajustado.pesoMedioInicial = max(50, ajustado.pesoMedioInicial)
        ajustado.pesoAlvoAbate = max(ajustado.pesoMedioInicial + 1, ajustado.pesoAlvoAbate)
        ajustado.pesoFinalMaturidade = max(200, ajustado.pesoFinalMaturidade)
        ajustado.ganhoMetaDiario = max(0, ajustado.ganhoMetaDiario)
        ajustado.diasPorPeriodo = min(max(7, ajustado.diasPorPeriodo), 180)
        ajustado.ajusteConsumo = min(max(0.7, ajustado.ajusteConsumo), 1.3)
        ajustado.restricoes.mineralGramasDia = max(0, ajustado.restricoes.mineralGramasDia)
        estado.salvar(lote: ajustado)
        fechar()
    }
}

/// Escolha de um insumo de uma categoria.
struct SeletorInsumo: View {
    @EnvironmentObject private var estado: AppEstado
    let titulo: String
    let categoria: CategoriaInsumo
    @Binding var selecao: UUID?
    var permiteNenhum: Bool = false

    var body: some View {
        Picker(titulo, selection: $selecao) {
            if permiteNenhum {
                Text("Nenhum").tag(UUID?.none)
            }
            ForEach(estado.insumos(da: categoria)) { insumo in
                Text(insumo.nome).tag(UUID?.some(insumo.id))
            }
        }
    }
}

/// Registro de uma nova pesagem.
struct NovaPesagemView: View {
    @Environment(\.dismiss) private var fechar
    let pesoSugerido: Double
    let aoSalvar: (Pesagem) -> Void

    @State private var data = Date()
    @State private var peso: Double
    @State private var observacao = ""

    init(pesoSugerido: Double, aoSalvar: @escaping (Pesagem) -> Void) {
        self.pesoSugerido = pesoSugerido
        self.aoSalvar = aoSalvar
        _peso = State(initialValue: pesoSugerido)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Data", selection: $data, displayedComponents: .date)
                CampoNumerico(titulo: "Peso médio", valor: $peso, casas: 1, sufixo: "kg")
                TextField("Observação", text: $observacao)
            }
            .navigationTitle("Nova pesagem")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        aoSalvar(Pesagem(data: data, pesoMedio: max(30, peso), observacao: observacao))
                        fechar()
                    }
                }
            }
        }
    }
}
