import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { authenticate } from './auth.js';

const port = Number(process.env.PORT || 3000);
const staticRoot = resolve(fileURLToPath(new URL('../web/dist/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp' };
async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/health') return false;
  let file;
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\\') || decoded.includes(String.fromCharCode(0))) return false;
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
      res.end(data); return true;
    } catch { return false; }
  }
}
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: true },
  max: 5
}) : null;
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
};
const readBody = async (req) => {
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString();
    if (text.length > 16000) { const error = new Error('Corpo muito grande'); error.status = 413; throw error; }
  }
  try { return JSON.parse(text); } catch { const error = new Error('JSON inválido'); error.status = 400; throw error; }
};
const handler = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/') && url.pathname !== '/api' && url.pathname !== '/health' && await serveStatic(req, res, url.pathname)) return;
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'am-tech-platform', version: '0.1.0' });
    if (!pool) return json(res, 503, { error: 'Banco de dados não configurado' });
    let userId;
    try { userId = await authenticate(req); } catch { return json(res, 401, { error: 'Autenticação inválida' }); }
    if (!userId) return json(res, 401, { error: 'Autenticação obrigatória' });
    const membership = await pool.query('SELECT role FROM admin_users WHERE auth_user_id = $1 AND active = true', [userId]);
    if (!membership.rowCount) return json(res, 403, { error: 'Usuário não autorizado' });
    if (req.method === 'GET' && url.pathname === '/api/me') {
      return json(res, 200, { user_id: userId, role: membership.rows[0].role });
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
      if (body.started_at != null && (typeof body.started_at!=='string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(body.started_at))) return json(res,422,{error:'Data inicial inválida'});
      if (body.next_billing_at != null && (typeof body.next_billing_at!=='string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(body.next_billing_at))) return json(res,422,{error:'Data de cobrança inválida'});
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
      if (!Number.isSafeInteger(body.estimated_hours) || body.estimated_hours<1 || body.estimated_hours>100000) return json(res,422,{error:'Horas inválidas'});
      if (!Number.isSafeInteger(body.hourly_rate_cents) || body.hourly_rate_cents<0 || body.hourly_rate_cents>10000000) return json(res,422,{error:'Valor hora inválido'});
      if (!Number.isSafeInteger(body.extra_cost_cents) || body.extra_cost_cents<0 || body.extra_cost_cents>1000000000) return json(res,422,{error:'Custos adicionais inválidos'});
      if (!Number.isSafeInteger(body.margin_percent) || body.margin_percent<0 || body.margin_percent>500) return json(res,422,{error:'Margem inválida'});
      const base=body.estimated_hours*body.hourly_rate_cents+body.extra_cost_cents;
      const total=Math.round(base*(100+body.margin_percent)/100);
      if (!Number.isSafeInteger(total) || total>100000000000) return json(res,422,{error:'Total fora do limite'});
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
    console.error('Falha interna:', error.message);
    return json(res, 500, { error: 'Erro interno' });
  }
};
if (process.env.NODE_ENV !== 'test') http.createServer(handler).listen(port, '0.0.0.0', () => console.log('AM Tech API na porta ' + port));
export { handler };
