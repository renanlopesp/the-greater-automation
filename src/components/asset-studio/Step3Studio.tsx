'use client'

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { mockProducts, colorThemes } from "@/data/assetStudioData";
import type { StudioState, TextPosition, CanvasFormat } from "@/data/assetStudioData";
import { CanvasPreview } from "./CanvasPreview";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Props {
  state: StudioState;
  onChange: (partial: Partial<StudioState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const positions: { value: TextPosition; label: string }[] = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Base" },
];

const formats: { value: CanvasFormat; label: string }[] = [
  { value: "9:16", label: "9:16 Stories" },
  { value: "1:1", label: "1:1 Feed" },
  { value: "4:5", label: "4:5 Pinterest" },
];

export function Step3Studio({ state, onChange, onNext, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedProducts = mockProducts.filter((p) => state.selectedProducts.includes(p.id));

  const generateVariants = () => {
    setGenerating(true);
    setTimeout(() => {
      onChange({
        variants: [
          { textPosition: "top", themeId: "dark" },
          { textPosition: "bottom", themeId: "light" },
          { textPosition: "center", themeId: "rose" },
        ],
        activeVariant: null,
      });
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 animate-fade-in overflow-auto">
      {/* Canvas side */}
      <div className="flex flex-col items-center gap-4 shrink-0">
        {/* Phone frame */}
        <div className="p-2 bg-[#1A1A2E] rounded-[20px] border border-[#2A2A3E]">
          <CanvasPreview ref={canvasRef} state={state} />
        </div>

        {/* Format tabs */}
        <div className="flex gap-1 bg-[#1A1A2E] rounded-lg p-1">
          {formats.map((f) => (
            <button
              key={f.value}
              onClick={() => onChange({ format: f.value })}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                state.format === f.value
                  ? "bg-[#E94560] text-white"
                  : "text-[#888] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Variants row */}
        {generating && (
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[100px] h-[178px] rounded-lg bg-[#1A1A2E] animate-pulse" />
            ))}
          </div>
        )}
        {!generating && state.variants.length > 0 && (
          <div className="flex gap-2">
            {state.variants.map((v, i) => (
              <button
                key={i}
                onClick={() => {
                  onChange({
                    textPosition: v.textPosition,
                    themeId: v.themeId,
                    activeVariant: i,
                  });
                }}
                className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                  state.activeVariant === i ? "border-[#E94560]" : "border-transparent"
                }`}
              >
                <CanvasPreview
                  state={state}
                  themeOverride={v.themeId}
                  positionOverride={v.textPosition}
                  small
                />
                {state.activeVariant === i && (
                  <div className="absolute top-1 left-1 bg-[#E94560] text-white text-[8px] px-1.5 py-0.5 rounded-full">
                    Selecionada
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls side */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Text controls */}
        <div>
          <h3 className="text-xs text-[#888] uppercase tracking-wider mb-3">Texto</h3>
          <div className="space-y-3">
            <input
              value={state.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="Headline"
              className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#E94560]"
            />
            <input
              value={state.subheadline}
              onChange={(e) => onChange({ subheadline: e.target.value })}
              placeholder="Subheadline"
              className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#E94560]"
            />
            <input
              value={state.ctaText}
              onChange={(e) => onChange({ ctaText: e.target.value })}
              placeholder="CTA"
              className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#E94560]"
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <h3 className="text-xs text-[#888] uppercase tracking-wider mb-3">Posição do texto</h3>
          <div className="flex gap-2">
            {positions.map((p) => (
              <button
                key={p.value}
                onClick={() => onChange({ textPosition: p.value })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  state.textPosition === p.value
                    ? "bg-[#E94560] text-white"
                    : "bg-[#1A1A2E] text-[#888] hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <h3 className="text-xs text-[#888] uppercase tracking-wider mb-3">Tema de cor</h3>
          <div className="flex gap-2">
            {colorThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange({ themeId: t.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  state.themeId === t.id
                    ? "ring-2 ring-[#E94560] bg-[#1A1A2E]"
                    : "bg-[#1A1A2E] hover:ring-1 hover:ring-[#555]"
                }`}
              >
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: t.overlay }} />
                <span className="text-white">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product selector */}
        <div>
          <h3 className="text-xs text-[#888] uppercase tracking-wider mb-3">Produto</h3>
          <div className="flex gap-2">
            {selectedProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => onChange({ activeProductId: p.id, subheadline: p.name })}
                className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  state.activeProductId === p.id ? "border-[#E94560]" : "border-[#2A2A3E]"
                }`}
              >
                <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateVariants}
            disabled={generating}
            className="flex-1 py-2.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] text-sm text-white hover:border-[#E94560] transition-colors disabled:opacity-50"
          >
            {generating ? "Gerando…" : "Gerar Variações"}
          </button>
          <button
            onClick={async () => {
              if (!canvasRef.current) return;
              try {
                const canvas = await html2canvas(canvasRef.current, {
                  scale: 3,
                  useCORS: true,
                  backgroundColor: null,
                });
                const link = document.createElement("a");
                link.download = `${state.campaignName.replace(/\s+/g, "-").toLowerCase()}-asset.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                toast.success("Asset exportado com sucesso! 1080×1920px");
                onNext();
              } catch {
                toast.error("Erro ao exportar asset");
              }
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#E94560] text-white text-sm font-medium hover:bg-[#d63d55] transition-colors"
          >
            Exportar Asset ↓
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-xl border border-[#2A2A3E] text-[#888] text-sm hover:text-white transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>

      {/* Floating save draft */}
      <button
        onClick={() => toast("Rascunho salvo!")}
        className="fixed bottom-6 right-6 bg-[#1A1A2E] border border-[#2A2A3E] rounded-full px-4 py-2.5 flex items-center gap-2 text-sm text-[#888] hover:text-white hover:border-[#E94560] transition-colors shadow-lg z-50"
      >
        <Save size={14} />
        Salvar rascunho
      </button>
    </div>
  );
}
