import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { databaseConfig } from './database.js';
import { StringDecoder } from 'node:string_decoder';
import { authenticate } from './auth.js';
import { calculateQuoteTotal } from './quote-pricing.js';
import { isValidISODate } from './date-validation.js';

const port = Number(process.env.PORT || 3000);
const staticRoot = resolve(fileURLToPath(new URL('../web/dist/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp' };
async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/health' || pathname === '/ready') return false;
  let file;
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\\') || decoded.includes(String.fromCharCode(0)) || decoded.split('/').some(segment => segment.startsWith('.') && segment.length > 1)) return false;
    file = resolve(staticRoot, '.' + decoded);
    if (file !== staticRoot && !file.startsWith(staticRoot + sep)) return false;
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" });
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  } catch {
    if (extname(pathname) || pathname.startsWith('/.')) return false;
    try {
      const data = await readFile(resolve(staticRoot, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" });
      res.end(req.method === 'HEAD' ? undefined : data); return true;
    } catch { return false; }
  }
}
const pool = process.env.DATABASE_URL ? new Pool(databaseConfig(process.env.DATABASE_URL)) : null;
pool?.on('error', () => console.error('Falha na conexão ociosa com o banco'));
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
};
const readBody = async (req) => {
  let text = '';
  const decoder = new StringDecoder('utf8');
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 16000) { const error = new Error('Corpo muito grande'); error.status = 413; throw error; }
    text += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  text += decoder.end();
  try { const body = JSON.parse(text); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); return body; } catch { const error = new Error('JSON inválido'); error.status = 400; throw error; }
};
export function createHandler({ database = pool, authenticateRequest = authenticate } = {}) {
const pool = database;
return async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/') && url.pathname !== '/api' && url.pathname !== '/health' && url.pathname !== '/ready' && await serveStatic(req, res, url.pathname)) return;
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'am-tech-platform', version: '0.2.0' });
    if (req.method === 'GET' && url.pathname === '/ready') {
      if (!pool) return json(res, 503, { status: 'not_ready' });
      try { await pool.query('SELECT 1 FROM admin_users LIMIT 1'); return json(res, 200, { status: 'ready' }); }
      catch { return json(res, 503, { status: 'not_ready' }); }
    }
    if (!url.pathname.startsWith('/api/') && url.pathname !== '/api') return json(res, 404, { error: 'Rota não encontrada' });
    if (!['GET','POST'].includes(req.method)) return json(res, 405, { error: 'Método não permitido' });
    if (!pool) return json(res, 503, { error: 'Banco de dados não configurado' });
    let userId;
    try { userId = await authenticateRequest(req); } catch { return json(res, 401, { error: 'Autenticação inválida' }); }
    if (!userId) return json(res, 401, { error: 'Autenticação obrigatória' });
    const membership = await pool.query('SELECT role FROM admin_users WHERE auth_user_id = $1 AND active = true', [userId]);
    if (!membership.rowCount || !['owner','admin','support','viewer'].includes(membership.rows[0].role)) return json(res, 403, { error: 'Usuário não autorizado' });
    if (req.method === 'GET' && url.pathname === '/api/me') {
      return json(res, 200, { user_id: userId, role: membership.rows[0].role });
    }
    if (url.pathname === '/api/access') {
      if (membership.rows[0].role !== 'owner') return json(res,403,{error:'Somente o proprietário pode gerenciar acessos'});
      if (req.method === 'GET') {
        const result = await pool.query('SELECT auth_user_id,role,active,created_at FROM admin_users ORDER BY created_at');
        return json(res,200,{items:result.rows});
      }
      const body = await readBody(req);
      if (typeof body.auth_user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.auth_user_id) || !['owner','admin','viewer','support'].includes(body.role) || typeof body.active !== 'boolean') return json(res,422,{error:'Acesso inválido'});
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE admin_users IN EXCLUSIVE MODE');
        // Recheck inside the lock: an owner can have been revoked concurrently.
        const actor = await client.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true',[userId]);
        if (actor.rows[0]?.role !== 'owner') { await client.query('ROLLBACK'); return json(res,403,{error:'Acesso revogado'}); }
        const target = await client.query('SELECT role,active FROM admin_users WHERE auth_user_id=$1',[body.auth_user_id]);
        if (!target.rowCount) { await client.query('ROLLBACK'); return json(res,404,{error:'Usuário ainda não autorizado. Cadastre a identidade real pelo procedimento administrativo.'}); }
        if (target.rows[0].role === 'owner' && target.rows[0].active && (body.role !== 'owner' || !body.active)) {
          const owners = await client.query("SELECT count(*) AS count FROM admin_users WHERE role='owner' AND active=true");
          if (Number(owners.rows[0].count) <= 1) { await client.query('ROLLBACK'); return json(res,409,{error:'É necessário manter um proprietário ativo'}); }
        }
        const result = await client.query('UPDATE admin_users SET role=$2,active=$3 WHERE auth_user_id=$1 RETURNING auth_user_id,role,active',[body.auth_user_id,body.role,body.active]);
        await client.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'access.updated','admin_user',body.auth_user_id]);
        await client.query('COMMIT'); return json(res,200,result.rows[0]);
      } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    if (req.method === 'GET' && url.pathname === '/api/clients') {
      const result = await pool.query('SELECT id, name, email, phone, status, created_at FROM clients ORDER BY created_at DESC LIMIT 100');
      return json(res, 200, { items: result.rows });
    }
    if (req.method === 'POST' && url.pathname === '/api/clients') {
      if (!['owner', 'admin'].includes(membership.rows[0].role)) return json(res, 403, { error: 'Sem permissão para cadastrar' });
      const body = await readBody(req);
      if (!body || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 160) return json(res, 422, { error: 'Nome inválido (2 a 160 caracteres)' });
      if (body.email != null && (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) return json(res, 422, { error: 'E-mail inválido' });
      if (body.phone != null && (typeof body.phone !== 'string' || body.phone.length > 40)) return json(res, 422, { error: 'Telefone inválido' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query('INSERT INTO clients (name, email, phone) VALUES ($1,$2,$3) RETURNING id, name, email, phone, status, created_at', [body.name.trim(), body.email || null, body.phone || null]);
        await client.query('INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4)', [userId, 'client.created', 'client', result.rows[0].id]);
        await client.query('COMMIT');
        return json(res, 201, result.rows[0]);
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    if (req.method === 'GET' && url.pathname === '/api/products') {
      const result = await pool.query('SELECT id, name, description, active, created_at FROM products ORDER BY created_at DESC LIMIT 100');
      return json(res, 200, { items: result.rows });
    }
    if (req.method === 'POST' && url.pathname === '/api/products') {
      if (!['owner','admin'].includes(membership.rows[0].role)) return json(res, 403, { error: 'Sem permissão para cadastrar' });
      const body = await readBody(req);
      if (!body || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 120) return json(res, 422, { error: 'Nome inválido' });
      if (body.description != null && (typeof body.description !== 'string' || body.description.length > 2000)) return json(res, 422, { error: 'Descrição inválida' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query('INSERT INTO products(name,description) VALUES ($1,$2) RETURNING id,name,description,active,created_at',[body.name.trim(),body.description?.trim()||null]);
        await client.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)',[userId,'product.created','product',result.rows[0].id]);
        await client.query('COMMIT');
        return json(res,201,result.rows[0]);
      } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    if (req.method === 'GET' && url.pathname === '/api/plans') {
      const result = await pool.query('SELECT p.id,p.product_id,p.name,p.price_cents,p.billing_cycle,p.active,pr.name AS product_name FROM plans p JOIN products pr ON pr.id=p.product_id ORDER BY pr.name,p.name LIMIT 100');
      return json(res,200,{items:result.rows});
    }
    if (req.method === 'POST' && url.pathname === '/api/plans') {
      if (!['owner','admin'].includes(membership.rows[0].role)) return json(res,403,{error:'Sem permissão para cadastrar'});
      const body=await readBody(req);
      if (!body || typeof body.name!=='string' || body.name.trim().length<2 || body.name.length>120) return json(res,422,{error:'Nome inválido'});
      if (typeof body.product_id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.product_id)) return json(res,422,{error:'Produto inválido'});
      if (!Number.isSafeInteger(body.price_cents) || body.price_cents<0 || body.price_cents>1000000000) return json(res,422,{error:'Preço inválido'});
      if (!['monthly','yearly','one_time'].includes(body.billing_cycle)) return json(res,422,{error:'Periodicidade inválida'});
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        const result=await client.query('INSERT INTO plans(product_id,name,price_cents,billing_cycle) SELECT id,$2,$3,$4 FROM products WHERE id=$1 AND active=true RETURNING id,product_id,name,price_cents,billing_cycle,active',[body.product_id,body.name.trim(),body.price_cents,body.billing_cycle]);
        if (!result.rowCount) { await client.query('ROLLBACK'); return json(res,422,{error:'Produto não encontrado ou inativo'}); }
        await client.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'plan.created','plan',result.rows[0].id]);
        await client.query('COMMIT');return json(res,201,result.rows[0]);
      } catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    }
    if (req.method === 'GET' && url.pathname === '/api/subscriptions') {
      const result = await pool.query(`SELECT s.id,s.client_id,s.plan_id,s.status,s.started_at,s.next_billing_at,s.created_at,c.name AS client_name,p.name AS plan_name,p.price_cents,p.billing_cycle,pr.name AS product_name FROM subscriptions s JOIN clients c ON c.id=s.client_id JOIN plans p ON p.id=s.plan_id JOIN products pr ON pr.id=p.product_id ORDER BY s.created_at DESC LIMIT 100`);
      return json(res,200,{items:result.rows});
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions') {
      if (!['owner','admin'].includes(membership.rows[0].role)) return json(res,403,{error:'Sem permissão para cadastrar'});
      const body=await readBody(req);
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!body || typeof body.client_id!=='string' || !uuid.test(body.client_id) || typeof body.plan_id!=='string' || !uuid.test(body.plan_id)) return json(res,422,{error:'Cliente ou plano inválido'});
      if (body.started_at != null && (typeof body.started_at!=='string' || !isValidISODate(body.started_at))) return json(res,422,{error:'Data inicial inválida'});
      if (body.next_billing_at != null && (typeof body.next_billing_at!=='string' || !isValidISODate(body.next_billing_at))) return json(res,422,{error:'Data de cobrança inválida'});
      if (body.started_at && body.next_billing_at && body.next_billing_at < body.started_at) return json(res,422,{error:'Cobrança anterior à data inicial'});
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        const result=await client.query(`INSERT INTO subscriptions(client_id,plan_id,started_at,next_billing_at) SELECT c.id,p.id,$3,$4 FROM clients c CROSS JOIN plans p JOIN products pr ON pr.id=p.product_id WHERE c.id=$1 AND c.status='active' AND p.id=$2 AND p.active=true AND pr.active=true RETURNING id,client_id,plan_id,status,started_at,next_billing_at,created_at`,[body.client_id,body.plan_id,body.started_at||null,body.next_billing_at||null]);
        if(!result.rowCount){await client.query('ROLLBACK');return json(res,422,{error:'Cliente ou plano indisponível'})}
        await client.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'subscription.created','subscription',result.rows[0].id]);
        await client.query('COMMIT');return json(res,201,result.rows[0]);
      } catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    }
    if (req.method === 'GET' && url.pathname === '/api/quotes') {
      const result = await pool.query('SELECT q.id,q.client_id,c.name AS client_name,q.title,q.complexity,q.estimated_hours,q.hourly_rate_cents,q.extra_cost_cents,q.margin_percent,q.total_cents,q.status,q.created_at FROM quotes q JOIN clients c ON c.id=q.client_id ORDER BY q.created_at DESC LIMIT 100');
      return json(res,200,{items:result.rows});
    }
    if (req.method === 'POST' && url.pathname === '/api/quotes') {
      if (!['owner','admin'].includes(membership.rows[0].role)) return json(res,403,{error:'Sem permissão para cadastrar'});
      const body=await readBody(req);
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!body || typeof body.client_id!=='string' || !uuid.test(body.client_id) || typeof body.title!=='string' || body.title.trim().length<3 || body.title.length>160) return json(res,422,{error:'Cliente ou título inválido'});
      if (!['simple','medium','advanced','custom'].includes(body.complexity)) return json(res,422,{error:'Complexidade inválida'});
      let total;
      try { total = calculateQuoteTotal(body); }
      catch (error) { if (error instanceof RangeError) return json(res,422,{error:error.message}); throw error; }
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        const result=await client.query('INSERT INTO quotes(client_id,title,complexity,estimated_hours,hourly_rate_cents,extra_cost_cents,margin_percent,total_cents) SELECT id,$2,$3,$4,$5,$6,$7,$8 FROM clients WHERE id=$1 AND status=$9 RETURNING *',[body.client_id,body.title.trim(),body.complexity,body.estimated_hours,body.hourly_rate_cents,body.extra_cost_cents,body.margin_percent,total,'active']);
        if(!result.rowCount){await client.query('ROLLBACK');return json(res,422,{error:'Cliente não encontrado ou inativo'})}
        await client.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'quote.created','quote',result.rows[0].id]);
        await client.query('COMMIT');return json(res,201,result.rows[0]);
      }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    }
    return json(res, 404, { error: 'Rota não encontrada' });
  } catch (error) {
    if (error.status) return json(res, error.status, { error: error.message });
    console.error('Falha interna na API', { code: /^[0-9A-Z]{5}$/.test(error.code || '') ? error.code : 'INTERNAL' });
    return json(res, 500, { error: 'Erro interno' });
  }
};
}
const handler = createHandler();
if (process.env.NODE_ENV !== 'test' && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = http.createServer(handler);
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.listen(port, '0.0.0.0', () => console.log('AM Tech API na porta ' + port));
  const shutdown = () => { server.close(async () => { await pool?.end(); process.exit(0); }); setTimeout(() => process.exit(1),10000).unref(); };
  process.once('SIGTERM',shutdown); process.once('SIGINT',shutdown);
}
export { handler, readBody };
