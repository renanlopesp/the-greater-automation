'use client'

import { toast } from "sonner";
import { CanvasPreview } from "./CanvasPreview";
import type { StudioState } from "@/data/assetStudioData";
import { Copy, Send, RotateCcw, TrendingUp, Bookmark, MousePointerClick } from "lucide-react";

interface Props {
  state: StudioState;
  onReset: () => void;
}

export function Step4Export({ state, onReset }: Props) {
  const igCaption = `✨ ${state.campaignName}\n\nO presente perfeito para quem está vivendo a fase mais especial da vida 💛\nDescubra peças únicas feitas com amor e carinho.\n\n👉 Link na bio\n\n#diadasmaes #primeiramaternidade #enxovaldebebe #presenteespecial #snewbaby`;
  const waCaption = `💛 ${state.campaignName}\n\nPeças exclusivas com personalização. Aproveite condições especiais!\n\nVeja mais: link.snew.com.br/mae`;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada!");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-white mb-6">Asset Exportado ✓</h2>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Preview */}
        <div className="p-2 bg-[#1A1A2E] rounded-[20px] border border-[#2A2A3E] self-start">
          <CanvasPreview state={state} />
        </div>

        <div className="flex-1 space-y-6">
          {/* Metrics projection */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Alcance est.", value: "12.4K", icon: TrendingUp },
              { label: "Salvamentos est.", value: "340", icon: Bookmark },
              { label: "CTR est.", value: "3.2%", icon: MousePointerClick },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl p-3 text-center"
              >
                <m.icon size={14} className="text-[#E94560] mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{m.value}</div>
                <div className="text-[10px] text-[#888]">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[#555] -mt-3">
            Projeção baseada em benchmarks da categoria baby/kids
          </div>

          {/* Instagram caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#888]">Legenda Instagram</span>
              <button
                onClick={() => copyText(igCaption)}
                className="flex items-center gap-1 text-xs text-[#E94560] hover:underline"
              >
                <Copy size={12} /> Copiar
              </button>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl p-3 text-sm text-[#ccc] whitespace-pre-line leading-relaxed">
              {igCaption}
            </div>
          </div>

          {/* WhatsApp caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#888]">Legenda WhatsApp</span>
              <button
                onClick={() => copyText(waCaption)}
                className="flex items-center gap-1 text-xs text-[#E94560] hover:underline"
              >
                <Copy size={12} /> Copiar
              </button>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl p-3 text-sm text-[#ccc] whitespace-pre-line leading-relaxed">
              {waCaption}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => toast.success("Enviado para o Campaign Orchestrator")}
            className="w-full py-3 rounded-xl bg-[#E94560] text-white font-medium text-sm hover:bg-[#d63d55] transition-colors flex items-center justify-center gap-2"
          >
            <Send size={14} />
            Agendar no Campaign Orchestrator
          </button>
          <button
            onClick={onReset}
            className="w-full py-3 rounded-xl border border-[#2A2A3E] text-[#888] text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            Criar outro asset
          </button>
        </div>
      </div>
    </div>
  );
}
