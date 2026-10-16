import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/server.js';

function response() {
  return {
    status: null, headers: null, body: '',
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
}
test('GET /health retorna identificação do serviço', async () => {
  const res = response();
  await handler({ method: 'GET', url: '/health', headers: {} }, res);
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(res.body).service, 'am-tech-platform');
});
test('API não atende cadastros sem banco configurado', async () => {
  if (process.env.DATABASE_URL) return;
  const res = response();
  await handler({ method: 'GET', url: '/api/clients', headers: {} }, res);
  assert.equal(res.status, 503);
});
