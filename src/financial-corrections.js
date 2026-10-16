import {isValidISODate} from './date-validation.js';
export async function correctionRoute({req,res,path,pool,userId,role,readBody,json}){
 const match=path.match(/^\/api\/finance\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(edit|corrections)$/i);
 if(!match)return false;
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Sem permissão financeira'});return true;}
 if(req.method==='GET'&&match[2]==='corrections'){
  const r=await pool.query('SELECT * FROM financial_corrections WHERE entry_id=$1 ORDER BY created_at,id',[match[1]]);json(res,200,{items:r.rows});return true;
 }
 if(req.method!=='POST'||match[2]!=='edit'){json(res,405,{error:'Método não permitido'});return true;}
 const b=await readBody(req);
 if(typeof b.description!=='string'||b.description.trim().length<3||b.description.length>160||!Number.isSafeInteger(b.amount_cents)||b.amount_cents<=0||b.amount_cents>1000000000||!isValidISODate(b.due_date)||typeof b.reason!=='string'||b.reason.trim().length<5||b.reason.length>1000){json(res,422,{error:'Correção inválida; informe descrição, valor, vencimento e motivo'});return true;}
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  const previous=await c.query('SELECT * FROM financial_entries WHERE id=$1 FOR UPDATE',[match[1]]);
  if(!previous.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Lançamento não encontrado'});return true;}
  const paid=await c.query('SELECT id FROM financial_payments p WHERE entry_id=$1 AND NOT EXISTS(SELECT 1 FROM financial_reversals r WHERE r.payment_id=p.id) LIMIT 1',[match[1]]);
  if(paid.rowCount){await c.query('ROLLBACK');json(res,409,{error:'Estorne os pagamentos ativos antes de corrigir o lançamento'});return true;}
  const r=await c.query('UPDATE financial_entries SET description=$2,amount_cents=$3,due_date=$4 WHERE id=$1 RETURNING *',[match[1],b.description.trim(),b.amount_cents,b.due_date]);
  await c.query('INSERT INTO financial_corrections(entry_id,actor_id,reason,previous_data,new_data) VALUES($1,$2,$3,$4,$5)',[match[1],userId,b.reason.trim(),JSON.stringify(previous.rows[0]),JSON.stringify(r.rows[0])]);
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'finance.corrected','financial_entry',match[1]]);
  await c.query('COMMIT');json(res,200,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
