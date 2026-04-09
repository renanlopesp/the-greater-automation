/**
 * L3 content for seasonal calendar dates.
 * Each date can have multiple sections, each with ContentSection blocks.
 */

export interface L3Section {
  title: string;
  blocks: Array<{
    label?: string;
    sublabel?: string;
    content: string;
  }>;
}

export interface L3Content {
  [sectionId: string]: L3Section[];
}

export const seasonalL3Content: Record<string, L3Content> = {
  "dia-das-maes": {
    copies: [
      {
        title: "Instagram · feed",
        blocks: [
          {
            label: "caption",
            content: `Ela não precisa de mais uma flor.

Ela precisa de uma memória que vai durar.

Body personalizado com o nome do bebê.
Entrega garantida até o Dia das Mães.

→ Link na bio`,
          },
        ],
      },
      {
        title: "Instagram · stories",
        blocks: [
          { label: "slide 1 de 3", content: "Dia das Mães em [X] dias." },
          {
            label: "slide 2 de 3",
            content: "Peças personalizadas com o nome do bebê.",
          },
          {
            label: "slide 3 de 3",
            content: "Entrega garantida até [data]. Arrasta pra cima.",
          },
        ],
      },
      {
        title: "WhatsApp · disparo VIP",
        blocks: [
          {
            label: "mensagem",
            content: `Oi [nome] 🤍

O Dia das Mães está chegando — e a gente preparou algo especial pra você presentear aquela mãe de primeira viagem da sua vida.

Body + manta personalizados com o nome do bebê. Entrega garantida até [data].

Ver coleção completa: [link]

(Responda aqui se quiser ajuda pra escolher.)`,
          },
        ],
      },
      {
        title: "E-mail · D-7 urgência",
        blocks: [
          {
            label: "assunto a",
            content: "Ainda dá tempo. Mas só por pouco.",
          },
          {
            label: "assunto b",
            content:
              "Pedidos fecham [data]. Entrega garantida até o Dia das Mães.",
          },
          {
            label: "corpo",
            content: `Oi [nome],

Pedidos com personalização fecham [data].
Depois disso, não garantimos entrega antes do Dia das Mães.

Se você ainda não escolheu o presente, esse é o momento.

→ [VER PRODUTOS COM ENTREGA GARANTIDA]

Milkes`,
          },
        ],
      },
      {
        title: "SMS · D-3",
        blocks: [
          {
            label: "mensagem",
            content:
              "Milkes: Dia das Mães em 3 dias. Entrega garantida até [data] pra pedidos feitos hoje. Body personalizado com o nome do bebê: [link]",
          },
        ],
      },
      {
        title: "Google Ads",
        blocks: [
          {
            label: "headline 1",
            content: "Presente Dia das Mães com Nome do Bebê",
          },
          {
            label: "headline 2",
            content: "Peças Tricô Personalizadas | Milkes",
          },
          {
            label: "headline 3",
            content: "Entrega Garantida até [Data]",
          },
          {
            label: "descrição",
            content:
              "Body, manta e saída maternidade com bordado exclusivo. A memória mais bonita que você pode dar.",
          },
        ],
      },
    ],
    email: [
      {
        title: "Assuntos",
        blocks: [
          {
            label: "assunto a",
            content: "A memória mais bonita que você pode dar pra ela.",
          },
          {
            label: "assunto b",
            content:
              "Faltam [X] dias. Ela ainda não sabe o que vai ganhar.",
          },
        ],
      },
      {
        title: "Corpo do e-mail",
        blocks: [
          {
            label: "template completo",
            content: `Oi [nome],

O Dia das Mães está chegando. E você sabe melhor do que ninguém o que aquela mãe de primeira viagem está sentindo — a exaustão, o amor, a transformação.

A gente faz uma coisa só na Milkes: peças que ficam.

Não no armário. Na memória. Na foto que ela vai olhar daqui a 10 anos e lembrar de tudo que sentiu naquele primeiro Dia das Mães como mãe.

O Body Comfy com o nome do [bebê] bordado.
A Saída Maternidade que ela usou na primeira foto oficial.
A Manta que estava em toda foto dos primeiros meses.

→ [VER COLEÇÃO DIA DAS MÃES]

Entrega garantida até [data]. Personalização inclusa.

Com carinho,
Milkes

---

P.S. Pedidos com personalização têm prazo de 5 dias úteis.
Se for presente, vale pedir já.`,
          },
        ],
      },
    ],
    script: [
      {
        title: "Versão 1 · emocional (60s)",
        blocks: [
          {
            label: "0–3s · hook",
            content: '"O presente que faz ela chorar. Do jeito bom."',
          },
          {
            label: "3–15s · contexto",
            content:
              "Mostra a avó, a tia, a madrinha — alguém que quer dar o presente perfeito pra nova mãe. Close nas mãos escolhendo o produto no site.",
          },
          {
            label: "15–35s · produto",
            content:
              'Unboxing da peça. Close no bordado com o nome do bebê.\nNarração: "Uma peça com o nome dele. Que vai ficar pra sempre."',
          },
          {
            label: "35–50s · prova",
            content:
              "Fotos de clientes reais usando as peças. Depoimentos curtos.",
          },
          {
            label: "50–60s · cta",
            content:
              '"Entrega garantida até o Dia das Mães. Link na bio."',
          },
          {
            label: "trilha",
            content: "Lo-fi suave, sem letra. Emocional mas leve.",
          },
        ],
      },
      {
        title: "Versão 2 · direta (30s)",
        blocks: [
          {
            label: "0–3s · hook",
            content: '"Você ainda não sabe o que dar de presente?"',
          },
          {
            label: "3–15s · produto",
            content:
              'Mostra 3 produtos rapidamente. Body, manta, kit.\nTexto na tela: "Personalizado com o nome do bebê."',
          },
          {
            label: "15–25s · urgência",
            content:
              '"Entrega garantida até [data]."\nTexto: "Pedidos fecham [data]."',
          },
          {
            label: "25–30s · cta",
            content: '"Link na bio. Milkes."',
          },
          {
            label: "trilha",
            content: "Animada, rítmica. Cortes rápidos.",
          },
        ],
      },
    ],
    timeline: [
      {
        title: "Semana a semana",
        blocks: [
          {
            label: "d-45 · agora",
            content: `→ Briefing aprovado. Conceito criativo definido.
→ Separar produtos em destaque. Confirmar estoque.
→ Briefar fotógrafo se precisar de novas fotos.`,
          },
          {
            label: "d-30",
            content: `→ Disparar e-mail VIP com acesso antecipado à coleção.
→ Publicar primeiro post no feed.
→ Ativar tráfego pago com criativo de apresentação.`,
          },
          {
            label: "d-21",
            content: `→ Intensificar frequência de stories (3–4x por semana).
→ Disparar sequência de WhatsApp para base quente.
→ Publicar Reels versão emocional (60s).`,
          },
          {
            label: "d-14 · pico",
            content: `→ Campanha no máximo. Disparar e-mail para toda a base.
→ Publicar Reels versão direta (30s).
→ Ativar urgência em ads: "Últimas semanas com entrega garantida."`,
          },
          {
            label: "d-7",
            content: `→ E-mail de urgência: "Ainda dá tempo".
→ Stories diários com contagem regressiva.
→ Fechar personalização para garantir prazo.`,
          },
          {
            label: "d-3",
            content: `→ SMS para base engajada.
→ WhatsApp final para quem abriu mas não comprou.
→ Post: "Últimas peças com entrega garantida."`,
          },
          {
            label: "d-0 · dia das mães",
            content: `→ Post de celebração. Fotos de clientes.
→ Sem pressão de venda. Só afeto.`,
          },
          {
            label: "d+2",
            content: `→ E-mail: "Como foi o Dia das Mães dela?"
→ Pedido de review + UGC.
→ Iniciar sequência de upsell pós-data.`,
          },
        ],
      },
    ],
  },
};
