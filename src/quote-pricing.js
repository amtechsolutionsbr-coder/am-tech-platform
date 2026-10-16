export function calculateQuoteTotal({estimated_hours,hourly_rate_cents,extra_cost_cents,margin_percent}) {
  if (!Number.isSafeInteger(estimated_hours) || estimated_hours < 1 || estimated_hours > 100000) throw new RangeError('Horas inválidas');
  if (!Number.isSafeInteger(hourly_rate_cents) || hourly_rate_cents < 0 || hourly_rate_cents > 10000000) throw new RangeError('Valor hora inválido');
  if (!Number.isSafeInteger(extra_cost_cents) || extra_cost_cents < 0 || extra_cost_cents > 1000000000) throw new RangeError('Custos adicionais inválidos');
  if (!Number.isSafeInteger(margin_percent) || margin_percent < 0 || margin_percent > 500) throw new RangeError('Margem inválida');
  const base = estimated_hours * hourly_rate_cents + extra_cost_cents;
  const total = Math.round(base * (100 + margin_percent) / 100);
  if (!Number.isSafeInteger(total) || total > 100000000000) throw new RangeError('Total fora do limite');
  return total;
}
