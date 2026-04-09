'use client'

import React from "react";
import { mockProducts, colorThemes } from "@/data/assetStudioData";
import type { StudioState, CanvasFormat, TextPosition } from "@/data/assetStudioData";

interface Props {
  state: StudioState;
  themeOverride?: string;
  positionOverride?: TextPosition;
  small?: boolean;
}

const formatDimensions: Record<CanvasFormat, { w: number; h: number }> = {
  "9:16": { w: 360, h: 640 },
  "1:1": { w: 400, h: 400 },
  "4:5": { w: 400, h: 500 },
};

export const CanvasPreview = React.forwardRef<HTMLDivElement, Props>(function CanvasPreview({ state, themeOverride, positionOverride, small }, ref) {
  const theme = colorThemes.find((t) => t.id === (themeOverride || state.themeId)) || colorThemes[0];
  const product = mockProducts.find((p) => p.id === state.activeProductId) || mockProducts[0];
  const pos = positionOverride || state.textPosition;
  const dim = formatDimensions[state.format];
  const scale = small ? 0.28 : 1;
  const w = dim.w * scale;
  const h = dim.h * scale;

  const textAlign: Record<TextPosition, string> = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
  };

  return (
    <div
      ref={ref}
      className="relative overflow-hidden shrink-0"
      style={{
        width: w,
        height: h,
        borderRadius: small ? 8 : 16,
        boxShadow: small ? "0 2px 8px rgba(0,0,0,0.3)" : "0 8px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Product photo */}
      <img
        src={product.photo}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Color overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to bottom, transparent 20%, ${theme.overlay}cc 60%, ${theme.overlay} 100%)`,
        }}
      />

      {/* Text content */}
      <div
        className="absolute inset-0 flex flex-col p-4 sm:p-6"
        style={{
          justifyContent: textAlign[pos],
        }}
      >
        {!small && (
          <>
            <span
              className="uppercase tracking-widest mb-2"
              style={{
                fontSize: 10,
                color: theme.accent,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              Campanha · {state.campaignDate}
            </span>
            <h3
              className="font-bold leading-tight mb-2"
              style={{
                fontSize: 22,
                color: theme.text,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {state.headline || state.campaignName}
            </h3>
            <p
              className="text-sm mb-3"
              style={{
                color: theme.text,
                opacity: 0.8,
                textShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {state.subheadline || product.name} · R$ {product.price.toFixed(2).replace(".", ",")}
            </p>
            <div
              className="inline-flex self-start px-4 py-2 rounded-full text-xs font-medium"
              style={{
                background: theme.accent,
                color: theme.id === "light" ? "#fff" : theme.overlay,
              }}
            >
              {state.ctaText}
            </div>
          </>
        )}
      </div>

      {/* Logo placeholder */}
      {!small && (
        <div className="absolute bottom-3 right-3 text-[10px] text-white/40 font-medium">
          Snew
        </div>
      )}
    </div>
  );
});
