import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'
import type { CampaignProduct } from '@/data/campaign-data'

const EmailTemplateSchema = z.object({
  subject: z.string().describe('Assunto do email (max 60 chars)'),
  preview: z.string().describe('Preview text (80-100 chars)'),
  html: z.string().describe('HTML completo do email com inline CSS, responsivo, max-width 600px'),
})

export type EmailTemplateResult = z.infer<typeof EmailTemplateSchema>

export async function generateEmailTemplate(params: {
  campaignSlogan: string
  campaignIntro: string
  dateName: string
  products: CampaignProduct[]
  brandDna: {
    niche: string
    tone: string
    audience: string
    positioning: string
  }
}): Promise<EmailTemplateResult> {
  const openai = getOpenAIProvider()
  const { campaignSlogan, campaignIntro, dateName, products, brandDna } = params

  const productRows = products
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.name}: R$ ${p.price}${p.image_url ? ` (imagem: ${p.image_url})` : ''}${p.tag ? ` [${p.tag}]` : ''}`
    )
    .join('\n')

  const systemPrompt = `Você é um especialista em email marketing para e-commerce brasileiro. Gere um email HTML COMPLETO e RESPONSIVO para uma campanha sazonal.

CAMPANHA: ${dateName}
SLOGAN: "${campaignSlogan}"
CONTEXTO: ${campaignIntro}

PERFIL DA LOJA:
- Nicho: ${brandDna.niche}
- Tom: ${brandDna.tone}
- Público: ${brandDna.audience}
- Posicionamento: ${brandDna.positioning}

PRODUTOS PARA INCLUIR:
${productRows}

INSTRUÇÕES PARA O HTML:
1. ESTRUTURA: Use table-based layout para compatibilidade (Gmail, Outlook, Apple Mail)
2. LARGURA: max-width 600px, centralizado
3. CSS: 100% INLINE em cada elemento (Outlook não suporta <style> block)
4. SEÇÕES DO EMAIL:
   - Header: Nome da loja em texto (h1), cor de fundo sólida
   - Hero: Slogan da campanha em destaque, subtítulo com a data
   - Produtos: Grid de produtos (2 por linha) com imagem, nome, preço. Use <img> com src da URL do produto quando disponível, com width="250" height="250" e alt text
   - CTA: Botão grande "Comprar Agora" centralizado, cor de fundo contrastante, padding generoso
   - Footer: Texto pequeno "Você recebeu este email porque..." + link "Descadastrar"
5. CORES: Use tons que combinem com o nicho (ex: suave/pastel para bebê, vibrante para moda)
6. TIPOGRAFIA: font-family: Arial, Helvetica, sans-serif (seguro para email)
7. IMAGENS: Todos os <img> devem ter width, height, alt, style="display:block"
8. RESPONSIVIDADE: Use width="100%" nos containers internos
9. NÃO use: JavaScript, CSS externo, @media queries complexas, position, float
10. O HTML deve ser COMPLETO: começa com <!DOCTYPE html> e termina com </html>

ASSUNTO: Máx 60 chars, chamativo, com emoji relevante
PREVIEW: 80-100 chars, complementa o assunto (aparece ao lado no inbox)

Toda a saída em Português do Brasil.`

  const { object } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema: EmailTemplateSchema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Gere o email marketing completo para a campanha "${dateName}" com slogan "${campaignSlogan}".`,
      },
    ],
  })

  return object
}
