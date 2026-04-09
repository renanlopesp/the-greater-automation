'use client'

import { useState } from "react";

export interface FontOption {
  id: string;
  name: string;
  family: string;
}

interface FontCategory {
  id: string;
  label: string;
  fonts: FontOption[];
}

const fontCategories: FontCategory[] = [
  {
    id: "sans",
    label: "Sans",
    fonts: [
      { id: "inter",      name: "Inter",      family: "'Inter', sans-serif"      },
      { id: "poppins",    name: "Poppins",    family: "'Poppins', sans-serif"    },
      { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif" },
      { id: "lexend",     name: "Lexend",     family: "'Lexend', sans-serif"     },
      { id: "outfit",     name: "Outfit",     family: "'Outfit', sans-serif"     },
      { id: "onest",      name: "Onest",      family: "'Onest', sans-serif"      },
      { id: "dongle",     name: "Dongle",     family: "'Dongle', sans-serif"     },
    ],
  },
  {
    id: "serif",
    label: "Serif",
    fonts: [
      { id: "playfair",    name: "Playfair Display", family: "'Playfair Display', serif"    },
      { id: "playfair-sc", name: "Playfair SC",      family: "'Playfair Display SC', serif" },
      { id: "lora",        name: "Lora",             family: "'Lora', serif"                },
      { id: "cormorant",   name: "Cormorant",        family: "'Cormorant Garamond', serif"  },
      { id: "scope-one",   name: "Scope One",        family: "'Scope One', serif"           },
      { id: "dm-serif",    name: "DM Serif",         family: "'DM Serif Display', serif"    },
      { id: "fraunces",    name: "Fraunces",         family: "'Fraunces', serif"             },
    ],
  },
  {
    id: "display",
    label: "Display",
    fonts: [
      { id: "bebas",         name: "Bebas Neue",    family: "'Bebas Neue', sans-serif"    },
      { id: "oswald",        name: "Oswald",        family: "'Oswald', sans-serif"        },
      { id: "anton",         name: "Anton",         family: "'Anton', sans-serif"         },
      { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
      { id: "raleway",       name: "Raleway",       family: "'Raleway', sans-serif"       },
    ],
  },
  {
    id: "script",
    label: "Script",
    fonts: [
      { id: "monsieur-la-doulaise", name: "Monsieur La Doulaise", family: "'Monsieur La Doulaise', cursive" },
      { id: "pinyon-script",        name: "Pinyon Script",        family: "'Pinyon Script', cursive"        },
      { id: "meow-script",          name: "Meow Script",          family: "'Meow Script', cursive"          },
      { id: "dancing",              name: "Dancing Script",       family: "'Dancing Script', cursive"       },
      { id: "great-vibes",          name: "Great Vibes",          family: "'Great Vibes', cursive"          },
      { id: "pacifico",             name: "Pacifico",             family: "'Pacifico', cursive"             },
    ],
  },
  {
    id: "handwritten",
    label: "Handwritten",
    fonts: [
      { id: "gochi-hand", name: "Gochi Hand", family: "'Gochi Hand', cursive" },
      { id: "pangolin",   name: "Pangolin",   family: "'Pangolin', cursive"   },
      { id: "kapakana",   name: "Kapakana",   family: "'Kapakana', cursive"   },
    ],
  },
];

export const ALL_FONTS: FontOption[] = fontCategories.flatMap(c => c.fonts);

export const getFontById = (id: string): FontOption | undefined => ALL_FONTS.find(f => f.id === id);
export const getFontFamilyById = (id: string): string => getFontById(id)?.family || "'Inter', sans-serif";

interface FontCategorySelectorProps {
  selectedFontId: string;
  onSelect: (font: FontOption) => void;
}

export const FontCategorySelector = ({ selectedFontId, onSelect }: FontCategorySelectorProps) => {
  const [openCat, setOpenCat] = useState<string>("sans");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {fontCategories.map(cat => (
        <div key={cat.id}>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpenCat(prev => prev === cat.id ? "" : cat.id);
            }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "8px 0",
              background: "transparent", border: "none",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer", color: "rgba(255,255,255,0.65)",
              fontSize: "12px", fontWeight: 600, fontFamily: "'Inter',sans-serif",
            }}
          >
            <span>{cat.label}</span>
            <span style={{ fontSize: "9px", opacity: 0.4 }}>
              {openCat === cat.id ? "▲" : "▼"}
            </span>
          </button>

          {openCat === cat.id && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 6 }}>
              {cat.fonts.map(font => {
                const active = selectedFontId === font.id;
                return (
                  <button
                    key={font.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onSelect(font);
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "9px 10px", borderRadius: "7px",
                      border: active ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                      background: active ? "rgba(255,255,255,0.1)" : "transparent",
                      cursor: "pointer",
                      fontFamily: font.family,
                      fontSize: "16px",
                      fontWeight: 400,
                      color: "#FFFFFF",
                      width: "100%", textAlign: "left" as const,
                    }}
                  >
                    {font.name}
                    {active && <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
