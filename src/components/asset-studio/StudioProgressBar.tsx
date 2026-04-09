'use client'

import { Check } from "lucide-react";

const steps = [
  { num: 1, label: "Campanha" },
  { num: 2, label: "Produtos" },
  { num: 3, label: "Asset Studio" },
  { num: 4, label: "Exportar" },
];

export function StudioProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-6">
      {steps.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  done
                    ? "bg-[#E94560] text-white"
                    : active
                    ? "bg-[#E94560] text-white"
                    : "bg-[#1A1A2E] text-[#666]"
                }`}
              >
                {done ? <Check size={14} /> : s.num}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-white" : done ? "text-[#999]" : "text-[#555]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-px ${done ? "bg-[#E94560]" : "bg-[#2A2A3E]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
