import { isValidISODate } from './date-validation.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function financeRoute({req,res,path,pool,userId,role,readBody,json}) {
 if(path!=='/api/finance' && !path.startsWith('/api/finance/'))return false;
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Financeiro restrito à administração'});return true;}
 if(req.method==='GET'&&path==='/api/finance'){
  const items=await pool.query(`SELECT f.*,c.name AS client_name FROM financial_entries f LEFT JOIN clients c ON c.id=f.client_id ORDER BY f.due_date DESC,f.created_at DESC LIMIT 200`);
  const summary=await pool.query(`SELECT COALESCE(sum(amount_cents) FILTER(WHERE kind='income' AND settled_date IS NOT NULL),0) AS received_cents, COALESCE(sum(amount_cents) FILTER(WHERE kind='expense' AND settled_date IS NOT NULL),0) AS paid_cents, COALESCE(sum(amount_cents) FILTER(WHERE kind='income' AND settled_date IS NULL),0) AS receivable_cents, COALESCE(sum(amount_cents) FILTER(WHERE kind='expense' AND settled_date IS NULL),0) AS payable_cents FROM financial_entries`);
  json(res,200,{items:items.rows,summary:summary.rows[0]});return true;
 }
 if(req.method!=='POST'){json(res,404,{error:'Rota não encontrada'});return true;}
 const body=await readBody(req);
 const settle=path.match(/^\/api\/finance\/([0-9a-f-]+)\/settle$/i);
 if(path==='/api/finance'){
  if(!['income','expense'].includes(body.kind)||typeof body.description!=='string'||body.description.trim().length<3||body.description.length>160||!Number.isSafeInteger(body.amount_cents)||body.amount_cents<=0||body.amount_cents>1000000000||!isValidISODate(body.due_date)|| (body.client_id!=null&&(typeof body.client_id!=='string'||!uuid.test(body.client_id)))){json(res,422,{error:'Lançamento financeiro inválido'});return true;}
 }else if(!settle||!uuid.test(settle[1])||!isValidISODate(body.settled_date)||body.settled_date>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){json(res,422,{error:'Data de quitação inválida ou futura'});return true;}
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  if(path==='/api/finance'&&body.client_id){const exists=await c.query('SELECT id FROM clients WHERE id=$1',[body.client_id]);if(!exists.rowCount){await c.query('ROLLBACK');json(res,422,{error:'Cliente não encontrado'});return true;}}
  const r=path==='/api/finance'?await c.query('INSERT INTO financial_entries(kind,description,client_id,amount_cents,due_date) VALUES($1,$2,$3,$4,$5) RETURNING *',[body.kind,body.description.trim(),body.client_id||null,body.amount_cents,body.due_date]):await c.query('UPDATE financial_entries SET settled_date=$2 WHERE id=$1 AND settled_date IS NULL RETURNING *',[settle[1],body.settled_date]);
  if(!r.rowCount){await c.query('ROLLBACK');json(res,409,{error:'Lançamento inexistente ou já quitado'});return true;}
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,path==='/api/finance'?'finance.created':'finance.settled','financial_entry',r.rows[0].id]);
  await c.query('COMMIT');json(res,path==='/api/finance'?201:200,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 return true;
}
