"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

// Used only for Realtime on the live map. Reads the same cookie session as the server.
export function getBrowserClient() {
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseKey);
  return client;
}
