import {createCipheriv,createDecipheriv,randomBytes,scryptSync} from 'node:crypto';
export const backupTables=['admin_users','clients','products','plans','subscriptions','quotes','audit_events','financial_entries','financial_payments','client_apps','support_tickets','support_updates','financial_reversals','financial_corrections','client_app_users'];
export async function snapshotBusiness(client){
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  const tables={};for(const table of backupTables)tables[table]=(await client.query('SELECT * FROM public.'+table)).rows;
  await client.query('COMMIT');return {format:'amtech-business-backup',version:2,created_at:new Date().toISOString(),tables};
 }catch(e){await client.query('ROLLBACK');throw e;}
}
export function encryptBackup(snapshot,password){
 if(typeof password!=='string'||password.length<16)throw Error('Use senha de backup com pelo menos 16 caracteres');
 const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(password,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv);
 const data=Buffer.concat([cipher.update(JSON.stringify(snapshot),'utf8'),cipher.final()]);
 return JSON.stringify({format:'amtech-encrypted-backup',version:1,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});
}
export function decryptBackup(encoded,password){
 const b=JSON.parse(encoded);if(b.format!=='amtech-encrypted-backup'||b.version!==1)throw Error('Formato de backup inválido');
 const decipher=createDecipheriv('aes-256-gcm',scryptSync(password,Buffer.from(b.salt,'base64'),32),Buffer.from(b.iv,'base64'));decipher.setAuthTag(Buffer.from(b.tag,'base64'));
 const result=JSON.parse(Buffer.concat([decipher.update(Buffer.from(b.data,'base64')),decipher.final()]).toString('utf8'));
 if(result.format==='amtech-business-backup'&&result.version===1){result.tables.client_app_users??=[];result.version=2;}
 if(result.format!=='amtech-business-backup'||result.version!==2||!result.tables||Object.keys(result.tables).length!==backupTables.length||backupTables.some(t=>!Array.isArray(result.tables[t])))throw Error('Conteúdo de backup inválido');
 return result;
}
export async function restoreBusinessToEmpty(client,snapshot){
 if(snapshot.format!=='amtech-business-backup'||snapshot.version!==2||backupTables.some(t=>!Array.isArray(snapshot.tables?.[t])))throw Error('Backup inválido');
 await client.query('BEGIN');
 try{
  await client.query('LOCK TABLE '+backupTables.map(t=>'public.'+t).join(',')+' IN ACCESS EXCLUSIVE MODE');
  for(const table of backupTables){const n=await client.query('SELECT count(*) AS count FROM public.'+table);if(Number(n.rows[0].count)!==0)throw Error('Destino deve estar vazio: '+table);}
  for(const table of backupTables){
   const columns=(await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',table])).rows.map(c=>c.column_name);
   for(const row of snapshot.tables[table]){
    const keys=Object.keys(row);if(!keys.length||keys.some(k=>!columns.includes(k)))throw Error('Colunas incompatíveis em '+table);
    await client.query('INSERT INTO public.'+table+' ('+keys.map(k=>'"'+k.replaceAll('"','""')+'"').join(',')+') OVERRIDING SYSTEM VALUE VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',keys.map(k=>row[k]!==null&&typeof row[k]==='object'&&!(row[k] instanceof Date)?JSON.stringify(row[k]):row[k]));
   }
  }
  await client.query("SELECT setval(pg_get_serial_sequence('audit_events','id'),COALESCE((SELECT max(id) FROM audit_events),1),(SELECT count(*)>0 FROM audit_events))");
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}
}
