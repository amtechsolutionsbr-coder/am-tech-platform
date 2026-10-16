import {once} from 'node:events';
export function financeFilter(search){
 const values=[],clauses=[];
 const add=(sql,value)=>{values.push(value);clauses.push(sql.replace('?', '$'+values.length));};
 const month=search.get('month'),kind=search.get('kind'),status=search.get('status');
 if(month){if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)||month.startsWith('0000'))throw Error('Mês inválido');add("to_char(f.due_date,'YYYY-MM')=?",month);}
 if(kind&&kind!=='all'){if(!['income','expense'].includes(kind))throw Error('Tipo inválido');add('f.kind=?',kind);}
 if(status&&status!=='all'){if(!['paid','pending'].includes(status))throw Error('Situação inválida');clauses.push(status==='paid'?'f.settled_date IS NOT NULL':'f.settled_date IS NULL');}
 const integer=(key,fallback,max)=>{const v=search.get(key);if(v===null)return fallback;if(!/^[1-9][0-9]*$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)throw Error('Paginação inválida');return Number(v);};
 const page=integer('page',1,1000000),size=integer('page_size',50,200);
 return {values,where:clauses.length?' WHERE '+clauses.join(' AND '):'',page,size};
}
export const financeSelect=`SELECT f.*,c.name AS client_name,COALESCE(p.total,0) AS paid_cents FROM financial_entries f LEFT JOIN clients c ON c.id=f.client_id LEFT JOIN (SELECT entry_id,sum(amount_cents) total FROM financial_payments p WHERE NOT EXISTS(SELECT 1 FROM financial_reversals r WHERE r.payment_id=p.id) GROUP BY entry_id) p ON p.entry_id=f.id`;
export const financeOrder=' ORDER BY f.due_date DESC,f.created_at DESC,f.id DESC';
export function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function financeCSVRow(x){return [x.description,x.client_name,x.kind==='income'?'Receita':'Despesa',(Number(x.amount_cents)/100).toFixed(2),(Number(x.paid_cents)/100).toFixed(2),((Number(x.amount_cents)-Number(x.paid_cents))/100).toFixed(2),String(x.due_date).slice(0,10),x.settled_date?'Quitado':'Pendente'].map(csvCell).join(';')+'\r\n';}
export async function exportFinance({pool,res,filter,userId}){
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const actor=await client.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await client.query('ROLLBACK');res.writeHead(403,{'content-type':'application/json'});res.end(JSON.stringify({error:'Acesso revogado'}));return;}
  await client.query('DECLARE finance_export NO SCROLL CURSOR FOR '+financeSelect+filter.where+financeOrder,filter.values);
  res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="AM_Tech_Financeiro.csv"','cache-control':'no-store','x-content-type-options':'nosniff'});
  const write=async text=>{if(res.destroyed)throw Error('Exportação interrompida');if(res.write(text)===false)await once(res,'drain');};
  await write('\ufeffDescrição;Cliente;Tipo;Valor BRL;Pago BRL;Saldo BRL;Vencimento;Situação\r\n');
  while(true){const batch=await client.query('FETCH FORWARD 500 FROM finance_export');if(!batch.rows.length)break;for(const row of batch.rows)await write(financeCSVRow(row));}
  await client.query('COMMIT');res.end();
 }catch(error){await client.query('ROLLBACK');if(res.headersSent){res.destroy(error);return;}throw error;}finally{client.release();}
}
