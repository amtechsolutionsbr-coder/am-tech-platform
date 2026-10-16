const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
export async function supportRoute({req,res,path,pool,userId,role,readBody,json}){
 if(path!=='/api/support'&&!path.startsWith('/api/support/'))return false;
 const update=path.match(/^\/api\/support\/([0-9a-f-]+)\/updates$/i);
 if(path!=='/api/support'&&(!update||!uuid.test(update[1]))){json(res,404,{error:'Rota não encontrada'});return true;}
 if(req.method==='GET'){
  const r=update?await pool.query('SELECT id,actor_id,status,note,visibility,created_at FROM support_updates WHERE ticket_id=$1 ORDER BY created_at,id',[update[1]]):await pool.query('SELECT t.*,c.name AS client_name,a.name AS app_name FROM support_tickets t JOIN clients c ON c.id=t.client_id LEFT JOIN client_apps a ON a.id=t.app_id ORDER BY t.updated_at DESC LIMIT 200');
  json(res,200,{items:r.rows});return true;
 }
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Sem permissão para alterar chamados'});return true;}
 const b=await readBody(req);
 if(update?(!['open','in_progress','waiting','resolved'].includes(b.status)||!text(b.note,3,4000)):(!uuid.test(b.client_id||'')||(b.app_id!=null&&!uuid.test(b.app_id))||!text(b.title,3,160)||!text(b.description,3,4000)||!['low','normal','high','urgent'].includes(b.priority))){json(res,422,{error:'Dados do chamado inválidos'});return true;}
 if(update&&b.visibility!=null&&!['internal','customer'].includes(b.visibility)){json(res,422,{error:'Visibilidade inválida'});return true;}
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  let r;
  if(update){
   r=await c.query('UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[update[1],b.status]);
   if(!r.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Chamado não encontrado'});return true;}
   await c.query('INSERT INTO support_updates(ticket_id,actor_id,status,note,visibility) VALUES($1,$2,$3,$4,$5)',[update[1],userId,b.status,b.note.trim(),b.visibility||'internal']);
  }else{
   if(b.app_id){const app=await c.query('SELECT id FROM client_apps WHERE id=$1 AND client_id=$2',[b.app_id,b.client_id]);if(!app.rowCount){await c.query('ROLLBACK');json(res,422,{error:'Aplicativo não pertence ao cliente'});return true;}}
   r=await c.query("INSERT INTO support_tickets(client_id,app_id,title,description,priority) SELECT id,$2,$3,$4,$5 FROM clients WHERE id=$1 AND status='active' RETURNING *",[b.client_id,b.app_id||null,b.title.trim(),b.description.trim(),b.priority]);
   if(!r.rowCount){await c.query('ROLLBACK');json(res,422,{error:'Cliente não encontrado ou inativo'});return true;}
   await c.query('INSERT INTO support_updates(ticket_id,actor_id,status,note) VALUES($1,$2,$3,$4)',[r.rows[0].id,userId,'open',b.description.trim()]);
  }
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,update?'support.updated':'support.created','support_ticket',r.rows[0].id]);
  await c.query('COMMIT');json(res,update?200:201,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
