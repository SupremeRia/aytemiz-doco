import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSignedUrlMap, groupStoragePaths } from "../src/lib/storage/batch-paths.ts";
import { mapWithConcurrency } from "../src/lib/concurrency.ts";
import { DataAccessError, failDataAccess } from "../src/lib/observability.ts";
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

test("public routes do not mount authenticated offline or auth checks", async()=>{
  const[root,proxy]=await Promise.all([readFile(new URL("../src/app/layout.tsx",import.meta.url),"utf8"),readFile(new URL("../src/proxy.ts",import.meta.url),"utf8")]);
  assert.doesNotMatch(root,/PwaRegister|pendingMutationCount|auth\.getUser/);
  assert.match(root,/ServiceWorkerRegister/);
  assert.doesNotMatch(proxy,/\/\(\(\?!/);
  assert.match(proxy,/\/dashboard\/\:path\*/);
});

test("home route remains static and registered notice is client isolated",async()=>{
  const source=await readFile(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/searchParams|cookies\(|headers\(/);
  assert.match(source,/RegisteredNotice/);
});

test("signed URLs are batched once per bucket and duplicate path",async()=>{
  const calls:{bucket:string;paths:string[]}[]=[];
  const urls=await createSignedUrlMap([{bucket:"a",path:"1"},{bucket:"a",path:"2"},{bucket:"a",path:"1"},{bucket:"b",path:"3"}],900,async(bucket,paths)=>{calls.push({bucket,paths});return{data:paths.map(path=>({path,signedUrl:`${bucket}/${path}`})),error:null}});
  assert.deepEqual(calls,[{bucket:"a",paths:["1","2"]},{bucket:"b",paths:["3"]}]);
  assert.equal(urls.get("a:1"),"a/1");
});

test("signed URL empty and failure behavior is explicit",async()=>{
  assert.deepEqual([...(await createSignedUrlMap([],900,async()=>({data:[],error:null})))],[]);
  await assert.rejects(()=>createSignedUrlMap([{bucket:"a",path:"1"}],900,async()=>({data:null,error:new Error("storage unavailable")})),/storage unavailable/);
});

test("bounded concurrency never exceeds configured limit",async()=>{
  let active=0,max=0;
  await mapWithConcurrency([1,2,3,4,5,6],2,async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,2));active--});
  assert.equal(max,2);
});

test("data access errors preserve safe operation metadata without raw messages",()=>{
  const original=console.error;const logs:unknown[][]=[];console.error=(...args:unknown[])=>{logs.push(args)};
  try{assert.throws(()=>failDataAccess("tasks.list",{code:"42501",status:403,message:"private payload"}),(error:unknown)=>error instanceof DataAccessError&&error.operation==="tasks.list"&&Boolean(error.incidentId));}
  finally{console.error=original}
  assert.equal(JSON.stringify(logs).includes("private payload"),false);
  assert.match(JSON.stringify(logs),/tasks\.list/);
});
