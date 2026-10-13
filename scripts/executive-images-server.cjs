const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
function readImage(req){return new Promise((resolve,reject)=>{
 const chunks=[];let length=0;let exceeded=false;
 req.on('data',chunk=>{length+=chunk.length;if(length>10*1024*1024){if(!exceeded)reject(new Error('รูปใหญ่เกิน 10 MB'));exceeded=true;return;}if(!exceeded)chunks.push(chunk);});
 req.on('end',()=>{if(!exceeded)resolve(Buffer.concat(chunks));});req.on('error',reject);
});}
function imageType(buffer){
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {extension:'.png',mime:'image/png'};
 if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return {extension:'.jpg',mime:'image/jpeg'};
 if(['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString('ascii')))return {extension:'.gif',mime:'image/gif'};
 if(buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP')return {extension:'.webp',mime:'image/webp'};
 return null;
}
module.exports=function createImageHandler(master,json,candidates){
 const directory=path.join(master,'images');fs.mkdirSync(directory,{recursive:true});
 return async function handleImages(req,res,url){
  if(url.pathname==='/api/executive/images'&&req.method==='GET'){
   const images=fs.readdirSync(directory).filter(file=>/^[a-f0-9-]{36}\.json$/.test(file)).map(file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
   images.sort((a,b)=>a.uploadedAt.localeCompare(b.uploadedAt)||a.id.localeCompare(b.id));
   json(res,200,images);return true;
  }
  if(url.pathname==='/api/executive/images'&&req.method==='POST'){
   const stationId=url.searchParams.get('stationId');
   if(!candidates.some(row=>row.station_id===stationId)){json(res,400,{error:'กรุณาเลือกจุดติดตั้งที่ถูกต้องก่อนอัปโหลด'});return true;}
   let buffer;try{buffer=await readImage(req);}catch(error){json(res,413,{error:error.message});return true;}
   const type=imageType(buffer);
   if(!type){json(res,400,{error:'รองรับเฉพาะรูป JPG, PNG, GIF และ WebP'});return true;}
   const id=randomUUID();const image={id,name:(url.searchParams.get('name')||'รูปภาพ').slice(0,250),uploadedAt:new Date().toISOString(),mime:type.mime,extension:type.extension,size:buffer.length};
   const imagePath=path.join(directory,id+type.extension);
   image.stationId=stationId;
   const metaPath=path.join(directory,id+'.json');
   fs.writeFileSync(imagePath,buffer,{flag:'wx'});
   try{fs.writeFileSync(metaPath+'.tmp',JSON.stringify(image,null,2),{flag:'wx'});fs.renameSync(metaPath+'.tmp',metaPath);}catch(error){fs.unlinkSync(imagePath);throw error;}
   json(res,201,image);return true;
  }
  const match=url.pathname.match(/^\/api\/executive\/images\/([a-f0-9-]{36})(\/content)?$/);
  if(match){
   const metaPath=path.join(directory,match[1]+'.json');
   let image;try{image=JSON.parse(fs.readFileSync(metaPath,'utf8'));}catch(error){if(error.code==='ENOENT'){json(res,404,{error:'ไม่พบรูปภาพนี้'});return true;}throw error;}
   const imagePath=path.join(directory,image.id+image.extension);
   if(req.method==='PATCH'&&!match[2]){
    const stationId=url.searchParams.get('stationId');
    if(!candidates.some(row=>row.station_id===stationId)){json(res,400,{error:'จุดติดตั้งไม่ถูกต้อง'});return true;}
    image.stationId=stationId;
    fs.writeFileSync(metaPath+'.tmp',JSON.stringify(image,null,2));fs.renameSync(metaPath+'.tmp',metaPath);
    json(res,200,image);return true;
   }
   if(req.method==='GET'&&match[2]){
    const content=fs.readFileSync(imagePath);
    res.writeHead(200,{'Content-Type':image.mime,'Content-Length':content.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);return true;
   }
   if(req.method==='DELETE'&&!match[2]){
    fs.unlinkSync(imagePath);fs.unlinkSync(metaPath);json(res,200,{deleted:true,id:image.id});return true;
   }
  }
  return false;
 };
};
