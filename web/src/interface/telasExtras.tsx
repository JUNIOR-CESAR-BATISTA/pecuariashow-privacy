/** Telas abertas por cima das abas: conversor de sacas e metodologia. */
import { useState } from "react";

import { descricao, descricaoCompra, equivalencias } from "../nucleo/conversorSacas.js";
import { numero, paraNumero } from "../nucleo/formatadores.js";
import { Campo, LinhaDado, TituloSecao } from "./componentes.js";

// ----------------------------------------------------------------- Conversor

export function TelaConversor() {
  const [texto, setTexto] = useState("1000");
  const quilos = Math.max(0, paraNumero(texto, 0));

  return (
    <div className="space-y-5">
      <TituloSecao texto="Conversor de sacas" />

      <div className="cartao space-y-3">
        <Campo rotulo="Total" valor={texto} aoMudar={setTexto} sufixo="kg" />
        <LinhaDado rotulo="Em toneladas" valor={`${numero(quilos / 1000, 3)} t`} />
      </div>

      <div className="cartao divide-y divide-borda">
        <p className="rotulo-secao pb-3 text-ouroEscuro">
          Equivalência nos tamanhos de mercado
        </p>
        {equivalencias(quilos).map((c) => (
          <div key={c.kgPorUnidade} className="py-2">
            <LinhaDado
              rotulo={`Saca de ${numero(c.kgPorUnidade, 0)} kg`}
              valor={`${numero(c.unidadesExatas, 2)} sacas`}
            />
            <p className="text-xs text-textoSuave">
              {descricao(c)} · comprar {descricaoCompra(c)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-textoTenue">
        A linha de compra arredonda sempre para cima, porque não se compra fração de saca.
      </p>
    </div>
  );
}

// --------------------------------------------------------------- Metodologia

function Metodo({ titulo, corpo }: { titulo: string; corpo: string }) {
  return (
    <div className="py-2">
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-textoSuave">{corpo}</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <p className="rotulo-secao text-ouroEscuro">{titulo}</p>
      <div className="cartao divide-y divide-borda py-1">{children}</div>
    </section>
  );
}

export function TelaMetodologia() {
  return (
    <div className="space-y-5">
      <TituloSecao texto="Metodologia" />

      <p className="text-sm leading-relaxed text-textoSuave">
        As exigências são calculadas pelo sistema de energia líquida e proteína metabolizável do
        NRC para gado de corte, com ajustes de grupo genético e de atividade usuais em condições
        brasileiras. Tudo parte de três informações: peso vivo, meta de ganho e o peso em que a
        novilha termina.
      </p>

      <Bloco titulo="Energia">
        <Metodo
          titulo="Mantença"
          corpo="ELm = 0,077 x fator do grupo genético x fator da categoria x fator de atividade x PCJ elevado a 0,75. PCJ é o peso vivo de jejum (96% do peso vivo). O fator da categoria é 1,00 para fêmea e macho castrado e 1,15 para macho inteiro."
        />
        <Metodo
          titulo="Ganho"
          corpo="ER = a x PCVZ equivalente elevado a 0,75 x ganho de corpo vazio elevado a b. O NRC publica um par de coeficientes por sexo, não um fator de correção: fêmea usa a = 0,0783 e b = 1,119; macho, castrado ou inteiro, usa a = 0,0635 e b = 1,097. A fêmea deposita mais gordura por quilo ganho no mesmo grau de maturidade, e por isso exige mais energia."
        />
        <Metodo
          titulo="Peso equivalente"
          corpo="O peso é corrigido pelo grau de maturidade: peso de jejum x 462 / peso de acabamento em jejum. O peso de referência é o mesmo para as três categorias de propósito - o tamanho adulto de cada uma já entra pelo peso de acabamento que você informa no lote, e ajustar os dois contaria a mesma diferença duas vezes."
        />
        <Metodo
          titulo="NDT"
          corpo="A densidade da dieta é encontrada procurando o teor de NDT em que o consumo necessário iguala o consumo previsto. O NDT diário é o consumo de matéria seca multiplicado por esse teor."
        />
      </Bloco>

      <Bloco titulo="Proteína">
        <Metodo titulo="Mantença" corpo="PM de mantença = 3,8 g por PCJ elevado a 0,75." />
        <Metodo
          titulo="Ganho"
          corpo="A proteína líquida por quilo de ganho cai conforme a energia retida sobe: 268 menos 29,4 vezes a energia retida por quilo de ganho. A eficiência de uso da proteína metabolizável vai de 0,834 menos 0,00114 vezes o peso equivalente, com piso de 0,492."
        />
        <Metodo
          titulo="Efeito da categoria"
          corpo="A proteína líquida por quilo de ganho cai conforme a energia retida sobe. Como o macho retém menos energia que a fêmea no mesmo ganho, ele pede menos NDT e mais proteína - o erro de rodar um garrote como fêmea vai para os dois lados ao mesmo tempo."
        />
        <Metodo
          titulo="Da PM para a PB"
          corpo="Considera 130 g de proteína microbiana por quilo de NDT, aproveitada em 64%. O que faltar vem de proteína não degradável no rúmen, aproveitada em 80%. A soma das duas frações é a proteína bruta da dieta."
        />
        <Metodo
          titulo="Piso prático"
          corpo="Quando a conta resulta em menos proteína que o mínimo da fase (13% na desmama, 12% na recria inicial e 11% depois), o aplicativo usa o piso para não comprometer o ambiente ruminal."
        />
      </Bloco>

      <Bloco titulo="Ração e conversões">
        <Metodo
          titulo="Balanceamento"
          corpo="Com volumoso, energético e proteico o aplicativo resolve um sistema de três equações: matéria seca total, proteína bruta e NDT. Quando a solução fica fora dos limites de volumoso, o volumoso é fixado no limite e o concentrado atende a proteína, mostrando o saldo de energia."
        />
        <Metodo
          titulo="Dieta sem concentrado"
          corpo="Sem energético nem proteico no cocho (escolha do lote, à parte do sistema de criação), não há o que balancear: toda a matéria seca que sobra do mineral é o volumoso, e o NDT e a PB que a dieta entrega são só os dele. Quando o volumoso não sustenta a exigência, o aviso de falta aparece do mesmo jeito - a diferença é que aqui não existe um concentrado para completar a conta."
        />
        <Metodo
          titulo="Matéria natural"
          corpo="A quantidade a fornecer no cocho é a matéria seca dividida pelo teor de matéria seca do alimento."
        />
        <Metodo
          titulo="Sacas"
          corpo="O total em quilos é dividido pelo peso da embalagem cadastrada. Tamanhos de mercado disponíveis: 60, 50, 40, 30, 25 e 20 kg, além de granel em toneladas. A linha de compra arredonda para cima."
        />
        <Metodo
          titulo="Períodos"
          corpo="O ciclo é dividido em períodos. Em cada um as exigências são recalculadas no peso médio do intervalo e a ração é refeita, por isso o consumo cresce ao longo do ciclo."
        />
      </Bloco>

      <Bloco titulo="Etapas da dieta">
        <Metodo
          titulo="Quem tem duas etapas"
          corpo="No plano automático a fase do lote decide. Desmama, recria inicial e recria final ainda têm crescimento pela frente: fazem uma dieta de crescimento até o peso de virada e uma de engorda daí ao abate. Lote que entra em terminação só tem engorda, e faz o ciclo inteiro numa dieta só."
        />
        <Metodo
          titulo="Onde a virada cai"
          corpo="A virada vale quando o peso de troca está entre o peso de hoje e o peso de abate. Abaixo dele o lote já entrou em engorda; acima, a engorda não chega a começar. Nos dois casos o ciclo tem uma etapa só, e nenhum período atravessa a virada: ele é cortado exatamente no peso de troca."
        />
        <Metodo
          titulo="O que muda de uma para a outra"
          corpo="A meta de ganho, os limites de volumoso e, se você quiser, os alimentos. O que ficar em branco na engorda é herdado do crescimento. Os produtos de cada etapa são somados separados, porque é assim que se compra."
        />
      </Bloco>

      <Bloco titulo="Resultado previsto">
        <Metodo
          titulo="Compra"
          corpo="Por arroba, o preço combinado multiplica as arrobas de carcaça no peso de entrada (peso de entrada x rendimento / 15). Por cabeça, vale o valor informado, qualquer que seja o peso."
        />
        <Metodo
          titulo="Venda"
          corpo="As arrobas de carcaça no peso de abate multiplicadas pelo preço de arroba informado."
        />
        <Metodo
          titulo="Lucro"
          corpo="Venda menos compra menos o custo da dieta até o abate. Não entram sanidade, transporte, pastagem, mão de obra nem impostos."
        />
        <Metodo
          titulo="Arroba de equilíbrio"
          corpo="O investimento dividido por todas as arrobas vendidas. É o preço em que o ciclo empata; abaixo dele a venda não paga a compra mais a dieta."
        />
        <Metodo
          titulo="Resultado só da engorda"
          corpo="As arrobas produzidas no ciclo ao preço de venda, menos o custo da dieta. Separa o mérito da ração do mérito da compra."
        />
      </Bloco>

      <p className="text-xs leading-relaxed text-textoTenue">
        Os coeficientes são médias de população. Acompanhe pesagens reais e use o ajuste de consumo
        do lote para aproximar a previsão do que acontece no cocho.
      </p>
    </div>
  );
}
