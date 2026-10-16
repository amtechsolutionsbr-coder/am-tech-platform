import test from 'node:test';
import assert from 'node:assert/strict';
import {splitInstallments} from '../src/installments.js';
test('parcelamento preserva centavos e dia no fim do mês',()=>{
 const result=splitInstallments(10000,3,'2026-01-31');
 assert.deepEqual(result,[{amount_cents:3334,due_date:'2026-01-31'},{amount_cents:3333,due_date:'2026-02-28'},{amount_cents:3333,due_date:'2026-03-31'}]);
 assert.equal(splitInstallments(100,2,'2028-01-31')[1].due_date,'2028-02-29');
 assert.equal(splitInstallments(100,2,'2026-12-31')[1].due_date,'2027-01-31');
});
test('parcelamento rejeita parcelas zeradas, frações e datas fora do limite',()=>{
 for(const args of [[1,2,'2026-01-01'],[100,37,'2026-01-01'],[100,1.5,'2026-01-01'],[100,2,'9999-12-31'],[100,1,'2026-02-30']])assert.throws(()=>splitInstallments(...args),RangeError);
});
