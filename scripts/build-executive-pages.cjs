const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'.pages-dist');
require('./create-executive-history.cjs');
let html=fs.readFileSync(path.join(root,'executive_dashboard_v13_master_history.html'),'utf8');
function replace(from,to){if(!html.includes(from))throw new Error('Missing Pages transform: '+from);html=html.replace(from,to);}
replace('</style>', `.history-nav,#detailGallery,#masterView,#imageView,.approval-actions>:not(#resetApprovals){display:none!important}
.pages-notice{padding:12px 22px;color:#082b55;background:#eaf4fd;border-bottom:1px solid #c9deef}
</style>`);
replace('<body>', '<body><div class="pages-notice" role="note">GitHub Pages · เลือก/ยกเลิกอนุมัติพร้อมสรุปยอดรายจังหวัดได้ · รีเฟรชจะเริ่มรอบใหม่ · ผลการเลือกบนลิงก์นี้ไม่บันทึกลง Master ของ localhost</div>');
replace('กดบันทึกลง Master เพื่อเก็บผลรอบนี้','การเลือกมีผลเฉพาะรอบนี้ รีเฟรชเริ่มใหม่');
replace('function historyDatabase(){', "function historyDatabase(){throw new Error('หน้าดูข้อมูลไม่เปิดฐานข้อมูล');");
replace('async function historyTransaction(mode,operation){', "async function historyTransaction(mode,operation){throw new Error('ใช้ Master ผ่านระบบ localhost');");
replace('async function saveRound(){','async function saveRound(){return;');
replace("const master=location.hash==='#master';",'const master=false;');
replace("const images=location.hash==='#images';",'const images=false;');
replace('async function imageApi(url,options){',"async function imageApi(url,options){throw new Error('จัดการรูปภาพผ่านระบบ localhost');");
replace('async function refreshImageGallery(){','async function refreshImageGallery(){return;');
replace('async function uploadSelectedImages(){','async function uploadSelectedImages(){return;');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'index.html'),html);
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Pages approval artifact (current round only): '+output);
