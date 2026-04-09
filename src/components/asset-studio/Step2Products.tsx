'use client'

import { mockProducts } from "@/data/assetStudioData";
import type { StudioState } from "@/data/assetStudioData";
import { Star } from "lucide-react";

interface Props {
  state: StudioState;
  onChange: (partial: Partial<StudioState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Products({ state, onChange, onNext, onBack }: Props) {
  const toggle = (id: number) => {
    const sel = state.selectedProducts;
    if (sel.includes(id)) {
      onChange({ selectedProducts: sel.filter((x) => x !== id) });
    } else if (sel.length < 3) {
      onChange({ selectedProducts: [...sel, id] });
    }
  };

  const recommended = mockProducts.filter((p) => p.seasonal_score === "alta").slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-white mb-2">Selecionar Produtos</h2>
      <p className="text-sm text-[#888] mb-6">
        Escolha até 3 produtos · {state.selectedProducts.length} de 3 selecionados
      </p>

      {/* Recommended */}
      <div className="mb-6 p-4 border border-[#E94560]/30 rounded-xl bg-[#1A1A2E]">
        <div className="flex items-center gap-1.5 mb-3">
          <Star size={13} className="text-[#E94560]" />
          <span className="text-xs font-medium text-[#E94560]">Snew recomenda</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recommended.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                state.selectedProducts.includes(p.id)
                  ? "border-[#E94560] bg-[#E94560]/10"
                  : "border-[#2A2A3E] hover:border-[#555]"
              }`}
            >
              <img src={p.photo} alt={p.name} className="w-12 h-14 rounded-md object-cover" />
              <div>
                <div className="text-sm text-white font-medium">{p.name}</div>
                <div className="text-xs text-[#888]">R$ {p.price.toFixed(2).replace(".", ",")}</div>
                <span className="text-[10px] bg-[#E94560]/20 text-[#E94560] px-1.5 py-0.5 rounded mt-1 inline-block">
                  ⭐ Melhor desempenho sazonal
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* All Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mockProducts.map((p) => {
          const selected = state.selectedProducts.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`relative rounded-xl border overflow-hidden transition-all text-left ${
                selected
                  ? "border-[#E94560] ring-1 ring-[#E94560]"
                  : "border-[#2A2A3E] hover:border-[#555]"
              } bg-[#1A1A2E]`}
            >
              <img src={p.photo} alt={p.name} className="w-full aspect-[4/5] object-cover" />
              {selected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E94560] flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              )}
              <div className="p-3">
                <div className="text-sm text-white font-medium leading-tight">{p.name}</div>
                <div className="text-xs text-[#888] mt-1">
                  R$ {p.price.toFixed(2).replace(".", ",")}
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded mt-1.5 inline-block ${
                    p.seasonal_score === "alta"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {p.seasonal_score === "alta" ? "Alta" : "Média"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-[#2A2A3E] text-[#888] text-sm hover:text-white transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={() => {
            const first = state.selectedProducts[0];
            onChange({
              activeProductId: first,
              headline: state.campaignName,
              subheadline: mockProducts.find((p) => p.id === first)?.name || "",
            });
            onNext();
          }}
          disabled={state.selectedProducts.length === 0}
          className="flex-1 py-3 rounded-xl bg-[#E94560] text-white font-medium text-sm hover:bg-[#d63d55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Criar Assets →
        </button>
      </div>
    </div>
  );
}
