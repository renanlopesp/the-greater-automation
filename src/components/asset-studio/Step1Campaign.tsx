'use client'

import { useState } from "react";
import { holidaySuggestions } from "@/data/assetStudioData";
import type { StudioState } from "@/data/assetStudioData";

interface Props {
  state: StudioState;
  onChange: (partial: Partial<StudioState>) => void;
  onNext: () => void;
}

const objectives = [
  { value: "conversion", label: "Conversão" },
  { value: "awareness", label: "Awareness" },
  { value: "recompra", label: "Recompra" },
];

const channels = [
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "tiktok", label: "TikTok" },
  { value: "stories", label: "Stories" },
  { value: "pinterest", label: "Pinterest" },
];

export function Step1Campaign({ state, onChange, onNext }: Props) {
  return (
    <div className="max-w-lg mx-auto py-10 px-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-white mb-6">Criar Campanha</h2>

      <div className="space-y-5">
        {/* Campaign Name */}
        <div>
          <label className="text-xs text-[#888] mb-1.5 block">Nome da campanha</label>
          <input
            value={state.campaignName}
            onChange={(e) => onChange({ campaignName: e.target.value })}
            placeholder="Ex: Dia das Mães — Primeira Vez"
            className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#E94560] transition-colors"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-[#888] mb-1.5 block">Data da campanha</label>
          <input
            type="date"
            value={state.campaignDate}
            onChange={(e) => onChange({ campaignDate: e.target.value })}
            className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#E94560] transition-colors"
          />
        </div>

        {/* Objective */}
        <div>
          <label className="text-xs text-[#888] mb-1.5 block">Objetivo</label>
          <div className="flex gap-2">
            {objectives.map((o) => (
              <button
                key={o.value}
                onClick={() => onChange({ objective: o.value })}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  state.objective === o.value
                    ? "bg-[#E94560] text-white"
                    : "bg-[#1A1A2E] text-[#888] hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel */}
        <div>
          <label className="text-xs text-[#888] mb-1.5 block">Canal principal</label>
          <select
            value={state.channel}
            onChange={(e) => onChange({ channel: e.target.value })}
            className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#E94560] transition-colors"
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Holiday Suggestions */}
      <div className="mt-8 p-4 bg-[#1A1A2E] rounded-xl border border-[#2A2A3E]">
        <span className="text-xs text-[#888] block mb-3">Sugestões de datas</span>
        <div className="flex flex-wrap gap-2">
          {holidaySuggestions.map((h) => (
            <button
              key={h.label}
              onClick={() =>
                onChange({ campaignName: h.name, campaignDate: h.date })
              }
              className="px-3 py-1.5 rounded-full bg-[#0F0F1A] border border-[#2A2A3E] text-xs text-[#ccc] hover:border-[#E94560] hover:text-white transition-colors"
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!state.campaignName}
        className="mt-8 w-full py-3 rounded-xl bg-[#E94560] text-white font-medium text-sm hover:bg-[#d63d55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Escolher Produtos →
      </button>
    </div>
  );
}
