import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuoteTotal } from '../src/quote-pricing.js';

const valid = {estimated_hours:10,hourly_rate_cents:15000,extra_cost_cents:20000,margin_percent:20};

test('orçamento calcula custo e acréscimo em centavos',()=>{
  assert.equal(calculateQuoteTotal(valid),204000);
});
test('orçamento com zero de acréscimo',()=>{
  assert.equal(calculateQuoteTotal({...valid,margin_percent:0}),170000);
});
test('orçamento arredonda centavos',()=>{
  assert.equal(calculateQuoteTotal({estimated_hours:1,hourly_rate_cents:101,extra_cost_cents:0,margin_percent:50}),152);
});
test('orçamento rejeita valores inválidos',()=>{
  for(const patch of [
    {estimated_hours:0},{estimated_hours:1.5},{estimated_hours:100001},
    {hourly_rate_cents:-1},{hourly_rate_cents:10000001},
    {extra_cost_cents:-1},{margin_percent:-1},{margin_percent:501},
    {margin_percent:20.5},{estimated_hours:'10'}
  ]) assert.throws(()=>calculateQuoteTotal({...valid,...patch}),RangeError);
});
