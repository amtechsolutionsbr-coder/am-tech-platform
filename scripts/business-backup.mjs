import {Pool} from 'pg';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {databaseConfig} from '../src/database.js';
import {snapshotBusiness,encryptBackup,decryptBackup,restoreBusinessToEmpty} from '../src/business-backup.js';
const [mode,file]=process.argv.slice(2);
if(!['export','verify-local'].includes(mode)||!file)throw Error('Uso: node scripts/business-backup.mjs export|verify-local arquivo.amtech');
const connection=process.env.AM_TECH_BACKUP_DATABASE_URL,password=process.env.AM_TECH_BACKUP_PASSWORD;
if(!connection||!password||password.length<16)throw Error('Configure conexão privada e senha de backup por variáveis de ambiente');
const url=new URL(connection);
if(mode==='verify-local'&&(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/^\/(?:test|restore)_[a-z0-9_]+$/i.test(url.pathname)))throw Error('Restauração de teste permitida apenas em banco local test_* ou restore_*');
const pool=new Pool(databaseConfig(connection)),client=await pool.connect();
try{
 if(mode==='export'){
  const snapshot=await snapshotBusiness(client),target=resolve(file);await mkdir(dirname(target),{recursive:true});
  await writeFile(target,encryptBackup(snapshot,password),{mode:0o600,flag:'wx'});
  console.log('Backup empresarial criptografado criado. Guarde a senha separadamente.');
 }else{
  const snapshot=decryptBackup(await readFile(resolve(file),'utf8'),password);await restoreBusinessToEmpty(client,snapshot);
  console.log('Restauração em banco local vazio concluída. Auth e configurações de infraestrutura não estão incluídos.');
 }
}catch{console.error('Backup/verificação falhou. Nenhuma credencial foi exibida. Confira permissões, arquivo e destino.');process.exitCode=1;}finally{client.release();await pool.end();}
