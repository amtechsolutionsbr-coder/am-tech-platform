import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { authenticate } from '../src/auth.js';
const base='https://example.supabase.co';
const {privateKey,publicKey}=await generateKeyPair('ES256');
const sub='00000000-0000-4000-8000-000000000001';
async function token(claims={}){return new SignJWT({role:'authenticated',...claims}).setProtectedHeader({alg:'ES256'}).setSubject(claims.sub||sub).setIssuer(claims.iss||base+'/auth/v1').setAudience(claims.aud||'authenticated').setExpirationTime(claims.exp||'1h').sign(privateKey)}
const verify=t=>authenticate({headers:{authorization:'Bearer '+t}},{base,keyResolver:publicKey});
test('JWT assinado válido aceita identidade sem confiar em metadados de perfil',async()=>{
 assert.equal(await verify(await token({user_metadata:{role:'owner'}})),sub);
});
test('JWT inválido, expirado, de outro projeto ou audiência é rejeitado',async()=>{
 for(const claims of [{iss:'https://outro.supabase.co/auth/v1'},{aud:'anon'},{exp:1}])await assert.rejects(verify(await token(claims)));
 await assert.rejects(verify('invalid'));
 const {publicKey:other}=await generateKeyPair('ES256');
 await assert.rejects(authenticate({headers:{authorization:'Bearer '+await token()}},{base,keyResolver:other}));
});
test('JWT anon e identidade sem UUID não são autorizados',async()=>{
 assert.equal(await verify(await token({role:'anon'})),null);
 assert.equal(await verify(await token({sub:'invalido'})),null);
 assert.equal(await authenticate({headers:{}}),null);
});
