import test from 'node:test';
import assert from 'node:assert/strict';
import { readBody } from '../src/server.js';

function chunks(...items) {
  return {async *[Symbol.asyncIterator](){for(const item of items)yield Buffer.from(item)}};
}
test('parser aceita JSON válido em múltiplos blocos',async()=>{
  assert.deepEqual(await readBody(chunks('{"nome":','"teste"}')),{nome:'teste'});
});
test('parser rejeita JSON inválido',async()=>{
  await assert.rejects(readBody(chunks('{invalido')),e=>e.status===400);
});
test('limite de 16 mil bytes considera UTF-8 e não caracteres',async()=>{
  const valid='{"texto":"'+ 'á'.repeat(7995)+'"}';
  assert.ok(valid.length<16000);
  assert.ok(Buffer.byteLength(valid)>16000);
  await assert.rejects(readBody(chunks(valid)),e=>e.status===413);
});
test('parser aceita corpo de até 16 mil bytes',async()=>{
  const payload='{"texto":"'+ 'a'.repeat(15988)+'"}';
  assert.equal(Buffer.byteLength(payload),1600 + 0 + 14400);
  assert.equal((await readBody(chunks(payload))).texto.length,15988);
});

test('parser preserva caracteres UTF-8 partidos entre blocos',async()=>{
 const data=Buffer.from(JSON.stringify({name:'João 🛠️'}));
 const req={async *[Symbol.asyncIterator](){for(const byte of data)yield Buffer.from([byte])}};
 assert.deepEqual(await readBody(req),{name:'João 🛠️'});
});
test('parser rejeita valores JSON que não são objetos',async()=>{
 for(const body of ['null','[]','123','"texto"'])await assert.rejects(readBody(chunks(body)),e=>e.status===400);
});
