# pecuariashow-privacy

Classificado Bovino

---

# NovilhaNutri

Aplicativo iOS (SwiftUI) para controle nutricional de novilhas em semiconfinamento,
com **armazenamento exclusivamente local no aparelho**.

A partir do peso inicial, da meta de ganho e da fase do animal, o aplicativo calcula
as necessidades diarias de **Proteina Bruta (PB)** e **Nutrientes Digestiveis Totais (NDT)**,
monta a racao diaria, converte o total de insumos de cada periodo em **quilos e sacas**
e gera o **planejamento de abate**.

## Como abrir

```bash
open NovilhaNutri.xcodeproj
```

Requer Xcode 16 ou superior. Alvo: iOS 17.0, iPhone e iPad.
Os testes ficam em `NovilhaNutriTests` e rodam com Cmd+U.

## Telas

| Aba | O que faz |
| --- | --- |
| **Rebanho** | Cadastro dos lotes: numero de animais, peso de entrada, meta de ganho, fase, grupo genetico, sistema de criacao, peso alvo de abate, rendimento de carcaca e historico de pesagens. |
| **Resumo** | Exigencias diarias por animal (PB em gramas e % da MS, NDT em kg e % da MS, consumo de materia seca), composicao da racao diaria alimento por alimento, quantidade a fornecer para o lote inteiro em kg e sacas por dia, balanco da dieta e ganho esperado. |
| **Insumos** | Cadastro dos alimentos com MS, PB, NDT, forma de aquisicao (saca de 60/50/40/30/25/20 kg, granel ou pastejo) e preco. Inclui um conversor livre de quilos para sacas. |
| **Relatorios** | Planejamento do abate: dias e data prevista, evolucao do peso, arrobas produzidas, conversao alimentar, custo por arroba, total de insumos do ciclo em kg e sacas, e o detalhamento periodo a periodo. Exporta o relatorio em texto. |
| **Dados** | Onde os dados ficam, backup manual em JSON, exclusao de tudo e a metodologia dos calculos. |

## Funcionalidades principais

**Exigencias nutricionais.** Sistema de energia liquida e proteina metabolizavel
(NRC para gado de corte), com coeficientes de femeas em crescimento e ajustes de
grupo genetico (zebuino, cruzado, taurino) e de atividade (confinamento,
semiconfinamento, pasto). O peso equivalente corrige o grau de maturidade: uma
novilha precoce exige mais energia por quilo ganho no mesmo peso.

**Meta inviavel e aviso claro.** Se a meta de ganho estiver acima do que o animal
consegue no peso atual, o aplicativo avisa e mostra o ganho maximo possivel em vez
de devolver um numero irreal.

**Formulacao da racao.** Com volumoso, energetico e proteico o aplicativo resolve um
sistema de tres equacoes (materia seca, PB e NDT) e chega a proporcao exata. Se a
solucao violar o limite de volumoso, o volumoso e fixado no limite, o concentrado
passa a atender a proteina e o saldo de energia aparece no balanco, junto com o
ganho que aquela dieta realmente sustenta.

**Conversao para sacas.** Todo total em quilos vira sacas do tamanho cadastrado para
cada insumo, mostrando sacas inteiras, a sobra em quilos e quantas sacas comprar
(sempre arredondando para cima). Pastejo nao entra na lista de compras.

**Planejamento de abate.** O ciclo e dividido em periodos (30 dias por padrao). Em
cada periodo as exigencias sao recalculadas no peso medio do intervalo e a racao e
refeita, entao o consumo cresce ao longo do ciclo como acontece na pratica. O
relatorio traz data de abate, peso e arrobas de carcaca, arrobas produzidas,
conversao alimentar, custo total, custo por animal por dia e custo por arroba.

## Privacidade

Nao ha servidor, conta de usuario, analytics nem sincronizacao. Os dados sao gravados
em `Application Support/NovilhaNutri/novilhanutri.json`, dentro da area privada do
aplicativo, com protecao de arquivo completa. A unica saida possivel e o backup em
JSON que o proprio usuario gera e compartilha.

## Estrutura

```
NovilhaNutri/
  Core/
    Modelos/       Classificacoes, Insumo, Lote
    Calculo/       MotorExigencias, FormuladorRacao, ConversorSacas,
                   PlanejadorAbate, RelatorioTexto
    Dados/         CatalogoInsumos (tabela inicial de alimentos)
    Formatadores   Numeros, moeda e datas em pt-BR
  Persistencia/    BancoLocal (JSON local), AppEstado (estado observavel)
  Interface/       Telas SwiftUI e componentes
NovilhaNutriTests/ Testes das exigencias, formulacao, conversao,
                   projecao e persistencia
docs/METODOLOGIA.md
```

O `Core` nao depende de SwiftUI: sao tipos de valor e funcoes puras, o que mantem os
calculos testaveis de forma isolada.

## Aviso tecnico

Os coeficientes usados sao medias de populacao e os teores dos alimentos sao valores
de referencia de tabela. Ajuste os alimentos conforme a analise bromatologica da
propriedade, acompanhe as pesagens e use o ajuste de consumo do lote para aproximar a
previsao do observado no cocho. O aplicativo e uma ferramenta de planejamento e nao
substitui a avaliacao de um zootecnista ou medico veterinario.
