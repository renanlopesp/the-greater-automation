'use client'

import { useState, useEffect, useCallback } from "react";
import { studioSupabase } from '@/lib/supabase/studio-client';
import { STUDIO_PRODUCT_SEEDS } from "@/config/studioProducts";

export interface CatalogProduct {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  image_url: string;
}

function mergeWithSeeds(products: CatalogProduct[]): CatalogProduct[] {
  const byId = new Map(products.map((product) => [product.product_id, product]));

  for (const seed of STUDIO_PRODUCT_SEEDS) {
    if (!byId.has(seed.product_id)) {
      byId.set(seed.product_id, {
        id: `seed-${seed.product_id}`,
        product_id: seed.product_id,
        name: seed.name,
        sku: seed.sku,
        image_url: "",
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aSeedIndex = STUDIO_PRODUCT_SEEDS.findIndex((seed) => seed.product_id === a.product_id);
    const bSeedIndex = STUDIO_PRODUCT_SEEDS.findIndex((seed) => seed.product_id === b.product_id);
    if (aSeedIndex === -1 && bSeedIndex === -1) return a.name.localeCompare(b.name);
    if (aSeedIndex === -1) return 1;
    if (bSeedIndex === -1) return -1;
    return aSeedIndex - bSeedIndex;
  });
}

export function useProductCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const supabase = studioSupabase as any;
    const { data } = await supabase
      .from("product_catalog")
      .select("*")
      .order("created_at", { ascending: true });

    setProducts(mergeWithSeeds((data as CatalogProduct[] | null) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const addProduct = useCallback(async (name: string, sku: string) => {
    const supabase = studioSupabase as any;
    const product_id = `p${Date.now()}`;
    const { data, error } = await supabase
      .from("product_catalog")
      .insert({ product_id, name, sku })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    const prod = data as CatalogProduct;
    setProducts(prev => mergeWithSeeds([...prev.filter((p) => !p.id.startsWith("seed-")), prod]));
    return prod;
  }, []);

  const removeProduct = useCallback(async (product_id: string) => {
    const supabase = studioSupabase as any;
    const prod = products.find(p => p.product_id === product_id);
    if (prod?.image_url) {
      await supabase.storage.from("product-images").remove([
        `${product_id}.jpg`, `${product_id}.jpeg`, `${product_id}.png`, `${product_id}.webp`,
      ]);
    }
    await supabase.from("product_catalog").delete().eq("product_id", product_id);
    setProducts(prev => mergeWithSeeds(prev.filter(p => p.product_id !== product_id && !p.id.startsWith("seed-"))));
  }, [products]);

  const updateImageUrl = useCallback(async (product_id: string, image_url: string) => {
    const supabase = studioSupabase as any;
    const existing = products.find((p) => p.product_id === product_id);
    if (existing?.id.startsWith("seed-")) {
      const { data, error } = await supabase
        .from("product_catalog")
        .insert({ product_id, name: existing.name, sku: existing.sku, image_url })
        .select()
        .single();
      if (error) {
        console.error(error);
        return;
      }
      const inserted = data as CatalogProduct;
      setProducts(prev => mergeWithSeeds([...prev.filter((p) => p.product_id !== product_id && !p.id.startsWith("seed-")), inserted]));
      return;
    }

    await supabase.from("product_catalog").update({ image_url }).eq("product_id", product_id);
    setProducts(prev => mergeWithSeeds(prev.map(p => p.product_id === product_id ? { ...p, image_url } : p).filter((p) => !p.id.startsWith("seed-"))));
  }, [products]);

  const uploadProductImage = useCallback(async (product_id: string, file: File): Promise<string | null> => {
    const supabase = studioSupabase as any;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${product_id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (uploadError) { console.error("Upload error:", uploadError); return null; }

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    const cleanUrl = publicUrl.split("?")[0];
    const urlWithBuster = `${cleanUrl}?t=${Date.now()}`;

    await updateImageUrl(product_id, cleanUrl);
    return urlWithBuster;
  }, [updateImageUrl]);

  const removeProductImage = useCallback(async (product_id: string) => {
    const supabase = studioSupabase as any;
    await supabase.storage.from("product-images").remove([
      `${product_id}.jpg`, `${product_id}.jpeg`, `${product_id}.png`, `${product_id}.webp`
    ]);

    const existing = products.find((p) => p.product_id === product_id);
    if (existing?.id.startsWith("seed-")) {
      setProducts(prev => mergeWithSeeds(prev.filter((p) => !p.id.startsWith("seed-"))));
      return;
    }

    await supabase.from("product_catalog").update({ image_url: "" }).eq("product_id", product_id);
    setProducts(prev => mergeWithSeeds(prev.map(p => p.product_id === product_id ? { ...p, image_url: "" } : p).filter((p) => !p.id.startsWith("seed-"))));
  }, [products]);

  return { products, loading, addProduct, removeProduct, updateImageUrl, uploadProductImage, removeProductImage, refetch: fetchProducts };
}

