import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidISODate } from '../src/date-validation.js';

test('aceita datas válidas, incluindo ano bissexto',()=>{
  for(const date of ['2026-10-16','2024-02-29','2000-02-29','2026-12-31'])
    assert.equal(isValidISODate(date),true,date);
});
test('rejeita datas inexistentes e formatos inválidos',()=>{
  for(const date of ['2026-02-29','1900-02-29','2026-13-01','2026-00-01','2026-04-31','2026-01-00','2026-1-1','2026-01-01T00:00:00','',null,42])
    assert.equal(isValidISODate(date),false,String(date));
});
