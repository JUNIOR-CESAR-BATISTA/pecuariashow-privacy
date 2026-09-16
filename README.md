# pecuariashow-privacy

Classificado Bovino

---

# NovilhaNutri

Aplicativo web para controle nutricional de novilhas em semiconfinamento, com
**armazenamento exclusivamente local no aparelho**.

A partir do peso inicial, da meta de ganho e da fase do animal, calcula as necessidades
diárias de **Proteína Bruta (PB)** e **Nutrientes Digestíveis Totais (NDT)**, monta a
ração diária, converte o total de insumos de cada período em **quilos e sacas**, projeta
o **planejamento de abate** e prevê o **resultado do ciclo** a partir do preço de compra
do animal e do preço esperado da arroba.

Roda no endereço publicado ou instalado como aplicativo na tela de início do celular, e
funciona sem internet depois da primeira visita.

## Como rodar

```bash
cd web
npm install
npm run dev        # servidor de desenvolvimento
npm run teste      # os testes
npm run build      # gera dist/
```

Publicação automática no GitHub Pages a cada push na `main`, pelo workflow `Web`.

## Telas

Seis abas na barra inferior, com a aba ativa marcada em dourado.

| Aba | O que faz |
| --- | --- |
| **Início** | Painel de entrada: saudação, faixa com a situação do lote ativo, atalhos por categoria, ações rápidas e o botão flutuante de novo lote. Dá acesso à tela de dados e privacidade. |
| **Rebanho** | Cadastro dos lotes: número de animais, peso de entrada, meta de ganho, fase, grupo genético, sistema de criação, peso alvo de abate, rendimento de carcaça, preço de compra e de venda, e histórico de pesagens. |
| **Ração** | Exigências diárias por animal (PB em gramas e % da MS, NDT em kg e % da MS, consumo de matéria seca), composição da ração alimento por alimento, quantidade a fornecer para o lote inteiro em kg e sacas por dia, e balanço da dieta. |
| **Abate** | Planejamento do abate: dias e data prevista, arrobas produzidas, conversão alimentar, custo por arroba, total de insumos do ciclo em kg e sacas, o detalhamento período a período e a previsão de resultado. Exporta o relatório em texto. |
| **Insumos** | Cadastro dos alimentos com MS, PB, NDT, forma de aquisição (saca de 60/50/40/30/25/20 kg, granel ou pastejo) e preço. |
| **Análise** | O histórico da fazenda. Cada lote abatido vira um ciclo encerrado: compara previsto com realizado, calibra os próximos lotes, ranqueia os proteicos e energéticos já usados e aponta o que corrigir. |

As telas de **Dados e privacidade**, **Conversor de sacas** e **Metodologia** abrem por
cima das abas, a partir do cabeçalho do início e dos atalhos.

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
sistema de três equações (matéria seca, PB e NDT) e chega à proporção exata. Se a
solução violar o limite de volumoso, o volumoso é fixado no limite, o concentrado
passa a atender a proteína e o saldo de energia aparece no balanço.

**Conversão para sacas.** Todo total em quilos vira sacas do tamanho cadastrado para
cada insumo, mostrando sacas inteiras, a sobra em quilos e quantas sacas comprar
(sempre arredondando para cima). Pastejo não entra na lista de compras.

**Planejamento de abate.** O ciclo é dividido em períodos (30 dias por padrão). Em
cada período as exigências são recalculadas no peso médio do intervalo e a ração é
refeita, então o consumo cresce ao longo do ciclo como acontece na prática.

**Previsão de resultado.** Com o preço pago pelo animal (por arroba de carcaça na
entrada ou por cabeça) e o preço esperado da arroba, o aplicativo projeta compra,
dieta, investido, venda, lucro, retorno, lucro por arroba produzida e a arroba de
equilíbrio. Separa ainda o resultado só da engorda, que compara as arrobas que a
dieta produz com o que ela custa, sem o efeito da compra. Não entram sanidade,
transporte, pastagem, mão de obra nem impostos.

**O ciclo encerrado vira base de cálculo.** Depois do abate, o lote é encerrado
com os dados reais (peso vivo, carcaça, concentrado usado, custo, preço da
arroba) e sai do rebanho para o histórico. A partir daí o aplicativo aprende:
descobre por bisseção qual consumo explicaria o ganho que a balança mostrou e
passa esse ajuste para os lotes novos, junto com o rendimento de carcaça e o
peso de acabamento realmente observados. Quanto mais ciclos, mais firme a base:
o aplicativo declara se ela é indicativa, moderada ou consistente.

## Privacidade

Não há servidor, conta de usuário, analytics nem sincronização. Os dados são gravados
no IndexedDB do próprio navegador e não saem do aparelho. A única saída possível é o
backup em JSON que o próprio usuário gera.

## Estrutura

```
web/
  src/
    nucleo/          Classificacoes, Insumo, Lote, CicloEncerrado,
                     MotorExigencias, FormuladorRacao, ConversorSacas,
                     PlanejadorAbate, RelatorioTexto, AnalisadorHistorico,
                     CatalogoInsumos, Formatadores, DadosApp
    armazenamento/   Deposito (IndexedDB) e Repositorio (gravação adiada)
    interface/       App (abas), telas, componentes, ícones e tema
  testes/            Testes do núcleo, da persistência e do formato do arquivo
  ferramentas/       Scripts de navegador para conferir a interface e o modo
                     sem internet
Ferramentas/         Geração do ícone a partir da fotografia do nelore
docs/METODOLOGIA.md
```

O `nucleo` não depende do React: são tipos e funções puras, o que mantém os cálculos
testáveis de forma isolada.

## Histórico

O projeto começou como aplicativo iOS em SwiftUI, e a versão web é o porte fiel daquele
núcleo — os mesmos valores, o mesmo formato de arquivo. O código Swift, os testes, o
projeto do Xcode e a esteira do TestFlight foram retirados quando o aplicativo nativo
deixou de ser usado. Quem quiser consultá-los encontra tudo no ramo
`arquivo/ultimo-iphone`.

## Aviso técnico

Os coeficientes usados são médias de população e os teores dos alimentos são valores
de referência de tabela. Ajuste os alimentos conforme a análise bromatológica da
propriedade, acompanhe as pesagens e use o ajuste de consumo do lote para aproximar a
previsão do observado no cocho. O aplicativo é uma ferramenta de planejamento e não
substitui a avaliação de um zootecnista ou médico veterinário.
