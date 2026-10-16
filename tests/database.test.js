import test from 'node:test';
import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { databaseConfig } from '../src/database.js';
test('TLS Supabase valida certificado com CA oficial e nome de host',()=>{
 const config=databaseConfig('postgresql://user:pass@aws-1-sa-east-1.pooler.supabase.com:5432/postgres');
 assert.equal(config.ssl.rejectUnauthorized,true);
 const cert=new X509Certificate(config.ssl.ca);
 assert.match(cert.subject,/Supabase Root 2021 CA/);
 assert.equal(cert.ca,true);
});
test('URL remota não pode sobrescrever verificação TLS',()=>{
 for(const param of ['ssl=false','sslmode=disable','sslmode=require','sslrootcert=foo'])assert.throws(()=>databaseConfig('postgresql://user:pass@host.example/db?'+param));
 assert.equal(databaseConfig('postgresql://u:p@localhost/db').ssl,false);
 assert.equal(databaseConfig('postgresql://u:p@host.example/db').ssl.rejectUnauthorized,true);
 assert.equal(databaseConfig('postgresql://u:p@localhost.example/db').ssl.rejectUnauthorized,true);
});
