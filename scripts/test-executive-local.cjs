const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {fork}=require('node:child_process');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
const master=fs.mkdtempSync(path.join(root,'tmp','executive-local-master-'));
const base='http://127.0.0.1:4185';
let server;
async function start(){
 server=fork(path.join(__dirname,'executive-server.cjs'),[],{env:{...process.env,EXECUTIVE_PORT:'4185',EXECUTIVE_MASTER_DIR:master},stdio:'pipe'});
 server.stderr.on('data',data=>process.stderr.write(data));
 for(let i=0;i<50;i++){
  try{if((await fetch(base+'/api/executive/health')).ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw new Error('Test server failed to start');
}
async function stop(){if(server&&!server.killed){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill();await stopped;}}
async function json(url,options){const response=await fetch(base+url,options);return {status:response.status,value:await response.json()};}
(async()=>{
 await start();
 const browserTest=fork(path.join(__dirname,'test-executive-history.cjs'),[],{env:{...process.env,EXECUTIVE_TEST_URL:base+'/'},stdio:'inherit'});
 const exitCode=await new Promise(resolve=>browserTest.once('exit',resolve));
 assert.equal(exitCode,0,'Browser test failed');
 const filtersTest=fork(path.join(__dirname,'test-executive-filters.cjs'),[],{env:{...process.env,EXECUTIVE_TEST_URL:base+'/'},stdio:'inherit'});
 assert.equal(await new Promise(resolve=>filtersTest.once('exit',resolve)),0,'Filters browser test failed');
 const bulkTest=fork(path.join(__dirname,'test-executive-bulk.cjs'),[],{env:{...process.env,EXECUTIVE_TEST_URL:base+'/'},stdio:'inherit'});
 assert.equal(await new Promise(resolve=>bulkTest.once('exit',resolve)),0,'Bulk approval browser test failed');
 const imagesTest=fork(path.join(__dirname,'test-executive-images.cjs'),[],{env:{...process.env,EXECUTIVE_TEST_URL:base+'/'},stdio:'inherit'});
 assert.equal(await new Promise(resolve=>imagesTest.once('exit',resolve)),0,'Images browser test failed');
 const html=fs.readFileSync(path.join(root,'executive_dashboard_v13_master_history.html'),'utf8');
 const rows=JSON.parse(html.match(/const DATA=(\[[^\r\n]+\]);/)[1]).map((row,index)=>({...row,approved:index===0}));
 const input={rows,note:'ทดสอบรีสตาร์ต',startedAt:new Date().toISOString(),savedAt:'2000-01-01T00:00:00Z',approvedCount:99};
 const before=Date.now();
 const saved=await json('/api/executive/rounds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(saved.status,201);
 assert.equal(saved.value.approvedCount,1);
 assert.ok(Date.parse(saved.value.savedAt)>=before);
 assert.equal(fs.readdirSync(master).filter(file=>file.endsWith('.json')).length,1);
 await stop();await start();
 const savedImages=await json('/api/executive/images');
 assert.equal(savedImages.value.length,2);
 assert.equal((await fetch(base+'/api/executive/images/'+savedImages.value[0].id+'/content')).headers.get('content-type'),'image/png');
 const stored=await json('/api/executive/rounds');
 assert.equal(stored.value[0].id,saved.value.id);
 assert.equal(stored.value[0].rows.length,85);
 const invalid=await json('/api/executive/rounds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,rows:rows.slice(1)})});
 assert.equal(invalid.status,400);
 const blocked=await json('/api/executive/rounds',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(input)});
 assert.equal(blocked.status,403);
 const concurrent=await Promise.all([1,2].map(index=>json('/api/executive/rounds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,note:'parallel '+index})})));
 assert.ok(concurrent.every(item=>item.status===201));
 assert.equal((await json('/api/executive/rounds')).value.length,3);
 assert.equal(new Set(concurrent.map(item=>item.value.id)).size,2);
 for(const round of (await json('/api/executive/rounds')).value)assert.equal((await json('/api/executive/rounds/'+round.id,{method:'DELETE'})).status,200);
 for(const image of savedImages.value)assert.equal((await json('/api/executive/images/'+image.id,{method:'DELETE'})).status,200);
 await stop();await start();
 assert.deepEqual((await json('/api/executive/rounds')).value,[]);
 assert.deepEqual((await json('/api/executive/images')).value,[]);
 const directMaster=await fetch(base+'/master');assert.equal(directMaster.status,200);
 console.log('PASS: localhost browser flow, disk snapshots, server timestamps, restart persistence, validation, concurrent saves, deletion persistence, direct Master route.');
 await stop();
})().catch(async error=>{console.error(error);await stop();process.exitCode=1;});
