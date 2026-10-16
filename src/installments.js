import { isValidISODate } from './date-validation.js';
// Valor total dividido em centavos; últimos dias são limitados ao mês de destino.
export function splitInstallments(amount, count, firstDate) {
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000||!Number.isSafeInteger(count)||count<1||count>36||amount<count||!isValidISODate(firstDate))throw new RangeError('Valor, parcelas ou vencimento inválidos');
 const [year,month,day]=firstDate.split('-').map(Number);
 if(year+Math.floor((month-1+count-1)/12)>9999)throw new RangeError('Vencimento fora do limite');
 return Array.from({length:count},(_,i)=>{
  const m=month-1+i,y=year+Math.floor(m/12),mth=m%12;
  const leap=y%4===0&&(y%100!==0||y%400===0);
  const last=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][mth];
  return {amount_cents:Math.floor(amount/count)+(i<amount%count?1:0),due_date:`${String(y).padStart(4,'0')}-${String(mth+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`};
 });
}
