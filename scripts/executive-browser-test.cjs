const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const home=process.env.USERPROFILE||os.homedir();
let playwright;
try{playwright=require('playwright');}catch{
 playwright=require(process.env.EXECUTIVE_PLAYWRIGHT_MODULE||path.join(home,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const {chromium}=playwright;
let executablePath=process.env.EXECUTIVE_BROWSER_PATH;
if(!executablePath&&!fs.existsSync(chromium.executablePath())){
 const cache=path.join(home,'AppData/Local/ms-playwright');
 if(fs.existsSync(cache))executablePath=fs.readdirSync(cache).filter(name=>name.startsWith('chromium_headless_shell-')).sort().reverse().map(name=>path.join(cache,name,'chrome-headless-shell-win64/chrome-headless-shell.exe')).find(file=>fs.existsSync(file));
}
module.exports={chromium,executablePath};
