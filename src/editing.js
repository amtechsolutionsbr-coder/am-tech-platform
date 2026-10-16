export async function editingRoute({req,res,path,pool,userId,role,readBody,json}){
 const match=path.match(/^\/api\/(clients|client-apps)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/edit$/i);
 if(!match)return false;
 if(req.method!=='POST'){json(res,405,{error:'Método não permitido'});return true;}
 if(!['owner','admin'].includes(role)){json(res,403,{error:'Sem permissão para editar'});return true;}
 const b=await readBody(req),app=match[1]==='client-apps';let valid=true;
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>(app?120:160))valid=false;
 if(app){try{const u=new URL(b.app_url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||b.app_url.length>2048)valid=false;}catch{valid=false;}if(!['development','acceptance','production','paused'].includes(b.stage))valid=false;}
 else if(!['active','inactive'].includes(b.status)||(b.email!=null&&(typeof b.email!=='string'||b.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)))||(b.phone!=null&&(typeof b.phone!=='string'||b.phone.length>40)))valid=false;
 if(!valid){json(res,422,{error:'Dados inválidos para edição'});return true;}
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const actor=await c.query('SELECT role FROM admin_users WHERE auth_user_id=$1 AND active=true FOR SHARE',[userId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)){await c.query('ROLLBACK');json(res,403,{error:'Acesso revogado'});return true;}
  const r=app?await c.query('UPDATE client_apps SET name=$2,app_url=$3,stage=$4 WHERE id=$1 RETURNING *',[match[2],b.name.trim(),new URL(b.app_url).href,b.stage]):await c.query('UPDATE clients SET name=$2,email=$3,phone=$4,status=$5 WHERE id=$1 RETURNING *',[match[2],b.name.trim(),b.email||null,b.phone||null,b.status]);
  if(!r.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Registro não encontrado'});return true;}
  await c.query('INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[userId,app?'client_app.updated':'client.updated',app?'client_app':'client',match[2]]);
  await c.query('COMMIT');json(res,200,r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
 return true;
}
