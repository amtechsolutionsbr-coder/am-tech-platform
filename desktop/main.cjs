const {app,BrowserWindow,shell,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
let packagedUrl='';
try {
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
  packagedUrl=typeof config.appUrl==='string'?config.appUrl:'';
} catch {}
const httpsUrl=process.env.AM_TECH_APP_URL||packagedUrl;
function validUrl(value){
  try { const u=new URL(value);return u.protocol==='https:' && !!u.hostname && !u.username && !u.password && !u.hash; }
  catch {return false}
}
async function start(){
  if(!validUrl(httpsUrl)){
    dialog.showErrorBox('AM Tech Platform','A URL HTTPS da plataforma não foi configurada. A URL oficial ainda não foi configurada no instalador.');
    app.quit();return;
  }
  const allowedOrigin=new URL(httpsUrl).origin;
  const win=new BrowserWindow({width:1240,height:800,minWidth:760,minHeight:540,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==allowedOrigin)event.preventDefault()});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url);return {action:'deny'}});
  while(!win.isDestroyed()){
    try { await win.loadURL(httpsUrl); break; }
    catch(error){
      if(process.env.AM_TECH_SMOKE_TEST==='1')throw error;
      if(win.isDestroyed())return;
      const {response}=await dialog.showMessageBox(win,{
        type:'warning',title:'AM Tech Platform',
        message:'Não foi possível conectar à AM Tech Platform.',
        detail:'Confira sua conexão com a internet e tente novamente. Seus dados continuam salvos no servidor.\n\nAM Tech Solutions',
        buttons:['Tentar novamente','Fechar'],defaultId:0,cancelId:1,noLink:true
      });
      if(response!==0){win.close();return;}
    }
  }
  if(win.isDestroyed())return;
  // CI verification uses a fresh Windows user profile, never a real login.
  if(process.env.AM_TECH_SMOKE_TEST==='1'){
    const output=process.env.AM_TECH_SMOKE_OUTPUT;
    if(!output)throw Error('Destino da verificação desktop ausente');
    const preferences=win.webContents.getLastWebPreferences();
    if(preferences.nodeIntegration||!preferences.contextIsolation||!preferences.sandbox)throw Error('Isolamento desktop inválido');
    const title=win.webContents.getTitle();
    if(!title.includes('AM Tech'))throw Error('Título da plataforma não identificado');
    fs.writeFileSync(output,JSON.stringify({loaded:true,title,url:win.webContents.getURL(),packaged:app.isPackaged,nodeIntegration:preferences.nodeIntegration,contextIsolation:preferences.contextIsolation,sandbox:preferences.sandbox},null,2));
    app.quit();
  }
}
app.whenReady().then(start).catch(err=>{console.error(err);app.exit(1)});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)start()});
