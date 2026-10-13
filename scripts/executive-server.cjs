const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'executive_dashboard_v13_master_history.html'),'utf8');
const candidates=JSON.parse(html.match(/const DATA=(\[[^\r\n]+\]);/)[1]);
const port=Number(process.env.EXECUTIVE_PORT||4184);
const master=path.resolve(process.env.EXECUTIVE_MASTER_DIR||path.join(root,'data','executive-master'));
fs.mkdirSync(master,{recursive:true});
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const handleImages=require('./executive-images-server.cjs')(master,json,candidates);
function readBody(req){return new Promise((resolve,reject)=>{
 let size=0;const chunks=[];
 req.on('data',chunk=>{size+=chunk.length;if(size>2*1024*1024){reject(new Error('ข้อมูลใหญ่เกินกำหนด'));return;}chunks.push(chunk);});
 req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new Error('ข้อมูล JSON ไม่ถูกต้อง'));}});
 req.on('error',reject);
});}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  if(url.pathname.startsWith('/api/')){
   if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,403,{error:'ไม่อนุญาตให้เรียกจากเว็บไซต์อื่น'});
   if(url.pathname==='/api/executive/health'&&req.method==='GET')return json(res,200,{service:'executive-84-local',port});
   if(await handleImages(req,res,url))return;
   if(url.pathname==='/api/executive/rounds'&&req.method==='GET'){
    const rounds=fs.readdirSync(master).filter(file=>/^[a-f0-9-]{36}\.json$/.test(file)).map(file=>JSON.parse(fs.readFileSync(path.join(master,file),'utf8')));
    rounds.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
    return json(res,200,rounds);
   }
   if(url.pathname==='/api/executive/rounds'&&req.method==='POST'){
    let input;try{input=await readBody(req);}catch(error){return json(res,400,{error:error.message});}
    if(!input||!Array.isArray(input.rows)||input.rows.length!==candidates.length||typeof input.note!=='string'||input.note.length>200||typeof input.startedAt!=='string'||!Number.isFinite(Date.parse(input.startedAt)))return json(res,400,{error:'ข้อมูลรอบไม่ครบหรือรูปแบบไม่ถูกต้อง'});
    const statuses=new Map(input.rows.map(row=>[row?.station_id,row?.approved]));
    if(statuses.size!==candidates.length||candidates.some(row=>typeof statuses.get(row.station_id)!=='boolean'))return json(res,400,{error:'ต้องส่งผลการพิจารณาครบทุกจุด และรหัสสถานีต้องไม่ซ้ำ'});
    const rows=candidates.map(row=>({...row,approved:statuses.get(row.station_id)}));
    const snapshot={id:randomUUID(),schemaVersion:1,startedAt:input.startedAt,savedAt:new Date().toISOString(),timeZone:'Asia/Bangkok',note:input.note.trim(),target:70,total:rows.length,approvedCount:rows.filter(row=>row.approved).length,rows};
    const finalPath=path.join(master,snapshot.id+'.json');
    const temporary=finalPath+'.tmp';
    // fsync and atomic rename: only completed snapshots appear in the Master.
    const descriptor=fs.openSync(temporary,'wx');
    try{fs.writeFileSync(descriptor,JSON.stringify(snapshot,null,2),'utf8');fs.fsyncSync(descriptor);}finally{fs.closeSync(descriptor);}
    fs.renameSync(temporary,finalPath);
    return json(res,201,snapshot);
   }
   const match=url.pathname.match(/^\/api\/executive\/rounds\/([a-f0-9-]{36})$/);
   if(match&&req.method==='DELETE'){
    try{fs.unlinkSync(path.join(master,match[1]+'.json'));}catch(error){if(error.code==='ENOENT')return json(res,404,{error:'ไม่พบประวัติรอบนี้'});throw error;}
    return json(res,200,{deleted:true,id:match[1]});
   }
   return json(res,404,{error:'ไม่พบ API'});
  }
  if(req.method==='GET'&&['/','/executive_dashboard_v13_master_history.html','/master','/images'].includes(url.pathname)){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   return res.end(url.pathname==='/master'?html.replace('showHistoryRoute();','if(!location.hash)history.replaceState(null,"","#master");showHistoryRoute();'):url.pathname==='/images'?html.replace('showHistoryRoute();','if(!location.hash)history.replaceState(null,"","#images");showHistoryRoute();'):html);
  }
  res.writeHead(404);res.end('Not found');
 }catch(error){console.error(error);if(!res.headersSent)json(res,500,{error:'อ่านหรือบันทึก Master ไม่สำเร็จ กรุณาตรวจสิทธิ์และพื้นที่ว่างบนเครื่อง'});}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use`:error);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`Executive Dashboard: http://127.0.0.1:${port}\nMaster directory: ${master}`));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
