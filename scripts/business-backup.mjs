import {Pool} from 'pg';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {databaseConfig} from '../src/database.js';
import {backupTables,snapshotBusiness,encryptBackup,decryptBackup,restoreBusinessToEmpty} from '../src/business-backup.js';
const [mode,file,...extra]=process.argv.slice(2);
let pool,client;
try{
 if(!['export','inspect','verify-local'].includes(mode)||!file||extra.length)throw Error('invalid arguments');
 const password=process.env.AM_TECH_BACKUP_PASSWORD;
 if(!password||password.length<16)throw Error('invalid password');
 if(mode==='inspect'){
  const snapshot=decryptBackup(await readFile(resolve(file),'utf8'),password);
  console.log(JSON.stringify({verified:true,format:snapshot.format,version:snapshot.version,created_at:snapshot.created_at,tables:Object.fromEntries(backupTables.map(t=>[t,snapshot.tables[t].length])),scope:'Dados empresariais; não inclui Auth, Storage nem infraestrutura.'},null,2));
 }else{
  const connection=process.env.AM_TECH_BACKUP_DATABASE_URL;
  if(!connection)throw Error('missing connection');
  const url=new URL(connection);
  if(mode==='verify-local'&&(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/^\/(?:test|restore)_[a-z0-9_]+$/i.test(url.pathname)))throw Error('invalid restore target');
  pool=new Pool(databaseConfig(connection));client=await pool.connect();
  if(mode==='export'){
   const snapshot=await snapshotBusiness(client),target=resolve(file);await mkdir(dirname(target),{recursive:true});
   await writeFile(target,encryptBackup(snapshot,password),{mode:0o600,flag:'wx'});
   console.log('Backup empresarial criptografado criado. Guarde a senha separadamente.');
  }else{
   const snapshot=decryptBackup(await readFile(resolve(file),'utf8'),password);await restoreBusinessToEmpty(client,snapshot);
   console.log('Restauração em banco local vazio concluída. Auth e configurações de infraestrutura não estão incluídos.');
  }
 }
}catch{
 console.error('Backup/verificação falhou. Confira modo, arquivo, senha privada (mínimo 16 caracteres) e, para export/verify-local, conexão e permissões. Uso: node scripts/business-backup.mjs export|inspect|verify-local arquivo.amtech. Nenhuma credencial foi exibida.');
 process.exitCode=1;
}finally{client?.release();if(pool)await pool.end();}
