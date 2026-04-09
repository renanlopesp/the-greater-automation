'use client'

import { User, X } from "lucide-react";

interface StudioTopBarProps {
  contextLabel?: string;
  onClose?: () => void;
}

export function StudioTopBar({ contextLabel, onClose }: StudioTopBarProps) {
  return (
    <div className="h-12 border-b border-[#1A1A2E] bg-[#0A0A14] flex items-center justify-between px-5 shrink-0">
      <span className="text-white font-bold text-base tracking-tight">Snew</span>
      <span className="text-xs text-[#666] hidden sm:block">
        {contextLabel ?? "Seasonal Calendar → Dia das Mães → Asset Studio"}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#888]">Loja Demo</span>
        <div className="w-7 h-7 rounded-full bg-[#1A1A2E] flex items-center justify-center">
          <User size={14} className="text-[#666]" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2A2A3E] bg-[#1A1A2E] text-[#888] hover:text-white transition-colors flex items-center justify-center"
            aria-label="Fechar Asset Studio"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
