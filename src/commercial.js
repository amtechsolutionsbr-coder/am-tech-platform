export async function commercialRoute({req,res,path,pool,userId,role,readBody,json}){
 const match=path.match(/^\/api\/(products|plans|subscriptions|quotes)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/edit$/i);
 if(!match)return false;
 if(req.method!=='POST'){json(res,405,{error:'Método não permitido'});return true;}
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Sem permissão para editar'});return true;}
 const body=await readBody(req),table=match[1];let fields,values;
 if(table==='products'||table==='plans'){
  if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120||typeof body.active!=='boolean'){json(res,422,{error:'Nome ou situação inválidos'});return true;}
  if(table==='products'){
   if(body.description!=null&&(typeof body.description!=='string'||body.description.length>2000)){json(res,422,{error:'Descrição inválida'});return true;}
   fields=['name','description','active'];values=[body.name.trim(),body.description||null,body.active];
  }else{
   if(!Number.isSafeInteger(body.price_cents)||body.price_cents<0||body.price_cents>1000000000||!['monthly','yearly','one_time'].includes(body.billing_cycle)){json(res,422,{error:'Preço ou periodicidade inválidos'});return true;}
   fields=['name','price_cents','billing_cycle','active'];values=[body.name.trim(),body.price_cents,body.billing_cycle,body.active];
  }
 }else{
  const allowed=table==='quotes'?['draft','sent','approved','rejected','expired']:['pending','active','paused','cancelled','expired'];
  if(!allowed.includes(body.status)){json(res,422,{error:'Situação inválida'});return true;}
  fields=['status'];values=[body.status];
 }
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  // Table and field identifiers are selected exclusively from the fixed lists above.
  const previous=await c.query('SELECT * FROM '+table+' WHERE id=$1 FOR UPDATE',[match[2]]);
  if(!previous.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Registro não encontrado'});return true;}
  if(table==='plans'&&(Number(previous.rows[0].price_cents)!==body.price_cents||previous.rows[0].billing_cycle!==body.billing_cycle)){
   const used=await c.query('SELECT id FROM subscriptions WHERE plan_id=$1 LIMIT 1',[match[2]]);
   if(used.rowCount){await c.query('ROLLBACK');json(res,409,{error:'Plano vinculado a assinatura: crie um novo plano para alterar valor ou periodicidade e preservar o histórico'});return true;}
  }
  const r=await c.query('UPDATE '+table+' SET '+fields.map((f,i)=>f+'=$'+(i+2)).join(',')+' WHERE id=$1 RETURNING *',[match[2],...values]);
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,table+'.updated',table,match[2]]);
  await c.query('COMMIT');json(res,200,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
