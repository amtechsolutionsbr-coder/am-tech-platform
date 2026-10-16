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
 await db.exec((await readFile(new URL('../supabase/migrations/20261016031537_backend_role.sql',import.meta.url),'utf8')).replace('GRANT CONNECT ON DATABASE postgres TO amtech_api;',''));
 await db.exec(await readFile(new URL('../db/003_finance.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/004_client_apps.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/005_payments.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/006_editing.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/007_commercial.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/008_support.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/009_reversals.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/010_financial_corrections.sql',import.meta.url),'utf8'));
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
 await t.test('financeiro: permissões, centavos, quitação única e totais',async()=>{
  for(const n of [3,4])for(const method of ['GET','POST'])assert.equal((await request(method,'/api/finance',id(n),{})).status,403);
  const base={kind:'income',description:'Projeto financeiro',amount_cents:12345,due_date:'2026-10-16',client_id:client};
  for(const change of [{amount_cents:0},{amount_cents:1.5},{due_date:'2026-02-30'},{client_id:id(99)}])assert.equal((await request('POST','/api/finance',id(1),{...base,...change})).status,422);
  await db.exec('SET ROLE amtech_api');
  try {
   const r=await request('POST','/api/finance',id(1),base);assert.equal(r.status,201);
   const exp=await request('POST','/api/finance',id(2),{...base,kind:'expense',amount_cents:2345});assert.equal(exp.status,201);
   assert.equal((await request('POST','/api/finance/'+r.body.id+'/settle',id(1),{settled_date:'2099-01-01'})).status,422);
   for(const entry of [r,exp])assert.equal((await request('POST','/api/finance/'+entry.body.id+'/settle',id(1),{settled_date:'2020-01-01'})).status,200);
   assert.equal((await request('POST','/api/finance/'+r.body.id+'/settle',id(1),{settled_date:'2020-01-01'})).status,409);
   const summary=(await request('GET','/api/finance',id(1))).body.summary;
   assert.equal(Number(summary.received_cents),12345);assert.equal(Number(summary.paid_cents),2345);assert.equal(Number(summary.receivable_cents),0);
   await assert.rejects(query('DELETE FROM financial_entries'));
   await assert.rejects(query('UPDATE financial_payments SET amount_cents=1'));
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('pagamentos parciais preservam saldo e resumo mensal',async()=>{
  const r=await request('POST','/api/finance',id(1),{kind:'income',description:'Pagamento parcelado',amount_cents:10000,due_date:'2026-10-16'});
  const path='/api/finance/'+r.body.id+'/payments';
  assert.equal((await request('POST',path,id(1),{amount_cents:3000,settled_date:'2026-01-10'})).status,200);
  assert.equal((await request('POST',path,id(1),{amount_cents:7001,settled_date:'2026-01-11'})).status,409);
  let data=(await request('GET','/api/finance',id(1))).body;
  assert.equal(Number(data.summary.receivable_cents),7000);
  assert.equal(Number(data.monthly.find(m=>m.month==='2026-01').received_cents),3000);
  assert.equal((await request('POST',path,id(1),{amount_cents:7000,settled_date:'2026-02-10'})).status,200);
  assert.equal((await request('POST',path,id(1),{amount_cents:1,settled_date:'2026-02-11'})).status,409);
 });
 await t.test('parcelas são atômicas, preservam total e histórico é consultável',async()=>{
  const body={kind:'income',description:'Projeto em parcelas',amount_cents:10000,due_date:'2026-01-31',installments:3};
  await db.exec('SET ROLE amtech_api');
  try{
   const r=await request('POST','/api/finance/installments',id(1),body);assert.equal(r.status,201);
   assert.equal(r.body.items.length,3);assert.equal(r.body.items.reduce((n,x)=>n+Number(x.amount_cents),0),10000);
   assert.equal(String(r.body.items[1].due_date).slice(0,10),'2026-02-28');
   const entry=r.body.items[0];
   assert.equal((await request('POST','/api/finance/'+entry.id+'/payments',id(1),{amount_cents:100,settled_date:'2026-01-01'})).status,200);
   const history=await request('GET','/api/finance/'+entry.id+'/payments',id(1));assert.equal(history.status,200);assert.equal(Number(history.body.items[0].amount_cents),100);
   assert.equal((await request('GET','/api/finance/'+entry.id+'/payments',id(3))).status,403);
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('estorno preserva pagamento, reabre saldo e exige motivo',async()=>{
  const r=await request('POST','/api/finance',id(1),{kind:'expense',description:'Despesa a corrigir',amount_cents:1000,due_date:'2026-01-01'});
  await request('POST','/api/finance/'+r.body.id+'/settle',id(1),{settled_date:'2026-01-01'});
  const h=(await request('GET','/api/finance/'+r.body.id+'/payments',id(1))).body.items;
  const path='/api/finance/payments/'+h[0].id+'/reverse';
  assert.equal((await request('POST',path,id(3),{reason:'Erro de registro'})).status,403);
  assert.equal((await request('POST',path,id(1),{reason:'x'})).status,422);
  await db.exec('SET ROLE amtech_api');
  try{
   assert.equal((await request('POST',path,id(1),{reason:'Erro de registro'})).status,201);
   assert.equal((await request('POST',path,id(1),{reason:'Estorno duplicado'})).status,409);
   const entry=(await request('GET','/api/finance',id(1))).body.items.find(x=>x.id===r.body.id);
   assert.equal(Number(entry.paid_cents),0);assert.equal(entry.settled_date,null);
   const history=(await request('GET','/api/finance/'+r.body.id+'/payments',id(1))).body.items;
   assert.equal(history.length,1);assert.equal(history[0].reversal_reason,'Erro de registro');
   await assert.rejects(query('DELETE FROM financial_reversals'));
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('correção exige motivo, bloqueia pagamentos ativos e preserva antes/depois',async()=>{
  const r=await request('POST','/api/finance',id(1),{kind:'income',description:'Cadastro incorreto',amount_cents:1000,due_date:'2026-01-01'});
  const path='/api/finance/'+r.body.id;
  const body={description:'Cadastro corrigido',amount_cents:2000,due_date:'2026-02-01',reason:'Valor cadastrado errado'};
  assert.equal((await request('POST',path+'/edit',id(3),body)).status,403);
  assert.equal((await request('POST',path+'/edit',id(1),{...body,reason:''})).status,422);
  await db.exec('SET ROLE amtech_api');
  try{
   assert.equal((await request('POST',path+'/edit',id(1),body)).status,200);
   const history=(await request('GET',path+'/corrections',id(1))).body.items;
   assert.equal(Number(history[0].previous_data.amount_cents),1000);assert.equal(Number(history[0].new_data.amount_cents),2000);
   assert.equal((await request('POST',path+'/payments',id(1),{amount_cents:100,settled_date:'2026-01-01'})).status,200);
   assert.equal((await request('POST',path+'/edit',id(1),body)).status,409);
   await assert.rejects(query('DELETE FROM financial_corrections'));
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('central: cliente, URL segura, permissões e papel SQL restrito',async()=>{
  for(const n of [3,4])for(const method of ['GET','POST'])assert.equal((await request(method,'/api/client-apps',id(n),{})).status,403);
  const base={name:'App de teste isolado',client_id:client,app_url:'https://example.test/app',stage:'acceptance'};
  for(const url of ['javascript:alert(1)','http://example.test','https://user:password@example.test','https://example.test?token=secret','https://example.test#token'])assert.equal((await request('POST','/api/client-apps',id(1),{...base,app_url:url})).status,422);
  assert.equal((await request('POST','/api/client-apps',id(1),{...base,client_id:id(99)})).status,422);
  await db.exec('SET ROLE amtech_api');
  try{
   assert.equal((await request('POST','/api/client-apps',id(1),base)).status,201);
   const r=await request('GET','/api/client-apps',id(2));assert.equal(r.status,200);assert.equal(r.body.items[0].client_name,'Cliente de homologação isolada');
   await assert.rejects(query('DELETE FROM client_apps'));
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('edição de clientes e aplicativos mantém identidade e exige permissão',async()=>{
  const path='/api/clients/'+client+'/edit';
  const body={name:'Cliente editado',email:'contato@example.test',phone:'11999999999',status:'active'};
  assert.equal((await request('POST',path,id(3),body)).status,403);
  assert.equal((await request('POST',path,id(1),{...body,email:'errado'})).status,422);
  await db.exec('SET ROLE amtech_api');
  try{
   const r=await request('POST',path,id(1),body);assert.equal(r.status,200);assert.equal(r.body.id,client);
   const app=(await request('GET','/api/client-apps',id(1))).body.items[0];
   const update={name:app.name,app_url:app.app_url,stage:'production'};
   assert.equal((await request('POST','/api/client-apps/'+app.id+'/edit',id(1),update)).status,200);
   assert.equal((await request('POST','/api/client-apps/'+app.id+'/edit',id(1),{...update,app_url:'javascript:alert(1)'})).status,422);
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('comercial edita com auditoria e preserva valor de plano contratado',async()=>{
  const body={name:'Plano revisado',price_cents:12345,billing_cycle:'monthly',active:true};
  assert.equal((await request('POST','/api/plans/'+plan+'/edit',id(3),body)).status,403);
  await db.exec('SET ROLE amtech_api');
  try{
   assert.equal((await request('POST','/api/plans/'+plan+'/edit',id(1),body)).status,200);
   assert.equal((await request('POST','/api/plans/'+plan+'/edit',id(1),{...body,price_cents:999})).status,409);
   assert.equal((await request('POST','/api/products/'+product+'/edit',id(1),{name:'Produto revisado',description:'Descrição',active:true})).status,200);
   const sub=(await request('GET','/api/subscriptions',id(1))).body.items[0];
   assert.equal((await request('POST','/api/subscriptions/'+sub.id+'/edit',id(1),{status:'active'})).status,200);
   const quote=(await request('GET','/api/quotes',id(1))).body.items[0];
   assert.equal((await request('POST','/api/quotes/'+quote.id+'/edit',id(1),{status:'approved'})).status,200);
   assert.equal((await request('POST','/api/quotes/'+quote.id+'/edit',id(1),{status:'errado'})).status,422);
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('suporte vincula cliente e aplicativo, preserva histórico e bloqueia escrita de leitura',async()=>{
  const app=(await request('GET','/api/client-apps',id(1))).body.items[0];
  const body={client_id:client,app_id:app.id,title:'Falha no aplicativo',description:'Descrição do problema',priority:'high'};
  assert.equal((await request('POST','/api/support',id(3),body)).status,403);
  assert.equal((await request('POST','/api/support',id(1),{...body,client_id:id(99)})).status,422);
  await db.exec('SET ROLE amtech_api');
  try{
   const r=await request('POST','/api/support',id(1),body);assert.equal(r.status,201);
   const path='/api/support/'+r.body.id+'/updates';
   assert.equal((await request('POST',path,id(1),{status:'resolved',note:'Problema corrigido'})).status,200);
   assert.equal((await request('POST',path,id(4),{status:'open',note:'Tentativa de alteração'})).status,403);
   const h=await request('GET',path,id(3));assert.equal(h.status,200);assert.equal(h.body.items.length,2);
   assert.equal((await request('GET','/api/support',id(4))).body.items[0].status,'resolved');
   await assert.rejects(query('DELETE FROM support_tickets'));
   await assert.rejects(query("UPDATE support_updates SET note='reescrito'"));
  }finally{await db.exec('RESET ROLE')}
 });
 await t.test('painel soma toda a base e não expõe dados financeiros',async()=>{
  await db.exec('SET ROLE amtech_api');
  try{
   const r=await request('GET','/api/dashboard',id(3));assert.equal(r.status,200);
   assert.equal(Number(r.body.clients),1);assert.equal(Number(r.body.active_subscriptions),1);assert.equal(Number(r.body.approved_quotes),1);assert.equal(Number(r.body.open_tickets),0);
   assert.equal(r.body.received_cents,undefined);
  }finally{await db.exec('RESET ROLE')}
  assert.equal((await request('GET','/api/dashboard')).status,401);
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
 await t.test('papel SQL restrito executa os cinco fluxos sem poder apagar ou alterar auditoria',async()=>{
  await db.exec('SET ROLE amtech_api');
  try {
   const c=await request('POST','/api/clients',id(1),{name:'Cliente com papel restrito'});assert.equal(c.status,201);
   const p=await request('POST','/api/products',id(1),{name:'Produto com papel restrito'});assert.equal(p.status,201);
   const plan=await request('POST','/api/plans',id(1),{product_id:p.body.id,name:'Plano restrito',price_cents:100,billing_cycle:'monthly'});assert.equal(plan.status,201);
   assert.equal((await request('POST','/api/subscriptions',id(1),{client_id:c.body.id,plan_id:plan.body.id})).status,201);
   assert.equal((await request('POST','/api/quotes',id(1),{client_id:c.body.id,title:'Orçamento restrito',complexity:'simple',estimated_hours:1,hourly_rate_cents:100,extra_cost_cents:0,margin_percent:0})).status,201);
   assert.equal((await request('POST','/api/access',id(1),{auth_user_id:id(1),role:'owner',active:true})).status,200);
   await assert.rejects(query('DELETE FROM clients'));
   await assert.rejects(query("UPDATE audit_events SET action='alterada'"));
  } finally { await db.exec('RESET ROLE'); }
 });
 await t.test('RLS mantém dados inacessíveis a papel público com privilégios de tabela',async()=>{
  await db.exec('CREATE ROLE anon; GRANT USAGE ON SCHEMA public TO anon; GRANT SELECT,INSERT ON clients TO anon; SET ROLE anon');
  try {
   assert.equal((await query('SELECT id FROM clients')).rows.length,0);
   await assert.rejects(query("INSERT INTO clients(name) VALUES('Acesso público indevido')"));
  } finally { await db.exec('RESET ROLE'); }
 });
 await t.test('prontidão depende do banco disponível',async()=>{
  assert.equal((await request('GET','/ready')).status,200);
  const handler=createHandler({database:{query:async()=>{throw Error('offline')}}});
  const res={writeHead(s){this.status=s},end(){}};await handler({method:'GET',url:'/ready',headers:{}},res);assert.equal(res.status,503);
 });
 }finally{await db.close()}
});
