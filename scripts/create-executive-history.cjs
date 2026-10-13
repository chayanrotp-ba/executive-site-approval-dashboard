const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../assets/executive/source-v12.html');
const destination = path.resolve(__dirname, '../executive_dashboard_v13_master_history.html');
let html = fs.readFileSync(source, 'utf8');
const replace = (from, to) => {
  if (!html.includes(from)) throw new Error('Missing expected source: ' + from.slice(0, 80));
  html = html.replace(from, to);
};
// Close the two media queries left open in the supplied file before adding global styles.
replace('@media(max-width:1050px){.kpis{grid-template-columns:repeat(3,1fr)}@media(max-width:650px){.container{padding-left:13px;padding-right:13px}.kpis{grid-template-columns:repeat(2,1fr)}', '@media(max-width:1050px){.kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:650px){.container{padding-left:13px;padding-right:13px}.kpis{grid-template-columns:repeat(2,1fr)}}');
replace('</style>', `
[hidden]{display:none!important}
.history-nav{display:flex;gap:10px;flex-wrap:wrap;padding:16px 22px;background:#fff;border-bottom:1px solid var(--line)}
.history-nav a{color:var(--navy);font-weight:800;padding:9px 14px;text-decoration:none;border-radius:8px;border:1px solid var(--line)}
.history-nav a[aria-current="page"]{background:var(--navy);color:white}
.save-round{background:var(--navy);color:white;border:0;border-radius:8px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}
button:disabled{opacity:.55;cursor:wait}
.history-card{padding:20px;margin-top:22px}
.history-card h2{margin:0;color:var(--navy)}
.history-card p{color:var(--muted)}
.history-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:14px 0}
.history-card input{border:1px solid var(--line);border-radius:8px;padding:9px;font:inherit;max-width:100%}
.history-scroll{overflow:auto}
.history-table{width:100%;border-collapse:collapse;min-width:660px}
.history-table th,.history-table td{padding:12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
.history-table th{background:#eef4fa;color:var(--navy)}
.history-table button{margin:2px;padding:7px 10px}
.history-delete{color:#b51e28}
.history-status{padding:10px 0;white-space:pre-wrap}
.history-status.error{color:#b51e28}
.image-gallery{margin-top:22px;padding:20px}
.image-gallery h2{margin:0;color:var(--navy)}
.gallery-stage{margin-top:12px;background:#edf2f7;border-radius:12px;min-height:180px;display:flex;align-items:center;justify-content:center;padding:12px}
.gallery-stage img{max-width:100%;width:auto;height:auto;max-height:500px;object-fit:contain}
.gallery-controls{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:12px}
.image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:20px}
.image-item{border:1px solid var(--line);border-radius:12px;padding:12px;overflow:hidden}
.image-item img{display:block;width:100%;height:160px;object-fit:contain;background:#edf2f7;border-radius:8px}
.image-item p{overflow-wrap:anywhere;margin:8px 0}
.image-upload{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:18px}
.image-upload input{max-width:100%}
.image-upload label{width:520px;max-width:100%;min-width:0}
.image-upload select{display:block;width:100%;padding:8px;font:inherit;border:1px solid var(--line);border-radius:8px}
.exec-filter-bar{grid-template-columns:repeat(4,minmax(0,1fr)) auto}
.bulk-approval-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px;border-bottom:1px solid var(--line);background:#f3f8fc}
.bulk-approval-bar span{color:var(--muted);font-size:13px}
@media(max-width:1050px){.exec-filter-bar{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.exec-filter-bar{grid-template-columns:1fr}}
:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
</style>`);
replace('<main class="container">', `<nav class="history-nav" aria-label="หน้าการพิจารณา">
  <a href="#dashboard" id="dashboardNav">พิจารณารอบปัจจุบัน</a>
  <a href="#master" id="masterNav">Master ประวัติการบันทึก</a>
  <a href="#images" id="imageNav">Master จัดการการแสดงรูป</a>
</nav>
<main class="container" id="dashboardView">`);
replace('<div id="nearestStationBlock"></div>', `<section class="card image-gallery" aria-label="รูปภาพจุดติดตั้ง" id="detailGallery">
  <h2>รูปภาพประกอบ</h2>
  <div class="gallery-stage"><img id="galleryImage" alt="" hidden><p id="galleryEmpty">ยังไม่มีรูปภาพของจุดนี้</p></div>
  <div class="gallery-controls"><button class="approval-reset" id="galleryPrev" type="button">← ก่อนหน้า</button><span id="galleryCaption" aria-live="polite">0 / 0</span><button class="approval-reset" id="galleryNext" type="button">ถัดไป →</button></div>
 </section>
<div id="nearestStationBlock"></div>`);
replace(' currentDetailKey=recordKey(r);', ' currentDetailKey=recordKey(r);\n galleryIndex=0;\n renderGallery();\n refreshImageGallery();');
replace('<button type="button" class="approval-reset" id="resetApprovals">ล้างผลการพิจารณาทั้งหมด</button>', `<button type="button" class="save-round" id="saveRound">บันทึกลง Master</button>
      <button type="button" class="approval-reset" id="resetApprovals">ล้างการเลือกรอบปัจจุบัน</button>`);
replace('<span class="approval-save-note">สถานะถูกบันทึกอัตโนมัติในเบราว์เซอร์เครื่องนี้</span>', `<span class="approval-save-note">กดบันทึกเพื่อเก็บผลทั้ง 84 จุด · รีเฟรชจะเริ่มรอบใหม่ ประวัติยังอยู่</span>
      <label class="approval-save-note">ชื่อรอบ / หมายเหตุ <input id="roundNote" maxlength="200" placeholder="ระบุได้ตามต้องการ" style="font:inherit;padding:8px;max-width:100%"></label>
      <span class="approval-save-note" id="saveStatus" role="status" aria-live="polite"></span>`);
replace('</main>', `</main>
<main class="container" id="masterView" hidden>
 <section class="card history-card">
  <h2>Master ประวัติการบันทึก</h2>
  <p>แต่ละรายการเก็บผลทั้ง 84 จุด ณ เวลาที่กดบันทึก แยกจากการพิจารณารอบปัจจุบัน · เวลาแสดงตามประเทศไทย (Asia/Bangkok)</p>
  <p id="storageNote">ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ การล้างข้อมูลเว็บไซต์จะลบประวัติด้วย สามารถส่งออก JSON เพื่อเก็บสำรองได้</p>
  <div class="history-toolbar">
   <label>ค้นหาชื่อรอบ <input id="historySearch" type="search" placeholder="ชื่อรอบ / หมายเหตุ"></label>
   <button class="approval-reset" id="refreshHistory" type="button">รีเฟรชประวัติ</button>
   <button class="approval-reset" id="exportHistory" type="button">ส่งออกประวัติทั้งหมด (JSON)</button>
  </div>
  <div id="historyStatus" class="history-status" role="status" aria-live="polite"></div>
  <div class="history-scroll"><table class="history-table">
   <thead><tr><th>เวลาบันทึก</th><th>ชื่อรอบ / หมายเหตุ</th><th>อนุมัติ</th><th>ยังไม่อนุมัติ</th><th>จัดการ</th></tr></thead>
   <tbody id="historyRows"></tbody>
  </table></div>
 </section>
 <section class="card history-card" id="historyDetail" hidden>
  <div class="history-toolbar"><h2 id="historyDetailTitle">รายละเอียดรอบ</h2><button class="approval-reset" id="closeHistoryDetail" type="button">ปิดรายละเอียด</button></div>
  <p id="historyDetailSummary"></p>
  <div class="history-scroll"><table class="history-table">
   <thead><tr><th>รหัสสถานี</th><th>สถานที่</th><th>จังหวัด / อำเภอ / ตำบล</th><th>Final Score</th><th>ผล ณ เวลาบันทึก</th></tr></thead>
   <tbody id="historyDetailRows"></tbody>
  </table></div>
 </section>
</main>
<main class="container" id="imageView" hidden>
 <section class="card history-card">
  <h2>Master จัดการการแสดงรูป</h2>
  <p>เลือกจุดติดตั้งก่อนอัปโหลด รูปจะแสดงใต้สถานะการพิจารณาในรายละเอียดของจุดนั้น พร้อมปุ่มก่อนหน้า–ถัดไป</p>
  <p>รองรับ JPG, PNG, GIF และ WebP · ไม่เกิน 10 MB ต่อรูป · เรียงตามลำดับที่อัปโหลด</p>
  <div class="image-upload"><label>จุดติดตั้ง <select id="imageStation" aria-label="เลือกจุดติดตั้ง"></select></label><input id="imageFiles" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple aria-label="เลือกรูปภาพหลายรูป"><button class="save-round" id="uploadImages" type="button">อัปโหลดรูปที่เลือก</button><button class="approval-reset" id="refreshImages" type="button">รีเฟรชรูปภาพ</button></div>
  <div id="imageStatus" class="history-status" role="status" aria-live="polite"></div>
  <div id="imageGrid" class="image-grid"></div>
 </section>
</main>`);
replace('const APPROVAL_STORAGE_KEY="station_approval_50_50_84_v1";', 'const HISTORY_DB_NAME="executive_84_approval_master_v1";');
const start = html.indexOf('function loadApprovalState(){');
const end = html.indexOf('function isApproved(r){', start);
if (start < 0 || end < 0) throw new Error('Missing approval persistence functions');
html = html.slice(0, start) + fs.readFileSync(path.join(__dirname, 'executive-history-fragment.js'), 'utf8') + '\n' + html.slice(end);
replace(' saveApprovalState();', ' markRoundDirty();');
replace('   saveApprovalState();', '   markRoundDirty();');
replace('loadApprovalState();', `$("saveRound").addEventListener("click",saveRound);
$("roundNote").addEventListener("input",markRoundDirty);
$("historySearch").addEventListener("input",renderHistory);
$("refreshHistory").addEventListener("click",loadHistory);
$("exportHistory").addEventListener("click",exportAllHistory);
$("closeHistoryDetail").addEventListener("click",()=>$("historyDetail").hidden=true);
window.addEventListener("hashchange",showHistoryRoute);
showHistoryRoute();`);
const originalData=html.match(/const DATA=(\[[^\r\n]+\]);/)[1];
const candidates=JSON.parse(originalData);
const additions=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/executive-supplemental.json'),'utf8'));
for(const addition of additions){if(!candidates.some(row=>row.place===addition.place))candidates.push(addition);}
candidates.sort((a,b)=>b.final-a.final);
replace('Executive Dashboard 50:50 — 84 จุด','Executive Dashboard 50:50 — '+candidates.length+' จุด');
replace('const DATA='+originalData+';', 'const DATA='+JSON.stringify(candidates)+';');
const bodyStart=html.indexOf('<body>'),scriptStart=html.indexOf('<script>');
const markup=html.slice(bodyStart,scriptStart).replace(/\b84\b/g,String(candidates.length));
html=html.slice(0,bodyStart)+markup+html.slice(scriptStart);
const average=candidates.reduce((sum,row)=>sum+row.final,0)/candidates.length;
const values=candidates.map(row=>row.final).sort((a,b)=>a-b);
const median=values.length%2?values[Math.floor(values.length/2)]:(values[values.length/2-1]+values[values.length/2])/2;
replace('<div class="value">69.95</div>', '<div class="value">'+average.toFixed(2)+'</div>');
replace('Median 69.99','Median '+median.toFixed(2));
replace('42 / 42',candidates.filter(row=>row.zone==='แดง').length+' / '+candidates.filter(row=>row.zone==='ส้ม').length);
replace('<div class="label">Final Score ≥ 70</div><div class="value">42</div><div class="sub">50.0% ของทั้งหมด</div>', '<div class="label">Final Score ≥ 70</div><div class="value">'+candidates.filter(row=>row.final>=70).length+'</div><div class="sub">'+(100*candidates.filter(row=>row.final>=70).length/candidates.length).toFixed(1)+'% ของทั้งหมด</div>');
const representativeNames=JSON.parse(fs.readFileSync(path.join(__dirname,'executive-representatives.json'),'utf8'));
const normalizePlace=value=>value.replace(/\s+/g,' ').trim();
const representativeIds=[];
const missingRepresentatives=[];
for(const name of representativeNames){
 const matches=candidates.filter(row=>normalizePlace(row.place)===normalizePlace(name));
 if(matches.length===1)representativeIds.push(matches[0].station_id);
 else if(matches.length===0)missingRepresentatives.push(name);
 else throw new Error('Ambiguous representative: '+name);
}
replace('const APPROVAL_TARGET=70;', `const APPROVAL_TARGET=70;
const REPRESENTATIVE_IDS=new Set(${JSON.stringify(representativeIds)});
function recordBasins(row){
 return String(row.basin||'').replace(/ลุ่มน้ำ้ำปิง/g,'ลุ่มน้ำปิง').replace(/ลุ่มน้ำเเม่กลอง/g,'ลุ่มน้ำแม่กลอง').replace(/ลุ่มน้ำชีในเขตจังหวัดชัยภูมิ/g,'ลุ่มน้ำชี').split(/[,\\n]+|\\s+(?=ลุ่มน้ำ|แม่น้ำ)/u).map(value=>value.trim()).filter(Boolean);
}`);
replace('<div class="exec-filter-bar">', `<div class="exec-filter-bar">
 <div class="exec-filter-group"><label class="exec-filter-label" for="basinFilter">ลุ่มน้ำ</label><select id="basinFilter"><option value="">ทุกลุ่มน้ำ</option></select></div>
 <div class="exec-filter-group"><label class="exec-filter-label" for="representativeFilter">ประเภทสถานที่</label><select id="representativeFilter"><option value="">ทุกสถานที่</option><option value="representative">ตัวแทนจังหวัด</option></select><div class="exec-filter-hint">ตามรายชื่อที่ระบุ ${representativeIds.length} จุด${missingRepresentatives.length?' · ไม่พบในข้อมูล '+missingRepresentatives.map(name=>escBuild(name)).join(', '):''}</div></div>`);
replace(' return provincePass && scorePass;', ` return provincePass && scorePass && (!$('basinFilter').value || recordBasins(r).includes($('basinFilter').value)) && (!$('representativeFilter').value || REPRESENTATIVE_IDS.has(r.station_id));`);
replace(' if(selectedProvince) filterText+=', ` if($('basinFilter').value)filterText+=' · ลุ่มน้ำ '+$('basinFilter').value;
 if($('representativeFilter').value)filterText+=' · ตัวแทนจังหวัด';
 if(selectedProvince) filterText+=`);
replace('function clearExecFilters(){', `function clearExecFilters(){
 $('basinFilter').value='';
 $('representativeFilter').value='';`);
replace('<div class="table-wrap">', `<div class="bulk-approval-bar"><button type="button" class="save-round" id="approveFiltered">อนุมัติทั้งหมดตาม Filter</button><span id="bulkApprovalCount" role="status" aria-live="polite"></span><span>กดบันทึกลง Master เพื่อเก็บผลรอบนี้</span></div>
<div class="table-wrap">`);
replace('function render(){', `function approveFilteredRows(){
 if(!parseScoreRange($('scoreRangeFilter').value).ok)return;
 const pending=getFilteredSortedData().filter(row=>!isApproved(row));
 if(!pending.length)return;
 pending.forEach(row=>{approvalState[recordKey(row)]=true;});
 markRoundDirty();
 render();
 updateApprovalDashboard();
 if(currentDetailKey)updateDrawerApprovalByKey(currentDetailKey);
}
function render(){`);
replace(' window._filtered=arr;', ` const pending=arr.filter(row=>!isApproved(row)).length;
 const valid=parseScoreRange($('scoreRangeFilter').value).ok;
 $('approveFiltered').disabled=!valid||pending===0;
 $('approveFiltered').textContent='อนุมัติทั้งหมดตาม Filter ('+arr.length+' จุด)';
 $('bulkApprovalCount').textContent=valid?'ตรง Filter '+arr.length+' จุด · อนุมัติแล้ว '+(arr.length-pending)+' จุด · ยังไม่อนุมัติ '+pending+' จุด':'กรุณาแก้ไขช่วงคะแนนก่อนอนุมัติ';
 window._filtered=arr;`);
replace('setupSorting();', `$('basinFilter').innerHTML='<option value="">ทุกลุ่มน้ำ</option>'+[...new Set(DATA.flatMap(recordBasins))].sort((a,b)=>a.localeCompare(b,'th')).map(basin=>'<option value="'+esc(basin)+'">'+esc(basin)+'</option>').join('');
$('basinFilter').addEventListener('change',render);
$('representativeFilter').addEventListener('change',render);
$('approveFiltered').addEventListener('click',approveFilteredRows);
setupSorting();`);
replace('</script>', fs.readFileSync(path.join(__dirname,'executive-station-images.js'),'utf8')+'\n</script>');
fs.writeFileSync(destination, html);
console.log(destination);
console.log('Representatives: '+representativeIds.length+' / '+representativeNames.length+'; missing: '+missingRepresentatives.join(', '));
function escBuild(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
