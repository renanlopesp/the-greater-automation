import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { type CatalogSummary, formatCatalogForLLM } from '@/lib/retail/catalog-summarizer'

export interface StoreInfo {
  name: string
  segment: string
  platform: string
  ownerName: string
}

export interface BrandDnaResult {
  niche: string
  average_ticket: number
  tone: string
  audience: string
  positioning: string
  words_to_use: string[]
  words_to_avoid: string[]
  strengths: Array<{ title: string; description: string }>
  alerts: Array<{ title: string; description: string }>
  opportunities: Array<{
    title: string
    description: string
    estimated_revenue: number
    color: 'green' | 'amber'
  }>
  revenue_projection: {
    current: number
    projected: number
    delta: number
    disclaimer: string
  }
  recommended_skills: Array<{ slug: string; reason: string }>
  greeting: string
  intro: string
}

const BrandDnaSchema = z.object({
  niche: z.string().describe('Nicho de mercado específico da loja (ex: moda feminina plus size)'),
  average_ticket: z.number().describe('Ticket médio estimado em reais'),
  tone: z
    .string()
    .describe(
      'Tom de comunicação da marca (ex: informal e próximo, técnico e confiável, sofisticado e exclusivo)'
    ),
  audience: z
    .string()
    .describe(
      'Público-alvo principal com detalhes de perfil (ex: mulheres de 25-40 anos, classe B/C, interessadas em moda acessível)'
    ),
  positioning: z
    .string()
    .describe('Posicionamento de mercado (ex: custo-benefício, premium, especialista no segmento)'),
  words_to_use: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe('Palavras e expressões alinhadas com a marca para usar na comunicação'),
  words_to_avoid: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe('Palavras e expressões que não combinam com a marca'),
  strengths: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .min(2)
    .max(5)
    .describe('Pontos fortes identificados no catálogo e posicionamento'),
  alerts: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .min(1)
    .max(4)
    .describe('Alertas e pontos de atenção para o negócio'),
  opportunities: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        estimated_revenue: z.number().describe('Receita estimada em reais'),
        color: z
          .enum(['green', 'amber'])
          .describe('green = alta confiança, amber = média confiança'),
      })
    )
    .min(2)
    .max(5)
    .describe('Oportunidades sazonais e estratégicas com receita estimada'),
  revenue_projection: z.object({
    current: z.number().describe('Receita mensal atual estimada em reais'),
    projected: z.number().describe('Receita mensal projetada após 90 dias de otimização em reais'),
    delta: z.number().describe('Diferença percentual entre current e projected'),
    disclaimer: z.string().describe('Nota explicando as premissas da projeção'),
  }),
  recommended_skills: z
    .array(
      z.object({
        slug: z.string().describe('Slug da skill recomendada'),
        reason: z.string().describe('Por que essa skill é relevante para essa loja'),
      })
    )
    .min(3)
    .max(3)
    .describe('Exatamente 3 skills recomendadas'),
  greeting: z.string().describe('Saudação personalizada do Snew para o dono(a) da loja'),
  intro: z
    .string()
    .describe('Parágrafo introdutório resumindo o que foi analisado e os principais insights'),
})

/**
 * Calls LLM to generate Brand DNA analysis from a catalog summary.
 * All output text is in Portuguese (PT-BR).
 */
export async function analyzeBrandDna(
  summary: CatalogSummary,
  storeInfo: StoreInfo
): Promise<BrandDnaResult> {
  const openai = createOpenAI({ apiKey: process.env.OPEN_AI_API_KEY })
  const formattedCatalog = formatCatalogForLLM(summary)

  const systemPrompt = `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua missão é analisar o catálogo de uma loja e gerar uma análise estratégica completa da marca, como um CMO sênior com 15 anos de experiência no varejo digital brasileiro.

Loja: ${storeInfo.name}
Plataforma: ${storeInfo.platform}
Segmento declarado: ${storeInfo.segment}
Dono(a): ${storeInfo.ownerName}

${formattedCatalog}

---

INSTRUÇÕES PARA A ANÁLISE:

1. NICHO (niche): Detecte o nicho específico a partir dos nomes de produtos, categorias e faixa de preço. Seja preciso — não use categorias amplas como "moda" quando pode dizer "moda feminina casual para o dia a dia".

2. TICKET MÉDIO (average_ticket): Use a mediana de preços do catálogo como base. Considere que o ticket médio real pode ser 10-20% maior (combo de produtos, frete).

3. TOM DE COMUNICAÇÃO (tone): Analise as descrições dos produtos. Linguagem técnica/formal indica um tom mais institucional. Linguagem emotiva/coloquial indica proximidade com o cliente. Faixa de preço premium indica sofisticação.

4. PÚBLICO-ALVO (audience): Cruze nicho + faixa de preço + categorias para inferir o perfil. Seja específico sobre faixa etária estimada, gênero (se aplicável), classe social (A/B/C) e motivação de compra.

5. POSICIONAMENTO (positioning): Determine se a loja compete por: (a) custo-benefício, (b) especialização no nicho, (c) premium/exclusividade, (d) conveniência/variedade.

6. WORDS TO USE/AVOID: Baseie-se no tom e público. Evite palavras genéricas — liste termos específicos que ressoam (ou não) com o perfil detectado.

7. PONTOS FORTES (strengths): Identifique 2-5 vantagens reais baseadas nos dados do catálogo (variedade de categorias, faixa de preço acessível, profundidade em determinada categoria, etc.).

8. ALERTAS (alerts): Aponte riscos concretos: concentração excessiva em uma categoria, ausência de descrições, falta de produtos em determinada faixa de preço, etc.

9. OPORTUNIDADES (opportunities): Gere 2-5 oportunidades SAZONAIS com datas do calendário brasileiro relevantes para o nicho. Exemplos: Dia das Mães (maio), Dia dos Pais (agosto), Dia dos Namorados (junho), Black Friday (novembro), Natal (dezembro), Carnaval (fevereiro/março), Volta às Aulas (janeiro/julho), Dia da Mulher (março). Priorize as datas mais relevantes para o nicho específico detectado.
   - estimated_revenue: Calcule como ticket_médio × volume_estimado_de_pedidos × multiplicador_sazonal. Use estimativas conservadoras.
   - color: 'green' para oportunidades de alta confiança (datas óbvias para o nicho), 'amber' para média confiança.

10. PROJEÇÃO DE RECEITA (revenue_projection):
    - current: Estime a receita mensal atual como ticket_médio × volume_pedidos_estimado (use o total de produtos como proxy para o tamanho da operação: <50 produtos = pequena, 50-200 = média, >200 = grande).
    - projected: Aplique um crescimento de 20-40% após 90 dias de otimização com as skills recomendadas.
    - delta: Percentual de crescimento projetado (ex: 30 para 30%).
    - disclaimer: Explique as premissas em PT-BR de forma clara e honesta.

11. SKILLS RECOMENDADAS (recommended_skills): Escolha EXATAMENTE 3 slugs da lista abaixo que fazem mais sentido para esse nicho e momento da loja:
    - seasonal-calendar: Calendário sazonal automatizado com campanhas por data
    - campaign-copywriter: Geração de copies para campanhas de marketing
    - campaign-engine: Motor de campanhas automatizadas
    - image-generator: Geração de imagens para produtos e campanhas
    - social-asset-creator: Criação de assets para redes sociais
    - video-script-creator: Roteiros para vídeos de produto e marketing
    - revenue-intelligence: Análise de receita e precificação inteligente
    - funnel-diagnostics: Diagnóstico de funil de conversão
    - conversion-optimizer: Otimização de taxa de conversão
    - brand-dna-agent: Agente especialista em identidade de marca

12. SAUDAÇÃO (greeting): DEVE ser exatamente: "Oi, ${storeInfo.ownerName}. Sou o Snew, seu novo CMO." — sem variações.

13. INTRO (intro): Escreva 2-3 frases em PT-BR resumindo o que foi analisado e os 2-3 insights mais importantes. Mencione a loja pelo nome (${storeInfo.name}) e faça referência a produtos ou categorias reais do catálogo. Seja direto e impactante — como um CMO apresentando uma análise executiva.

IMPORTANTE:
- Toda a saída de texto deve estar em Português do Brasil (PT-BR)
- Seja específico e use dados reais do catálogo fornecido
- Evite generalismos — cada campo deve refletir as características únicas desta loja
- As estimativas de receita devem ser realistas para o mercado de e-commerce brasileiro`

  const { object } = await generateObject({
    model: openai('gpt-5.2'),
    schema: BrandDnaSchema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Gere a análise completa de Brand DNA para a loja "${storeInfo.name}" com base nos dados do catálogo fornecidos no prompt de sistema.`,
      },
    ],
  })

  return object
}
