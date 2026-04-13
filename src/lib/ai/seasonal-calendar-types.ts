import { z } from 'zod'

// ---------------------------------------------------------------------------
// PersonalizedCalendar schemas — shared types used by UI components and hooks
// ---------------------------------------------------------------------------

const PersonalizedDateSchema = z.object({
  id: z.string().describe('ID único da data (ex: dia-das-maes-2026)'),
  name: z.string().describe('Nome da data sazonal'),
  emoji: z.string().describe('Emoji representativo'),
  date: z.string().describe('Data ISO (YYYY-MM-DD)'),
  displayDate: z.string().describe('Data formatada (ex: 11 de Maio)'),
  month: z.string().describe('Mês abreviado (ex: Mai)'),
  day: z.string().describe('Dia do mês'),
  type: z
    .enum(['universal', 'niche'])
    .describe('Tipo: universal (Black Friday) ou nicho (Dia do Dentista)'),
  relevanceReason: z.string().describe('Por que essa data é relevante para essa loja'),
  estimatedRevenue: z.number().describe('Receita estimada em reais'),
  potentialValue: z.string().describe('Receita formatada (ex: R$ 85.000)'),
  priority: z.enum(['high', 'medium', 'low']).describe('Prioridade para essa loja'),
})

const PersonalizedCalendarSchema = z.object({
  year: z.number(),
  generatedAt: z.string(),
  dates: z.array(PersonalizedDateSchema).min(5).max(25),
  summary: z.object({
    totalDates: z.number(),
    totalPotentialRevenue: z.number(),
    nextActionableDate: z.string().nullable(),
  }),
  nextYearSuggested: z.boolean(),
})

export type PersonalizedDate = z.infer<typeof PersonalizedDateSchema>
export type PersonalizedCalendar = z.infer<typeof PersonalizedCalendarSchema>
