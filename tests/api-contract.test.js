import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/server.js';

function response() {
  return {
    status: null, headers: null, body: '',
    writeHead(status, headers) { this.status=status; this.headers=headers; },
    end(body) { this.body=body||''; }
  };
}
async function request(method,path,headers={}) {
  const res=response();
  await handler({method,url:path,headers},res);
  return {status:res.status,body:JSON.parse(res.body),headers:res.headers};
}
test('health retorna 200 sem credenciais',async()=>{
  const r=await request('GET','/health');
  assert.equal(r.status,200);
  assert.equal(r.body.status,'ok');
  assert.equal(r.headers['cache-control'],'no-store');
});
test('rotas de dados falham fechadas sem configuração de banco',async()=>{
  if(process.env.DATABASE_URL)return;
  for(const path of ['/api/me','/api/clients','/api/products','/api/plans','/api/subscriptions','/api/quotes']){
    const r=await request('GET',path);
    assert.equal(r.status,503,path);
    assert.equal(r.body.error,'Banco de dados não configurado');
  }
});
test('não confia em cabeçalho de usuário como autenticação',async()=>{
  if(process.env.DATABASE_URL)return;
  const r=await request('GET','/api/me',{'x-user-id':'00000000-0000-0000-0000-000000000000'});
  assert.equal(r.status,503);
});

test('caminhos internos não retornam arquivos da aplicação',async()=>{
  for(const path of ['/.env','/package.json','/src/server.js','/desktop/main.cjs']){
    const r=await request('GET',path);
    assert.notEqual(r.status,200,path);
  }
});

test('rota API inexistente nunca responde HTML',async()=>{
  if(process.env.DATABASE_URL)return;
  const r=await request('GET','/api/nao-existe');
  assert.equal(r.status,503);
  assert.match(r.headers['content-type'],/application\/json/);
});

test('rotas API reservadas nunca retornam HTML sem banco',async()=>{
  if(process.env.DATABASE_URL)return;
  for(const path of ['/api','/api/quotes','/api/nao-existe','/health?x=1']){
    const r=await request('GET',path);
    assert.match(r.headers['content-type'],/application\/json/,path);
  }
});

test('caminho com byte NUL codificado não entrega arquivo',async()=>{
  const r=await request('GET','/%00package.json');
  assert.notEqual(r.status,200);
});

test('caminhos com segmentos ocultos não entregam arquivos',async()=>{
  for(const path of ['/.git/config','/.env','/assets/.secret.js']){
    const r=await request('GET',path);
    assert.notEqual(r.status,200,path);
  }
});

test('rotas desconhecidas fora da API retornam 404',async()=>{
  for(const path of ['/caminho-inexistente.js','/.git/config','/src/server.js']){
    const r=await request('GET',path);
    assert.equal(r.status,404,path);
    assert.match(r.headers['content-type'],/application\/json/);
  }
});
