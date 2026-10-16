import { splitInstallments } from './installments.js';
import { isValidISODate } from './date-validation.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function financeRoute({req,res,path,pool,userId,role,readBody,json}) {
 if(path!=='/api/finance' && !path.startsWith('/api/finance/'))return false;
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Financeiro restrito à administração'});return true;}
 if(req.method==='GET'&&path==='/api/finance'){
  const items=await pool.query(`SELECT f.*,c.name AS client_name, COALESCE(p.total,0) AS paid_cents FROM financial_entries f LEFT JOIN clients c ON c.id=f.client_id LEFT JOIN (SELECT entry_id,sum(amount_cents) total FROM financial_payments GROUP BY entry_id) p ON p.entry_id=f.id ORDER BY f.due_date DESC,f.created_at DESC LIMIT 200`);
  const summary=await pool.query(`SELECT COALESCE(sum(p.total) FILTER(WHERE f.kind='income'),0) AS received_cents, COALESCE(sum(p.total) FILTER(WHERE f.kind='expense'),0) AS paid_cents, COALESCE(sum(f.amount_cents-COALESCE(p.total,0)) FILTER(WHERE f.kind='income'),0) AS receivable_cents, COALESCE(sum(f.amount_cents-COALESCE(p.total,0)) FILTER(WHERE f.kind='expense'),0) AS payable_cents FROM financial_entries f LEFT JOIN (SELECT entry_id,sum(amount_cents) total FROM financial_payments GROUP BY entry_id) p ON p.entry_id=f.id`);
  const monthly=await pool.query(`SELECT to_char(p.paid_date,'YYYY-MM') AS month, COALESCE(sum(p.amount_cents) FILTER(WHERE f.kind='income'),0) AS received_cents, COALESCE(sum(p.amount_cents) FILTER(WHERE f.kind='expense'),0) AS paid_cents FROM financial_payments p JOIN financial_entries f ON f.id=p.entry_id GROUP BY to_char(p.paid_date,'YYYY-MM') ORDER BY month DESC LIMIT 24`);
  json(res,200,{items:items.rows,summary:summary.rows[0],monthly:monthly.rows});return true;
 }
 const history=path.match(/^\/api\/finance\/([0-9a-f-]+)\/payments$/i);
 if(req.method==='GET'&&history&&uuid.test(history[1])){
  const result=await pool.query('SELECT id,amount_cents,paid_date,created_at FROM financial_payments WHERE entry_id=$1 ORDER BY paid_date,created_at',[history[1]]);
  json(res,200,{items:result.rows});return true;
 }
 if(req.method!=='POST'){json(res,404,{error:'Rota não encontrada'});return true;}
 const body=await readBody(req);
 let installments;
 const creating=path==='/api/finance'||path==='/api/finance/installments';
 const settle=path.match(/^\/api\/finance\/([0-9a-f-]+)\/(settle|payments)$/i);
 if(creating){
  if(!['income','expense'].includes(body.kind)||typeof body.description!=='string'||body.description.trim().length<3||body.description.length>160||!Number.isSafeInteger(body.amount_cents)||body.amount_cents<=0||body.amount_cents>1000000000||!isValidISODate(body.due_date)|| (body.client_id!=null&&(typeof body.client_id!=='string'||!uuid.test(body.client_id)))){json(res,422,{error:'Lançamento financeiro inválido'});return true;}
  try{installments=splitInstallments(body.amount_cents,path==='/api/finance/installments'?body.installments:1,body.due_date)}catch(e){json(res,422,{error:e.message});return true;}
 }else if(!settle||!uuid.test(settle[1])||!isValidISODate(body.settled_date)||body.settled_date>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){json(res,422,{error:'Data de quitação inválida ou futura'});return true;}
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  if(creating&&body.client_id){const exists=await c.query('SELECT id FROM clients WHERE id=$1',[body.client_id]);if(!exists.rowCount){await c.query('ROLLBACK');json(res,422,{error:'Cliente não encontrado'});return true;}}
  let r;
  if(creating){
   const entries=[];
   for(const [i,part] of installments.entries()){
    const description=installments.length>1?`${body.description.trim().slice(0,145)} (${i+1}/${installments.length})`:body.description.trim();
    r=await c.query('INSERT INTO financial_entries(kind,description,client_id,amount_cents,due_date) VALUES($1,$2,$3,$4,$5) RETURNING *',[body.kind,description,body.client_id||null,part.amount_cents,part.due_date]);
    entries.push(r.rows[0]);
    await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'finance.created','financial_entry',r.rows[0].id]);
   }
   await c.query('COMMIT');json(res,201,path==='/api/finance/installments'?{items:entries}:entries[0]);return true;
  }else{
   const entry=await c.query('SELECT * FROM financial_entries WHERE id=$1 FOR UPDATE',[settle[1]]);
   if(!entry.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Lançamento não encontrado'});return true;}
   const paid=await c.query('SELECT COALESCE(sum(amount_cents),0) AS total FROM financial_payments WHERE entry_id=$1',[settle[1]]);
   const remaining=Number(entry.rows[0].amount_cents)-Number(paid.rows[0].total);
   const amount=settle[2]==='settle'?remaining:body.amount_cents;
   if(!Number.isSafeInteger(amount)||amount<=0||amount>remaining){await c.query('ROLLBACK');json(res,409,{error:'Valor inválido, superior ao saldo ou lançamento já quitado'});return true;}
   await c.query('INSERT INTO financial_payments(entry_id,amount_cents,paid_date) VALUES($1,$2,$3)',[settle[1],amount,body.settled_date]);
   r=await c.query('UPDATE financial_entries SET settled_date=CASE WHEN $2 THEN (SELECT max(paid_date) FROM financial_payments WHERE entry_id=$1) ELSE NULL END WHERE id=$1 RETURNING *',[settle[1],amount===remaining]);
  }
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,path==='/api/finance'?'finance.created':'finance.payment_recorded','financial_entry',r.rows[0].id]);
  await c.query('COMMIT');json(res,path==='/api/finance'?201:200,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 return true;
}
