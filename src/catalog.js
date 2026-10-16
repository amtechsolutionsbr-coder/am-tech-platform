const queries={
  "/api/clients": "SELECT id, name, email, phone, status, created_at FROM clients ORDER BY created_at DESC,clients.id DESC",
  "/api/products": "SELECT id, name, description, active, created_at FROM products ORDER BY created_at DESC,products.id DESC",
  "/api/plans": "SELECT p.id,p.product_id,p.name,p.price_cents,p.billing_cycle,p.active,pr.name AS product_name FROM plans p JOIN products pr ON pr.id=p.product_id ORDER BY pr.name,p.name,p.id DESC",
  "/api/subscriptions": "SELECT s.id,s.client_id,s.plan_id,s.status,s.started_at,s.next_billing_at,s.created_at,c.name AS client_name,p.name AS plan_name,p.price_cents,p.billing_cycle,pr.name AS product_name FROM subscriptions s JOIN clients c ON c.id=s.client_id JOIN plans p ON p.id=s.plan_id JOIN products pr ON pr.id=p.product_id ORDER BY s.created_at DESC,s.id DESC",
  "/api/quotes": "SELECT q.id,q.client_id,c.name AS client_name,q.title,q.complexity,q.estimated_hours,q.hourly_rate_cents,q.extra_cost_cents,q.margin_percent,q.total_cents,q.status,q.created_at FROM quotes q JOIN clients c ON c.id=q.client_id ORDER BY q.created_at DESC,q.id DESC",
  "/api/client-apps": "SELECT a.*,c.name AS client_name FROM client_apps a JOIN clients c ON c.id=a.client_id ORDER BY a.created_at DESC,a.id DESC",
  "/api/support": "SELECT t.*,c.name AS client_name,a.name AS app_name FROM support_tickets t JOIN clients c ON c.id=t.client_id LEFT JOIN client_apps a ON a.id=t.app_id ORDER BY t.updated_at DESC,t.id DESC"
};
export async function catalogRoute({req,res,path,pool,role,json}){
 if(req.method!=='GET'||!queries[path])return false;
 if(path==='/api/client-apps'&&!['owner','admin'].includes(role)){json(res,403,{error:'Central restrita à administração'});return true;}
 const search=new URL(req.url,'http://localhost').searchParams;
 const page=search.get('page')||'1',size=search.get('page_size')||'100';
 if(!/^[1-9][0-9]*$/.test(page)||Number(page)>1000000||!/^[1-9][0-9]*$/.test(size)||Number(size)>200){json(res,422,{error:'Paginação inválida'});return true;}
 const query=queries[path];
 const total=await pool.query('SELECT count(*) AS total FROM ('+query+') AS records');
 const r=await pool.query(query+' LIMIT $1 OFFSET $2',[Number(size),(Number(page)-1)*Number(size)]);
 json(res,200,{items:r.rows,pagination:{page:Number(page),page_size:Number(size),total:Number(total.rows[0].total)}});return true;
}
