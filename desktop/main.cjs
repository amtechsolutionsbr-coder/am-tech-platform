const {app,BrowserWindow,shell,dialog}=require('electron');
const httpsUrl=process.env.AM_TECH_APP_URL;
function validUrl(value){
  try { const u=new URL(value);return u.protocol==='https:' && !!u.hostname && !u.username && !u.password && !u.hash; }
  catch {return false}
}
async function start(){
  if(!validUrl(httpsUrl)){
    dialog.showErrorBox('AM Tech Platform','A URL HTTPS da plataforma não foi configurada. Configure AM_TECH_APP_URL para a URL oficial publicada.');
    app.quit();return;
  }
  const allowedOrigin=new URL(httpsUrl).origin;
  const win=new BrowserWindow({width:1240,height:800,minWidth:760,minHeight:540,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==allowedOrigin)event.preventDefault()});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url);return {action:'deny'}});
  await win.loadURL(httpsUrl);
}
app.whenReady().then(start).catch(err=>{console.error(err);app.quit()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)start()});
