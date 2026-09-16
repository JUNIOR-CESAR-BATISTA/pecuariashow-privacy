# Metodologia de cálculo

Este documento descreve as equações implementadas em `NovilhaNutri/Core/Calculo`.
Todas as constantes estão reunidas em `MotorExigencias.Constantes`, o que permite
auditar ou recalibrar o modelo em um único lugar.

## 1. Pesos derivados

| Símbolo | Significado | Equação |
| --- | --- | --- |
| PCJ | peso de corpo em jejum | `PCJ = 0,96 x PV` |
| PCVZ | peso de corpo vazio | `PCVZ = 0,891 x PCJ` |
| GPCVZ | ganho de corpo vazio | `GPCVZ = 0,956 x GMD` |
| PCJeq | peso equivalente | `PCJeq = PCJ x 462 / (0,96 x peso de acabamento)` |

O peso equivalente corrige o grau de maturidade em relação ao animal de referência
de 462 kg. Uma novilha que termina com 380 kg está proporcionalmente mais madura aos
300 kg do que outra que termina com 520 kg, deposita mais gordura por quilo ganho e
por isso exige mais energia.

## 2. Exigência de energia

```
ELm = 0,077 x fg x fa x PCJ^0,75            (Mcal/dia)
ER  = 0,0783 x PCVZeq^0,75 x GPCVZ^1,119    (Mcal/dia)
```

- `fg` — grupo genético: zebuíno 0,90; cruzado 0,95; taurino 1,00.
- `fa` — atividade: confinamento 1,00; semiconfinamento 1,10; pasto 1,20.
- Os coeficientes 0,0783 e 1,119 são os de fêmeas em crescimento, que retêm mais
  gordura por quilo de ganho que machos inteiros.

A energia da dieta em função do teor de NDT (% da MS):

```
ED = 0,04409 x NDT
EM = 0,82 x ED
ELm_dieta = 1,37 EM - 0,138 EM^2 + 0,0105 EM^3 - 1,12
ELg_dieta = 1,42 EM - 0,174 EM^2 + 0,0122 EM^3 - 1,65
```

## 3. Consumo e densidade da dieta

Consumo previsto (NRC, animais em crescimento):

```
CMS_previsto = ajuste x PCJ^0,75 x (0,2435 ELm_dieta - 0,0466 ELm_dieta^2 - 0,1128) / ELm_dieta
```

Consumo necessário para a meta de ganho:

```
CMS_necessario = ELm / ELm_dieta + ER / ELg_dieta
```

Os dois dependem do teor de NDT da dieta, então o aplicativo procura por bissecção,
entre 40% e 85% de NDT, o ponto em que `CMS_necessario = CMS_previsto`. Esse ponto dá,
ao mesmo tempo, a densidade energética que a dieta precisa ter e o consumo esperado.

```
NDT (kg/dia) = CMS x NDT% / 100
```

Se nem a 85% de NDT o animal consegue comer o suficiente, a meta é declarada inviável:
o aplicativo avisa e recalcula tudo com o ganho máximo, obtido invertendo a equação
de energia retida.

## 4. Exigência de proteína

```
PMm = 3,8 x PCJ^0,75                                        (g/dia)
PL_ganho = GPCVZ x (268 - 29,4 x ER / GPCVZ)                (g/dia)
eficiencia = max(0,492 ; 0,834 - 0,00114 x PCJeq)
PM_total = PMm + PL_ganho / eficiencia
```

Da proteína metabolizável para a proteína bruta da dieta, pelo sistema PDR/PNDR:

```
PDR = 130 x NDT(kg)              proteina microbiana produzida (g)
PM_microbiana = 0,64 x PDR
PNDR = max(0 ; (PM_total - PM_microbiana) / 0,80)
PB = PDR + PNDR                  (g/dia)
```

Em animais mais pesados a proteína microbiana sozinha já cobre a exigência. Nesses
casos a conta pode resultar em menos proteína do que é prudente fornecer, então entra
um piso prático por fase: 13% na desmama, 12% na recria inicial e 11% da matéria seca
na recria final e na terminação. Quando o piso é aplicado, o resumo avisa.

## 5. Formulação da ração

Com um volumoso (v), um energético (e) e um proteico (p), sendo `D` a matéria seca
disponível após descontar o mineral de fornecimento fixo:

```
v + e + p = D
v.PBv + e.PBe + p.PBp = PB exigida
v.NDTv + e.NDTe + p.NDTp = NDT exigido
```

Sistema 3x3 resolvido por eliminação de Gauss-Jordan com pivoteamento parcial. Se a
solução colocar o volumoso fora dos limites de manejo, ou exigir quantidade negativa
de algum concentrado, o volumoso é fixado no limite e a proporção energético/proteico
passa a atender a proteína exatamente; a diferença de energia aparece como saldo, e o
ganho que a dieta realmente sustenta é calculado invertendo as equações da seção 2
(e a da seção 4, para o limite proteico). O menor dos dois é o ganho esperado, com o
nutriente limitante identificado na tela.

Quantidade a fornecer no cocho:

```
materia natural (kg) = materia seca (kg) / (MS% / 100)
```

## 6. Conversão para sacas

```
sacas exatas   = kg / kg por saca
sacas inteiras = floor(sacas exatas)
sobra (kg)     = kg - sacas inteiras x kg por saca
sacas a comprar = ceil(sacas exatas)
```

Tamanhos de mercado disponíveis: 60, 50, 40, 30, 25 e 20 kg, além de granel em
toneladas e pastejo (não adquirido, fora da lista de compras e do custo).

## 7. Períodos e planejamento de abate

```
dias totais = (peso alvo - peso atual) / GMD
```

O ciclo é dividido em períodos de N dias (30 por padrão; o último pode ser parcial).
Em cada período:

1. peso médio do intervalo = peso inicial + GMD x dias / 2;
2. exigências recalculadas nesse peso, com a fase avançando conforme o peso;
3. ração reformulada;
4. consumo do período = kg por animal por dia x dias x número de animais;
5. conversão para sacas e custo.

Indicadores do ciclo:

```
carcaca (kg)          = peso vivo x rendimento
arrobas               = carcaca / 15
arrobas produzidas    = (carcaca final - carcaca inicial) / 15
conversao alimentar   = MS total consumida / ganho de peso vivo total
custo por arroba      = custo total / arrobas produzidas
```

## 8. Aprendizado com os ciclos encerrados

Quando um lote é abatido, o plano vigente é fotografado (consumo previsto,
teores médios da dieta, concentrado e custo planejados) e guardado junto com o
que de fato aconteceu. Daí saem três coisas.

### Fator de consumo

A pergunta é: *qual consumo, no modelo, produziria o ganho que a balança
mostrou?* Mantidos os teores informados da dieta, procura-se por bisseção o
fator `a` tal que

```
ganho_modelo(a x CMS_previsto, NDT da dieta) = GMD observado
```

usando a mesma inversão da seção 5. O resultado é limitado à faixa de 0,70 a
1,30 e entra nos novos lotes como ajuste de consumo.

O fator não é proporcional ao desvio de ganho: como a mantença consome uma
parte fixa da energia, o ganho é bem mais sensível que o consumo. Um lote que
ganhou 13% menos que a meta costuma corresponder a um fator perto de 0,92, não
de 0,87.

### Rendimento e peso de acabamento

Média ponderada por animais e dias dos valores realmente observados no abate.
Substituem os padrões de tabela do grupo genético nos lotes seguintes.

### Diagnóstico

Regras que cruzam o previsto com o realizado:

| Situação | Leitura |
| --- | --- |
| Ganho abaixo da meta **e** concentrado fornecido abaixo do planejado | Problema de fornecimento, não de formulação |
| Ganho abaixo da meta **com** o concentrado entregue | A dieta rendeu menos que a tabela: rever NDT e PB dos alimentos por análise |
| Ganho acima da meta | Sobra de dieta: elevar a meta ou reduzir concentrado |
| Rendimento de carcaça abaixo do esperado para o grupo genético | Acabamento insuficiente |
| Ciclo mais de 15% mais longo que o planejado | Meta irreal ou abate fora do peso combinado |
| Custo real mais de 10% acima do previsto | Preços de insumo desatualizados no cadastro |

A comparação entre fontes proteicas agrupa os ciclos pelo proteico usado e
ordena por aderência à meta, mostrando também o custo por arroba de cada um —
é o que responde qual proteico reforçar e qual está saindo caro demais.

A confiança da base é declarada junto: 1 ciclo é indicativo, 2 a 3 é moderada,
4 ou mais é consistente.

## 9. Conferência numérica

Os valores abaixo, produzidos pelo motor, foram conferidos contra uma implementação
independente das mesmas equações e estão fixados nos testes automatizados.

| Condições | PV (kg) | GMD (kg/dia) | CMS (kg) | NDT (kg) | NDT (% MS) | PB (g) | PB (% MS) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| zebuína, semiconfinamento, acabamento 430 kg | 200 | 0,500 | 5,03 | 3,13 | 62,3 | 604 | 12,0 |
| zebuína, semiconfinamento, acabamento 450 kg | 300 | 0,000 | 5,62 | 2,78 | 49,5 | 618 | 11,0 |
| zebuína, semiconfinamento, acabamento 450 kg | 300 | 0,700 | 6,89 | 4,67 | 67,9 | 757 | 11,0 |
| cruzada, confinamento, acabamento 480 kg | 400 | 1,000 | 8,37 | 6,41 | 76,6 | 921 | 11,0 |

Em todas essas linhas a PB ficou no piso prático da fase: nesta faixa de peso e de
ganho o sistema de proteína metabolizável sozinho devolveria teores mais baixos, e o
piso é o que garante o funcionamento ruminal.

Coerências verificadas nos testes: a ração balanceada devolve exatamente a meta de
ganho quando reavaliada pelo caminho inverso; a soma dos períodos é igual ao total do
ciclo; e o consumo cresce monotonicamente ao longo do ciclo.

## Referências

- National Research Council. *Nutrient Requirements of Beef Cattle*. National Academies Press.
- Valadares Filho, S. C. et al. *BR-CORTE: Exigências Nutricionais de Zebuínos Puros e Cruzados*. UFV.
- Tabelas brasileiras de composição de alimentos para bovinos (valores de referência
  do catálogo inicial de insumos).

Os coeficientes são médias de população. Para uso na propriedade, ajuste a composição
dos alimentos conforme análise bromatológica e calibre o consumo previsto pelo que é
observado no cocho.
