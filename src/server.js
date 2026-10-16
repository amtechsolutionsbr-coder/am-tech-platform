import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { authenticate } from './auth.js';

const port = Number(process.env.PORT || 3000);
const staticRoot = resolve(fileURLToPath(new URL('../web/dist/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (pathname.startsWith('/api/') || pathname === '/health') return false;
  let file;
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\\') || decoded.includes('\\0')) return false;
    file = resolve(staticRoot, '.' + decoded);
    if (file !== staticRoot && !file.startsWith(staticRoot + sep)) return false;
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" });
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  } catch {
    if (extname(pathname)) return false;
    try {
      const data = await readFile(resolve(staticRoot, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' });
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
    if (await serveStatic(req, res, url.pathname)) return;
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
    return json(res, 404, { error: 'Rota não encontrada' });
  } catch (error) {
    if (error.status) return json(res, error.status, { error: error.message });
    console.error('Falha interna:', error.message);
    return json(res, 500, { error: 'Erro interno' });
  }
};
if (process.env.NODE_ENV !== 'test') http.createServer(handler).listen(port, '0.0.0.0', () => console.log('AM Tech API na porta ' + port));
export { handler };
