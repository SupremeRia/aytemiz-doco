import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { groupStoragePaths } from "../src/lib/storage/batch-paths.ts";
import { getSupabaseEnv, hasSupabaseEnv } from "../src/lib/supabase/config.ts";

test("news cover paths are batched once per bucket", () => {
  const groups = groupStoragePaths([
    { bucket: "private-news", path: "a.webp" },
    { bucket: "private-news", path: "b.webp" },
    { bucket: "private-news", path: "a.webp" },
    { bucket: "archive", path: "c.webp" },
  ]);
  assert.deepEqual([...groups], [
    ["private-news", ["a.webp", "b.webp"]],
    ["archive", ["c.webp"]],
  ]);
});

test("missing Supabase configuration fails closed instead of loading demo data", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    assert.equal(hasSupabaseEnv(), false);
    assert.throws(() => getSupabaseEnv(), /environment variables are missing/);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  }
});

test("service worker never intercepts navigation or authenticated requests", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /request\.mode\s*===\s*["']navigate["']/);
  assert.match(source, /request\.headers\.(?:has|get)\(["']authorization["']\)/);
  assert.match(source, /return;/);
});
