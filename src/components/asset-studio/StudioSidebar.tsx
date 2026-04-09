'use client'

import { Calendar, Megaphone, Palette, FileText } from "lucide-react";

const agents = [
  { label: "Seasonal Calendar", icon: Calendar, active: true },
  { label: "Campaign Orchestrator", icon: Megaphone, active: false },
  { label: "Brand DNA Agent", icon: Palette, active: false },
  { label: "Campaign Copywriter", icon: FileText, active: false },
];

export function StudioSidebar() {
  return (
    <div className="w-56 border-r border-[#1A1A2E] bg-[#0A0A14] flex flex-col py-6 px-3 shrink-0 hidden lg:flex">
      <div className="text-[10px] uppercase tracking-widest text-[#555] mb-4 px-2">
        Agentes
      </div>
      {agents.map((a) => (
        <div
          key={a.label}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 ${
            a.active
              ? "bg-[#1A1A2E] text-[#E94560] font-medium"
              : "text-[#666] hover:text-[#999]"
          }`}
        >
          <a.icon size={16} />
          <span>{a.label}</span>
        </div>
      ))}
    </div>
  );
}
