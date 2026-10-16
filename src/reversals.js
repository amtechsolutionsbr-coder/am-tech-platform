export async function reversalRoute({req,res,path,pool,userId,role,readBody,json}){
 const match=path.match(/^\/api\/finance\/payments\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/reverse$/i);
 if(!match)return false;
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Sem permissão para estornar'});return true;}
 if(req.method!=='POST'){json(res,405,{error:'Método não permitido'});return true;}
 const b=await readBody(req);if(typeof b.reason!=='string'||b.reason.trim().length<5||b.reason.length>1000){json(res,422,{error:'Informe motivo de 5 a 1000 caracteres'});return true;}
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  const p=await c.query('SELECT entry_id FROM financial_payments WHERE id=$1',[match[1]]);
  if(!p.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Pagamento não encontrado'});return true;}
  await c.query('SELECT id FROM financial_entries WHERE id=$1 FOR UPDATE',[p.rows[0].entry_id]);
  const r=await c.query('INSERT INTO financial_reversals(payment_id,actor_id,reason) VALUES($1,$2,$3) ON CONFLICT(payment_id) DO NOTHING RETURNING *',[match[1],userId,b.reason.trim()]);
  if(!r.rowCount){await c.query('ROLLBACK');json(res,409,{error:'Pagamento já estornado'});return true;}
  await c.query('UPDATE financial_entries SET settled_date=NULL WHERE id=$1',[p.rows[0].entry_id]);
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'finance.payment_reversed','financial_payment',match[1]]);
  await c.query('COMMIT');json(res,201,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
