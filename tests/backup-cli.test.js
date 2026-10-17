import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {backupTables,encryptBackup} from '../src/business-backup.js';
const password='isolated-backup-test-password';
function inspect(file,secret=password){return spawnSync(process.execPath,['scripts/business-backup.mjs','inspect',file],{encoding:'utf8',env:{...process.env,AM_TECH_BACKUP_PASSWORD:secret,AM_TECH_BACKUP_DATABASE_URL:'invalid-connection-must-not-be-used'}})}
test('backup inspection authenticates file without database and exposes only counts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amtech-backup-'));
 try{
  const tables=Object.fromEntries(backupTables.map(t=>[t,[]]));tables.clients=[{id:'private-id',name:'private-client-name'}];
  const file=join(dir,'test.amtech');await writeFile(file,encryptBackup({format:'amtech-business-backup',version:1,created_at:'2026-10-17T00:00:00Z',tables},password));
  const result=inspect(file);assert.equal(result.status,0);const summary=JSON.parse(result.stdout);assert.equal(summary.verified,true);assert.equal(summary.tables.clients,1);assert.equal(Object.keys(summary.tables).length,14);assert.ok(!result.stdout.includes('private-client-name'));assert.ok(!result.stdout.includes('private-id'));
  const wrong=inspect(file,'another-wrong-password');assert.equal(wrong.status,1);assert.equal(wrong.stdout,'');assert.ok(!wrong.stderr.includes('another-wrong-password'));
  const raw=JSON.parse(await (await import('node:fs/promises')).readFile(file,'utf8'));const bytes=Buffer.from(raw.data,'base64');bytes[0]^=1;raw.data=bytes.toString('base64');await writeFile(file,JSON.stringify(raw));const tampered=inspect(file);assert.equal(tampered.status,1);assert.equal(tampered.stdout,'');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('backup connection failures do not print connection credentials',()=>{
 const secret='private-example-password';const result=spawnSync(process.execPath,['scripts/business-backup.mjs','export','unused.amtech'],{encoding:'utf8',env:{...process.env,AM_TECH_BACKUP_PASSWORD:password,AM_TECH_BACKUP_DATABASE_URL:`invalid://user:${secret}@example.test/db`}});assert.equal(result.status,1);assert.ok(!result.stderr.includes(secret));assert.equal(result.stdout,'');
});
