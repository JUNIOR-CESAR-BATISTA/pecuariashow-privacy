# pecuariashow-privacy

Classificado Bovino

---

# NovilhaNutri

Aplicativo iOS (SwiftUI) para controle nutricional de novilhas em semiconfinamento,
com **armazenamento exclusivamente local no aparelho**.

A partir do peso inicial, da meta de ganho e da fase do animal, o aplicativo calcula
as necessidades diárias de **Proteína Bruta (PB)** e **Nutrientes Digestíveis Totais (NDT)**,
monta a ração diária, converte o total de insumos de cada período em **quilos e sacas**
e gera o **planejamento de abate**.

## Como abrir

```bash
open NovilhaNutri.xcodeproj
```

Requer Xcode 16 ou superior. Alvo: iOS 17.0, iPhone e iPad.
Os testes ficam em `NovilhaNutriTests` e rodam com Cmd+U.

## Telas

Seis abas na barra inferior, com a aba ativa marcada em dourado.

| Aba | O que faz |
| --- | --- |
| **Início** | Painel de entrada: saudação, faixa com a situação do lote ativo, atalhos por categoria, ações rápidas e o botão flutuante de novo lote. Dá acesso à tela de dados e privacidade. |
| **Rebanho** | Cadastro dos lotes: número de animais, peso de entrada, meta de ganho, fase, grupo genético, sistema de criação, peso alvo de abate, rendimento de carcaça e histórico de pesagens. Cada lote aparece como cartão com barra de progresso até o peso de abate. |
| **Ração** | Exigências diárias por animal (PB em gramas e % da MS, NDT em kg e % da MS, consumo de matéria seca), composição da ração diária alimento por alimento, quantidade a fornecer para o lote inteiro em kg e sacas por dia, balanço da dieta e ganho esperado. |
| **Relatórios** | Planejamento do abate: dias e data prevista, evolução do peso, arrobas produzidas, conversão alimentar, custo por arroba, total de insumos do ciclo em kg e sacas, e o detalhamento período a período. Exporta o relatório em texto. |
| **Insumos** | Cadastro dos alimentos com MS, PB, NDT, forma de aquisição (saca de 60/50/40/30/25/20 kg, granel ou pastejo) e preço. Inclui um conversor livre de quilos para sacas. |
| **Análise** | O histórico da fazenda. Cada lote abatido vira um ciclo encerrado: o aplicativo compara previsto com realizado, calibra os próximos lotes, ranqueia os proteicos e energéticos já usados e aponta o que corrigir. |

A tela de **Dados** (onde os dados ficam, backup manual em JSON, exclusão de tudo e a
metodologia dos cálculos) fica no botão de cadeado, no cabeçalho do início.

## Aparência

Tema escuro em verde profundo com dourado de destaque: cartões arredondados com borda
discreta, títulos de seção com barra dourada, pílulas de ação, botão flutuante verde e
barra inferior própria, em que a aba ativa vira um bloco dourado. Cores, medidas e peças
reutilizáveis ficam reunidas em `NovilhaNutri/Interface/Tema.swift`.

## Funcionalidades principais

**Exigências nutricionais.** Sistema de energia líquida e proteína metabolizável
(NRC para gado de corte), com coeficientes de fêmeas em crescimento e ajustes de
grupo genético (zebuíno, cruzado, taurino) e de atividade (confinamento,
semiconfinamento, pasto). O peso equivalente corrige o grau de maturidade: uma
novilha precoce exige mais energia por quilo ganho no mesmo peso.

**Meta inviável e aviso claro.** Se a meta de ganho estiver acima do que o animal
consegue no peso atual, o aplicativo avisa e mostra o ganho máximo possível em vez
de devolver um número irreal.

**Formulação da ração.** Com volumoso, energético e proteico o aplicativo resolve um
sistema de três equações (matéria seca, PB e NDT) e chega a proporção exata. Se a
solução violar o limite de volumoso, o volumoso é fixado no limite, o concentrado
passa a atender a proteína e o saldo de energia aparece no balanço, junto com o
ganho que aquela dieta realmente sustenta.

**Conversão para sacas.** Todo total em quilos vira sacas do tamanho cadastrado para
cada insumo, mostrando sacas inteiras, a sobra em quilos e quantas sacas comprar
(sempre arredondando para cima). Pastejo não entra na lista de compras.

**Planejamento de abate.** O ciclo é dividido em períodos (30 dias por padrão). Em
cada período as exigências são recalculadas no peso médio do intervalo e a ração é
refeita, então o consumo cresce ao longo do ciclo como acontece na prática. O
relatório traz data de abate, peso e arrobas de carcaça, arrobas produzidas,
conversão alimentar, custo total, custo por animal por dia e custo por arroba.

**O ciclo encerrado vira base de cálculo.** Depois do abate, o lote é encerrado
com os dados reais (peso vivo, carcaça, concentrado usado, custo, preço da
arroba) e sai do rebanho para o histórico. A partir daí o aplicativo aprende:
descobre por bisseção qual consumo explicaria o ganho que a balança mostrou e
passa esse ajuste para os lotes novos, junto com o rendimento de carcaça e o
peso de acabamento realmente observados. O diagnóstico cruza os números para
dizer onde está o problema - se faltou concentrado no cocho ou se a dieta
rendeu menos do que a tabela prometia - e compara as fontes proteicas já
usadas por ganho e por custo da arroba. Quanto mais ciclos, mais firme a base:
o aplicativo declara se ela é indicativa, moderada ou consistente.

## Privacidade

Não há servidor, conta de usuário, analytics nem sincronização. Os dados são gravados
em `Application Support/NovilhaNutri/novilhanutri.json`, dentro da área privada do
aplicativo, com proteção de arquivo completa. A única saída possível é o backup em
JSON que o próprio usuário gera e compartilha.

## Estrutura

```
NovilhaNutri/
  Core/
    Modelos/       Classificacoes, Insumo, Lote, CicloEncerrado
    Calculo/       MotorExigencias, FormuladorRacao, ConversorSacas,
                   PlanejadorAbate, RelatorioTexto, AnalisadorHistorico
    Dados/         CatalogoInsumos (tabela inicial de alimentos)
    Formatadores   Numeros, moeda e datas em pt-BR
  Persistencia/    BancoLocal (JSON local), AppEstado (estado observável)
  Interface/       Tema (cores e peças visuais), Componentes,
                   RaizView (abas), InicioView, RebanhoView, ResumoView,
                   InsumosView, RelatorioView, AnaliseView,
                   EncerrarCicloView, DadosView
NovilhaNutriTests/ Testes das exigências, formulação, conversão,
                   projeção, histórico e persistência
docs/METODOLOGIA.md
```

O `Core` não depende de SwiftUI: são tipos de valor e funções puras, o que mantém os
cálculos testáveis de forma isolada.

## Aviso técnico

Os coeficientes usados são médias de população e os teores dos alimentos são valores
de referência de tabela. Ajuste os alimentos conforme a análise bromatológica da
propriedade, acompanhe as pesagens e use o ajuste de consumo do lote para aproximar a
previsão do observado no cocho. O aplicativo é uma ferramenta de planejamento e não
substitui a avaliação de um zootecnista ou médico veterinário.
