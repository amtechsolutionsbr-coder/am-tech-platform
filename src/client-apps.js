export async function clientAppsRoute({req,res,path,pool,userId,role,readBody,json}){
 if(path!=='/api/client-apps')return false;
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Central restrita à administração'});return true;}
 if(req.method==='GET'){
  const r=await pool.query('SELECT a.*,c.name AS client_name FROM client_apps a JOIN clients c ON c.id=a.client_id ORDER BY a.created_at DESC LIMIT 200');
  json(res,200,{items:r.rows});return true;
 }
 const b=await readBody(req);let valid=false;
 try{const u=new URL(b.app_url);valid=u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&!u.hash&&!u.search;}catch{}
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>120||typeof b.client_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.client_id)||typeof b.app_url!=='string'||b.app_url.length>2048||!valid||!['development','acceptance','production','paused'].includes(b.stage)){
  json(res,422,{error:'Informe cliente, nome, etapa e URL HTTPS sem credenciais, parâmetros ou fragmentos'});return true;
 }
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  const r=await c.query("INSERT INTO client_apps(client_id,name,app_url,stage) SELECT id,$2,$3,$4 FROM clients WHERE id=$1 AND status='active' RETURNING *",[b.client_id,b.name.trim(),new URL(b.app_url).href,b.stage]);
  if(!r.rowCount){await c.query('ROLLBACK');json(res,422,{error:'Cliente não encontrado ou inativo'});return true;}
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,'client_app.created','client_app',r.rows[0].id]);
  await c.query('COMMIT');json(res,201,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
