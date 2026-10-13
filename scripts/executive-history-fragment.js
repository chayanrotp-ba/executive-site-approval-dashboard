// Embedded into the standalone HTML by create-executive-history.cjs.
const roundStartedAt=new Date().toISOString();
let historyCache=[];
let dbPromise=null;
let selectedHistoryId=null;

function historyDatabase(){
 if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error('เบราว์เซอร์นี้ไม่รองรับการเก็บประวัติ'));return;}
  const request=indexedDB.open(HISTORY_DB_NAME,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('rounds',{keyPath:'id'});
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{db.close();dbPromise=null;};
   resolve(db);
  };
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('กรุณาปิดหน้าแดชบอร์ดอื่นแล้วลองใหม่'));
 }).catch(error=>{dbPromise=null;throw error;});
 return dbPromise;
}

async function historyTransaction(mode,operation){
 if(location.protocol==='http:'||location.protocol==='https:'){
  const action=operation({getAll:()=>({method:'GET',url:'/api/executive/rounds'}),add:snapshot=>({method:'POST',url:'/api/executive/rounds',body:snapshot}),delete:id=>({method:'DELETE',url:'/api/executive/rounds/'+encodeURIComponent(id)})});
  const response=await fetch(action.url,{method:action.method,headers:action.body?{'Content-Type':'application/json'}:{},body:action.body?JSON.stringify(action.body):undefined,cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'ไม่สามารถเชื่อมต่อ Master บนเครื่องได้');
  return result;
 }
 const db=await historyDatabase();
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction('rounds',mode);
  const request=operation(transaction.objectStore('rounds'));
  transaction.oncomplete=()=>resolve(request.result);
  transaction.onerror=()=>reject(transaction.error||request.error);
  transaction.onabort=()=>reject(transaction.error||new Error('การบันทึกถูกยกเลิก'));
 });
}

function markRoundDirty(){
 $('saveStatus').textContent='มีการเปลี่ยนแปลงในรอบปัจจุบัน ยังไม่ได้บันทึกลง Master';
 $('saveStatus').style.color='';
}

function formatHistoryTime(value){
 return new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value));
}

async function saveRound(){
 const button=$('saveRound');
 button.disabled=true;
 // Capture the complete current dataset before waiting for storage; filters never limit it.
 const savedAt=new Date().toISOString();
 const rows=DATA.map(r=>({...r,approved:isApproved(r)}));
 const snapshot={id:crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),schemaVersion:1,startedAt:roundStartedAt,savedAt,timeZone:'Asia/Bangkok',note:$('roundNote').value.trim(),target:APPROVAL_TARGET,total:rows.length,approvedCount:rows.filter(r=>r.approved).length,rows};
 const capturedState=JSON.stringify(approvalState);
 try{
  const stored=await historyTransaction('readwrite',store=>store.add(snapshot));
  if(stored&&stored.savedAt)snapshot.savedAt=stored.savedAt;
  const changed=capturedState!==JSON.stringify(approvalState)||snapshot.note!==$('roundNote').value.trim();
  $('saveStatus').style.color='#13704e';
  $('saveStatus').textContent=`บันทึกสำเร็จ ${formatHistoryTime(snapshot.savedAt)} · อนุมัติ ${snapshot.approvedCount}/${snapshot.total} จุด`+(changed?' · มีการแก้ไขเพิ่มเติมที่ยังไม่ได้บันทึก':'');
 }catch(error){
  $('saveStatus').style.color='#b51e28';
  $('saveStatus').textContent='บันทึกไม่สำเร็จ ข้อมูลรอบนี้ยังอยู่ กรุณาลองใหม่: '+(error.message||error);
 }finally{button.disabled=false;}
}

async function loadHistory(){
 $('historyStatus').textContent='กำลังอ่านประวัติ…';
 $('historyStatus').classList.remove('error');
 try{
  historyCache=await historyTransaction('readonly',store=>store.getAll());
  historyCache.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  renderHistory();
  if(selectedHistoryId&&!historyCache.some(r=>r.id===selectedHistoryId)) $('historyDetail').hidden=true;
 }catch(error){
  $('historyStatus').classList.add('error');
  $('historyStatus').textContent='อ่านประวัติไม่สำเร็จ: '+(error.message||error);
  $('historyRows').replaceChildren();
 }
}

function renderHistory(){
 const query=$('historySearch').value.trim().toLocaleLowerCase('th');
 const rounds=historyCache.filter(r=>r.note.toLocaleLowerCase('th').includes(query));
 $('historyStatus').textContent=`เก็บไว้ ${historyCache.length} รอบ · แสดง ${rounds.length} รอบ`;
 $('historyRows').innerHTML=rounds.length ? rounds.map(r=>`<tr>
  <td>${esc(formatHistoryTime(r.savedAt))}<br><small>${esc(r.id)}</small></td>
  <td>${esc(r.note||'ไม่ระบุชื่อรอบ')}</td><td>${r.approvedCount} / ${r.total}</td><td>${r.total-r.approvedCount}</td>
  <td><button class="approval-reset" data-history-action="view" data-id="${esc(r.id)}">ดูรายละเอียด</button><button class="approval-reset" data-history-action="export" data-id="${esc(r.id)}">ส่งออก</button><button class="approval-reset history-delete" data-history-action="delete" data-id="${esc(r.id)}">ลบ</button></td>
 </tr>`).join('') : `<tr><td colspan="5">${query?'ไม่พบชื่อรอบที่ค้นหา':'ยังไม่มีประวัติ กรุณาเลือกผลแล้วกดบันทึกลง Master'}</td></tr>`;
 $('historyRows').querySelectorAll('[data-history-action]').forEach(button=>button.addEventListener('click',()=>{
  const round=historyCache.find(r=>r.id===button.dataset.id);
  if(!round)return;
  if(button.dataset.historyAction==='view') viewHistory(round);
  if(button.dataset.historyAction==='export') downloadHistory([round],round.id);
  if(button.dataset.historyAction==='delete') deleteHistory(round,button);
 }));
}

function viewHistory(round){
 selectedHistoryId=round.id;
 $('historyDetailTitle').textContent=round.note||'รายละเอียดรอบที่บันทึก';
 $('historyDetailSummary').textContent=`บันทึก ${formatHistoryTime(round.savedAt)} · เริ่มรอบ ${formatHistoryTime(round.startedAt)} · อนุมัติ ${round.approvedCount} / ${round.total} จุด · เป้าหมาย ${round.target} จุด`;
 $('historyDetailRows').innerHTML=round.rows.map(r=>`<tr><td>${esc(r.station_id)}</td><td>${esc(r.place)}</td><td>${esc([r.province,r.district,r.subdistrict].join(' / '))}</td><td>${fmt(r.final)}</td><td><span class="approval-status-pill ${r.approved?'approved':'pending'}">${r.approved?'อนุมัติแล้ว':'ยังไม่อนุมัติ'}</span></td></tr>`).join('');
 $('historyDetail').hidden=false;
 $('historyDetail').scrollIntoView({behavior:'smooth',block:'start'});
}

async function deleteHistory(round,button){
 if(!confirm(`ลบประวัติ “${round.note||'ไม่ระบุชื่อรอบ'}” ที่บันทึก ${formatHistoryTime(round.savedAt)}?\nรายการนี้จะถูกลบถาวร โดยไม่เปลี่ยนผลรอบปัจจุบันหรือประวัติรอบอื่น`))return;
 button.disabled=true;
 try{
  await historyTransaction('readwrite',store=>store.delete(round.id));
  if(selectedHistoryId===round.id){selectedHistoryId=null;$('historyDetail').hidden=true;}
  await loadHistory();
 }catch(error){
  button.disabled=false;
  $('historyStatus').classList.add('error');
  $('historyStatus').textContent='ลบไม่สำเร็จ: '+(error.message||error);
 }
}

function downloadHistory(rounds,suffix){
 const blob=new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),timeZone:'Asia/Bangkok',rounds},null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;link.download=`executive-master-${suffix}.json`;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function exportAllHistory(){
 try{
  const rounds=await historyTransaction('readonly',store=>store.getAll());
  if(!rounds.length){$('historyStatus').textContent='ยังไม่มีประวัติให้ส่งออก';return;}
  downloadHistory(rounds,'all-'+new Date().toISOString().replace(/[:.]/g,'-'));
 }catch(error){$('historyStatus').textContent='ส่งออกไม่สำเร็จ: '+(error.message||error);}
}

function showHistoryRoute(){
 if(location.protocol==='http:'||location.protocol==='https:')$('storageNote').textContent='ข้อมูลเก็บใน Master บนเครื่องที่รันระบบ เปลี่ยนเบราว์เซอร์หรือรีเฟรชได้ ประวัติยังอยู่ · ส่งออก JSON เพื่อเก็บสำรองได้';
 const master=location.hash==='#master';
 const images=location.hash==='#images';
 $('dashboardView').hidden=master||images;
 $('masterView').hidden=!master;
 $('imageView').hidden=!images;
 $('dashboardNav').setAttribute('aria-current',master||images?'false':'page');
 $('masterNav').setAttribute('aria-current',master?'page':'false');
 $('imageNav').setAttribute('aria-current',images?'page':'false');
 closeDetail();
 if(master)loadHistory();
 if(typeof refreshImageGallery==='function')queueMicrotask(()=>refreshImageGallery());
}
