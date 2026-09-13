import Foundation

/// Tabela inicial de alimentos, com valores de referencia de composicao.
///
/// Os teores sao medias de tabelas brasileiras de composicao de alimentos e
/// servem apenas como ponto de partida: o produtor deve ajustar cada insumo
/// conforme a analise bromatologica do que tem na propriedade. Os precos
/// comecam zerados justamente porque variam por regiao e por safra.
enum CatalogoInsumos {

    private static func uid(_ texto: String) -> UUID {
        UUID(uuidString: texto) ?? UUID()
    }

    static let pastoAguasID = uid("11111111-0000-4000-A000-000000000001")
    static let silagemMilhoID = uid("11111111-0000-4000-A000-000000000003")
    static let milhoID = uid("11111111-0000-4000-A000-000000000010")
    static let fareloSojaID = uid("11111111-0000-4000-A000-000000000016")
    static let mineralID = uid("11111111-0000-4000-A000-000000000021")

    static let padrao: [Insumo] = [
        // Volumosos
        Insumo(id: pastoAguasID,
               nome: "Pasto - capim das aguas",
               categoria: .volumoso,
               materiaSeca: 28, proteinaBruta: 9.0, ndt: 58,
               embalagem: .pastejo,
               observacao: "Braquiaria em pleno crescimento, pastejo direto."),
        Insumo(id: uid("11111111-0000-4000-A000-000000000002"),
               nome: "Pasto - capim da seca",
               categoria: .volumoso,
               materiaSeca: 45, proteinaBruta: 5.0, ndt: 48,
               embalagem: .pastejo,
               observacao: "Forragem madura, exige suplemento proteico."),
        Insumo(id: silagemMilhoID,
               nome: "Silagem de milho",
               categoria: .volumoso,
               materiaSeca: 32, proteinaBruta: 7.5, ndt: 65,
               embalagem: .granel),
        Insumo(id: uid("11111111-0000-4000-A000-000000000004"),
               nome: "Silagem de sorgo",
               categoria: .volumoso,
               materiaSeca: 30, proteinaBruta: 7.0, ndt: 60,
               embalagem: .granel),
        Insumo(id: uid("11111111-0000-4000-A000-000000000005"),
               nome: "Cana-de-acucar picada",
               categoria: .volumoso,
               materiaSeca: 28, proteinaBruta: 3.0, ndt: 60,
               embalagem: .granel,
               observacao: "Precisa de correcao proteica."),
        Insumo(id: uid("11111111-0000-4000-A000-000000000006"),
               nome: "Feno de tifton",
               categoria: .volumoso,
               materiaSeca: 87, proteinaBruta: 10.0, ndt: 55,
               embalagem: .granel),
        Insumo(id: uid("11111111-0000-4000-A000-000000000007"),
               nome: "Silagem de capim",
               categoria: .volumoso,
               materiaSeca: 25, proteinaBruta: 8.0, ndt: 55,
               embalagem: .granel),

        // Energeticos
        Insumo(id: milhoID,
               nome: "Milho grao moido",
               categoria: .energetico,
               materiaSeca: 88, proteinaBruta: 9.0, ndt: 87,
               embalagem: .saca60),
        Insumo(id: uid("11111111-0000-4000-A000-000000000011"),
               nome: "Sorgo grao moido",
               categoria: .energetico,
               materiaSeca: 88, proteinaBruta: 9.5, ndt: 82,
               embalagem: .saca60),
        Insumo(id: uid("11111111-0000-4000-A000-000000000012"),
               nome: "Farelo de trigo",
               categoria: .energetico,
               materiaSeca: 88, proteinaBruta: 17.0, ndt: 70,
               embalagem: .saca40),
        Insumo(id: uid("11111111-0000-4000-A000-000000000013"),
               nome: "Polpa citrica peletizada",
               categoria: .energetico,
               materiaSeca: 88, proteinaBruta: 7.0, ndt: 78,
               embalagem: .saca25),
        Insumo(id: uid("11111111-0000-4000-A000-000000000014"),
               nome: "Casca de soja",
               categoria: .energetico,
               materiaSeca: 89, proteinaBruta: 12.0, ndt: 70,
               embalagem: .saca40),
        Insumo(id: uid("11111111-0000-4000-A000-000000000015"),
               nome: "Caroco de algodao",
               categoria: .energetico,
               materiaSeca: 90, proteinaBruta: 23.0, ndt: 85,
               embalagem: .granel,
               observacao: "Limitar a 15% da materia seca da dieta."),

        // Proteicos
        Insumo(id: fareloSojaID,
               nome: "Farelo de soja",
               categoria: .proteico,
               materiaSeca: 89, proteinaBruta: 48.0, ndt: 82,
               embalagem: .saca50),
        Insumo(id: uid("11111111-0000-4000-A000-000000000017"),
               nome: "Farelo de algodao 38%",
               categoria: .proteico,
               materiaSeca: 90, proteinaBruta: 38.0, ndt: 72,
               embalagem: .saca50),
        Insumo(id: uid("11111111-0000-4000-A000-000000000018"),
               nome: "Farelo de amendoim",
               categoria: .proteico,
               materiaSeca: 90, proteinaBruta: 45.0, ndt: 78,
               embalagem: .saca50),
        Insumo(id: uid("11111111-0000-4000-A000-000000000019"),
               nome: "Ureia pecuaria",
               categoria: .proteico,
               materiaSeca: 99, proteinaBruta: 281.0, ndt: 0,
               embalagem: .saca25,
               observacao: "Maximo de 1% da materia seca total. Adaptacao gradual."),
        Insumo(id: uid("11111111-0000-4000-A000-000000000020"),
               nome: "Concentrado proteico comercial",
               categoria: .proteico,
               materiaSeca: 89, proteinaBruta: 32.0, ndt: 70,
               embalagem: .saca40),

        // Minerais
        Insumo(id: mineralID,
               nome: "Nucleo mineral para recria",
               categoria: .mineral,
               materiaSeca: 99, proteinaBruta: 0, ndt: 0,
               embalagem: .saca25,
               observacao: "Fornecimento medio de 100 g por animal por dia."),
        Insumo(id: uid("11111111-0000-4000-A000-000000000022"),
               nome: "Sal mineral proteinado",
               categoria: .mineral,
               materiaSeca: 95, proteinaBruta: 20.0, ndt: 25,
               embalagem: .saca30,
               observacao: "Consumo tipico de 200 a 400 g por animal por dia.")
    ]

    static func porCategoria(_ categoria: CategoriaInsumo, em lista: [Insumo]) -> [Insumo] {
        lista.filter { $0.categoria == categoria }
    }
}
