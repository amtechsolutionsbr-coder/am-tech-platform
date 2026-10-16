import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchCatalog} from '../web/src/catalog-fetch.js';
test('frontend reúne todas as páginas sem truncar em 200 registros',async()=>{
 const original=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async url=>{const u=new URL(url);calls.push(u.searchParams.get('page'));const page=Number(u.searchParams.get('page'));return new Response(JSON.stringify({items:page===1?Array.from({length:200},(_,i)=>({id:i})):Array.from({length:5},(_,i)=>({id:200+i})),pagination:{page,page_size:200,total:205}}));};
  const r=await fetchCatalog('/api/clients',{headers:{Authorization:'Bearer test'}});assert.equal((await r.json()).items.length,205);assert.deepEqual(calls,['1','2']);
 }finally{globalThis.fetch=original;}
});
test('frontend preserva erro HTTP em página posterior',async()=>{
 const original=globalThis.fetch;let n=0;
 try{globalThis.fetch=async()=>++n===1?new Response(JSON.stringify({items:[{id:1}],pagination:{page:1,page_size:1,total:2}})):new Response('{"error":"Acesso revogado"}',{status:403});
  assert.equal((await fetchCatalog('/api/clients')).status,403);
 }finally{globalThis.fetch=original;}
});
