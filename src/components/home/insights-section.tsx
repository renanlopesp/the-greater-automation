const INSIGHT_COLORS = [
  'bg-[hsl(160_40%_95%)] dark:bg-[hsl(160_25%_15%)]',
  'bg-[hsl(170_40%_94%)] dark:bg-[hsl(170_25%_14%)]',
  'bg-[hsl(180_35%_94%)] dark:bg-[hsl(180_20%_14%)]',
]

interface Insight {
  id: string
  title: string
  description: string
}

interface InsightsSectionProps {
  insights?: Insight[]
}

const EXAMPLE_INSIGHTS: Insight[] = [
  {
    id: '1',
    title: 'High Cart Abandonment on Mobile Checkout',
    description:
      '40% of users abandon checkout at the payment step. Drop-off increased 12% week over week.',
  },
  {
    id: '2',
    title: '284 High-Value Customers Inactive for 45+ Days',
    description: 'Average order value $148. No email sent in the last 30 days.',
  },
  {
    id: '3',
    title: 'Top Competitor Reduced Prices on 3 Core SKUs',
    description: 'BrandX lowered prices by 8%. Traffic overlap detected at 37%.',
  },
]

export default function InsightsSection({ insights = EXAMPLE_INSIGHTS }: InsightsSectionProps) {
  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Insights of the day
        </h3>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what we found to improve your store today.
        </p>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={insight.id}
            className={`cursor-pointer rounded-2xl px-6 py-5 transition-colors ${INSIGHT_COLORS[i % INSIGHT_COLORS.length]}`}
          >
            <h4 className="text-sm font-medium">{insight.title}</h4>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
