let allStationImages=[],galleryImages=[],galleryIndex=0;
function imageSource(item){return '/api/executive/images/'+encodeURIComponent(item.id)+'/content';}
async function imageApi(url,options){const response=await fetch(url,{cache:'no-store',...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'ไม่สามารถจัดการรูปภาพได้');return data;}
function stationOptions(selected=''){return '<option value="">ยังไม่ผูกจุดติดตั้ง</option>'+DATA.map(r=>`<option value="${esc(r.station_id)}" ${r.station_id===selected?'selected':''}>${esc(r.station_id+' · '+r.place+' · '+r.province)}</option>`).join('');}
function renderGallery(){
 galleryImages=currentDetailKey?allStationImages.filter(item=>item.stationId===currentDetailKey):[];
 galleryIndex=Math.max(0,Math.min(galleryIndex,galleryImages.length-1));const item=galleryImages[galleryIndex];
 $('galleryImage').hidden=!item;$('galleryEmpty').hidden=!!item;
 $('galleryEmpty').textContent='ยังไม่มีรูปภาพของจุดนี้ เพิ่มได้ที่ Master จัดการการแสดงรูป';
 $('galleryPrev').disabled=galleryImages.length<2||galleryIndex===0;$('galleryNext').disabled=galleryImages.length<2||galleryIndex===galleryImages.length-1;
 $('galleryCaption').textContent=item?`${galleryIndex+1} / ${galleryImages.length} · ${item.name}`:'0 / 0';
 if(item){$('galleryImage').src=imageSource(item);$('galleryImage').alt=item.name;}else $('galleryImage').removeAttribute('src');
}
function renderImageManager(){
 const images=allStationImages.filter(item=>(item.stationId||'')===$('imageStation').value);
 $('imageGrid').innerHTML=images.length?images.map(image=>`<article class="image-item"><img src="${imageSource(image)}" alt="${esc(image.name)}" loading="lazy"><p><strong>${esc(image.name)}</strong><br><small>${esc(formatHistoryTime(image.uploadedAt))}</small></p><label>จุดติดตั้ง <select data-image-station="${esc(image.id)}" style="max-width:100%">${stationOptions(image.stationId)}</select></label><button class="approval-reset" type="button" data-assign-image="${esc(image.id)}">บันทึกจุดติดตั้ง</button><button class="approval-reset history-delete" type="button" data-delete-image="${esc(image.id)}">ลบรูปนี้</button></article>`).join(''):'<p>ยังไม่มีรูปภาพในรายการนี้</p>';
 $('imageGrid').querySelectorAll('[data-assign-image]').forEach(button=>button.addEventListener('click',async()=>{
  const stationId=$('imageGrid').querySelector(`[data-image-station="${button.dataset.assignImage}"]`).value;
  if(!stationId){$('imageStatus').textContent='กรุณาเลือกจุดติดตั้งเพื่อผูกภาพ';return;}button.disabled=true;
  try{await imageApi('/api/executive/images/'+button.dataset.assignImage+'?stationId='+encodeURIComponent(stationId),{method:'PATCH'});await refreshImageGallery();$('imageStatus').textContent='บันทึกจุดติดตั้งของรูปแล้ว';}catch(error){button.disabled=false;$('imageStatus').textContent='บันทึกไม่สำเร็จ: '+error.message;}
 }));
 $('imageGrid').querySelectorAll('[data-delete-image]').forEach(button=>button.addEventListener('click',async()=>{
  const item=allStationImages.find(image=>image.id===button.dataset.deleteImage);if(!item||!confirm(`ลบรูป “${item.name}” ออกจากระบบ?`))return;button.disabled=true;
  try{await imageApi('/api/executive/images/'+item.id,{method:'DELETE'});await refreshImageGallery();$('imageStatus').textContent='ลบรูปแล้ว';}catch(error){button.disabled=false;$('imageStatus').textContent='ลบไม่สำเร็จ: '+error.message;}
 }));
}
async function refreshImageGallery(){
 if(location.protocol==='file:'){$('imageStatus').textContent='กรุณาเปิดระบบผ่าน localhost เพื่อจัดการรูปภาพ';renderGallery();return;}
 try{allStationImages=await imageApi('/api/executive/images');renderGallery();renderImageManager();}catch(error){$('imageStatus').textContent='อ่านรูปภาพไม่สำเร็จ: '+error.message;$('galleryImage').hidden=true;$('galleryEmpty').hidden=false;$('galleryEmpty').textContent='อ่านรูปภาพไม่สำเร็จ กรุณาตรวจการเชื่อมต่อระบบ';}
}
async function uploadSelectedImages(){
 const files=Array.from($('imageFiles').files),station=$('imageStation').value;
 if(!station){$('imageStatus').textContent='กรุณาเลือกจุดติดตั้งก่อนอัปโหลดรูป';return;}
 if(!files.length){$('imageStatus').textContent='กรุณาเลือกรูปภาพก่อนอัปโหลด';return;}
 if(location.protocol==='file:'){$('imageStatus').textContent='กรุณาเปิดระบบผ่าน localhost ก่อนอัปโหลด';return;}
 $('uploadImages').disabled=true;$('imageFiles').disabled=true;$('imageStation').disabled=true;
 let success=0;const failed=[];
 for(const [index,file] of files.entries()){
  $('imageStatus').textContent=`กำลังอัปโหลด ${index+1} / ${files.length} · ${file.name}`;
  try{if(file.size>10*1024*1024)throw new Error('ไฟล์ใหญ่เกิน 10 MB');await imageApi('/api/executive/images?stationId='+encodeURIComponent(station)+'&name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});success++;}catch(error){failed.push(file.name+': '+error.message);}
 }
 await refreshImageGallery();$('imageStatus').textContent=`อัปโหลดสำเร็จ ${success} / ${files.length} รูป`+(failed.length?'\nอัปโหลดไม่สำเร็จ:\n'+failed.join('\n'):'');
 $('imageFiles').value='';$('uploadImages').disabled=false;$('imageFiles').disabled=false;$('imageStation').disabled=false;
}
$('imageStation').innerHTML=stationOptions();
$('imageStation').addEventListener('change',()=>{$('imageStatus').textContent='';renderImageManager();});
$('uploadImages').addEventListener('click',uploadSelectedImages);$('refreshImages').addEventListener('click',refreshImageGallery);
$('galleryPrev').addEventListener('click',()=>{if(galleryIndex>0){galleryIndex--;renderGallery();}});
$('galleryNext').addEventListener('click',()=>{if(galleryIndex<galleryImages.length-1){galleryIndex++;renderGallery();}});
