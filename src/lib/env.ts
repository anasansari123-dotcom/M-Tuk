// Only NEXT_PUBLIC_* values live here; they are safe for the browser by design.
// Next inlines them at build time, so each one must be read with its full literal name.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  mapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "",
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
