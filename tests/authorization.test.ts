import assert from "node:assert/strict";import test from "node:test";import { resolvePermission } from "../src/lib/auth/authorization.ts";
test("OP bütün kararların önündedir",()=>assert.equal(resolvePermission({isOp:true,explicitDeny:true,userAllow:false,roleAllow:false}),true));
test("explicit deny rol allow değerinden üstündür",()=>assert.equal(resolvePermission({isOp:false,explicitDeny:true,userAllow:false,roleAllow:true}),false));
test("kullanıcı allow izin verir",()=>assert.equal(resolvePermission({isOp:false,explicitDeny:false,userAllow:true,roleAllow:false}),true));
test("rol allow izin verir",()=>assert.equal(resolvePermission({isOp:false,explicitDeny:false,userAllow:false,roleAllow:true}),true));
test("eşleşme yoksa varsayılan deny uygulanır",()=>assert.equal(resolvePermission({isOp:false,explicitDeny:false,userAllow:false,roleAllow:false}),false));
