// Executed inside Render after building, with server-only environment variables.
// No test accounts or business records are created.
if (process.env.RENDER !== 'true') {
  console.log('Verificação de infraestrutura real: executada somente dentro do Render.');
} else {
  const { Pool } = await import('pg');
  const { default: http } = await import('node:http');
  const { handler } = await import('../src/server.js');
  const pool = new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000,max:1});
  let server;
  try {
    for(const table of ['admin_users','clients','products','plans','subscriptions','quotes'])await pool.query('SELECT 1 FROM public.'+table+' LIMIT 1');
    const privilege=await pool.query("SELECT current_user, has_table_privilege(current_user,'public.clients','DELETE') AS can_delete, has_table_privilege(current_user,'public.audit_events','UPDATE') AS can_rewrite");
    if(privilege.rows[0].current_user!=='amtech_api'||privilege.rows[0].can_delete||privilege.rows[0].can_rewrite)throw Error('Permissões SQL inesperadas');
    const jwks=await fetch(process.env.SUPABASE_URL+'/auth/v1/.well-known/jwks.json',{signal:AbortSignal.timeout(10000)});
    if(!jwks.ok||!(await jwks.json()).keys?.some(k=>['ES256','RS256'].includes(k.alg)))throw Error('JWKS incompatível');
    server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    for(const [path,status,headers] of [['/health',200],['/ready',200],['/',200],['/.env',404],['/api/me',401],['/api/me',401,{Authorization:'Bearer invalid'}]]){
      const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(15000)});
      if(response.status!==status)throw Error('Smoke HTTP falhou em '+path+': '+response.status);
      console.log('Smoke real: '+path+' HTTP '+response.status);
    }
    console.log('Infraestrutura real aprovada: API, frontend compilado, PostgreSQL restrito e JWKS. Login legítimo permanece pendente.');
  } catch(error) {
    const message=String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[conexão privada]');
    console.error('Falha na verificação real:',error.code||'SMOKE',message);
    process.exitCode=1;
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    await pool.end();
  }
  // The API's default pool is closed by process exit; no server is started on import.
  process.exit(process.exitCode||0);
}
