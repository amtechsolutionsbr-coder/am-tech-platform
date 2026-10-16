import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

async function launch(responses,smoke=false){
  let loads=0,dialogs=0,closed=false,exitCode;
  let ready;
  const win={webContents:{on(){},setWindowOpenHandler(){}},isDestroyed:()=>closed,close(){closed=true},async loadURL(){loads++;if(loads===1)throw Error('offline')}};
  const electron={app:{whenReady:()=>({then(fn){ready=fn();return {catch(handler){ready=ready.catch(handler);}}}}),on(){},quit(){},exit(code){exitCode=code}},BrowserWindow:function(){return win},shell:{},dialog:{async showMessageBox(){dialogs++;return {response:responses.shift()};}}};
  vm.runInNewContext(readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8'),{
    require(name){if(name==='electron')return electron;if(name==='node:path')return {join:()=>''};if(name==='node:fs')return {readFileSync:()=>JSON.stringify({appUrl:'https://example.test/'})};throw Error(name)},
    __dirname:'',URL,process:{env:smoke?{AM_TECH_SMOKE_TEST:'1'}:{},platform:'win32'},console:{error(){}}
  });
  await ready;
  return {loads,dialogs,closed,exitCode};
}
test('desktop retries failed initial connection',async()=>{
  assert.deepEqual(await launch([0]),{loads:2,dialogs:1,closed:false,exitCode:undefined});
});
test('desktop closes when retry is declined',async()=>{
  assert.deepEqual(await launch([1]),{loads:1,dialogs:1,closed:true,exitCode:undefined});
});
test('desktop smoke fails without prompting on connection failure',async()=>{
  assert.deepEqual(await launch([],true),{loads:1,dialogs:0,closed:false,exitCode:1});
});
