const {app,BrowserWindow,shell}=require('electron');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
let server;
const port=process.env.AM_TECH_PORT||'38473';
function waitForServer(attempt=0){
  return new Promise((resolve,reject)=>{
    http.get('http://127.0.0.1:'+port+'/health',res=>{res.resume();if(res.statusCode===200)resolve();else reject(new Error('Health check falhou'))}).on('error',err=>{
      if(attempt>=40)reject(err);else setTimeout(()=>waitForServer(attempt+1).then(resolve,reject),250);
    });
  });
}
async function start(){
  server=spawn(process.execPath,[path.join(__dirname,'../src/server.js')],{
    env:{...process.env,PORT:port,ELECTRON_RUN_AS_NODE:'1'},stdio:'ignore',windowsHide:true
  });
  await waitForServer();
  const win=new BrowserWindow({width:1240,height:800,minWidth:760,minHeight:540,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.loadURL('http://127.0.0.1:'+port);
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url);return {action:'deny'}});
}
app.whenReady().then(start).catch(err=>{console.error(err);app.quit()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('before-quit',()=>{if(server)server.kill()});
