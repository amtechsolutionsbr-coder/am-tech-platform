import test from 'node:test';
import assert from 'node:assert/strict';
import {financeFilter,csvCell} from '../src/finance-query.js';
test('filtros financeiros usam parâmetros e validam paginação',()=>{
 const f=financeFilter(new URLSearchParams('month=2026-10&kind=income&status=pending&page=2&page_size=100'));
 assert.deepEqual(f.values,['2026-10','income']);assert.equal(f.page,2);assert.equal(f.size,100);assert.match(f.where,/IS NULL/);
 for(const q of ['page=0','page_size=201','month=2026-13','month=0000-01','kind=invalid','status=unknown','page=1.5'])assert.throws(()=>financeFilter(new URLSearchParams(q)));
});
test('CSV neutraliza fórmulas e preserva aspas e quebras',()=>{
 assert.equal(csvCell('  =SUM(A1)'),`"'  =SUM(A1)"`);assert.equal(csvCell('A"B'), '"A""B"');assert.equal(csvCell('normal'),'"normal"');
});
