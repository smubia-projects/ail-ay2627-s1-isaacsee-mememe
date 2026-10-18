// Shared vibe + style options. Used by the pickers (client) and the API routes (server).

export const THEMES = ["funny", "cute", "classic_meme", "wholesome", "dramatic"] as const;
export type Theme = (typeof THEMES)[number];

export const STYLES = ["cartoon", "chibi", "pixel", "photo"] as const;
export type Style = (typeof STYLES)[number];

export const THEME_INFO: Record<Theme, { label: string; emoji: string; example: string }> = {
  funny: { label: "Funny", emoji: "😂", example: "Me opening the fridge for the 9th time" },
  cute: { label: "Cute", emoji: "🥺", example: "Hi bestie, sending you a hug" },
  classic_meme: { label: "Classic Meme", emoji: "🗿", example: "One does not simply skip kopi" },
  wholesome: { label: "Wholesome", emoji: "🌻", example: "Proud of you for surviving week 7" },
  dramatic: { label: "Dramatic", emoji: "🎭", example: "Betrayal. You ate my last fishball." },
};

export const STYLE_INFO: Record<Style, { label: string; hint: string }> = {
  cartoon: { label: "Cartoon", hint: "Bold lines, flat colour" },
  chibi: { label: "Chibi", hint: "Big head, glossy eyes" },
  pixel: { label: "Pixel Art", hint: "Chunky retro pixels" },
  photo: { label: "Keep Photo", hint: "Your photo, die-cut" },
};

/** Canvas caption font per theme (§5.8). Values are CSS variables set by next/font in layout.tsx. */
export const THEME_FONT: Record<Theme, { cssVar: string; weight: number }> = {
  classic_meme: { cssVar: "--font-anton", weight: 400 },
  dramatic: { cssVar: "--font-anton", weight: 400 },
  cute: { cssVar: "--font-baloo", weight: 800 },
  wholesome: { cssVar: "--font-baloo", weight: 800 },
  funny: { cssVar: "--font-bricolage", weight: 800 },
};
