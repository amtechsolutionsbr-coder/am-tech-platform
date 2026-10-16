export async function dashboardRoute({req,res,path,pool,json}){
 if(path!=='/api/dashboard')return false;
 if(req.method!=='GET'){json(res,405,{error:'Método não permitido'});return true;}
 const r=await pool.query(`SELECT
 (SELECT count(*) FROM clients) AS clients,
 (SELECT count(*) FROM clients WHERE status='active') AS active_clients,
 (SELECT count(*) FROM products WHERE active=true) AS active_products,
 (SELECT count(*) FROM subscriptions WHERE status='active') AS active_subscriptions,
 (SELECT count(*) FROM subscriptions WHERE status='pending') AS pending_subscriptions,
 (SELECT count(*) FROM quotes WHERE status='draft') AS draft_quotes,
 (SELECT count(*) FROM quotes WHERE status='sent') AS sent_quotes,
 (SELECT count(*) FROM quotes WHERE status='approved') AS approved_quotes,
 (SELECT count(*) FROM support_tickets WHERE status<>'resolved') AS open_tickets,
 (SELECT count(*) FROM support_tickets WHERE status<>'resolved' AND priority='urgent') AS urgent_tickets`);
 json(res,200,r.rows[0]);return true;
}
