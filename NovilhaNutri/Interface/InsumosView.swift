import SwiftUI

/// Cadastro de alimentos e utilitário de conversão para sacas.
struct InsumosView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var insumoEmEdicao: Insumo?
    @State private var criandoInsumo = false
    @State private var mostrarConversor = false

    var body: some View {
        List {
            ForEach(CategoriaInsumo.allCases) { categoria in
                let lista = estado.insumos(da: categoria)
                if !lista.isEmpty {
                    Section {
                        ForEach(lista) { insumo in
                            Button {
                                insumoEmEdicao = insumo
                            } label: {
                                LinhaInsumo(insumo: insumo,
                                            emUso: estado.lotesQueUsam(insumoID: insumo.id))
                            }
                            .buttonStyle(.plain)
                        }
                        .onDelete { indices in
                            for indice in indices {
                                estado.remover(insumoID: lista[indice].id)
                            }
                        }
                    } header: {
                        Label(categoria.nome, systemImage: categoria.simbolo)
                    }
                }
            }

            Section {
                Button {
                    mostrarConversor = true
                } label: {
                    Label("Conversor de quilos e sacas", systemImage: "arrow.left.arrow.right")
                }
                Button {
                    estado.restaurarCatalogoPadrao()
                } label: {
                    Label("Restaurar alimentos padrão", systemImage: "arrow.counterclockwise")
                }
            } footer: {
                Text("Os teores de MS, PB e NDT são valores de referência. Ajuste conforme a análise do alimento da sua propriedade.")
            }
        }
        .navigationTitle("Insumos")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    criandoInsumo = true
                } label: {
                    Label("Novo insumo", systemImage: "plus")
                }
            }
        }
        .sheet(item: $insumoEmEdicao) { insumo in
            InsumoEditorView(insumo: insumo, novo: false)
        }
        .sheet(isPresented: $criandoInsumo) {
            InsumoEditorView(insumo: Insumo(nome: "", categoria: .energetico,
                                            materiaSeca: 88, proteinaBruta: 9, ndt: 80),
                             novo: true)
        }
        .sheet(isPresented: $mostrarConversor) {
            ConversorView()
        }
    }
}

struct LinhaInsumo: View {
    let insumo: Insumo
    let emUso: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(insumo.nome)
                    .font(.subheadline.weight(.medium))
                Spacer()
                if emUso > 0 {
                    Etiqueta(texto: "\(emUso) lote\(emUso == 1 ? "" : "s")",
                             cor: Paleta.cor(de: insumo.categoria))
                }
            }
            Text(insumo.resumoBromatologico)
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(spacing: 10) {
                Label(insumo.embalagem.descricao, systemImage: "shippingbox")
                if insumo.precoUnitario > 0 {
                    Label(Formatadores.moeda(insumo.precoUnitario), systemImage: "tag")
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
    }
}

/// Formulário de um alimento.
struct InsumoEditorView: View {
    @EnvironmentObject private var estado: AppEstado
    @Environment(\.dismiss) private var fechar

    @State private var insumo: Insumo
    private let novo: Bool
    @State private var tamanhoPersonalizado = false

    init(insumo: Insumo, novo: Bool) {
        _insumo = State(initialValue: insumo)
        self.novo = novo
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Identificação") {
                    TextField("Nome", text: $insumo.nome)
                    Picker("Categoria", selection: $insumo.categoria) {
                        ForEach(CategoriaInsumo.allCases) { categoria in
                            Text(categoria.nome).tag(categoria)
                        }
                    }
                }

                Section {
                    CampoNumerico(titulo: "Matéria seca", valor: $insumo.materiaSeca, casas: 1, sufixo: "%")
                    CampoNumerico(titulo: "Proteína bruta", valor: $insumo.proteinaBruta, casas: 1, sufixo: "%")
                    CampoNumerico(titulo: "NDT", valor: $insumo.ndt, casas: 1, sufixo: "%")
                } header: {
                    Text("Composição")
                } footer: {
                    Text("PB e NDT sempre em percentual da matéria seca. Em 1 kg natural deste alimento há \(Formatadores.numero(insumo.fracaoMateriaSeca, casas: 3)) kg de matéria seca, \(Formatadores.gramas(insumo.fracaoMateriaSeca * insumo.proteinaBruta * 10)) de PB e \(Formatadores.gramas(insumo.fracaoMateriaSeca * insumo.ndt * 10)) de NDT.")
                }

                Section {
                    Picker("Forma de aquisição", selection: $insumo.embalagem.tipo) {
                        ForEach(Embalagem.Tipo.allCases) { tipo in
                            Text(tipo.nome).tag(tipo)
                        }
                    }
                    if insumo.embalagem.tipo == .saca {
                        Picker("Tamanho da saca", selection: Binding(
                            get: {
                                Embalagem.tamanhosPadrao.contains(insumo.embalagem.kgPorSaca)
                                    ? insumo.embalagem.kgPorSaca : -1
                            },
                            set: { novo in
                                if novo > 0 {
                                    insumo.embalagem.kgPorSaca = novo
                                    tamanhoPersonalizado = false
                                } else {
                                    tamanhoPersonalizado = true
                                }
                            })) {
                            ForEach(Embalagem.tamanhosPadrao, id: \.self) { tamanho in
                                Text("\(Formatadores.numero(tamanho, casas: 0)) kg").tag(tamanho)
                            }
                            Text("Outro").tag(-1.0)
                        }
                        if tamanhoPersonalizado || !Embalagem.tamanhosPadrao.contains(insumo.embalagem.kgPorSaca) {
                            CampoNumerico(titulo: "Peso da saca",
                                          valor: $insumo.embalagem.kgPorSaca, casas: 1, sufixo: "kg")
                        }
                    }
                    if insumo.embalagem.tipo != .pastejo {
                        CampoNumerico(titulo: precoTitulo, valor: $insumo.precoUnitario,
                                      casas: 2, sufixo: "R$")
                    }
                } header: {
                    Text("Compra")
                } footer: {
                    if insumo.embalagem.tipo != .pastejo && insumo.precoUnitario > 0 {
                        Text("Equivale a \(Formatadores.moeda(insumo.precoPorKg)) por quilo natural e \(Formatadores.moeda(insumo.precoPorKgMateriaSeca)) por quilo de matéria seca.")
                    } else if insumo.embalagem.tipo == .pastejo {
                        Text("Alimentos de pastejo não entram na lista de compras nem no custo da ração.")
                    } else {
                        Text("Informe o preço para que os relatórios calculem o custo do ciclo.")
                    }
                }

                Section("Observação") {
                    TextField("Anotações", text: $insumo.observacao, axis: .vertical)
                        .lineLimit(1...4)
                }

                if !novo {
                    Section {
                        Button(role: .destructive) {
                            estado.remover(insumoID: insumo.id)
                            fechar()
                        } label: {
                            Label("Excluir insumo", systemImage: "trash")
                        }
                    } footer: {
                        let usos = estado.lotesQueUsam(insumoID: insumo.id)
                        if usos > 0 {
                            Text("Este alimento é usado por \(usos) lote\(usos == 1 ? "" : "s"). Ao excluir, os lotes passam a usar o primeiro alimento disponível da categoria.")
                        }
                    }
                }
            }
            .navigationTitle(novo ? "Novo insumo" : "Editar insumo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") { salvar() }
                }
            }
        }
    }

    private var precoTitulo: String {
        insumo.embalagem.tipo == .granel ? "Preço por tonelada" : "Preço por saca"
    }

    private func salvar() {
        var ajustado = insumo
        if ajustado.nome.trimmingCharacters(in: .whitespaces).isEmpty {
            ajustado.nome = ajustado.categoria.nome
        }
        ajustado.materiaSeca = min(max(ajustado.materiaSeca, 1), 100)
        ajustado.proteinaBruta = max(0, ajustado.proteinaBruta)
        ajustado.ndt = min(max(ajustado.ndt, 0), 100)
        ajustado.precoUnitario = max(0, ajustado.precoUnitario)
        if ajustado.embalagem.tipo == .saca {
            ajustado.embalagem.kgPorSaca = min(max(ajustado.embalagem.kgPorSaca, 1), 1200)
        }
        estado.salvar(insumo: ajustado)
        fechar()
    }
}

/// Conversor livre entre quilos, sacas e toneladas.
struct ConversorView: View {
    @Environment(\.dismiss) private var fechar
    @State private var quilos: Double = 1000

    var body: some View {
        NavigationStack {
            List {
                Section("Quantidade") {
                    CampoNumerico(titulo: "Total", valor: $quilos, casas: 1, sufixo: "kg")
                    LinhaDado(rotulo: "Em toneladas",
                              valor: "\(Formatadores.numero(quilos / 1000, casas: 3)) t")
                }
                Section {
                    ForEach(ConversorSacas.equivalencias(kg: max(0, quilos)), id: \.kgPorUnidade) { conversao in
                        VStack(alignment: .leading, spacing: 2) {
                            LinhaDado(rotulo: "Saca de \(Formatadores.numero(conversao.kgPorUnidade, casas: 0)) kg",
                                      valor: "\(Formatadores.numero(conversao.unidadesExatas, casas: 2)) sacas")
                            Text("\(conversao.descricao) - comprar \(conversao.descricaoCompra)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                } header: {
                    Text("Equivalência nos tamanhos de mercado")
                } footer: {
                    Text("A linha de compra arredonda sempre para cima, porque não se compra fração de saca.")
                }
            }
            .navigationTitle("Conversor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fechar") { fechar() }
                }
            }
        }
    }
}
