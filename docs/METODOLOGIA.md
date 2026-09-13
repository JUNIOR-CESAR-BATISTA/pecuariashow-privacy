# Metodologia de calculo

Este documento descreve as equacoes implementadas em `NovilhaNutri/Core/Calculo`.
Todas as constantes estao reunidas em `MotorExigencias.Constantes`, o que permite
auditar ou recalibrar o modelo em um unico lugar.

## 1. Pesos derivados

| Simbolo | Significado | Equacao |
| --- | --- | --- |
| PCJ | peso de corpo em jejum | `PCJ = 0,96 x PV` |
| PCVZ | peso de corpo vazio | `PCVZ = 0,891 x PCJ` |
| GPCVZ | ganho de corpo vazio | `GPCVZ = 0,956 x GMD` |
| PCJeq | peso equivalente | `PCJeq = PCJ x 462 / (0,96 x peso de acabamento)` |

O peso equivalente corrige o grau de maturidade em relacao ao animal de referencia
de 462 kg. Uma novilha que termina com 380 kg esta proporcionalmente mais madura aos
300 kg do que outra que termina com 520 kg, deposita mais gordura por quilo ganho e
por isso exige mais energia.

## 2. Exigencia de energia

```
ELm = 0,077 x fg x fa x PCJ^0,75            (Mcal/dia)
ER  = 0,0783 x PCVZeq^0,75 x GPCVZ^1,119    (Mcal/dia)
```

- `fg` — grupo genetico: zebuino 0,90; cruzado 0,95; taurino 1,00.
- `fa` — atividade: confinamento 1,00; semiconfinamento 1,10; pasto 1,20.
- Os coeficientes 0,0783 e 1,119 sao os de femeas em crescimento, que retem mais
  gordura por quilo de ganho que machos inteiros.

A energia da dieta em funcao do teor de NDT (% da MS):

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

Consumo necessario para a meta de ganho:

```
CMS_necessario = ELm / ELm_dieta + ER / ELg_dieta
```

Os dois dependem do teor de NDT da dieta, entao o aplicativo procura por bisseccao,
entre 40% e 85% de NDT, o ponto em que `CMS_necessario = CMS_previsto`. Esse ponto da,
ao mesmo tempo, a densidade energetica que a dieta precisa ter e o consumo esperado.

```
NDT (kg/dia) = CMS x NDT% / 100
```

Se nem a 85% de NDT o animal consegue comer o suficiente, a meta e declarada inviavel:
o aplicativo avisa e recalcula tudo com o ganho maximo, obtido invertendo a equacao
de energia retida.

## 4. Exigencia de proteina

```
PMm = 3,8 x PCJ^0,75                                        (g/dia)
PL_ganho = GPCVZ x (268 - 29,4 x ER / GPCVZ)                (g/dia)
eficiencia = max(0,492 ; 0,834 - 0,00114 x PCJeq)
PM_total = PMm + PL_ganho / eficiencia
```

Da proteina metabolizavel para a proteina bruta da dieta, pelo sistema PDR/PNDR:

```
PDR = 130 x NDT(kg)              proteina microbiana produzida (g)
PM_microbiana = 0,64 x PDR
PNDR = max(0 ; (PM_total - PM_microbiana) / 0,80)
PB = PDR + PNDR                  (g/dia)
```

Em animais mais pesados a proteina microbiana sozinha ja cobre a exigencia. Nesses
casos a conta pode resultar em menos proteina do que e prudente fornecer, entao entra
um piso pratico por fase: 13% na desmama, 12% na recria inicial e 11% da materia seca
na recria final e na terminacao. Quando o piso e aplicado, o resumo avisa.

## 5. Formulacao da racao

Com um volumoso (v), um energetico (e) e um proteico (p), sendo `D` a materia seca
disponivel apos descontar o mineral de fornecimento fixo:

```
v + e + p = D
v.PBv + e.PBe + p.PBp = PB exigida
v.NDTv + e.NDTe + p.NDTp = NDT exigido
```

Sistema 3x3 resolvido por eliminacao de Gauss-Jordan com pivoteamento parcial. Se a
solucao colocar o volumoso fora dos limites de manejo, ou exigir quantidade negativa
de algum concentrado, o volumoso e fixado no limite e a proporcao energetico/proteico
passa a atender a proteina exatamente; a diferenca de energia aparece como saldo, e o
ganho que a dieta realmente sustenta e calculado invertendo as equacoes da secao 2
(e a da secao 4, para o limite proteico). O menor dos dois e o ganho esperado, com o
nutriente limitante identificado na tela.

Quantidade a fornecer no cocho:

```
materia natural (kg) = materia seca (kg) / (MS% / 100)
```

## 6. Conversao para sacas

```
sacas exatas   = kg / kg por saca
sacas inteiras = floor(sacas exatas)
sobra (kg)     = kg - sacas inteiras x kg por saca
sacas a comprar = ceil(sacas exatas)
```

Tamanhos de mercado disponiveis: 60, 50, 40, 30, 25 e 20 kg, alem de granel em
toneladas e pastejo (nao adquirido, fora da lista de compras e do custo).

## 7. Periodos e planejamento de abate

```
dias totais = (peso alvo - peso atual) / GMD
```

O ciclo e dividido em periodos de N dias (30 por padrao; o ultimo pode ser parcial).
Em cada periodo:

1. peso medio do intervalo = peso inicial + GMD x dias / 2;
2. exigencias recalculadas nesse peso, com a fase avancando conforme o peso;
3. racao reformulada;
4. consumo do periodo = kg por animal por dia x dias x numero de animais;
5. conversao para sacas e custo.

Indicadores do ciclo:

```
carcaca (kg)          = peso vivo x rendimento
arrobas               = carcaca / 15
arrobas produzidas    = (carcaca final - carcaca inicial) / 15
conversao alimentar   = MS total consumida / ganho de peso vivo total
custo por arroba      = custo total / arrobas produzidas
```

## 8. Conferencia numerica

Os valores abaixo, produzidos pelo motor, foram conferidos contra uma implementacao
independente das mesmas equacoes e estao fixados nos testes automatizados.

| Condicoes | PV (kg) | GMD (kg/dia) | CMS (kg) | NDT (kg) | NDT (% MS) | PB (g) | PB (% MS) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| zebuina, semiconfinamento, acabamento 430 kg | 200 | 0,500 | 5,03 | 3,13 | 62,3 | 604 | 12,0 |
| zebuina, semiconfinamento, acabamento 450 kg | 300 | 0,000 | 5,62 | 2,78 | 49,5 | 618 | 11,0 |
| zebuina, semiconfinamento, acabamento 450 kg | 300 | 0,700 | 6,89 | 4,67 | 67,9 | 757 | 11,0 |
| cruzada, confinamento, acabamento 480 kg | 400 | 1,000 | 8,37 | 6,41 | 76,6 | 921 | 11,0 |

Em todas essas linhas a PB ficou no piso pratico da fase: nesta faixa de peso e de
ganho o sistema de proteina metabolizavel sozinho devolveria teores mais baixos, e o
piso e o que garante o funcionamento ruminal.

Coerencias verificadas nos testes: a racao balanceada devolve exatamente a meta de
ganho quando reavaliada pelo caminho inverso; a soma dos periodos e igual ao total do
ciclo; e o consumo cresce monotonicamente ao longo do ciclo.

## Referencias

- National Research Council. *Nutrient Requirements of Beef Cattle*. National Academies Press.
- Valadares Filho, S. C. et al. *BR-CORTE: Exigencias Nutricionais de Zebuinos Puros e Cruzados*. UFV.
- Tabelas brasileiras de composicao de alimentos para bovinos (valores de referencia
  do catalogo inicial de insumos).

Os coeficientes sao medias de populacao. Para uso na propriedade, ajuste a composicao
dos alimentos conforme analise bromatologica e calibre o consumo previsto pelo que e
observado no cocho.
