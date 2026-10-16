import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const url=process.env.AM_TECH_APP_URL;
let parsed;
try { parsed=new URL(url); } catch { throw new Error('Defina AM_TECH_APP_URL com a URL HTTPS da plataforma publicada.'); }
if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password||parsed.hash) throw new Error('AM_TECH_APP_URL precisa ser uma URL HTTPS válida, sem credenciais ou fragmento.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
mkdirSync(resolve(root,'desktop'),{recursive:true});
writeFileSync(resolve(root,'desktop','config.json'),JSON.stringify({appUrl:parsed.toString()},null,2)+'\n');
console.log('Configuração pública do desktop preparada.');
