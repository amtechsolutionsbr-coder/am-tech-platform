import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../src/server.js';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('homologação isolada: SQL, API, papéis e auditoria',async t=>{
 const db=new PGlite();
 try {
 for(const file of ['001_initial.sql','002_quotes.sql'])await db.exec((await readFile(new URL('../db/'+file,import.meta.url),'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 await db.exec((await readFile(new URL('../supabase/migrations/20261016031446_backend_role.sql',import.meta.url),'utf8')).replace('GRANT CONNECT ON DATABASE postgres TO amtech_api;',''));
 const query=async(sql,params)=>{const result=await db.query(sql,params);return {...result,rowCount:result.rows.length || result.affectedRows || 0}};
 const pool={query,async connect(){return {query,release(){}}}};
 const handler=createHandler({database:pool,authenticateRequest:async req=>{const token=req.headers.authorization;if(token==='invalid')throw Error('invalid');return token||null}});
 async function request(method,path,token,body){
  const req={method,url:path,headers:{authorization:token},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body))}};
  const res={writeHead(status,headers){this.status=status;this.headers=headers},end(data){this.body=JSON.parse(data)}};
  await handler(req,res);return res;
 }
 for(const [i,role] of [[1,'owner'],[2,'admin'],[3,'viewer'],[4,'support']])await query('INSERT INTO admin_users(auth_user_id,role) VALUES($1,$2)',[id(i),role]);
 await t.test('sem token, inválido, não membro e inativo são recusados',async()=>{
  assert.equal((await request('GET','/api/me')).status,401);
  assert.equal((await request('GET','/api/me','invalid')).status,401);
  assert.equal((await request('GET','/api/me',id(99))).status,403);
  await query("INSERT INTO admin_users(auth_user_id,role,active) VALUES($1,'admin',false)",[id(5)]);
  assert.equal((await request('GET','/api/me',id(5))).status,403);
 });
 await t.test('viewer e suporte leem e não cadastram em nenhum módulo',async()=>{
  for(const role of [3,4])for(const route of ['clients','products','plans','subscriptions','quotes']){
   assert.equal((await request('GET','/api/'+route,id(role))).status,200,route);
   assert.equal((await request('POST','/api/'+route,id(role),{})).status,403,route);
  }
 });
 let client,product,plan;
 await t.test('owner e admin cadastram cliente, produto, plano, assinatura e orçamento',async()=>{
  let r=await request('POST','/api/clients',id(1),{name:'Cliente de homologação isolada',email:'teste@example.test'});assert.equal(r.status,201);client=r.body.id;
  r=await request('POST','/api/products',id(2),{name:'Projeto teste'});assert.equal(r.status,201);product=r.body.id;
  r=await request('POST','/api/plans',id(2),{product_id:product,name:'Mensal',price_cents:12345,billing_cycle:'monthly'});assert.equal(r.status,201);plan=r.body.id;
  r=await request('POST','/api/subscriptions',id(2),{client_id:client,plan_id:plan,started_at:'2026-10-16',next_billing_at:'2026-11-16'});assert.equal(r.status,201);assert.equal(r.body.status,'pending');
  r=await request('POST','/api/quotes',id(1),{client_id:client,title:'Sistema sob medida',complexity:'custom',estimated_hours:10,hourly_rate_cents:10000,extra_cost_cents:2000,margin_percent:20});assert.equal(r.status,201);assert.equal(Number(r.body.total_cents),122400);
  for(const route of ['clients','products','plans','subscriptions','quotes'])assert.equal((await request('GET','/api/'+route,id(2))).body.items.length,1);
  assert.equal((await query('SELECT count(*) AS count FROM audit_events')).rows[0].count,5);
 });
 await t.test('valida entradas, datas e referências inativas sem salvar',async()=>{
  assert.equal((await request('POST','/api/clients',id(1),{name:'a'})).status,422);
  assert.equal((await request('POST','/api/plans',id(1),{product_id:product,name:'Teste',price_cents:-1,billing_cycle:'monthly'})).status,422);
  assert.equal((await request('POST','/api/subscriptions',id(1),{client_id:client,plan_id:plan,started_at:'2026-02-30'})).status,422);
  assert.equal((await request('POST','/api/subscriptions',id(1),{client_id:client,plan_id:plan,started_at:'2026-10-16',next_billing_at:'2026-10-15'})).status,422);
  await query('UPDATE products SET active=false WHERE id=$1',[product]);
  assert.equal((await request('POST','/api/subscriptions',id(1),{client_id:client,plan_id:plan})).status,422);
 });
 await t.test('falha de auditoria desfaz o cadastro',async()=>{
  const broken={...pool,async connect(){return {release(){},async query(sql,params){if(sql.startsWith('INSERT INTO audit_events'))throw Error('audit unavailable');return query(sql,params)}}}};
  const brokenHandler=createHandler({database:broken,authenticateRequest:async()=>id(1)});
  const req={method:'POST',url:'/api/clients',headers:{},async *[Symbol.asyncIterator](){yield Buffer.from('{"name":"Rollback obrigatório"}')}};
  const res={writeHead(status){this.status=status},end(){}};
  await brokenHandler(req,res);assert.equal(res.status,500);
  assert.equal((await query('SELECT count(*) AS count FROM clients')).rows[0].count,1);
 });
 await t.test('somente owner altera acessos; último owner é preservado; revogação é imediata',async()=>{
  for(const user of [2,3,4])assert.equal((await request('GET','/api/access',id(user))).status,403);
  assert.equal((await request('POST','/api/access',id(2),{auth_user_id:id(2),role:'owner',active:true})).status,403);
  assert.equal((await request('POST','/api/access',id(1),{auth_user_id:id(1),role:'viewer',active:true})).status,409);
  assert.equal((await request('POST','/api/access',id(1),{auth_user_id:id(99),role:'admin',active:true})).status,404);
  assert.equal((await request('POST','/api/access',id(1),{auth_user_id:id(2),role:'viewer',active:false})).status,200);
  assert.equal((await request('GET','/api/me',id(2))).status,403);
  assert.equal((await query("SELECT count(*) AS count FROM audit_events WHERE action='access.updated'")).rows[0].count,1);
 });
 await t.test('prontidão depende do banco disponível',async()=>{
  assert.equal((await request('GET','/ready')).status,200);
  const handler=createHandler({database:{query:async()=>{throw Error('offline')}}});
  const res={writeHead(s){this.status=s},end(){}};await handler({method:'GET',url:'/ready',headers:{}},res);assert.equal(res.status,503);
 });
 }finally{await db.close()}
});
