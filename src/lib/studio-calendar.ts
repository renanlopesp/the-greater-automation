export interface ScheduledPost {
  id: string;
  imageUrl: string;
  legenda: string;
  platform: "instagram" | "linkedin" | "whatsapp";
  date: string;
  time: string;
  status: "scheduled" | "published" | "failed";
  campaign: string;
}

const STORAGE_KEY = "studio:scheduled-posts";

export const saveScheduledPosts = (posts: ScheduledPost[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch {}
};

export const loadScheduledPosts = (): ScheduledPost[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
