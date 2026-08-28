import test from "node:test";import assert from "node:assert/strict";import { validateMediaFile } from "../src/lib/media/validation.ts";
test("uyumlu görsel kabul edilir",()=>assert.deepEqual(validateMediaFile("kanit.JPG","image/jpeg",1024),{ok:true,extension:"jpg"}));
test("çalıştırılabilir dosya reddedilir",()=>assert.equal(validateMediaFile("zararli.exe","application/octet-stream",100).ok,false));
test("MIME ve uzantı uyuşmazlığı reddedilir",()=>assert.equal(validateMediaFile("sahte.jpg","application/pdf",100).ok,false));
test("HEIC için anlaşılır hata döner",()=>{const result=validateMediaFile("foto.heic","image/heic",100);assert.equal(result.ok,false);if(!result.ok)assert.match(result.message,/HEIC/)});
test("boyut sınırı uygulanır",()=>assert.equal(validateMediaFile("buyuk.mp4","video/mp4",51*1024*1024).ok,false));
