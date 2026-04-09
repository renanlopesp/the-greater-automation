export interface Product {
  id: number;
  name: string;
  price: number;
  seasonal_score: "alta" | "media";
  photo: string;
}

export interface ColorTheme {
  id: string;
  label: string;
  overlay: string;
  text: string;
  accent: string;
}

export const mockProducts: Product[] = [
  { id: 1, name: "Body Bordado Personalizado", price: 89.90, seasonal_score: "alta", photo: "https://picsum.photos/seed/baby1/400/500" },
  { id: 2, name: "Macacão Tricot Olivia", price: 127.00, seasonal_score: "alta", photo: "https://picsum.photos/seed/baby2/400/500" },
  { id: 3, name: "Kit Saída de Maternidade", price: 195.00, seasonal_score: "alta", photo: "https://picsum.photos/seed/baby3/400/500" },
  { id: 4, name: "Sapatinho Laço Rosa", price: 54.90, seasonal_score: "media", photo: "https://picsum.photos/seed/baby4/400/500" },
  { id: 5, name: "Enxoval Completo 10 Peças", price: 289.00, seasonal_score: "media", photo: "https://picsum.photos/seed/baby5/400/500" },
  { id: 6, name: "Cobertor Bordado", price: 79.90, seasonal_score: "media", photo: "https://picsum.photos/seed/baby6/400/500" },
];

export const colorThemes: ColorTheme[] = [
  { id: "dark", label: "Escuro", overlay: "#0F0F1A", text: "#FFFFFF", accent: "#E94560" },
  { id: "light", label: "Claro", overlay: "#F5F0EB", text: "#1A1A1A", accent: "#8B6F5E" },
  { id: "rose", label: "Rose", overlay: "#C2847A", text: "#FFFFFF", accent: "#FFE4E1" },
  { id: "sage", label: "Verde Sage", overlay: "#5C7A6B", text: "#FFFFFF", accent: "#A8C5B8" },
];

export const holidaySuggestions = [
  { label: "Dia das Mães", name: "Dia das Mães — Primeira Vez", date: "2026-05-10" },
  { label: "Dia dos Pais", name: "Dia dos Pais — Presente Especial", date: "2026-08-09" },
  { label: "Natal", name: "Natal — Primeiro Natal do Bebê", date: "2026-12-25" },
];

export type TextPosition = "top" | "center" | "bottom";
export type CanvasFormat = "9:16" | "1:1" | "4:5";

export interface StudioState {
  step: number;
  campaignName: string;
  campaignDate: string;
  objective: string;
  channel: string;
  selectedProducts: number[];
  headline: string;
  subheadline: string;
  ctaText: string;
  textPosition: TextPosition;
  themeId: string;
  activeProductId: number | null;
  format: CanvasFormat;
  variants: { textPosition: TextPosition; themeId: string }[];
  activeVariant: number | null;
}

export const initialStudioState: StudioState = {
  step: 1,
  campaignName: "",
  campaignDate: "2026-05-10",
  objective: "conversion",
  channel: "instagram_reels",
  selectedProducts: [],
  headline: "",
  subheadline: "",
  ctaText: "Personalize o seu →",
  textPosition: "bottom",
  themeId: "dark",
  activeProductId: null,
  format: "9:16",
  variants: [],
  activeVariant: null,
};
