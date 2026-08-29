import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./config";

export const createClient = cache(async () => {
  const store = await cookies();
  const { url, key } = getSupabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot always persist refreshed cookies.
        }
      },
    },
  });
});
