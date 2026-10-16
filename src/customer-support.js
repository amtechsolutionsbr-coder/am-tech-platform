const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const publicTicket='id,title,description,priority,status,created_at,updated_at';
export async function customerSupportRoute({req,res,path,pool,userId,readBody,json}){
 if(path!=='/api/customer-support'&&!path.startsWith('/api/customer-support/'))return false;
 const history=path.match(/^\/api\/customer-support\/([0-9a-f-]+)\/updates$/i);
 if(path!=='/api/customer-support'&&(!history||!uuid.test(history[1]))){json(res,404,{error:'Rota não encontrada'});return true;}
 const url=new URL(req.url,'http://localhost'),appId=url.searchParams.get('app_id');
 if(!uuid.test(appId||'')){json(res,422,{error:'Aplicativo inválido'});return true;}
 const membershipSQL="SELECT a.client_id FROM client_app_users m JOIN client_apps a ON a.id=m.app_id JOIN clients c ON c.id=a.client_id WHERE m.auth_user_id=$1 AND m.app_id=$2 AND m.active=true AND c.status='active' AND a.stage<>'paused'";
 const membership=await pool.query(membershipSQL,[userId,appId]);
 if(!membership.rowCount){json(res,403,{error:'Aplicativo não autorizado'});return true;}
 if(req.method==='GET'){
  if(history){
   const ticket=await pool.query('SELECT id FROM support_tickets WHERE id=$1 AND app_id=$2 AND external_request_id IS NOT NULL',[history[1],appId]);
   if(!ticket.rowCount){json(res,404,{error:'Chamado não encontrado'});return true;}
   const r=await pool.query("SELECT id,status,note,created_at FROM support_updates WHERE ticket_id=$1 AND visibility='customer' ORDER BY created_at,id",[history[1]]);json(res,200,{items:r.rows});return true;
  }
  const raw=url.searchParams.get('page')||'1';if(!/^[1-9][0-9]*$/.test(raw)||Number(raw)>1000000){json(res,422,{error:'Página inválida'});return true;}
  const r=await pool.query('SELECT '+publicTicket+' FROM support_tickets WHERE app_id=$1 AND external_request_id IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2',[appId,(Number(raw)-1)*50]);
  const total=await pool.query('SELECT count(*) AS total FROM support_tickets WHERE app_id=$1 AND external_request_id IS NOT NULL',[appId]);json(res,200,{items:r.rows,pagination:{page:Number(raw),page_size:50,total:Number(total.rows[0].total)}});return true;
 }
 if(history){json(res,405,{error:'Atualizações do cliente ainda não habilitadas'});return true;}
 const b=await readBody(req);
 if(!uuid.test(b.request_id||'')||typeof b.title!=='string'||b.title.trim().length<3||b.title.length>160||typeof b.description!=='string'||b.description.trim().length<3||b.description.length>4000||!['low','normal','high','urgent'].includes(b.priority)){json(res,422,{error:'Chamado inválido'});return true;}
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query(membershipSQL+' FOR SHARE OF a,c',[userId,appId]);
  if(!actor.rowCount){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  // A retry from the offline outbox must return the original protocol.
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[appId+':'+b.request_id]);
  const existing=await c.query('SELECT '+publicTicket+' FROM support_tickets WHERE app_id=$1 AND external_request_id=$2',[appId,b.request_id]);
  if(existing.rowCount){await c.query('COMMIT');json(res,200,existing.rows[0]);return true;}
  const r=await c.query('INSERT INTO support_tickets(client_id,app_id,title,description,priority,external_request_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING '+publicTicket,[actor.rows[0].client_id,appId,b.title.trim(),b.description.trim(),b.priority,b.request_id]);
  await c.query("INSERT INTO support_updates(ticket_id,actor_id,status,note,visibility) VALUES($1,$2,'open',$3,'customer')",[r.rows[0].id,userId,b.description.trim()]);
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'support.customer_created','support_ticket',r.rows[0].id]);
  await c.query('COMMIT');json(res,201,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
