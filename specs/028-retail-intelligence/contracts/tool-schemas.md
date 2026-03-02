# Tool Contracts: Retail Intelligence

Both tools are added to the `buildRetailTools()` function in `src/lib/ai/retail-tools.ts`, following the existing STORE\_\* tool pattern.

## STORE_ANALYZE_CUSTOMERS

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "days": {
      "type": "number",
      "description": "Days of order history to analyze (default: 90, max: 365)"
    },
    "focus": {
      "type": "string",
      "enum": ["overview", "repurchase", "at_risk"],
      "description": "Analysis focus: overview (all segments), repurchase (overdue customers), at_risk (declining customers). Default: overview"
    },
    "limit": {
      "type": "number",
      "description": "Max customers per segment to return (default: 10)"
    }
  }
}
```

### Output: focus = "overview"

```json
{
  "resumo": {
    "periodo": "Ultimos 90 dias",
    "pedidos_analisados": 247,
    "clientes_unicos": 89,
    "pedidos_sem_cliente": 3
  },
  "segmentos": {
    "vip": {
      "total": 8,
      "receita_total": "R$ 12.450,00",
      "pct_receita": "42%",
      "clientes": [
        {
          "nome": "Maria Silva",
          "email": "maria@email.com",
          "pedidos": 12,
          "total_gasto": "R$ 2.340,00",
          "ultimo_pedido": "3 dias atras",
          "rfm": "5-5-5"
        }
      ]
    },
    "loyal": { "...same structure..." },
    "promising": { "...same structure..." },
    "at_risk": { "...same structure..." },
    "lost": { "...same structure..." },
    "new": { "...same structure..." }
  },
  "acoes_sugeridas": [
    "8 clientes VIP geram 42% da receita — considere programa de fidelidade",
    "12 clientes Em Risco nao compram ha 45+ dias — envie cupom de reativacao",
    "5 clientes Perdidos somam R$ 3.200 em compras passadas — campanha de win-back"
  ]
}
```

### Output: focus = "repurchase"

```json
{
  "resumo": {
    "periodo": "Ultimos 90 dias",
    "clientes_analisados": 42,
    "clientes_com_recompra_prevista": 15,
    "excluidos_pedido_unico": 28
  },
  "recompra_atrasada": [
    {
      "nome": "Joao Santos",
      "email": "joao@email.com",
      "intervalo_medio": "28 dias",
      "ultimo_pedido": "35 dias atras",
      "dias_atrasado": 7,
      "total_gasto": "R$ 890,00",
      "pedidos": 5
    }
  ],
  "recompra_proxima": [
    {
      "nome": "Ana Costa",
      "email": "ana@email.com",
      "intervalo_medio": "21 dias",
      "ultimo_pedido": "18 dias atras",
      "previsao": "em 3 dias",
      "total_gasto": "R$ 1.200,00",
      "pedidos": 8
    }
  ]
}
```

---

## STORE_ANALYZE_PRODUCTS

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "days": {
      "type": "number",
      "description": "Days of sales history to analyze (default: 30, max: 365)"
    },
    "include_dead_stock": {
      "type": "boolean",
      "description": "Include products with stock but zero sales (default: true)"
    },
    "limit": {
      "type": "number",
      "description": "Max products per class to return (default: 15)"
    }
  }
}
```

### Output

```json
{
  "resumo": {
    "periodo": "Ultimos 30 dias",
    "pedidos_analisados": 156,
    "produtos_vendidos": 45,
    "receita_total": "R$ 28.500,00"
  },
  "classificacao": {
    "classe_a": {
      "total_produtos": 9,
      "pct_catalogo": "20%",
      "receita": "R$ 22.800,00",
      "pct_receita": "80%",
      "margem_media": "45%",
      "produtos": [
        {
          "nome": "Racao Premium 15kg",
          "receita": "R$ 4.200,00",
          "pct_receita": "14.7%",
          "unidades_vendidas": 84,
          "estoque_atual": 25,
          "giro": 3.4,
          "margem": "52%",
          "preco": "R$ 50,00",
          "custo": "R$ 24,00"
        }
      ]
    },
    "classe_b": { "...same structure..." },
    "classe_c": { "...same structure..." }
  },
  "estoque_parado": [
    {
      "nome": "Coleira Decorada P",
      "sku": "COL-DEC-P",
      "estoque": 45,
      "preco": "R$ 29,90",
      "valor_parado": "R$ 1.345,50",
      "ultima_venda": "42 dias atras"
    }
  ],
  "acoes_sugeridas": [
    "9 produtos Classe A geram 80% do faturamento — priorize estoque e visibilidade",
    "R$ 3.200 em estoque parado (8 produtos) — considere promocao ou bundle",
    "Classe C tem margem media de 22% vs 45% da Classe A — revise precificacao"
  ]
}
```
