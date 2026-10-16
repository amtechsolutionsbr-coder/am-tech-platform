import { readFileSync } from 'node:fs';
export function databaseConfig(connectionString) {
  const url=new URL(connectionString);
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  // pg connection-string SSL parameters can override its explicit ssl object.
  // Never allow a remote URL to silently disable certificate verification.
  for(const key of ['ssl','sslmode','sslcert','sslkey','sslrootcert']) {
    if(url.searchParams.has(key))throw new Error('Configure TLS na API, sem parâmetros SSL na DATABASE_URL');
  }
  const supabase=/\.(?:pooler\.supabase\.com|supabase\.co)$/.test(url.hostname);
  return {
    connectionString:url.href,
    ssl:local?false:{rejectUnauthorized:true,...(supabase?{ca:readFileSync(new URL('../certs/supabase-prod-ca-2021.crt',import.meta.url),'utf8')}:{})},
    connectionTimeoutMillis:10000,idleTimeoutMillis:30000,max:5
  };
}
