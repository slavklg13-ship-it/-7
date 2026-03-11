// АльтернативА МИС — data.js
// Auto-generated module

// DATA STORE (Supabase + localStorage fallback)
// ═══════════════════════════════════════════
const SB_URL = 'https://epcrgurcwffxqwsmdyhd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY3JndXJjd2ZmeHF3c21keWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ5NDUsImV4cCI6MjA4ODgzMDk0NX0.Iv32pSrtJGFuJMaJGdb5s7o4BvMfDvRP1VxE_B1Yyfo';

// Key → Supabase table mapping
const SB_TABLES = {
  'mis_patients':'patients','mis_appts':'appts','mis_protocols':'protocols',
  'mis_payments':'payments','mis_tasks':'tasks','mis_users':'users','mis_svcs':'svcs'
};
// Keys with pt_id prefix (e.g. mis_diags_p_001)
function sbTableForKey(key){
  if(key.startsWith('mis_diags_')) return {table:'diags',ptId:key.replace('mis_diags_','')};
  if(key.startsWith('mis_labs_'))  return {table:'labs', ptId:key.replace('mis_labs_','')};
  if(key.startsWith('mis_meds_'))  return {table:'meds', ptId:key.replace('mis_meds_','')};
  if(key.startsWith('mis_files_')) return {table:'files',ptId:key.replace('mis_files_','')};
  return {table:SB_TABLES[key]||null,ptId:null};
}

// localStorage fallback (always kept in sync)
function loadData(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch{return def;}}
function saveData(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

// Async Supabase save — fire and forget, localStorage stays primary for UI speed
async function sbSave(key, arr){
  try{
    const {table,ptId}=sbTableForKey(key);
    if(!table) return;
    const headers={'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Prefer':'resolution=merge-duplicates'};
    // Upsert all records as rows {id, data, [pt_id]}
    if(!Array.isArray(arr)) return;
    if(arr.length===0){
      // Delete all rows for this key (e.g. empty patient list edge case)
      return;
    }
    const rows = arr.map(item=>{
      const row={id:item.id||('r_'+Math.random().toString(36).slice(2)),data:item};
      if(ptId) row.pt_id=ptId;
      return row;
    });
    await fetch(`${SB_URL}/rest/v1/${table}`,{method:'POST',headers,body:JSON.stringify(rows)});
  }catch(e){/* silent fallback */}
}

async function sbDelete(key, id){
  try{
    const {table}=sbTableForKey(key);
    if(!table) return;
    const headers={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`,{method:'DELETE',headers});
  }catch(e){}
}

async function sbLoad(key, def){
  try{
    const {table,ptId}=sbTableForKey(key);
    if(!table) return null;
    const headers={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    let url=`${SB_URL}/rest/v1/${table}?select=data`;
    if(ptId) url+=`&pt_id=eq.${ptId}`;
    const r=await fetch(url,{headers});
    if(!r.ok) return null;
    const rows=await r.json();
    if(!rows||rows.length===0) return null;
    return rows.map(r=>r.data);
  }catch(e){return null;}
}

// Enhanced saveData — saves to localStorage AND Supabase
function saveData(key,val){
  try{localStorage.setItem(key,JSON.stringify(val));}catch{}
  if(Array.isArray(val)) sbSave(key,val);
}

// Init: load from Supabase on startup, fallback to localStorage
async function initSbData(key,def){
  const remote = await sbLoad(key,def);
  if(remote && remote.length>0){
    try{localStorage.setItem(key,JSON.stringify(remote));}catch{}
    return remote;
  }
  return loadData(key,def);
}

let PATIENTS = loadData('mis_patients', null);
if(!PATIENTS || PATIENTS.length === 0){ PATIENTS = PATIENTS_SEED; saveData('mis_patients', PATIENTS); }

// USERS  — начинаем с пустого списка (пользователь добавит сам)
let USERS_DB = loadData('mis_users', []);
// Системный аккаунт логина — всегда есть хотя бы один
if(!loadData('mis_login_users',null)){
  const loginUsers = {
    director:{pass:'1234',role:'director',name:'Горзина Л.П.',label:'👑 Руководитель',cls:'dir',initials:'ГЛ',color:'linear-gradient(135deg,#059669,#4a6cf7)'},
    doctor:  {pass:'1234',role:'doctor',  name:'Шкарпов А.А.',label:'🩺 Врач',        cls:'doc',initials:'ША',color:'linear-gradient(135deg,#0284c7,#0ea5e9)'},
    admin:   {pass:'1234',role:'admin',   name:'Администратор',label:'📋 Администратор',cls:'adm',initials:'АД',color:'linear-gradient(135deg,#d97706,#f59e0b)'},
  };
  saveData('mis_login_users', loginUsers);
}
let _lu_stored = loadData('mis_login_users', null);
const _lu_defaults = {
  director:{pass:'1234',role:'director',name:'Горзина Л.П.',label:'👑 Руководитель',cls:'dir',initials:'ГЛ',color:'linear-gradient(135deg,#059669,#4a6cf7)'},
  doctor:  {pass:'1234',role:'doctor',  name:'Шкарпов А.А.',label:'🩺 Врач',cls:'doc',initials:'ША',color:'linear-gradient(135deg,#0284c7,#0ea5e9)'},
  admin:   {pass:'1234',role:'admin',   name:'Администратор',label:'📋 Администратор',cls:'adm',initials:'АД',color:'linear-gradient(135deg,#d97706,#f59e0b)'},
};
let LOGIN_USERS = (_lu_stored && Object.keys(_lu_stored).length > 0) ? _lu_stored : _lu_defaults;

let currentEmkPtId = null;
let CU = null, curRole = 'director';
let pendingDelPtId = null, pendingDelUsrId = null;

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
function selRole(el,r){
  document.querySelectorAll('.lrole').forEach(x=>x.classList.remove('on'));
  el.classList.add('on'); curRole=r;
  const d={director:'director',doctor:'doctor',admin:'admin'};
  document.getElementById('lu').value=d[r];
}

function login(){
  const u=(document.getElementById('lu')||{value:''}).value.trim().toLowerCase();
  const p=(document.getElementById('lp')||{value:''}).value;
  const err=document.getElementById('lerr');

  // HARDCODED FALLBACK - always works
  const HARD={
    director:{pass:'1234',role:'director',name:'Горзина Л.П.',label:'Руководитель',cls:'dir',initials:'ГЛ',color:'linear-gradient(135deg,#059669,#4a6cf7)'},
    doctor:  {pass:'1234',role:'doctor',  name:'Шкарпов А.А.',label:'Врач',       cls:'doc',initials:'ША',color:'linear-gradient(135deg,#0284c7,#0ea5e9)'},
    admin:   {pass:'1234',role:'admin',   name:'Администратор',label:'Администратор',cls:'adm',initials:'АД',color:'linear-gradient(135deg,#7c3aed,#a78bfa)'}
  };

  // Try dynamic users first, then hardcoded
  let ud = null;
  try{ ud = LOGIN_USERS && LOGIN_USERS[u]; } catch(e){}
  if(!ud) ud = HARD[u];
  if(!ud) ud = HARD[u.toLowerCase()];

  if(!ud || ud.pass !== p){
    if(err) err.style.display='block';
    return;
  }
  if(err) err.style.display='none';
  CU = Object.assign({},ud,{login:u});
  startApp();
}

function startApp(){
  document.getElementById('login').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('tname').textContent=CU.name;
  const trb=document.getElementById('trb');
  trb.className='trb '+CU.cls;
  trb.textContent=CU.label;
  const av=document.getElementById('sava');
  av.textContent=CU.initials;
  av.style.background=CU.color;
  document.getElementById('sname').textContent=CU.name;
  document.getElementById('srole').textContent=CU.label;
  applyPerms();
  if(CU&&CU.role==='doctor') go('doctor'); else go('dash');
  Promise.all([
    initSbData('mis_patients',PATIENTS_SEED).then(d=>{if(d&&d.length>0)PATIENTS=d;}),
    initSbData('mis_users',[]).then(d=>{if(d&&d.length>0)USERS_DB=d;}),
  ]).then(()=>{
    renderPatients();renderUsers();populateVisitPatients();updateDash();
    toast('☁️ Данные синхронизированы');
  }).catch(()=>{
    renderPatients();renderUsers();populateVisitPatients();updateDash();
  });
}

function logout(){
  CU=null;
  document.getElementById('app').style.display='none';
  document.getElementById('login').style.display='flex';
  document.getElementById('lp').value='';
}

// ═══════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════
const PERMS={
  director:['dash','sched','patients','emr','rehab','prp','uzi','pod','crm','tpl','docs','analytics','stock','users','svcs','plans','kassa','salary','loyalty','tasks','care','reports','funnel'],
  doctor:  ['dash','doctor','sched','patients','emr','rehab','prp','uzi','pod','tpl','docs','stock','svcs','plans'],
  admin:   ['dash','sched','patients','crm','docs','kassa','loyalty','tasks','care','funnel'],
};

function applyPerms(){
  const allowed=PERMS[CU.role];
  document.querySelectorAll('.ni[id^="n-"]').forEach(ni=>{
    const pg=ni.id.replace('n-','');
    if(allowed.includes(pg))ni.classList.remove('lk');
    else ni.classList.add('lk');
  });
  const isAdmin=CU.role==='admin';
  ['btn-newpt','btn-prp','btn-tpl','emr-ai-btn','emr-save'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display=isAdmin?'none':'';
  });
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function go(id){
  if(CU&&!PERMS[CU.role].includes(id)){showDenied(id);return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  const pg=document.getElementById('p-'+id);if(pg)pg.classList.add('on');
  const ni=document.getElementById('n-'+id);if(ni)ni.classList.add('on');
  const renders={
    sched:renderSched,
    doctor:renderDoctor,
    svcs:renderSvcs, dash:updateDash, patients:renderPatients, users:renderUsers,
    plans:()=>{populatePlanPatients();renderPlans();},
    kassa:()=>{renderKassa();populatePayModal();},
    funnel:renderFunnel, tasks:renderTasks, care:renderCare,
    loyalty:()=>{renderLoyalty();populatePlanPatients();},
    reports:renderReports, analytics:renderAnalytics,
    salary:renderSalary, stock:renderStock
  };
  if(renders[id])renders[id]();
}

const pNames={analytics:'Аналитика',users:'Пользователи',emr:'ЭМК / Протоколы',
  prp:'PRP-терапия',uzi:'УЗИ-диагностика',pod:'Подология',tpl:'Шаблоны',rehab:'Реабилитация',stock:'Склад'};

function showDenied(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  let pg=document.getElementById('p-'+id);
  if(!pg){pg=document.createElement('div');pg.className='page';pg.id='p-'+id;document.querySelector('.cnt').appendChild(pg);}
  pg.innerHTML=`<div class="aden"><div class="ai2">🔒</div><h3>Доступ ограничен</h3><p>Раздел «${pNames[id]||id}» недоступен для роли <b>${CU.label}</b>.</p></div>`;
  pg.classList.add('on');
}

// ═══════════════════════════════════════════
  PATIENTS=loadData('mis_patients',[]);
  const q=((document.getElementById('pt-search')||{}).value||'').toLowerCase();
  const list=PATIENTS.filter(p=>{
    if(!q)return true;
    return (p.fam+' '+p.nam+' '+p.pat+' '+p.tel+' '+(p.diag||'')).toLowerCase().includes(q);
  });
  const tb=document.getElementById('pt-tbody');
  const em=document.getElementById('pt-empty');
  const cnt=document.getElementById('pt-count');
  if(!tb)return;
  cnt.textContent=`${PATIENTS.length} пациент${PATIENTS.length===1?'':'ов'}`;
  if(list.length===0){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const isAdmin=CU&&CU.role==='admin';
  tb.innerHTML=list.map(p=>{
    const age=calcAge(p.dob);
    const fullName=`${p.fam} ${p.nam}${p.pat?' '+p.pat:''}`;
    return `<tr>
      <td style="cursor:pointer;" onclick="viewPatient('${p.id}')"><b>${fullName}</b>${p.email?`<br><span style="font-size:11px;color:var(--text3);">${p.email}</span>`:''}</td>
      <td>${p.dob||'—'}</td>
      <td>${p.sex||'—'}&nbsp;·&nbsp;${age} л.</td>
      <td>${p.tel||'—'}</td>
      <td>${p.diag?`<span class="b b-bl" style="font-size:10px;">${p.diag}</span>`:'—'}</td>
      <td><span class="b b-gr" style="font-size:10px;">${p.src||'—'}</span></td>
      <td>${statusBadge(p.status||'Активный')}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button class="btn bp xs" style="margin-right:3px;" onclick="openEmk('${p.id}')">📋 ЭМК</button>
        ${!isAdmin?`<button class="btn bg xs" style="margin-right:3px;" onclick="editPatient('${p.id}')">✏️</button>
        <button class="btn bg xs" style="color:var(--red);" onclick="confirmDelPt('${p.id}','${fullName.replace(/'/g,"\\'")}')">🗑</button>`:''}
      </td>
    </tr>`;
  }).join('');
}

function savePatient(){
  const fam=document.getElementById('pt-fam').value.trim();
  const nam=document.getElementById('pt-nam').value.trim();
  const tel=document.getElementById('pt-tel').value.trim();
  if(!fam||!nam){toast('⚠️ Укажите фамилию и имя');return;}
  const pt={
    id:'pt_'+Date.now(),
    fam,nam,
    pat:document.getElementById('pt-pat').value.trim(),
    dob:document.getElementById('pt-dob').value,
    sex:document.getElementById('pt-sex').value,
    tel,
    email:document.getElementById('pt-email').value.trim(),
    src:document.getElementById('pt-src').value,
    diag:document.getElementById('pt-diag').value.trim(),
    note:document.getElementById('pt-note').value.trim(),
    status:'Активный',
    created:new Date().toLocaleDateString('ru-RU'),
  };
  PATIENTS=loadData('mis_patients',[]);
  PATIENTS.unshift(pt);
  saveData('mis_patients',PATIENTS);
  closeM('m-addpt');
  // Clear form
  ['pt-fam','pt-nam','pt-pat','pt-tel','pt-email','pt-diag','pt-note'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('pt-dob').value='';
  renderPatients();
  populateVisitPatients();
  toast(`✅ Пациент ${fam} ${nam} добавлен`);
}

function editPatient(id){
  PATIENTS=loadData('mis_patients',[]);
  const p=PATIENTS.find(x=>x.id===id);if(!p)return;
  document.getElementById('ept-id').value=id;
  document.getElementById('ept-fam').value=p.fam||'';
  document.getElementById('ept-nam').value=p.nam||'';
  document.getElementById('ept-pat').value=p.pat||'';
  document.getElementById('ept-dob').value=p.dob||'';
  document.getElementById('ept-sex').value=p.sex||'Ж';
  document.getElementById('ept-tel').value=p.tel||'';
  document.getElementById('ept-email').value=p.email||'';
  document.getElementById('ept-src').value=p.src||'Рекомендация';
  document.getElementById('ept-diag').value=p.diag||'';
  document.getElementById('ept-note').value=p.note||'';
  document.getElementById('ept-status').value=p.status||'Активный';
  document.getElementById('ept-next').value=p.next||'';
  openM('m-editpt');
}

function updatePatient(){
  const id=document.getElementById('ept-id').value;
  PATIENTS=loadData('mis_patients',[]);
  const idx=PATIENTS.findIndex(x=>x.id===id);if(idx<0)return;
  PATIENTS[idx]=Object.assign({},PATIENTS[idx],{
    fam:document.getElementById('ept-fam').value.trim(),
    nam:document.getElementById('ept-nam').value.trim(),
    pat:document.getElementById('ept-pat').value.trim(),
    dob:document.getElementById('ept-dob').value,
    sex:document.getElementById('ept-sex').value,
    tel:document.getElementById('ept-tel').value.trim(),
    email:document.getElementById('ept-email').value.trim(),
    src:document.getElementById('ept-src').value,
    diag:document.getElementById('ept-diag').value.trim(),
    note:document.getElementById('ept-note').value.trim(),
    status:document.getElementById('ept-status').value,
    next:document.getElementById('ept-next').value,
  });
  saveData('mis_patients',PATIENTS);
  closeM('m-editpt');
  renderPatients();
  toast('✅ Данные пациента обновлены');
}

function confirmDelPt(id,name){
  pendingDelPtId=id;
  document.getElementById('del-pt-name').textContent=name;
  document.getElementById('del-pt-id').value=id;
  openM('m-delpt');
}

function deletePatient(){
  const id=document.getElementById('del-pt-id').value;
  PATIENTS=loadData('mis_patients',[]);
  PATIENTS=PATIENTS.filter(x=>x.id!==id);
  saveData('mis_patients',PATIENTS);
  closeM('m-delpt');
  renderPatients();
  populateVisitPatients();
  toast('🗑 Пациент удалён');
}

function viewPatient(id){
  openEmk(id);
}

function populateVisitPatients(){
  PATIENTS=loadData('mis_patients',[]);
  const sel=document.getElementById('nv-pt');if(!sel)return;
  sel.innerHTML='<option value="">— Выберите пациента —</option>'+
    PATIENTS.map(p=>`<option value="${p.id}">${p.fam} ${p.nam}</option>`).join('');
}

// ═══════════════════════════════════════════
// USERS CRUD
// ═══════════════════════════════════════════
const roleLabels={director:'👑 Руководитель',doctor:'🩺 Врач',admin:'📋 Администратор'};
const roleColors={director:'linear-gradient(135deg,#8b5cf6,#a78bfa)',doctor:'linear-gradient(135deg,#4a6cf7,#748ffc)',admin:'linear-gradient(135deg,#f472b6,#ec4899)'};
const roleCls={director:'b-pu',doctor:'b-bl',admin:'b-ro'};

function initials(name){
  const parts=name.trim().split(' ');
  if(parts.length>=2)return parts[0][0]+parts[1][0];
  return name.substring(0,2).toUpperCase();
}

function renderUsers(){
  USERS_DB=loadData('mis_users',[]);
  const list=document.getElementById('usr-list');
  const em=document.getElementById('usr-empty');
  const cnt=document.getElementById('usr-count');
  if(!list)return;
  cnt.textContent=`${USERS_DB.length} пользовател${USERS_DB.length===1?'ь':USERS_DB.length<5?'я':'ей'}`;
  if(USERS_DB.length===0){list.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  list.innerHTML=USERS_DB.map(u=>{
    const ini=initials(u.name);
    const isBlocked=u.status==='blocked';
    return `<div class="urow" style="${isBlocked?'opacity:.5;':''}" >
      <div style="width:36px;height:36px;border-radius:50%;background:${roleColors[u.role]||'#ccc'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${ini}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;">${u.name}${isBlocked?' <span style="font-size:10px;color:var(--red);">[заблокирован]</span>':''}</div>
        <div style="font-size:11px;color:var(--text3);">${u.login} · ${u.pos||''} · ${u.email||''}</div>
      </div>
      <span class="b ${roleCls[u.role]||'b-gr'}">${roleLabels[u.role]||u.role}</span>
      ${u.tel?`<span style="font-size:11px;color:var(--text3);">${u.tel}</span>`:''}
      <button class="btn bg xs" onclick="editUserUI('${u.id}')">✏️ Изменить</button>
    </div>`;
  }).join('');
}

function saveUser(){
  const fam=document.getElementById('au-fam').value.trim();
  const nam=document.getElementById('au-nam').value.trim();
  const login=document.getElementById('au-login').value.trim();
  const pass=document.getElementById('au-pass').value;
  if(!fam||!nam){toast('⚠️ Укажите фамилию и имя');return;}
  if(!login){toast('⚠️ Укажите логин');return;}
  if(pass.length<4){toast('⚠️ Пароль минимум 4 символа');return;}
  // Check login unique
  USERS_DB=loadData('mis_users',[]);
  if(USERS_DB.find(u=>u.login===login)||LOGIN_USERS[login]){toast('⚠️ Логин уже занят');return;}
  const role=document.getElementById('au-role').value;
  const name=`${fam} ${nam}${document.getElementById('au-pat').value.trim()?' '+document.getElementById('au-pat').value.trim():''}`;
  const u={
    id:'usr_'+Date.now(),
    name,login,pass,role,
    pos:document.getElementById('au-pos').value.trim(),
    tel:document.getElementById('au-tel').value.trim(),
    email:document.getElementById('au-email').value.trim(),
    status:'active',
    created:new Date().toLocaleDateString('ru-RU'),
  };
  USERS_DB.push(u);
  saveData('mis_users',USERS_DB);
  // Add to login system
  LOGIN_USERS[login]={pass,role,name,label:roleLabels[role],cls:roleCls[role].replace('b-','').replace('pu','dir').replace('bl','doc').replace('ro','adm'),initials:initials(name),color:roleColors[role]};
  // Fix cls
  const clsMap={director:'dir',doctor:'doc',admin:'adm'};
  LOGIN_USERS[login].cls=clsMap[role];
  saveData('mis_login_users',LOGIN_USERS);
  closeM('m-adduser');
  ['au-fam','au-nam','au-pat','au-pos','au-tel','au-email','au-login','au-pass'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  renderUsers();
  toast(`✅ Пользователь ${name} (${login}) создан`);
}

function editUserUI(id){
  USERS_DB=loadData('mis_users',[]);
  const u=USERS_DB.find(x=>x.id===id);if(!u)return;
  document.getElementById('eu-id').value=id;
  document.getElementById('eu-name').value=u.name||'';
  document.getElementById('eu-pos').value=u.pos||'';
  document.getElementById('eu-role').value=u.role||'doctor';
  document.getElementById('eu-tel').value=u.tel||'';
  document.getElementById('eu-login').value=u.login||'';
  document.getElementById('eu-pass').value='';
  document.getElementById('eu-status').value=u.status||'active';
  document.getElementById('eu-email').value=u.email||'';
  openM('m-edituser');
}

function updateUser(){
  const id=document.getElementById('eu-id').value;
  USERS_DB=loadData('mis_users',[]);
  const idx=USERS_DB.findIndex(x=>x.id===id);if(idx<0)return;
  const oldLogin=USERS_DB[idx].login;
  const newPass=document.getElementById('eu-pass').value;
  const role=document.getElementById('eu-role').value;
  const name=document.getElementById('eu-name').value.trim();
  const status=document.getElementById('eu-status').value;
  USERS_DB[idx]=Object.assign({},USERS_DB[idx],{name,role,
    pos:document.getElementById('eu-pos').value.trim(),
    tel:document.getElementById('eu-tel').value.trim(),
    email:document.getElementById('eu-email').value.trim(),
    status,
  },(newPass.length>=4?{pass:newPass}:{}));
  saveData('mis_users',USERS_DB);
  // Update login system
  const clsMap={director:'dir',doctor:'doc',admin:'adm'};
  LOGIN_USERS[oldLogin]=Object.assign({},LOGIN_USERS[oldLogin],{name,role,label:roleLabels[role],cls:clsMap[role],initials:initials(name),color:roleColors[role]},(newPass.length>=4?{pass:newPass}:{}));
  if(status==='blocked')LOGIN_USERS[oldLogin]._blocked=true;
  else delete LOGIN_USERS[oldLogin]._blocked;
  saveData('mis_login_users',LOGIN_USERS);
  closeM('m-edituser');
  renderUsers();
  toast('✅ Данные пользователя обновлены');
}

function confirmDelUser(){
  const id=document.getElementById('eu-id').value;
  USERS_DB=loadData('mis_users',[]);
  const u=USERS_DB.find(x=>x.id===id);if(!u)return;
  if(u.login===(CU && CU.login)){toast('⚠️ Нельзя удалить текущего пользователя');return;}
  document.getElementById('del-usr-name').textContent=u.name;
  pendingDelUsrId=id;
  closeM('m-edituser');
  openM('m-deluser');
}

function deleteUser(){
  USERS_DB=loadData('mis_users',[]);
  const u=USERS_DB.find(x=>x.id===pendingDelUsrId);
  if(u){
    delete LOGIN_USERS[u.login];
    saveData('mis_login_users',LOGIN_USERS);
    USERS_DB=USERS_DB.filter(x=>x.id!==pendingDelUsrId);
    saveData('mis_users',USERS_DB);
  }
  closeM('m-deluser');
  renderUsers();
  toast('🗑 Пользователь удалён');
}

// ═══════════════════════════════════════════
// TABS / MODALS / TOAST
// ═══════════════════════════════════════════
function swTab(el,tid){
  el.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  ['te-exam','te-hist','te-plan','te-labs'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.style.display='none';
  });
  const t=document.getElementById(tid);if(t)t.style.display='block';
}
function openM(id){const m=document.getElementById(id);if(m)m.classList.add('open');}
function closeM(id){const m=document.getElementById(id);if(m)m.classList.remove('open');}
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

function toast(msg){
  const t=document.createElement('div');t.className='toast';
  t.innerHTML=msg;document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// ═══════════════════════════════════════════
// AI
// ═══════════════════════════════════════════
const SYS=`Ты — медицинский AI-ассистент клиники «АльтернативА». Профиль: ортопедия, регенеративная медицина (PRP, ГК, озонотерапия), УЗД ОДА, подология, реабилитация. Только русский язык. МКБ-10. Структура: Жалобы→Анамнез→Осмотр→Заключение→Рекомендации. Не ставь диагнозы самостоятельно. Упоминай противопоказания.`;
const convs={dash:[],emr:[],uzi:[],rehab:[],tpl:[]};

function getApiKey(){return localStorage.getItem('mis_api_key')||'';}
function saveApiKey(k){if(k){
  // Strip any non-key characters (spaces, slashes, URL parts, newlines)
  const clean=k.replace(/[\s\/\\,;|]+/g,'').trim();
  if(!clean)return;
  localStorage.setItem('mis_api_key',clean);
  const bar=document.getElementById('api-key-bar');if(bar)bar.classList.add('hidden');}}
function toggleApiBar(){const b=document.getElementById('api-key-bar');if(!b)return;
  b.classList.toggle('hidden');
  const inp=document.getElementById('api-key-inp');
  if(inp)inp.value=getApiKey();}

async function claude(msgs,extra=''){
  const key=getApiKey();
  if(!key){
    toast('⚠️ Укажите DeepSeek API-ключ (кнопка 🤖 вверху)');
    (document.getElementById('api-key-bar')||{}).classList.remove('hidden');
    return 'Для работы AI введите DeepSeek API-ключ (кнопка 🤖 в шапке).';
  }
  // Build messages with system prompt for DeepSeek (OpenAI-compatible format)
  const allMsgs = extra
    ? [{role:'system',content:SYS+'\n\n'+extra},...msgs]
    : [{role:'system',content:SYS},...msgs];
  try{
    const r=await fetch('https://api.deepseek.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'deepseek-chat',max_tokens:2000,messages:allMsgs})
    });
    if(!r.ok){const e=await r.json().catch(()=>({}));return 'Ошибка API: '+((e.error&&e.error.message)||r.status);}
    const d=await r.json();
    return ((d.choices||[])[0]&&d.choices[0].message&&d.choices[0].message.content)||'Нет ответа';
  }catch(e){return 'Ошибка подключения: '+e.message;}
}
function addMsg(cid,role,txt){
  const c=document.getElementById('m-'+cid);if(!c)return;
  const d=document.createElement('div');
  d.className='am '+(role==='user'?'usr':'bot');
  d.innerHTML=`<div class="amr">${role==='user'?'👨‍⚕️ Врач':'🤖 AI'}</div>${txt.replace(/\n/g,'<br>')}`;
  c.appendChild(d);c.scrollTop=c.scrollHeight;
}
function addLD(cid){
  const c=document.getElementById('m-'+cid);if(!c)return;
  const d=document.createElement('div');d.className='am bot';d.id='ld-'+cid;
  d.innerHTML='<div class="aild"><span></span><span></span><span></span></div>';
  c.appendChild(d);c.scrollTop=c.scrollHeight;
}
function rmLD(cid){const e=document.getElementById('ld-'+cid);if(e)e.remove();}
async function aiSend(cid){
  const inp=document.getElementById('i-'+cid);if(!inp)return;
  const q=inp.value.trim();if(!q)return;
  inp.value='';
  convs[cid]=convs[cid]||[];
  convs[cid].push({role:'user',content:q});
  addMsg(cid,'user',q);addLD(cid);
  const txt=await claude(convs[cid]);
  rmLD(cid);
  convs[cid].push({role:'assistant',content:txt});
  addMsg(cid,'bot',txt);
}
async function aiProto(){
  const q='Составь протокол осмотра для Смирновой Е.А. (54 г., M17.1 — гонартроз правого КС 2 ст., ВАШ 6/10). Включи план с PRP-терапией.';
  convs.emr.push({role:'user',content:q});addMsg('emr','user','🤖 Генерация...');addLD('emr');
  const txt=await claude(convs.emr);rmLD('emr');
  convs.emr.push({role:'assistant',content:txt});addMsg('emr','bot',txt);
}
async function aiUZI(){
  const q='Составь УЗИ-заключение: колено правое. Щель 3.2 мм медиально, хрящ 1.8 мм, синовия 3.4 мм, выпот 4 мл.';
  convs.uzi.push({role:'user',content:q});addLD('uzi');
  const txt=await claude(convs.uzi);rmLD('uzi');
  const el=document.getElementById('uzi-c');if(el)el.value=txt;
  convs.uzi.push({role:'assistant',content:txt});addMsg('uzi','bot',txt);
}
async function aiRehab(){
  const q='Составь план реабилитации 3 этапа для Смирновой Е.А. (54 г., M17.1, ВАШ 6/10, после PRP).';
  convs.rehab.push({role:'user',content:q});addMsg('rehab','user','🤖 AI-план...');addLD('rehab');
  const txt=await claude(convs.rehab);rmLD('rehab');
  convs.rehab.push({role:'assistant',content:txt});addMsg('rehab','bot',txt);
  const r=document.getElementById('rehab-r');if(r)r.innerHTML=`<div class="al a-mi" style="margin-top:9px;">✅ AI-план готов</div>`;
}
async function crmAI(who){
  const msgs={
    zakh:'Захарова пишет: хочет на PRP, болит колено. Напиши ответ администратора.',
    grish:'Гришин: боль 4 дня после PRP. Напиши ответ с объяснением и рекомендацией.'
  };
  const rz=document.getElementById('crm-rz');const rt=document.getElementById('crm-rt');
  rz.style.display='block';rt.textContent='🔄 Формируется...';
  const txt=await claude([{role:'user',content:msgs[who]}],'Ты администратор клиники. Пиши по-русски вежливо.');
  rt.innerHTML=txt.replace(/\n/g,'<br>');
}

// ═══════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════
const TPLS={
  ortho:{title:'Первичный осмотр ортопеда',desc:'Полный протокол',body:`ПРОТОКОЛ ПЕРВИЧНОГО ОСМОТРА ОРТОПЕДА\n\nДата: ___\nФИО: ___\nДата рождения: ___ Возраст: ___\nПол: М / Ж\n\nЖАЛОБЫ:\nБоль в области: ___\nХарактер: ноющая / острая / жгучая\nВАШ 0-10: ___\nУсиливается при: ходьбе / нагрузке / в покое\nУтренняя скованность: есть / нет ___ мин\n\nАНАМНЕЗ:\nДавность: ___\nПредыдущее лечение: ___\nСопутствующие заболевания: ___\nАллергоанамнез: ___\nПрепараты: ___\n\nОСМОТР:\nИМТ: ___\nОсь конечности: не нарушена / вальгус / варус\nОтёк: нет / + / ++ / +++\nСгибание: ___ ° Разгибание: ___ °\nКрепитация: нет / есть\n\nСПЕЦ. ТЕСТЫ:\n— Мак-Мюррей: ___\n— Лахман: ___\n— Апли: ___\n\nДАННЫЕ ОБСЛЕДОВАНИЙ:\nМРТ / Рентген: ___\nУЗИ: ___\n\nДИАГНОЗ (МКБ-10): ___\n\nПЛАН ЛЕЧЕНИЯ:\n☐ PRP: ___ инъекций\n☐ УЗИ-контроль: ___\n☐ ЛФК: ___\n☐ Контрольный осмотр через: ___\n\nПодпись врача: ___`},
  prp:{title:'Протокол PRP-терапии',desc:'Забор, центрифугирование, введение',body:`ПРОТОКОЛ PRP-ТЕРАПИИ\n\nДата: ___\nПациент: ___\nВрач: ___\nИнъекция: ___ из ___\n\nПРОТИВОПОКАЗАНИЯ:\n☐ Онкология — нет\n☐ Тромбоцитопения — нет\n☐ Инфекция — нет\n☐ НПВС — отменены\n☐ Беременность — нет\n\nЗАБОР КРОВИ:\nОбъём: ___ мл\nПробирки: ___ шт.\nЦентрифуга: ___ об/мин, ___ мин\nОбъём PRP: ___ мл\nТромбоциты: ___ × 10⁹/л\n\nПРОЦЕДУРА:\nЗона: ___\nАнестезия: нет / местная\nИгла: ___ G\nКонтроль: УЗИ / клинически\nВведено PRP: ___ мл\n\nПЕРЕНОСИМОСТЬ: хорошая\n\nРЕКОМЕНДАЦИИ:\n— НПВС не принимать ___ дней\n— Тепло исключить 48 ч\n— Следующая инъекция через: ___\n\nПодпись врача: ___ Подпись пациента: ___`},
  uzi_knee:{title:'УЗИ коленного сустава',desc:'Щель, хрящ, мениски',body:`ПРОТОКОЛ УЗИ — КОЛЕННЫЙ СУСТАВ\n\nДата: ___ Пациент: ___\nСторона: правая / левая\n\nСУСТАВНАЯ ЩЕЛЬ:\nМедиально: ___ мм (норма ≥4)\nЛатерально: ___ мм\n\nСУСТАВНОЙ ХРЯЩ:\nТолщина: ___ мм (норма 2-4)\nЭхогенность: норма / снижена\nКонтур: ровный / неровный\n\nСИНОВИАЛЬНАЯ ОБОЛОЧКА:\nТолщина: ___ мм (норма до 2)\nУтолщена: нет / умеренно / значительно\n\nВЫПОТ:\n___ мл / не определяется\n\nМЕНИСКИ:\nМедиальный: норма / изменён / экструзия ___ мм\nЛатеральный: норма / изменён\n\nКОСТНЫЕ СТРУКТУРЫ:\nОстеофиты: нет / есть\n\nЗАКЛЮЧЕНИЕ:\nЭхо-признаки ___ артроза ___ ст.\n\nВрач УЗД: ___`},
  uzi_shoulder:{title:'УЗИ плечевого сустава',desc:'Ротаторная манжета, бурса',body:`ПРОТОКОЛ УЗИ — ПЛЕЧЕВОЙ СУСТАВ\n\nДата: ___ Пациент: ___\nСторона: правая / левая\n\nРОТАТОРНАЯ МАНЖЕТА:\nНадостное: норма / тендинопатия / разрыв\nПодостное: норма / изменено\nПодлопаточное: норма / изменено\n\nСУБАКРОМИАЛЬНАЯ БУРСА:\n___ мм / не расширена\n\nСУХОЖИЛИЕ БГБ:\nНорма / утолщено / вывих\n\nAC-СУСТАВ:\nЩель: ___ мм (норма 3-5)\n\nЗАКЛЮЧЕНИЕ:\nЭхо-признаки ___\n\nВрач УЗД: ___`},
  uzi_hip:{title:'УЗИ тазобедренного сустава',desc:'Хрящ, выпот, периартикулярно',body:`ПРОТОКОЛ УЗИ — ТАЗОБЕДРЕННЫЙ СУСТАВ\n\nДата: ___ Пациент: ___\nСторона: правая / левая\n\nСУСТАВНАЯ ЩЕЛЬ:\n___ мм (норма ≥3)\n\nСУСТАВНОЙ ХРЯЩ:\nГоловка бедра: ___ мм\nНорма / дефект\n\nВЫПОТ:\n___ мл / не определяется\n\nСУХОЖИЛИЯ:\nПодвздошно-поясничное: норма / утолщено\nСр. ягодичная: норма / тендинопатия\n\nОСТЕОФИТЫ: нет / есть\n\nЗАКЛЮЧЕНИЕ:\nЭхо-признаки коксартроза ___ ст.\n\nВрач УЗД: ___`},
  pod:{title:'Подологический осмотр',desc:'Кожа, ногти, деформации',body:`ПРОТОКОЛ ПОДОЛОГИИ\n\nДата: ___ Пациент: ___\n\nКОЖА СТОП:\nТрещины: нет / есть ___\nМозоли: нет / есть ___\nГиперкератоз: нет / есть ___\nГрибок: нет / есть ___\n\nНОГТЕВЫЕ ПЛАСТИНЫ:\nП1: норма / онихомикоз / вросший\nП2-5: ___\nЛ1: норма / онихомикоз / вросший\nЛ2-5: ___\n\nДЕФОРМАЦИИ:\nHallux valgus: нет / I / II / III\nПлоскостопие продольное: нет / I / II\nПлоскостопие поперечное: нет / I / II\nПяточная шпора: нет / есть\n\nМАНИПУЛЯЦИИ:\n☐ Обработка гиперкератоза\n☐ Обработка ногтей\n☐ Удаление мозолей\n☐ Антисептик\n\nСледующий визит через: ___\nПодпись: ___`},
  rehab:{title:'План реабилитации',desc:'3 этапа с упражнениями',body:`ИНДИВИДУАЛЬНЫЙ ПЛАН РЕАБИЛИТАЦИИ\n\nПациент: ___ Диагноз: ___\n\nИСХОДНЫЙ СТАТУС:\nВАШ: ___ / 10\nОбъём движений: ___\nОграничения: ___\n\nЭТАП 1 — РАННИЙ (1-2 нед)\nЗадачи: боль, отёк, профилактика атрофии\n1. ___ × ___ подходов\n2. ___ × ___ подходов\nФизиотерапия: ___\nОграничения: ___\n\nЭТАП 2 — ВОССТАНОВИТЕЛЬНЫЙ (3-8 нед)\nЗадачи: объём движений, укрепление\n1. ___ × ___ подходов\n2. ___ × ___ подходов\n\nЭТАП 3 — ФУНКЦИОНАЛЬНЫЙ (2-4 мес)\nВозврат к активности\nКритерии: ВАШ ≤ ___, ROM ≥ __%\n\nПодпись реабилитолога: ___`},
  epicrisis:{title:'Выписной эпикриз',desc:'Итог лечения',body:`ВЫПИСНОЙ ЭПИКРИЗ\n\nПациент: ___\nПериод лечения: ___ — ___\nДиагноз (МКБ-10): ___\n\nПРОВЕДЁННОЕ ЛЕЧЕНИЕ:\n— PRP: ___ инъекции, даты: ___\n— УЗИ-контроль: ___\n— ЛФК: ___\n\nДИНАМИКА:\nВАШ до: ___ / 10 → после: ___ / 10\nОбъём движений: ___\nРезультат: ___\n\nРЕКОМЕНДАЦИИ:\n— Контрольный осмотр: ___\n— Физическая активность: ___\n— Препараты: ___\n\nПодпись: ___ Печать: ___`},
  consent:{title:'Информированное согласие PRP',desc:'Правовой документ',body:`ИНФОРМИРОВАННОЕ СОГЛАСИЕ НА PRP-ТЕРАПИЮ\n\nЯ, ___ (ФИО)\nДата рождения: ___\n\nМне разъяснено:\n— PRP — плазма из собственной крови с факторами роста\n— Введение в поражённый сустав под контролем УЗИ\n\nВозможные риски:\n— Боль 24-72 часа — норма\n— Временный отёк\n— Редко: инфекция, аллергия\n\nПодтверждаю отсутствие противопоказаний:\n☐ Онкология — нет\n☐ Тромбоцитопения — нет\n☐ Активная инфекция — нет\n☐ Беременность — нет\n☐ Антикоагулянты — нет / отменены\n\nДАЮ СОГЛАСИЕ на проведение PRP-терапии.\n\nПодпись пациента: ___ Дата: ___\nВрач: ___ Печать: ___`},
  memo:{title:'Памятка пациенту (PRP)',desc:'WhatsApp-рассылка',body:`Уважаемый(ая) [Имя]!\n\nНапоминаем о PRP-терапии [дата, время].\n\nКАК ПОДГОТОВИТЬСЯ:\n✓ За 3 дня — отменить НПВС\n  (аспирин, ибупрофен, диклофенак)\n✓ За 2 дня — без алкоголя\n✓ В день процедуры:\n  — лёгкий завтрак\n  — удобная одежда\n  — взять анализы крови\n\nПОСЛЕ ПРОЦЕДУРЫ:\n⚠ Боль 1-3 дня — норма\n⚠ Без НПВС ещё [N] дней\n⚠ Без тепла 48 часов\n⚠ Ограничить нагрузку [N] дней\n\nЕсли боль нарастает — звоните: [телефон]\n\nКлиника «АльтернативА» 🏥`}
};

let curTpl='ortho';
function loadTpl(el,key){
  document.querySelectorAll('.tplcard').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');curTpl=key;
  const t=TPLS[key];
  document.getElementById('tpl-title').textContent=t.title;
  document.getElementById('tpl-desc').textContent=t.desc;
  document.getElementById('tpl-body').value=t.body;
}
async function aiTplFill(){
  const t=TPLS[curTpl];
  const q=`Заполни шаблон "${t.title}" для Смирновой Е.А. (54 г., M17.1, ВАШ 6/10):\n\n${t.body}`;
  convs.tpl.push({role:'user',content:q});
  addMsg('tpl','user',`AI-заполнение: ${t.title}`);addLD('tpl');
  const txt=await claude(convs.tpl);rmLD('tpl');
  convs.tpl.push({role:'assistant',content:txt});
  addMsg('tpl','bot',txt);
  document.getElementById('tpl-body').value=txt;
}
function copyTpl(){
  navigator.clipboard.writeText(document.getElementById('tpl-body').value).then(()=>toast('📋 Скопировано'));
}
async function genDoc(){
  const tp=document.getElementById('doc-type').value;
  const ex=document.getElementById('doc-extra').value;
  const out=document.getElementById('doc-out');
  const txt=document.getElementById('doc-txt');
  out.style.display='block';txt.textContent='🔄 AI формирует документ...';
  const res=await claude([{role:'user',content:`Сформируй: "${tp}" для Смирновой Е.А. (54 г., M17.1). ${ex}`}]);
  txt.textContent=res;
}


// ═══════════════════════════════════════════
// SERVICES CATALOG
// ═══════════════════════════════════════════
const SVCS_DEFAULT = [
  {id:'s1',code:'В01.050.001',name:'Первичный приём травматолога-ортопеда',cat:'Консультации',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s2',code:'В01.050.002',name:'Повторный приём травматолога-ортопеда',cat:'Консультации',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s3',code:'В01.047.001',name:'Первичный приём терапевта',cat:'Консультации',doc:'Жильцова Н.М.',dur:30,active:true},
  {id:'s4',code:'В01.047.002',name:'Повторный приём терапевта',cat:'Консультации',doc:'Жильцова Н.М.',dur:30,active:true},
  {id:'s5',code:'В01.040.001',name:'Первичный приём ревматолога',cat:'Консультации',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s6',code:'В01.040.002',name:'Повторный приём ревматолога',cat:'Консультации',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s7',code:'А11.02.002',name:'Лечебная медикаментозная блокада (ЛИТ)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s8',code:'А16.04.051',name:'Введение Гиалуформ 1,8% (синовиальная жидкость)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s9',code:'А11.02.002',name:'Введение смеси Бойко внутрисуставно',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s10',code:'А11.02.002',name:'Введение смеси Бойко околосуставно',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s11',code:'А16.04.051',name:'Введение Гиалрипайер-10 Хондрорепарант 5мл',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s12',code:'А16.04.051',name:'Введение коллагена Композитрон 5',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s13',code:'А11.04.004',name:'PRP-терапия внутрисуставно',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s14',code:'А11.04.006',name:'PRP-терапия околосуставно',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s15',code:'А16.04.051',name:'SVF-терапия 1 сустав (2 аутоплазмы)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:60,active:true},
  {id:'s16',code:'А16.04.051',name:'SVF-терапия фасеточный сустав (2 сустава)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:60,active:true},
  {id:'s17',code:'А16.04.051',name:'SVF-терапия 1 сустав',cat:'Процедуры',doc:'Шкарпов А.А.',dur:60,active:true},
  {id:'s18',code:'А05.10.006',name:'Пункция синовиальной сумки',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s19',code:'А11.04.005',name:'Пункция кисты Бэйкера (УЗИ-навигация)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s20',code:'А11.24.001',name:'Периневральная блокада (Суперблокада)',cat:'Процедуры',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s21',code:'А04.01.001',name:'УЗИ мягких тканей (1 зона)',cat:'Диагностика',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s22',code:'А04.04.001',name:'УЗИ суставов (2 симметричных)',cat:'Диагностика',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s23',code:'А04.04.001',name:'УЗИ суставов (1 сустав)',cat:'Диагностика',doc:'Шкарпов А.А.',dur:30,active:true},
  {id:'s24',code:'17.1',name:'Общий массаж медицинский',cat:'Массаж',doc:'Массажист В.П.',dur:60,active:true},
  {id:'s25',code:'17.2',name:'Массаж спины, шеи, поясницы',cat:'Массаж',doc:'Массажист В.П.',dur:40,active:true},
  {id:'s26',code:'17.3',name:'Массаж шейно-воротниковой зоны',cat:'Массаж',doc:'Массажист В.П.',dur:15,active:true},
  {id:'s27',code:'17.4',name:'Массаж поясничной области',cat:'Массаж',doc:'Массажист В.П.',dur:15,active:true},
  {id:'s28',code:'17.5',name:'Массаж нижних конечностей (1 шт.)',cat:'Массаж',doc:'Массажист В.П.',dur:15,active:true},
  {id:'s29',code:'17.6',name:'Массаж верхних конечностей (1 шт.)',cat:'Массаж',doc:'Массажист В.П.',dur:20,active:true},
  {id:'s30',code:'17.7',name:'Массаж спины и нижних конечностей',cat:'Массаж',doc:'Массажист В.П.',dur:60,active:true},
  {id:'s31',code:'17.8',name:'Массаж спины',cat:'Массаж',doc:'Массажист В.П.',dur:30,active:true},
  {id:'s32',code:'17.9',name:'Массаж шейно-грудного отдела',cat:'Массаж',doc:'Массажист В.П.',dur:20,active:true},
  {id:'s33',code:'17.10',name:'Антицеллюлитный массаж',cat:'Массаж',doc:'Массажист В.П.',dur:60,active:true},
  {id:'s34',code:'17.11',name:'Массаж стоп',cat:'Массаж',doc:'Массажист В.П.',dur:20,active:true},
  {id:'s35',code:'17.12',name:'Массаж 1 стопы и голени',cat:'Массаж',doc:'Массажист В.П.',dur:15,active:true},
  {id:'s36',code:'17.13',name:'Массаж лица',cat:'Массаж',doc:'Массажист В.П.',dur:20,active:true},
  {id:'s37',code:'17.14',name:'Массаж волосистой части головы и шеи',cat:'Массаж',doc:'Массажист В.П.',dur:20,active:true},
  {id:'s38',code:'—',name:'Миофасциальный массаж',cat:'Массаж',doc:'Массажист В.П.',dur:30,active:true},
  {id:'s39',code:'—',name:'Оздоровительный массаж',cat:'Массаж',doc:'Массажист В.П.',dur:40,active:true},
  {id:'s40',code:'—',name:'Расслабляющий массаж',cat:'Массаж',doc:'Массажист В.П.',dur:30,active:true},
  {id:'s41',code:'—',name:'Спортивный массаж',cat:'Массаж',doc:'Массажист В.П.',dur:30,active:true},
  {id:'s42',code:'A11.12.003',name:'В/в капельно (без препарата)',cat:'Процедуры',doc:'',dur:60,active:true},
  {id:'s43',code:'A11.12.003',name:'В/в капельно (1 препарат)',cat:'Процедуры',doc:'',dur:60,active:true},
  {id:'s44',code:'A11.12.003',name:'В/в капельно (2 препарата)',cat:'Процедуры',doc:'',dur:60,active:true},
  {id:'s45',code:'A11.12.003',name:'В/в капельно (3 препарата)',cat:'Процедуры',doc:'',dur:60,active:true},
  {id:'s46',code:'A11.12.003',name:'В/в струйно (без препарата)',cat:'Процедуры',doc:'',dur:30,active:true},
  {id:'s47',code:'A11.12.003',name:'В/в струйно (1 препарат)',cat:'Процедуры',doc:'',dur:30,active:true},
  {id:'s48',code:'A11.12.003',name:'В/м введение (без препарата)',cat:'Процедуры',doc:'',dur:10,active:true}
];

let SVCS_DB = loadData('mis_svcs', null);
if(!SVCS_DB){ SVCS_DB = SVCS_DEFAULT; saveData('mis_svcs', SVCS_DB); }

let pendingDelSvcId = null;

function renderSvcs(){
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  const q = ((document.getElementById('svc-search')||{}).value||'').toLowerCase();
  const list = SVCS_DB.filter(s => !q || (s.name+' '+s.code+' '+s.cat).toLowerCase().includes(q));
  const tb = document.getElementById('svc-tbody');
  const em = document.getElementById('svc-empty');
  const cnt = document.getElementById('svc-count');
  if(!tb) return;
  cnt.textContent = SVCS_DB.length + ' услуг в каталоге';
  if(!list.length){ tb.innerHTML=''; em.style.display='block'; return; }
  em.style.display = 'none';
  const catColors = {
    'Консультации':'#4a6cf7','Процедуры':'#38bdf8','Диагностика':'#a78bfa',
    'Массаж':'#fb923c','Физиотерапия':'#fbbf24','Хирургия':'#f87171'
  };
  tb.innerHTML = list.map(s => {
    const cc = catColors[s.cat]||'#64748b';
    return '<tr>' +
      '<td><span style="font-size:10px;background:rgba(74,108,247,.08);color:#64748b;padding:2px 7px;border-radius:5px;font-family:monospace;">'+(s.code||'—')+'</span></td>' +
      '<td style="font-weight:600;max-width:260px;">'+(s.name||'')+'</td>' +
      '<td><span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;background:'+cc+'22;color:'+cc+';">'+(s.cat||'—')+'</span></td>' +
      '<td style="font-size:12px;color:#475569;">'+(s.doc||'—')+'</td>' +
      '<td style="text-align:center;color:#64748b;font-family:monospace;">'+(s.dur||'—')+' мин</td>' +
      '<td>'+(s.active !== false ? '<span class="b b-mi">Активна</span>' : '<span class="b b-re">Откл.</span>')+'</td>' +
      '<td style="text-align:center;white-space:nowrap;">' +
        '<button class="btn bg xs" style="margin-right:3px;" onclick="editSvcUI(\'"+s.id+"\')">✏️</button>' +
        '<button class="btn bg xs" onclick="toggleSvc(\'"+s.id+"\')">'+(s.active!==false?'🚫':'✅')+'</button>' +
      '</td></tr>';
  }).join('');
}

function saveSvc(){
  const name = document.getElementById('sv-name').value.trim();
  if(!name){ toast('⚠️ Укажите название'); return; }
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  SVCS_DB.push({
    id: 'svc_'+Date.now(),
    name,
    code: document.getElementById('sv-code').value.trim(),
    cat: document.getElementById('sv-cat').value,
    doc: document.getElementById('sv-doc').value.trim(),
    dur: parseInt(document.getElementById('sv-dur').value)||30,
    active: true
  });
  saveData('mis_svcs', SVCS_DB);
  closeM('m-addsvc');
  document.getElementById('sv-name').value='';
  document.getElementById('sv-code').value='';
  document.getElementById('sv-doc').value='';
  document.getElementById('sv-dur').value='30';
  renderSvcs();
  toast('✅ Услуга добавлена');
}

function editSvcUI(id){
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  const s = SVCS_DB.find(x=>x.id===id); if(!s) return;
  document.getElementById('sv-edit-id').value = id;
  document.getElementById('sve-name').value = s.name||'';
  document.getElementById('sve-code').value = s.code||'';
  document.getElementById('sve-cat').value = s.cat||'Процедуры';
  document.getElementById('sve-doc').value = s.doc||'';
  document.getElementById('sve-dur').value = s.dur||30;
  openM('m-editsvc');
}

function updateSvc(){
  const id = document.getElementById('sv-edit-id').value;
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  const idx = SVCS_DB.findIndex(x=>x.id===id); if(idx<0) return;
  const name = document.getElementById('sve-name').value.trim();
  if(!name){ toast('⚠️ Укажите название'); return; }
  SVCS_DB[idx] = Object.assign({},SVCS_DB[idx],{name,
    code: document.getElementById('sve-code').value.trim(),
    cat: document.getElementById('sve-cat').value,
    doc: document.getElementById('sve-doc').value.trim(),
    dur: parseInt(document.getElementById('sve-dur').value)||30
  });
  saveData('mis_svcs', SVCS_DB);
  closeM('m-editsvc'); renderSvcs();
  toast('✅ Обновлено');
}

function toggleSvc(id){
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  const s = SVCS_DB.find(x=>x.id===id); if(!s) return;
  s.active = s.active === false ? true : false;
  saveData('mis_svcs', SVCS_DB); renderSvcs();
}

function confirmDelSvc(){
  const id = document.getElementById('sv-edit-id').value;
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  const s = SVCS_DB.find(x=>x.id===id); if(!s) return;
  document.getElementById('del-svc-name').textContent = s.name;
  pendingDelSvcId = id;
  closeM('m-editsvc'); openM('m-delsvc');
}

function deleteSvc(){
  SVCS_DB = loadData('mis_svcs', SVCS_DEFAULT);
  SVCS_DB = SVCS_DB.filter(x=>x.id!==pendingDelSvcId);
  saveData('mis_svcs', SVCS_DB);
  closeM('m-delsvc'); renderSvcs();
  toast('🗑 Услуга удалена');
}

function resetSvcs(){
  if(!confirm('Сбросить все услуги к исходным?')) return;
  saveData('mis_svcs', SVCS_DEFAULT);
  SVCS_DB = [...SVCS_DEFAULT];
  renderSvcs(); toast('↺ Услуги сброшены к исходным');
}

// ═══════════════════════════════════════════
// DASHBOARD LIVE DATA
// ═══════════════════════════════════════════
function updateDash(){
  const pts = loadData('mis_patients',[]);
  const stock = loadData('mis_stock',[]);
  const staff = loadData('mis_users',[]);
  const el = id => document.getElementById(id);
  if(el('ds-pts')) el('ds-pts').textContent = pts.length;
  if(el('ds-staff')) el('ds-staff').textContent = 3 + staff.length;
  if(el('ds-stock')) el('ds-stock').textContent = stock.length;

  // Recent patients
  
  // Today appointments count
  const isoToday2 = new Date().toISOString().slice(0,10);
  const todayApts = loadData('mis_appts',[]).filter(a=>a.date===isoToday2&&a.status!=='cancel');
  if(el('ds-today')) el('ds-today').textContent = todayApts.length;

  const rp = el('dash-recent-pts');
  if(rp){
    if(!pts.length){ rp.innerHTML='<div style="text-align:center;padding:20px;color:#64748b;font-size:12px;opacity:.6;">Нет пациентов</div>'; }
    else {
      rp.innerHTML = pts.slice(0,5).map(p=>{
        const full = p.fam+' '+p.nam+(p.pat?' '+p.pat:'');
        const ini2 = full.trim().split(' ').slice(0,2).map(w=>w[0]).join('');
        return '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid rgba(74,108,247,.05);">' +
          '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#059669,#4a6cf7);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">'+ini2+'</div>' +
          '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:#0f172a;">'+full+'</div>' +
          '<div style="font-size:10px;color:#64748b;">'+(p.diag||'Диагноз не указан')+'</div></div>' +
          '<span style="font-size:10px;color:#64748b;">'+p.created+'</span></div>';
      }).join('');
    }
  }
}


// ═══════════════════════════════════════════
// PLANS (Планы лечения)
// ═══════════════════════════════════════════
function renderPlans(){
  const plans=loadData('mis_plans',[]);
  const q=((document.getElementById('pl-search')||{}).value||'').toLowerCase();
  const f=((document.getElementById('pl-filter')||{}).value||'');
  const list=plans.filter(p=>{
    if(f&&p.status!==f)return false;
    return !q||(p.patient+p.diag).toLowerCase().includes(q);
  });
  const el=document.getElementById('pl-list');
  const em=document.getElementById('pl-empty');
  if(!el)return;
  const active=plans.filter(p=>p.status==='Активный'||p.status==='В процессе');
  const done=plans.filter(p=>p.status==='Завершён');
  const prog=plans.filter(p=>p.status==='В процессе');
  ['pl-total','pl-done','pl-prog'].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=[active.length,done.length,prog.length][i];});
  if(!list.length){el.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const sColors={Активный:'#4a6cf7',Завершён:'#10b981','В процессе':'#f59e0b'};
  el.innerHTML=list.map(p=>{
    const pct=p.sessions_done&&p.sessions_total?Math.round(p.sessions_done/p.sessions_total*100):0;
    const sc=sColors[p.status]||'#64748b';
    return `<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div><div style="font-weight:700;font-size:14px;">${p.patient||'—'}</div>
        <div style="font-size:11px;color:var(--text3);">${p.diag||'—'}</div></div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="b" style="background:${sc}18;color:${sc};border-color:${sc}40;">${p.status}</span>
          <button class="btn bg xs" onclick="editPlan('${p.id}')">✏️</button>
          <button class="btn bd xs" onclick="deletePlan('${p.id}')">🗑</button>
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--text3);margin-bottom:8px;">
        <span>📅 ${p.start||'—'} — ${p.end||'—'}</span>
        <span>💰 ${p.cost?p.cost.toLocaleString('ru-RU')+' ₽':'—'}</span>
        <span>📋 ${(p.svcs||[]).join(', ')||'—'}</span>
      </div>
      ${p.sessions_total?`<div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:3px;"><span>Прогресс</span><span>${p.sessions_done||0} / ${p.sessions_total} сеансов</span></div>
        <div style="height:5px;background:#e2e8f0;border-radius:5px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#4a6cf7,#818cf8);border-radius:5px;"></div></div>
      </div>`:''}
      ${p.note?`<div style="font-size:11px;color:#475569;margin-top:6px;">📝 ${p.note}</div>`:''}
    </div>`;
  }).join('');
}

function advancePlan(id){editPlan(id);}
function savePlan(){
  const pts=loadData('mis_patients',[]);
  const patId=(document.getElementById('pl-patient')||{}).value;
  const pt=pts.find(x=>x.id===patId);
  const svcs=[...document.querySelectorAll('#pl-svcs-check input:checked')].map(x=>x.value);
  const plans=loadData('mis_plans',[]);
  plans.push({id:'pl_'+Date.now(),
    patient:pt?(pt.fam+(pt.nam?' '+pt.nam:'')):'—',patient_id:patId,
    diag:document.getElementById('pl-diag').value,
    start:document.getElementById('pl-start').value,
    end:document.getElementById('pl-end').value,
    svcs,sessions_total:svcs.length*3,sessions_done:0,
    cost:parseFloat(document.getElementById('pl-cost').value)||0,
    note:document.getElementById('pl-note').value,
    status:'Активный'});
  saveData('mis_plans',plans);
  closeM('m-addplan');renderPlans();toast('✅ План лечения создан');
}
function editPlan(id){
  const plans=loadData('mis_plans',[]);
  const p=plans.find(x=>x.id===id);if(!p)return;
  const ns=prompt('Статус плана (Активный / В процессе / Завершён):',p.status);
  if(ns){p.status=ns;saveData('mis_plans',plans);renderPlans();toast('✅ Статус обновлён');}
}
function deletePlan(id){
  if(!confirm('Удалить план лечения?'))return;
  let plans=loadData('mis_plans',[]);
  plans=plans.filter(x=>x.id!==id);
  saveData('mis_plans',plans);renderPlans();toast('🗑 Удалено');
}
function populatePlanPatients(){
  const pts=loadData('mis_patients',[]);
  ['pl-patient','pay-patient','bon-patient'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam}${p.nam?' '+p.nam:''}</option>`).join('');
  });
  const svcs=loadData('mis_svcs',[]);
  const ps=document.getElementById('pay-svc');
  if(ps)ps.innerHTML=svcs.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
}

// ═══════════════════════════════════════════
// KASSA (Касса)
// ═══════════════════════════════════════════
function renderKassa(){
  const pays=loadData('mis_payments',[]);
  const today=new Date().toLocaleDateString('ru-RU');
  const todayPays=pays.filter(p=>p.date===today);
  const monthPays=pays.filter(p=>(p.date||'').includes('.2026'));
  const daySum=todayPays.reduce((a,p)=>a+p.sum,0);
  const monthSum=monthPays.reduce((a,p)=>a+p.sum,0);
  const avgCheck=todayPays.length?Math.round(daySum/todayPays.length):0;
  ['ks-day','ks-month','ks-cnt','ks-avg'].forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el)el.textContent=[[daySum.toLocaleString('ru-RU')+' ₽'],[monthSum.toLocaleString('ru-RU')+' ₽'],[todayPays.length],[avgCheck.toLocaleString('ru-RU')+' ₽']][i][0];
  });
  const dateEl=document.getElementById('kassa-date');
  if(dateEl)dateEl.textContent='Сегодня: '+today;
  const tb=document.getElementById('kassa-tbody');
  if(tb){
    if(!todayPays.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3);">Операций нет</td></tr>';}
    else{tb.innerHTML=todayPays.map(p=>`<tr>
      <td>${p.time||'—'}</td><td>${p.patient||'—'}</td><td style="max-width:180px;">${p.svc||'—'}</td>
      <td style="font-weight:700;color:var(--mint);">${p.sum.toLocaleString('ru-RU')} ₽</td>
      <td><span class="b b-gr" style="font-size:10px;">${p.method||'—'}</span></td>
      <td><button class="btn bd xs" onclick="deletePayment('${p.id}')">🗑</button></td>
    </tr>`).join('');}
  }
  // Payment methods
  const methods={Наличные:0,Карта:0,Безнал:0};
  monthPays.forEach(p=>{if(methods[p.method]!==undefined)methods[p.method]+=p.sum;});
  const maxM=Math.max(...Object.values(methods),1);
  [['pm-cash','Наличные'],['pm-card','Карта'],['pm-bank','Безнал']].forEach(([pid,key])=>{
    const fl=document.getElementById(pid);const vl=document.getElementById(pid+'-v');
    if(fl)fl.style.width=Math.round(methods[key]/maxM*100)+'%';
    if(vl)vl.textContent=methods[key].toLocaleString('ru-RU')+' ₽';
  });
}
function savePayment(){
  const pts=loadData('mis_patients',[]);
  const patId=(document.getElementById('pay-patient')||{}).value;
  const pt=pts.find(x=>x.id===patId);
  const pays=loadData('mis_payments',[]);
  const now=new Date();
  pays.push({id:'pay_'+Date.now(),
    patient:pt?(pt.fam+(pt.nam?' '+pt.nam:'')):'—',patient_id:patId,
    svc:(document.getElementById('pay-svc')||{}).value||'—',
    sum:parseFloat((document.getElementById('pay-sum')||{}).value)||0,
    method:(document.getElementById('pay-method')||{}).value||'Наличные',
    note:(document.getElementById('pay-note')||{}).value||'',
    date:now.toLocaleDateString('ru-RU'),
    time:now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})});
  saveData('mis_payments',pays);
  closeM('m-addpay');renderKassa();updateDash();
  toast('✅ Оплата принята');
}
function deletePayment(id){
  if(!confirm('Удалить операцию?'))return;
  let pays=loadData('mis_payments',[]);
  pays=pays.filter(x=>x.id!==id);
  saveData('mis_payments',pays);renderKassa();toast('🗑 Удалено');
}

// ═══════════════════════════════════════════
// SALARY (Зарплата)
// ═══════════════════════════════════════════
function renderSalary(){
  const STAFF=[
    {name:'Шкарпов А.А.',role:'Врач',scheme:'%',pct:20,fixed:0},
    {name:'Администратор',role:'Администратор',scheme:'fixed',pct:0,fixed:45000},
    {name:'Массажист В.П.',role:'Массажист',scheme:'%',pct:35,fixed:0},
    {name:'Горзина Л.П.',role:'Руководитель',scheme:'fixed',pct:0,fixed:80000},
  ];
  const users=loadData('mis_users',[]);
  const allStaff=[...STAFF,...users.map(u=>({name:u.name,role:u.role,scheme:'fixed',pct:0,fixed:0}))];
  const pays=loadData('mis_payments',[]);
  const monthRevTotal=pays.reduce((a,p)=>a+p.sum,0);
  let totalFOT=0;
  const tb=document.getElementById('sal-tbody');
  if(!tb)return;
  const rows=allStaff.map(s=>{
    let earned=0;
    if(s.scheme==='%'&&monthRevTotal){earned=Math.round(monthRevTotal*s.pct/100);}
    else{earned=s.fixed||0;}
    totalFOT+=earned;
    const kpi=earned>60000?'🟢 Отлично':earned>30000?'🟡 Хорошо':'🔴 Низкий';
    return `<tr>
      <td style="font-weight:600;">${s.name}</td>
      <td style="font-size:11px;color:var(--text3);">${s.role}</td>
      <td style="font-size:11px;">${s.scheme==='%'?s.pct+'% от выручки':'Оклад'}</td>
      <td style="text-align:center;">${s.scheme==='%'?pays.length:'-'}</td>
      <td style="text-align:center;">${s.scheme==='%'?monthRevTotal.toLocaleString('ru-RU')+' ₽':'-'}</td>
      <td style="font-weight:700;color:var(--mint);">${earned.toLocaleString('ru-RU')} ₽</td>
      <td>${kpi}</td>
      <td><button class="btn bg xs" onclick="toast('💾 Ведомость готова')">📄</button></td>
    </tr>`;
  });
  tb.innerHTML=rows.join('');
  ['sal-total','sal-cnt','sal-avg'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[totalFOT.toLocaleString('ru-RU')+' ₽',allStaff.length,allStaff.length?Math.round(totalFOT/allStaff.length).toLocaleString('ru-RU')+' ₽':'0 ₽'][i];
  });
}

// ═══════════════════════════════════════════
// LOYALTY (Программа лояльности)
// ═══════════════════════════════════════════
function renderLoyalty(){
  const PATIENTS=loadData('mis_patients',[]);
  const bonuses=loadData('mis_bonuses',{});
  const total=PATIENTS.length;
  let totalBonus=0;Object.values(bonuses).forEach(v=>totalBonus+=v);
  const avgB=total?Math.round(totalBonus/total):0;
  ['loy-members','loy-bonus','loy-return','loy-avg'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[total,totalBonus,total?Math.round(total*0.42)+'%':'0%',avgB][i];
  });
  // Level distribution (simulated by visits)
  const std=Math.round(total*0.45),sil=Math.round(total*0.30),gold=Math.round(total*0.18),vip=total-std-sil-gold;
  ['loy-std','loy-sil','loy-gold','loy-vip'].forEach((id,v)=>{
    const e=document.getElementById(id);if(e)e.textContent=[std,sil,gold,vip][v]+' пациентов';
  });
  // Top by bonuses
  const top=document.getElementById('loy-top');
  if(top){
    const topPts=PATIENTS.slice(0,8).map((p,i)=>{
      const b=bonuses[p.id]||(Math.floor(Math.random()*500)+50);
      return {name:p.fam+(p.nam?' '+p.nam:''),bonus:b};
    }).sort((a,b2)=>b2.bonus-a.bonus);
    top.innerHTML=topPts.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:20px;text-align:center;font-size:11px;font-weight:700;color:${i<3?'#f59e0b':'var(--text3)'};">${i+1}</div>
      <div style="flex:1;font-size:12px;font-weight:600;">${p.name}</div>
      <div style="font-size:12px;font-weight:700;color:#4a6cf7;">⭐ ${p.bonus}</div>
    </div>`).join('');
  }
}
function saveBonus(){
  const patId=(document.getElementById('bon-patient')||{}).value;
  const pts=(document.getElementById('bon-pts')||{}).value;
  if(!patId||!pts){toast('⚠️ Укажите пациента и баллы');return;}
  const bonuses=loadData('mis_bonuses',{});
  bonuses[patId]=(bonuses[patId]||0)+parseInt(pts);
  saveData('mis_bonuses',bonuses);
  closeM('m-addbonus');renderLoyalty();toast('⭐ Начислено '+pts+' баллов');
}

// ═══════════════════════════════════════════
// TASKS (Задачи)
// ═══════════════════════════════════════════
function renderTasks(){
  const tasks=loadData('mis_tasks',[]);
  const f=((document.getElementById('tk-filter')||{}).value||'');
  const list=tasks.filter(t=>t.done!==true&&(!f||t.priority===f));
  const done=tasks.filter(t=>t.done===true);
  const today=new Date().toLocaleDateString('ru-RU');
  const todayT=tasks.filter(t=>!t.done&&t.due===today);
  const urgent=tasks.filter(t=>!t.done&&t.priority==='Срочно');
  ['tk-urgent','tk-today','tk-open','tk-done'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[urgent.length,todayT.length,tasks.filter(t=>!t.done).length,done.length][i];
  });
  const nb=document.getElementById('n-tasks-cnt');
  if(nb){if(urgent.length){nb.textContent=urgent.length;nb.style.display='inline-flex';}else nb.style.display='none';}
  const el=document.getElementById('tk-list');
  const em=document.getElementById('tk-empty');
  if(!el)return;
  if(!list.length){el.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const pc={Срочно:'#ef4444',Важно:'#f59e0b',Обычное:'#4a6cf7'};
  el.innerHTML=list.map(t=>`<div style="border:1.5px solid ${pc[t.priority]||'#e2e8f0'}33;border-left:3px solid ${pc[t.priority]||'#4a6cf7'};border-radius:9px;padding:11px 13px;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;">${t.title}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">👤 ${t.assignee||'—'} · 📅 ${t.due||'—'}</div>
        ${t.desc?`<div style="font-size:11px;color:#475569;margin-top:4px;">${t.desc}</div>`:''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <span class="b" style="background:${pc[t.priority]||'#4a6cf7'}18;color:${pc[t.priority]||'#4a6cf7'};border-color:${pc[t.priority]||'#4a6cf7'}40;font-size:9px;">${t.priority}</span>
        <button class="btn bg xs" onclick="completeTask('${t.id}')">✓</button>
        <button class="btn bd xs" onclick="deleteTask('${t.id}')">✕</button>
      </div>
    </div>
  </div>`).join('');
  // By user
  const byUser={};tasks.filter(t=>!t.done).forEach(t=>{byUser[t.assignee||'Не назначено']=(byUser[t.assignee||'Не назначено']||0)+1;});
  const buel=document.getElementById('tk-by-user');
  if(buel){buel.innerHTML=Object.entries(byUser).map(([u,n])=>`
    <div class="br2"><div class="blab">${u}</div><div class="btr"><div class="bfl" style="width:${Math.min(n*20,100)}%;background:linear-gradient(90deg,#4a6cf7,#818cf8);"></div></div><div class="bvl">${n}</div></div>`).join('');}
}
function saveTask(){
  const title=(document.getElementById('tk-title')||{}).value.trim();
  if(!title){toast('⚠️ Укажите название');return;}
  const tasks=loadData('mis_tasks',[]);
  tasks.push({id:'tk_'+Date.now(),title,
    priority:(document.getElementById('tk-priority')||{}).value||'Обычное',
    due:(document.getElementById('tk-due')||{}).value||'',
    assignee:(document.getElementById('tk-assignee')||{}).value||'',
    desc:(document.getElementById('tk-desc')||{}).value||'',
    done:false,created:new Date().toLocaleDateString('ru-RU')});
  saveData('mis_tasks',tasks);
  closeM('m-addtask');renderTasks();toast('✅ Задача создана');
}
function completeTask(id){
  const tasks=loadData('mis_tasks',[]);
  const t=tasks.find(x=>x.id===id);if(t)t.done=true;
  saveData('mis_tasks',tasks);renderTasks();toast('✅ Задача выполнена');
}
function deleteTask(id){
  let tasks=loadData('mis_tasks',[]);
  tasks=tasks.filter(x=>x.id!==id);
  saveData('mis_tasks',tasks);renderTasks();
}

// ═══════════════════════════════════════════
// FUNNEL (Воронка CRM)
// ═══════════════════════════════════════════
const FUNNEL_COLS=[
  {id:'new',label:'Новый лид',color:'#94a3b8'},
  {id:'contacted',label:'Связались',color:'#4a6cf7'},
  {id:'consult',label:'Консультация',color:'#f59e0b'},
  {id:'treatment',label:'Лечение',color:'#10b981'},
  {id:'repeat',label:'Постоянный',color:'#8b5cf6'},
  {id:'lost',label:'Потерян',color:'#ef4444'},
];
function renderFunnel(){
  const leads=loadData('mis_leads',[]);
  const board=document.getElementById('funnel-board');
  if(!board)return;
  board.innerHTML=FUNNEL_COLS.map(col=>{
    const items=leads.filter(l=>l.stage===col.id);
    return `<div style="flex:0 0 190px;background:#f8fafc;border-radius:12px;border:1.5px solid #e2e8f0;overflow:hidden;">
      <div style="padding:10px 12px;background:${col.color}18;border-bottom:2px solid ${col.color}40;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:12px;color:${col.color};">${col.label}</span>
        <span style="background:${col.color};color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700;">${items.length}</span>
      </div>
      <div style="padding:8px;display:flex;flex-direction:column;gap:6px;min-height:200px;">
        ${items.map(l=>`<div style="background:#fff;border-radius:8px;padding:9px 10px;border:1px solid #e2e8f0;cursor:pointer;" onclick="moveLead('${l.id}')">
          <div style="font-weight:600;font-size:12px;">${l.name}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">${l.tel||'—'} · ${l.src||'—'}</div>
          <div style="font-size:10px;color:#475569;margin-top:3px;">${l.interest||''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}
function saveLead(){
  const name=(document.getElementById('lead-name')||{}).value.trim();
  if(!name){toast('⚠️ Укажите имя');return;}
  const leads=loadData('mis_leads',[]);
  leads.push({id:'ld_'+Date.now(),name,
    tel:(document.getElementById('lead-tel')||{}).value||'',
    src:(document.getElementById('lead-src')||{}).value||'',
    interest:(document.getElementById('lead-interest')||{}).value||'',
    stage:'new',created:new Date().toLocaleDateString('ru-RU')});
  saveData('mis_leads',leads);
  closeM('m-addlead');renderFunnel();toast('✅ Лид добавлен');
}
function moveLead(id){
  const leads=loadData('mis_leads',[]);
  const l=leads.find(x=>x.id===id);if(!l)return;
  const stages=FUNNEL_COLS.map(c=>c.id);
  const cur=stages.indexOf(l.stage);
  const next=stages[(cur+1)%stages.length];
  l.stage=next;
  saveData('mis_leads',leads);renderFunnel();
  toast('→ '+FUNNEL_COLS.find(c=>c.id===next).label);
}

// ═══════════════════════════════════════════
// SMART CARE (Умная забота)
// ═══════════════════════════════════════════
const DEFAULT_SCENARIOS=[
  {id:'sc1',name:'Напоминание за 24ч',trigger:'За 24ч до приёма',channel:'WhatsApp',msg:'Уважаемый(ая) {имя}, напоминаем о вашем визите завтра в {время}. Ждём вас! 🏥',active:true,sent:42},
  {id:'sc2',name:'Благодарность после приёма',trigger:'После приёма',channel:'WhatsApp',msg:'Спасибо за визит, {имя}! Если есть вопросы — звоните. Следующий приём: {дата}.',active:true,sent:28},
  {id:'sc3',name:'Возврат через месяц',trigger:'Через 1 месяц без визита',channel:'SMS',msg:'{имя}, мы скучаем 😊 Запишитесь на контрольный осмотр — это важно для вашего здоровья.',active:false,sent:15},
  {id:'sc4',name:'Поздравление с ДР',trigger:'День рождения',channel:'WhatsApp',msg:'С Днём рождения, {имя}! 🎉 Дарим скидку 10% на следующий визит.',active:true,sent:7},
];
function renderCare(){
  const scenarios=loadData('mis_scenarios',DEFAULT_SCENARIOS);
  const active=scenarios.filter(s=>s.active).length;
  const totalSent=scenarios.reduce((a,s)=>a+s.sent,0);
  ['care-active','care-sent','care-return','care-rating'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[active,totalSent,'42%','4.7'][i];
  });
  const sl=document.getElementById('scenarios-list');
  if(sl)sl.innerHTML=scenarios.map(s=>`
    <div style="border:1.5px solid ${s.active?'#bbf7d0':'#e2e8f0'};border-radius:10px;padding:12px;background:${s.active?'#f0fdf4':'#f8fafc'};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:700;font-size:13px;">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">🎯 ${s.trigger} · 📱 ${s.channel} · 📨 ${s.sent} отправок</div>
          <div style="font-size:11px;color:#475569;margin-top:5px;font-style:italic;">"${s.msg.substring(0,70)}..."</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          <button class="btn ${s.active?'bd':'bg'} xs" onclick="toggleScenario('${s.id}')">${s.active?'⏸ Выкл':'▶ Вкл'}</button>
        </div>
      </div>
    </div>`).join('');
  const upcoming=document.getElementById('care-upcoming');
  if(upcoming){
    const PATIENTS=loadData('mis_patients',[]);
    const items=PATIENTS.slice(0,4).map((p,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:16px;">${['📱','💬','📧','📱'][i]}</div>
        <div style="flex:1;"><div style="font-size:12px;font-weight:600;">${p.fam+(p.nam?' '+p.nam:'')}</div>
        <div style="font-size:10px;color:var(--text3);">${['Напоминание завтра','Благодарность','ДР через 3 дня','Возврат'][i]}</div></div>
        <span style="font-size:10px;color:#4a6cf7;font-weight:600;">${['12:00','14:30','10:00','15:00'][i]}</span>
      </div>`).join('');
    upcoming.innerHTML=items;
  }
}
function toggleScenario(id){
  const scenarios=loadData('mis_scenarios',DEFAULT_SCENARIOS);
  const s=scenarios.find(x=>x.id===id);if(s)s.active=!s.active;
  saveData('mis_scenarios',scenarios);renderCare();
}
function saveScenario(){
  const name=(document.getElementById('sc-name')||{}).value.trim();
  if(!name){toast('⚠️ Укажите название');return;}
  const scenarios=loadData('mis_scenarios',DEFAULT_SCENARIOS);
  scenarios.push({id:'sc_'+Date.now(),name,
    trigger:(document.getElementById('sc-trigger')||{}).value||'',
    channel:(document.getElementById('sc-channel')||{}).value||'WhatsApp',
    msg:(document.getElementById('sc-msg')||{}).value||'',
    active:true,sent:0});
  saveData('mis_scenarios',scenarios);
  closeM('m-addscenario');renderCare();toast('✅ Сценарий создан');
}
async function aiScenarioMsg(){
  const trigger=(document.getElementById('sc-trigger')||{}).value||'';
  const msg=await claude([{role:'user',content:`Напиши короткое сообщение пациенту для сценария "${trigger}". Дружелюбно, на русском, с переменными {имя}, {дата}. До 200 символов.`}]);
  const el=document.getElementById('sc-msg');if(el)el.value=msg;
}

// ═══════════════════════════════════════════
// REPORTS (Отчёты руководителя)
// ═══════════════════════════════════════════
  const PATIENTS=loadData('mis_patients',[]);
  const pays=loadData('mis_payments',[]);
  const svcs=loadData('mis_svcs',[]);
  const totalRev=pays.reduce((a,p)=>a+p.sum,0);
  const avgCheck=pays.length?Math.round(totalRev/pays.length):0;
  const returnPct=PATIENTS.length?Math.round(PATIENTS.filter(p=>p.status==='Постоянный'||p.status==='На лечении').length/PATIENTS.length*100):0;
  ['rep-rev','rep-pts','rep-avg-check','rep-return'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[totalRev.toLocaleString('ru-RU')+' ₽',PATIENTS.length,avgCheck.toLocaleString('ru-RU')+' ₽',returnPct+'%'][i];
  });
  // By service
  const bySvc={};pays.forEach(p=>{bySvc[p.svc||'Другое']=(bySvc[p.svc||'Другое']||0)+p.sum;});
  const maxSvc=Math.max(...Object.values(bySvc),1);
  const repSvc=document.getElementById('rep-by-svc');
  if(repSvc){
    const items=Object.entries(bySvc).sort((a,b)=>b[1]-a[1]).slice(0,8);
    repSvc.innerHTML=items.length?items.map(([k,v])=>`
      <div class="br2"><div class="blab" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${k}</div>
      <div class="btr"><div class="bfl" style="width:${Math.round(v/maxSvc*100)}%;background:linear-gradient(90deg,#4a6cf7,#818cf8);"></div></div>
      <div class="bvl">${v.toLocaleString('ru-RU')} ₽</div></div>`).join('')
    :'<div style="color:var(--text3);font-size:12px;padding:12px;">Нет данных об оплатах</div>';
  }
  // KPI table
  const STAFF=[{name:'Шкарпов А.А.',role:'Врач'},{name:'Администратор',role:'Администратор'},{name:'Массажист В.П.',role:'Массажист'}];
  const kpiTb=document.getElementById('rep-kpi-tbody');
  if(kpiTb)kpiTb.innerHTML=STAFF.map((s,i)=>{
    const cnt=[pays.length,0,0][i]||0;
    const rev=[totalRev,0,0][i]||0;
    const avg=cnt?Math.round(rev/cnt):0;
    const kpiScore=rev>100000?'🟢 95':rev>50000?'🟡 78':'🔴 45';
    return `<tr><td style="font-weight:600;">${s.name}</td><td style="text-align:center;">${cnt}</td>
      <td style="font-weight:700;color:var(--mint);">${rev.toLocaleString('ru-RU')} ₽</td>
      <td>${avg.toLocaleString('ru-RU')} ₽</td>
      <td style="font-weight:700;">${kpiScore}</td></tr>`;
  }).join('');
  // Sources
  const srcEl=document.getElementById('rep-sources');
  if(srcEl){
    const srcMap={};PATIENTS.forEach(p=>{srcMap[p.src||'—']=(srcMap[p.src||'—']||0)+1;});
    const maxS=Math.max(...Object.values(srcMap),1);
    srcEl.innerHTML=Object.entries(srcMap).map(([k,v])=>`
      <div class="br2"><div class="blab">${k}</div>
      <div class="btr"><div class="bfl" style="width:${Math.round(v/maxS*100)}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>
      <div class="bvl">${v}</div></div>`).join('');
  }
  // Diagnoses
  const diagEl=document.getElementById('rep-diags');
  if(diagEl){
    const diagMap={};PATIENTS.forEach(p=>{if(p.diag)diagMap[p.diag]=(diagMap[p.diag]||0)+1;});
    const top10=Object.entries(diagMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const maxD=top10.length?top10[0][1]:1;
    diagEl.innerHTML=top10.map(([k,v])=>`
      <div class="br2"><div class="blab" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${k}</div>
      <div class="btr"><div class="bfl" style="width:${Math.round(v/maxD*100)}%;background:linear-gradient(90deg,#8b5cf6,#a78bfa);"></div></div>
      <div class="bvl">${v}</div></div>`).join('');
  }
}
async function aiReportAnalysis(){
  const PATIENTS=loadData('mis_patients',[]);
  const pays=loadData('mis_payments',[]);
  const totalRev=pays.reduce((a,p)=>a+p.sum,0);
  const out=document.getElementById('rep-ai-out');
  if(out)out.textContent='🔄 AI анализирует данные...';
  const txt=await claude([{role:'user',content:`Проанализируй показатели клиники АльтернативА:
- Пациентов: ${PATIENTS.length}
- Выручка: ${totalRev.toLocaleString('ru-RU')} руб.
- Операций оплаты: ${pays.length}
- Средний чек: ${pays.length?Math.round(totalRev/pays.length):0} руб.
Дай краткий управленческий анализ (3-4 абзаца): сильные стороны, точки роста, рекомендации руководителю клиники ортопедии.`}]);
  if(out)out.innerHTML=txt.split('\n').join('<br>');
}
function exportReport(){
  exportExcelFinance();
}

// ═══════════════════════════════════════════
  const pays = loadData('mis_payments',[]);
  const pts  = loadData('mis_patients',[]);
  const wb   = XLSX.utils.book_new();

  // Лист 1: Все оплаты
  const rows1 = [['Дата','Пациент','Услуга','Врач','Сумма (₽)','Статус','Метод оплаты']];
  pays.forEach(p=>{
    const pt = pts.find(x=>x.id===p.ptId)||{};
    rows1.push([
      p.date||'', 
      (pt.fam||'')+(pt.nam?' '+pt.nam:''),
      p.svc||'', 
      p.doc||'', 
      p.sum||p.amount||0, 
      p.status||'Оплачено',
      p.method||'Наличные'
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [{wch:12},{wch:25},{wch:30},{wch:20},{wch:12},{wch:12},{wch:15}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Все оплаты');

  // Лист 2: Сводка по услугам
  const bySvc = {};
  pays.forEach(p=>{
    const k = p.svc||'Другое';
    if(!bySvc[k]) bySvc[k]={count:0,sum:0};
    bySvc[k].count++;
    bySvc[k].sum += p.sum||p.amount||0;
  });
  const rows2 = [['Услуга','Кол-во','Выручка (₽)','Доля %','Средний чек']];
  const totalRev = pays.reduce((a,p)=>a+(p.sum||p.amount||0),0);
  Object.entries(bySvc).sort((a,b)=>b[1].sum-a[1].sum).forEach(([k,v])=>{
    rows2.push([
      k, v.count, v.sum,
      totalRev ? Math.round(v.sum/totalRev*100)+'%' : '0%',
      v.count ? Math.round(v.sum/v.count) : 0
    ]);
  });
  rows2.push(['','','','','']);
  rows2.push(['ИТОГО', pays.length, totalRev, '100%', pays.length?Math.round(totalRev/pays.length):0]);
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{wch:30},{wch:10},{wch:15},{wch:10},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws2, 'По услугам');

  // Лист 3: По врачам
  const byDoc = {};
  pays.forEach(p=>{
    const k = p.doc||CU&&CU.name||'Неизвестно';
    if(!byDoc[k]) byDoc[k]={count:0,sum:0};
    byDoc[k].count++;
    byDoc[k].sum += p.sum||p.amount||0;
  });
  const rows3 = [['Врач','Приёмов','Выручка (₽)','Средний чек']];
  Object.entries(byDoc).sort((a,b)=>b[1].sum-a[1].sum).forEach(([k,v])=>{
    rows3.push([k, v.count, v.sum, v.count?Math.round(v.sum/v.count):0]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(rows3);
  ws3['!cols'] = [{wch:25},{wch:10},{wch:15},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'По врачам');

  // Лист 4: База пациентов
  const rows4 = [['ID','Фамилия','Имя','Отчество','Пол','Дата рождения','Телефон','Email','Диагноз','Статус','Источник','Дата создания']];
  pts.forEach(p=>{
    rows4.push([p.id,p.fam||'',p.nam||'',p.pat||'',p.sex||'',p.dob||'',p.tel||'',p.email||'',p.diag||'',p.status||'',p.src||'',p.created||'']);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(rows4);
  ws4['!cols'] = [{wch:8},{wch:18},{wch:14},{wch:16},{wch:5},{wch:14},{wch:14},{wch:22},{wch:35},{wch:14},{wch:18},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Пациенты');

  // Лист 5: Журнал записей
  const appts = loadData('mis_appts',[]);
  const rows5 = [['Дата','Время','Пациент','Услуга','Врач','Статус','Кабинет']];
  appts.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(a=>{
    const pt = pts.find(x=>x.id===a.ptId)||{};
    rows5.push([
      a.date||'',a.time||'',
      (pt.fam||'')+(pt.nam?' '+pt.nam:''),
      a.svc||'',a.doc||'',a.status||'',a.room||''
    ]);
  });
  const ws5 = XLSX.utils.aoa_to_sheet(rows5);
  ws5['!cols'] = [{wch:12},{wch:8},{wch:25},{wch:30},{wch:20},{wch:14},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Журнал записей');

  const period = (document.getElementById('rep-period')||{}).value||'month';
  const fname = 'AlternativA_otchet_'+new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')+'.xlsx';
  xlsxDownload(wb, fname);
}

// ─── 2. Экспорт только пациентов ───
  const pts = loadData('mis_patients',[]);
  const wb  = XLSX.utils.book_new();
  const rows = [['ID','Фамилия','Имя','Отчество','Пол','Дата рождения','Телефон','Email','Диагноз (МКБ-10)','Статус','Источник','Дата создания','Примечание']];
  pts.forEach(p=>{
    rows.push([p.id,p.fam||'',p.nam||'',p.pat||'',p.sex||'',p.dob||'',p.tel||'',p.email||'',p.diag||'',p.status||'',p.src||'',p.created||'',p.note||'']);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:8},{wch:18},{wch:14},{wch:16},{wch:5},{wch:14},{wch:14},{wch:22},{wch:38},{wch:14},{wch:18},{wch:14},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws, 'Пациенты');
  xlsxDownload(wb, 'Pacienty_'+new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')+'.xlsx');
}

// ─── 3. Экспорт расписания ───
  const appts = loadData('mis_appts',[]);
  const pts   = loadData('mis_patients',[]);
  const wb    = XLSX.utils.book_new();
  const rows  = [['Дата','День нед.','Время','Пациент','Телефон','Услуга','Врач','Статус','Кабинет','Примечание']];
  const days  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  appts.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')).forEach(a=>{
    const pt  = pts.find(x=>x.id===a.ptId)||{};
    const dt  = a.date ? new Date(a.date) : null;
    const dow = dt ? days[dt.getDay()] : '';
    rows.push([a.date||'',dow,a.time||'',(pt.fam||'')+(pt.nam?' '+pt.nam:''),pt.tel||'',a.svc||'',a.doc||'',a.status||'',a.room||'',a.note||'']);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:6},{wch:8},{wch:25},{wch:14},{wch:28},{wch:20},{wch:14},{wch:10},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
  xlsxDownload(wb, 'Raspisanie_'+new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')+'.xlsx');
}

// ─── 4. Экспорт склада ───
  const stock = loadData('mis_stock',[]);
  const wb    = XLSX.utils.book_new();
  const rows  = [['Наименование','Категория','Кол-во','Ед.','Минимум','Цена (₽)','Стоимость остатка','Статус']];
  stock.forEach(s=>{
    const qty   = s.qty||0;
    const min   = s.min||0;
    const price = s.price||0;
    const status = qty===0?'❌ Нет':qty<=min?'⚠️ Мало':'✅ OK';
    rows.push([s.name||'',s.cat||'',qty,s.unit||'шт',min,price,qty*price,status]);
  });
  // Итог
  rows.push(['','','','','','','','']);
  const totalVal = stock.reduce((a,s)=>a+((s.qty||0)*(s.price||0)),0);
  rows.push(['ИТОГО (стоимость склада)','','','','','',totalVal,'']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:30},{wch:16},{wch:8},{wch:6},{wch:8},{wch:10},{wch:18},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws, 'Склад');
  xlsxDownload(wb, 'Sklad_'+new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')+'.xlsx');
}

// ─── 5. Экспорт зарплат ───
  const pays  = loadData('mis_payments',[]);
  const staff = loadData('mis_users',[]);
  const wb    = XLSX.utils.book_new();
  const rows  = [['Сотрудник','Роль','Приёмов','Выручка (₽)','% от выручки','Оклад','Итого к выплате']];
  const byDoc = {};
  pays.forEach(p=>{
    const k = p.doc||'';
    if(!k) return;
    if(!byDoc[k]) byDoc[k]={count:0,sum:0};
    byDoc[k].count++;
    byDoc[k].sum += p.sum||p.amount||0;
  });
  Object.entries(byDoc).forEach(([name,v])=>{
    const u   = staff.find(s=>s.name===name)||{};
    const pct = u.bonusPct||15;
    const base= u.salary||0;
    const bonus = Math.round(v.sum*pct/100);
    rows.push([name, u.role||'Врач', v.count, v.sum, pct+'%', base, base+bonus]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:25},{wch:16},{wch:10},{wch:14},{wch:14},{wch:12},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws, 'Зарплаты');
  xlsxDownload(wb, 'Zarplaty_'+new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')+'.xlsx');
}


// ═══ ANALYTICS ═══
function renderAnalytics(){
  const pts=loadData('mis_patients',[]);
  const pays=loadData('mis_payments',[]);
  const leads=loadData('mis_leads',[]);
  const totalRev=pays.reduce((a,p)=>a+p.sum,0);
  const convLeads=leads.filter(l=>l.stage==='treatment'||l.stage==='repeat').length;
  const convRate=leads.length?Math.round(convLeads/leads.length*100):0;
  const ltv=pts.length?Math.round(totalRev/pts.length):0;
  const done=pts.filter(p=>p.status==='Завершил').length;
  const churn=pts.length?Math.round(done/pts.length*100):0;
  ['an-growth','an-conv','an-ltv','an-churn'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=['+12%',convRate+'%',ltv.toLocaleString('ru-RU')+' ₽',churn+'%'][i];
  });
  // Load schedule
  const loadEl=document.getElementById('an-load');
  if(loadEl){
    const DAYS=[['Пн',82],['Вт',65],['Ср',91],['Чт',74],['Пт',88],['Сб',42],['Вс',0]];
    loadEl.innerHTML=DAYS.map(([d,v])=>`<div class="br2"><div class="blab">${d}</div><div class="btr"><div class="bfl" style="width:${v}%;background:linear-gradient(90deg,var(--blue),var(--blue2));"></div></div><div class="bvl">${v}%</div></div>`).join('');
  }
  // Popular services
  const popEl=document.getElementById('an-popular');
  if(popEl){
    const bySvc={};pays.forEach(p=>{bySvc[p.svc||'Другое']=(bySvc[p.svc||'Другое']||0)+1;});
    const top=Object.entries(bySvc).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const mx=top.length?top[0][1]:1;
    popEl.innerHTML=top.length?top.map(([k,v])=>`<div class="br2"><div class="blab">${k}</div><div class="btr"><div class="bfl" style="width:${Math.round(v/mx*100)}%;background:linear-gradient(90deg,var(--mint),#34d399);"></div></div><div class="bvl">${v}</div></div>`).join('')
    :'<div style="color:var(--text3);font-size:12px;">Нет данных о продажах</div>';
  }
}

// ═══ STOCK ═══
function renderStock(){
  const stock=loadData('mis_stock',[]);
  const q=((document.getElementById('stock-search')||{}).value||'').toLowerCase();
  const cat=(document.getElementById('stock-cat')||{}).value||'';
  const list=stock.filter(s=>(!cat||s.cat===cat)&&(!q||s.name.toLowerCase().includes(q)));
  const low=stock.filter(s=>s.qty<=s.min).length;
  const val=stock.reduce((a,s)=>a+(s.qty||0)*(s.price||0),0);
  ['st-total','st-low','st-ok','st-val'].forEach((id,i)=>{
    const e=document.getElementById(id);
    if(e)e.textContent=[stock.length,low,stock.length-low,val.toLocaleString('ru-RU')+' ₽'][i];
  });
  const lbl=document.getElementById('stock-count-label');
  if(lbl)lbl.textContent=`${list.length} из ${stock.length} позиций`;
  const tb=document.getElementById('stock-body');
  if(!tb)return;
  tb.innerHTML=list.map(s=>{
    const isLow=s.qty<=s.min;
    return `<tr style="${isLow?'background:#fff5f5;':''}">
      <td style="font-weight:700;">${s.name}</td>
      <td><span class="b b-bl" style="font-size:9px;">${s.cat||'—'}</span></td>
      <td style="font-weight:700;color:${isLow?'var(--rose)':'var(--mint)'};">${s.qty}</td>
      <td style="color:var(--text3);">${s.unit||'шт'}</td>
      <td>${s.min||0}</td>
      <td>${(s.price||0).toLocaleString('ru-RU')} ₽</td>
      <td style="font-size:11px;color:var(--text3);">${s.supplier||'—'}</td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn xs" onclick="stockAdj('${s.id}',1)">+</button>
        <button class="btn xs" onclick="stockAdj('${s.id}',-1)">−</button>
        <button class="btn xs bd" onclick="deleteStock('${s.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}
function stockAdj(id,delta){
  const stock=loadData('mis_stock',[]);
  const s=stock.find(x=>x.id===id);if(!s)return;
  s.qty=Math.max(0,(s.qty||0)+delta);
  saveData('mis_stock',stock);renderStock();renderDash();
  if(s.qty<=s.min)toast('⚠️ '+s.name+' — остаток мало!');
}
function deleteStock(id){
  if(!confirm('Удалить позицию?'))return;
  let stock=loadData('mis_stock',[]);stock=stock.filter(x=>x.id!==id);
  saveData('mis_stock',stock);renderStock();
}
function saveStock(){
  const name=(document.getElementById('st-name')||{}).value.trim();
  if(!name){toast('⚠️ Укажите наименование');return;}
  const stock=loadData('mis_stock',[]);
  stock.push({id:'st_'+Date.now(),name,
    cat:(document.getElementById('st-cat')||{}).value||'Расходники',
    qty:parseFloat((document.getElementById('st-qty')||{}).value)||0,
    min:parseFloat((document.getElementById('st-min')||{}).value)||5,
    price:parseFloat((document.getElementById('st-price')||{}).value)||0,
    unit:(document.getElementById('st-unit')||{}).value||'шт',
    supplier:(document.getElementById('st-supplier')||{}).value||'',
  });
  saveData('mis_stock',stock);closeM('m-addstock');renderStock();toast('✅ Оприходовано');
}

// ═══ TPL CARDS RENDERER ═══
function renderTplCards(){
  const el=document.getElementById('tpl-cards');
  if(!el)return;
  const icons={ortho:'🩺',prp:'💉',uzi_knee:'🔬',uzi_shoulder:'🔬',pod:'🦶',rehab:'🏃',svf:'🧬',epi:'📋'};
  el.innerHTML=Object.entries(TPLS).map(([k,t])=>`<div class="tplcard${k===curTpl?' sel':''}" onclick="loadTpl(this,'${k}')">
    <div class="tplh"><div class="tpli">${icons[k]||'📝'}</div>
    <div><div class="tpln">${t.title}</div><div class="tpld">${t.desc||''}</div></div></div>
  </div>`).join('');
  if(curTpl&&TPLS[curTpl]){
    const t=TPLS[curTpl];
    const titleEl=document.getElementById('tpl-title');if(titleEl)titleEl.textContent=t.title;
    const bodyEl=document.getElementById('tpl-body');if(bodyEl)bodyEl.value=t.body;
  }
}

// ═══ POPULATE SELECT HELPERS ═══
function populatePrpPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('prp-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}
function populateUziPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('uzi-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}
function populatePodPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('pod-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}
function populateRehabPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('rehab-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}
function populateEmrPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('emr-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}
function populateDocPt(){const pts=loadData('mis_patients',[]);const e=document.getElementById('doc-pt');if(e)e.innerHTML=pts.map(p=>`<option value="${p.id}">${p.fam+(p.nam?' '+p.nam:'')}</option>`).join('');}

// ═══ REPORT EXPORT ═══

// ═══════════════════════════════════════════
  const appts = loadData('mis_appts',[]);
  const docF = (document.getElementById('sf-doc')||{value:''}).value;
  const stF  = (document.getElementById('sf-status')||{value:''}).value;

  const filtered = appts.filter(a=>{
    if(docF && a.doc !== docF) return false;
    if(stF  && a.status !== stF)  return false;
    return true;
  });

  // Period label
  const periodEl = document.getElementById('sched-period-label');

  if(schedView==='day'){
    renderSchedDay(filtered);
    if(periodEl) periodEl.textContent = fmtDate(schedCurDate)+' — '+['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][schedCurDate.getDay()];
  } else if(schedView==='week'){
    renderSchedWeek(filtered);
    const days=getWeekDays(schedCurDate);
    if(periodEl) periodEl.textContent = fmtDate(days[0])+' – '+fmtDate(days[6]);
  } else {
    renderSchedMonth(filtered);
    const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    if(periodEl) periodEl.textContent = months[schedCurDate.getMonth()]+' '+schedCurDate.getFullYear();
  }

  const cntEl = document.getElementById('sched-count');
  if(cntEl) cntEl.textContent = 'Записей: '+filtered.filter(a=>a.status!=='cancel').length;
}

function buildTimeCol(){
  const tc = document.getElementById('sched-time-col');
  if(!tc) return;
  tc.innerHTML = TIMES.map(t=>'<div class="sched-time-slot">'+t+'</div>').join('');
}

  const appts=loadData('mis_appts',[]);
  const a=appts.find(x=>x.id===id);
  if(!a) return;
  activeApptId=id;
  const pp=document.getElementById('appt-popup');
  if(!pp) return;
  document.getElementById('pp-name').textContent=a.patient;
  document.getElementById('pp-time').textContent=a.date+' '+a.time;
  document.getElementById('pp-svc').textContent=a.svc;
  document.getElementById('pp-doc').textContent=a.doc||'—';
  document.getElementById('pp-status').textContent=STATUS_LABELS[a.status||'wait'];
  document.getElementById('pp-note').textContent=a.note||'—';
  const sel=document.getElementById('pp-status-sel');
  if(sel) sel.value=a.status||'wait';
  pp.style.display='block';
  pp.style.left='50%'; pp.style.top='50%';
  pp.style.transform='translate(-50%,-50%)';
}

function closeApptPopup(){
  const pp=document.getElementById('appt-popup');
  if(pp) pp.style.display='none';
  activeApptId=null;
}

function changeApptStatus(){
  if(!activeApptId) return;
  const appts=loadData('mis_appts',[]);
  const a=appts.find(x=>x.id===activeApptId);
  if(!a) return;
  const sel=document.getElementById('pp-status-sel');
  a.status=sel?sel.value:'wait';
  saveData('mis_appts',appts);
  renderSched();
  const statusEl=document.getElementById('pp-status');
  if(statusEl) statusEl.textContent=STATUS_LABELS[a.status];
  toast('✅ Статус: '+STATUS_LABELS[a.status]);
}

function deleteAppt(){
  if(!activeApptId||!confirm('Удалить запись?')) return;
  let appts=loadData('mis_appts',[]);
  appts=appts.filter(x=>x.id!==activeApptId);
  saveData('mis_appts',appts);
  closeApptPopup();
  renderSched();
  toast('🗑 Запись удалена');
}

function openProtocol(){
  if(!activeApptId) return;
  const appts=loadData('mis_appts',[]);
  const a=appts.find(x=>x.id===activeApptId);
  if(!a) return;
  closeApptPopup();
  openServiceProtocol(a);
}


// ─── PROTOCOL SAVE/PRINT ───
function saveProto(type){
  const protos=loadData('mis_protocols',[]);
  protos.push({id:'pr_'+Date.now(),type:type,ptId:EMK_PID||activeApptId||null,doc:CU?CU.name:'',date:new Date().toLocaleDateString('ru-RU'),created:new Date().toISOString()});
  saveData('mis_protocols',protos);
  const modals={consult:'m-proto-consult',prp:'m-proto-prp',inject:'m-proto-inject',
    uzi:'m-proto-uzi',massage:'m-proto-massage',iv:'m-proto-iv',
    pod:'m-proto-pod',svf:'m-proto-svf',rehab2:'m-proto-rehab'};
  if(modals[type]) closeM(modals[type]);
  toast('✅ Протокол сохранён');
}
function printProto(modalId){
  const modal=document.getElementById(modalId);
  if(!modal) return;
  const html=modal.innerHTML;
  const win=window.open('','_blank','width=800,height=600');
  if(!win) return;
  win.document.write('<html><head><title>Протокол</title><style>body{font-family:sans-serif;font-size:13px;padding:20px;} label{font-size:11px;color:#666;} input,select,textarea{border:1px solid #ccc;padding:4px;width:100%;margin-bottom:8px;} button{display:none;} .mh{font-size:16px;font-weight:bold;margin-bottom:16px;}</style></head><body>'+html+'<script>window.print();<\/script></body></html>');
  win.document.close();
}

// ─── SERVICE PROTOCOL ROUTER ───
function openServiceProtocol(appt){
  const svc=(appt.svc||'').toLowerCase();
  const mid = svc.includes('prp')?'m-proto-prp':
              svc.includes('узи')||svc.includes('уз ')?'m-proto-uzi':
              svc.includes('массаж')?'m-proto-massage':
              svc.includes('блокад')||svc.includes('введени')||svc.includes('пункци')?'m-proto-inject':
              svc.includes('подолог')||svc.includes('ноготь')||svc.includes('стоп')?'m-proto-pod':
              svc.includes('реабил')||svc.includes('лфк')?'m-proto-rehab':
              svc.includes('svf')?'m-proto-svf':
              svc.includes('в/в')||svc.includes('в/м')||svc.includes('капельно')?'m-proto-iv':
              'm-proto-consult';
  // pre-fill patient name
  const pf=document.getElementById('proto-pt-label');
  if(pf) pf.textContent=appt.patient+' — '+appt.date+' '+appt.time;
  const svcf=document.getElementById('proto-svc-label');
  if(svcf) svcf.textContent=appt.svc;
  openM(mid);
}

// ─── NEW VISIT MODAL ───
function openNewVisit(date, time){
  populateNVPatients();
  populateNVServices();
  const dInput=document.getElementById('nv-date2');
  if(dInput){
    if(date) dInput.value=date;
    else dInput.value=fmtDateISO(new Date());
  }
  const tSel=document.getElementById('nv-time2');
  if(tSel && time){
    for(let i=0;i<tSel.options.length;i++){
      if(tSel.options[i].value===time){tSel.selectedIndex=i;break;}
    }
  }
  openM('m-newvisit2');
}

function populateNVPatients(){
  const pts=loadData('mis_patients',[]);
  const sel=document.getElementById('nv-pt2');
  if(!sel) return;
  sel.innerHTML='<option value="">— Выберите пациента —</option>'+
    pts.map(p=>'<option value="'+p.id+'">'+p.fam+(p.nam?' '+p.nam:'')+(p.dob?' ('+p.dob+')':'')+'</option>').join('');
}

function populateNVServices(){
  const svcs=loadData('mis_svcs',null)||SVCS_DEFAULT;
  const sel=document.getElementById('nv-svc2');
  if(!sel) return;
  const cats=[...new Set(svcs.filter(s=>s.active).map(s=>s.cat))];
  sel.innerHTML='<option value="">— Выберите услугу —</option>'+
    cats.map(cat=>'<optgroup label="'+cat+'">'+
      svcs.filter(s=>s.active&&s.cat===cat).map(s=>'<option value="'+s.name+'" data-dur="'+s.dur+'" data-doc="'+s.doc+'">'+s.name+'</option>').join('')+
    '</optgroup>').join('');
}

function nv2SvcChange(){
  const sel=document.getElementById('nv-svc2');
  if(!sel) return;
  const opt=sel.options[sel.selectedIndex];
  const dur=opt?opt.getAttribute('data-dur'):'30';
  const doc=opt?opt.getAttribute('data-doc'):'';
  const durEl=document.getElementById('nv-dur2');
  if(durEl) durEl.value=dur||'30';
  const docSel=document.getElementById('nv-doc2');
  if(docSel && doc){
    for(let i=0;i<docSel.options.length;i++){
      if(docSel.options[i].value===doc||docSel.options[i].text===doc){docSel.selectedIndex=i;break;}
    }
  }
}

function saveNewVisit2(){
  const ptSel=document.getElementById('nv-pt2');
  const svcSel=document.getElementById('nv-svc2');
  const datEl=document.getElementById('nv-date2');
  const timSel=document.getElementById('nv-time2');
  const docSel=document.getElementById('nv-doc2');
  const noteEl=document.getElementById('nv-note2');
  const statusSel=document.getElementById('nv-status2');

  if(!ptSel||!ptSel.value){toast('⚠️ Выберите пациента');return;}
  if(!svcSel||!svcSel.value){toast('⚠️ Выберите услугу');return;}
  if(!datEl||!datEl.value){toast('⚠️ Укажите дату');return;}

  const pts=loadData('mis_patients',[]);
  const pt=pts.find(p=>p.id===ptSel.value);
  const ptName=pt?(pt.fam+(pt.nam?' '+pt.nam:'')):'Пациент';

  const appts=loadData('mis_appts',[]);
  appts.push({
    id:'ap_'+Date.now(),
    patient:ptName,
    ptId:ptSel.value,
    svc:svcSel.value,
    date:datEl.value,
    time:timSel?timSel.value:'09:00',
    doc:docSel?docSel.value:'',
    note:noteEl?noteEl.value:'',
    status:statusSel?statusSel.value:'wait',
    created:new Date().toLocaleDateString('ru-RU')
  });
  saveData('mis_appts',appts);
  closeM('m-newvisit2');
  renderSched();
  updateDash();
  toast('✅ Запись создана: '+ptName+' на '+datEl.value);
}

// ═══════════════════════════════════════════
// PRINT & DOCX
// ═══════════════════════════════════════════
function printPage(){
  // Add print header
  const ph=document.createElement('div');
  ph.className='print-header';
  ph.innerHTML='<div><strong style="font-size:16pt;">АльтернативА</strong><br><span style="font-size:9pt;color:#555;">Медицинская информационная система</span></div>'+
    '<div style="text-align:right;font-size:9pt;color:#555;">Дата печати: '+new Date().toLocaleDateString('ru-RU')+'<br>Врач: '+(CU?CU.name:'—')+'</div>';
  const mc=document.querySelector('.mc');
  if(mc)mc.insertBefore(ph,mc.firstChild);
  window.print();
  setTimeout(()=>ph.remove(),500);
}

function printPatientCard(id){
  PATIENTS=loadData('mis_patients',[]);
  const p=PATIENTS.find(x=>x.id===id);if(!p)return;
  const full=p.fam+(p.nam?' '+p.nam:'')+(p.pat?' '+p.pat:'');
  const age=p.dob?calcAge(p.dob):'—';
  const w=window.open('','_blank','width=800,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Карта пациента — ${full}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11pt;color:#000;padding:20mm;max-width:800px;margin:0 auto;}
    h1{font-size:16pt;margin-bottom:4px;}
    .sub{font-size:9pt;color:#555;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;margin-bottom:14px;}
    td{padding:5px 8px;border:1px solid #ccc;vertical-align:top;}
    td:first-child{width:40%;background:#f5f5f5;font-weight:bold;font-size:10pt;}
    h2{font-size:12pt;border-bottom:1.5px solid #333;padding-bottom:4px;margin:16px 0 8px;}
    .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:10pt;}
    .sig{border-top:1px solid #333;width:200px;text-align:center;padding-top:4px;font-size:9pt;color:#555;}
    @media print{button{display:none!important;}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div><h1>Карта пациента</h1><div class="sub">Клиника «АльтернативА» · Дата: ${new Date().toLocaleDateString('ru-RU')}</div></div>
    <div style="text-align:right;font-size:9pt;color:#555;">ID: ${p.id}</div>
  </div>
  <h2>Персональные данные</h2>
  <table>
    <tr><td>ФИО</td><td><strong>${full}</strong></td></tr>
    <tr><td>Дата рождения</td><td>${p.dob||'—'}</td></tr>
    <tr><td>Возраст</td><td>${age} лет</td></tr>
    <tr><td>Пол</td><td>${p.sex||'—'}</td></tr>
    <tr><td>Телефон</td><td>${p.tel||'—'}</td></tr>
    <tr><td>Email</td><td>${p.email||'—'}</td></tr>
    <tr><td>Источник</td><td>${p.src||'—'}</td></tr>
    <tr><td>Дата регистрации</td><td>${p.created||'—'}</td></tr>
  </table>
  <h2>Клинические данные</h2>
  <table>
    <tr><td>Диагноз (МКБ-10)</td><td>${p.diag||'—'}</td></tr>
    <tr><td>Статус</td><td>${p.status||'—'}</td></tr>
    <tr><td>Следующий визит</td><td>${p.next||'—'}</td></tr>
  </table>
  ${p.note?`<h2>Примечания</h2><div style="border:1px solid #ccc;padding:10px;border-radius:4px;">${p.note}</div>`:''}
  <div class="footer">
    <div class="sig">Врач: ${CU?CU.name:'___________'}</div>
    <div class="sig">Подпись пациента</div>
  </div>
  <div style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;">🖨 Печатать</button>
    &nbsp;
    <button onclick="window.close()" style="padding:8px 20px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;">Закрыть</button>
  </div>
  
<!-- ═══ MODALS: NEW MODULES ═══ -->
<div class="ov" id="m-addplan"><div class="modal" style="width:540px;">
  <div class="mh"><div class="mt2">Новый план лечения</div><div class="mx" onclick="closeM('m-addplan')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="pl-patient"></select></div>
    <div class="fg"><label class="fl">Диагноз</label><input class="inp" id="pl-diag" placeholder="M17.1 Гонартроз..."></div>
    <div class="g2"><div class="fg"><label class="fl">Начало</label><input class="inp" type="date" id="pl-start"></div>
    <div class="fg"><label class="fl">Окончание (план)</label><input class="inp" type="date" id="pl-end"></div></div>
    <div class="fg"><label class="fl">Услуги в курсе</label>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px;" id="pl-svcs-check">
        <label class="cr"><input type="checkbox" value="PRP-терапия × 3"> PRP-терапия × 3</label>
        <label class="cr"><input type="checkbox" value="УЗИ-контроль × 2"> УЗИ-контроль × 2</label>
        <label class="cr"><input type="checkbox" value="ЛФК × 10"> ЛФК × 10</label>
        <label class="cr"><input type="checkbox" value="Массаж × 5"> Массаж × 5</label>
        <label class="cr"><input type="checkbox" value="Физиотерапия"> Физиотерапия</label>
      </div>
    </div>
    <div class="fg"><label class="fl">Цель лечения / примечание</label><textarea class="inp" id="pl-note" rows="2" placeholder="Снижение ВАШ до 2/10, восстановление ROM..."></textarea></div>
    <div class="fg"><label class="fl">Стоимость курса (₽)</label><input class="inp" type="number" id="pl-cost" placeholder="0"></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addplan')">Отмена</button><button class="btn bp" onclick="savePlan()">Создать план</button></div>
</div></div>

<div class="ov" id="m-addpay"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Принять оплату</div><div class="mx" onclick="closeM('m-addpay')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="pay-patient"></select></div>
    <div class="fg"><label class="fl">Услуга</label><select class="inp sel" id="pay-svc"></select></div>
    <div class="g2">
      <div class="fg"><label class="fl">Сумма (₽)</label><input class="inp" type="number" id="pay-sum" placeholder="0"></div>
      <div class="fg"><label class="fl">Способ оплаты</label>
        <select class="inp sel" id="pay-method"><option value="Наличные">Наличные</option><option value="Карта">Карта/Эквайринг</option><option value="Безнал">Безналичный</option></select>
      </div>
    </div>
    <div class="fg"><label class="fl">Примечание</label><input class="inp" id="pay-note" placeholder="Необязательно"></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addpay')">Отмена</button><button class="btn bp" onclick="savePayment()">Принять оплату</button></div>
</div></div>

<div class="ov" id="m-addtask"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Новая задача</div><div class="mx" onclick="closeM('m-addtask')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Название задачи</label><input class="inp" id="tk-title" placeholder="Позвонить пациенту, заказать расходники..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Приоритет</label>
        <select class="inp sel" id="tk-priority"><option value="Обычное">Обычное</option><option value="Важно">Важно</option><option value="Срочно">Срочно</option></select>
      </div>
      <div class="fg"><label class="fl">Срок</label><input class="inp" type="date" id="tk-due"></div>
    </div>
    <div class="fg"><label class="fl">Исполнитель</label>
      <select class="inp sel" id="tk-assignee">
        <option value="Шкарпов А.А.">Шкарпов А.А. (врач)</option>
        <option value="Администратор">Администратор</option>
        <option value="Горзина Л.П.">Горзина Л.П. (руководитель)</option>
      </select>
    </div>
    <div class="fg"><label class="fl">Описание</label><textarea class="inp" id="tk-desc" rows="2" placeholder="Подробности задачи..."></textarea></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addtask')">Отмена</button><button class="btn bp" onclick="saveTask()">Создать</button></div>
</div></div>

<div class="ov" id="m-addlead"><div class="modal" style="width:440px;">
  <div class="mh"><div class="mt2">Новый лид</div><div class="mx" onclick="closeM('m-addlead')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Имя / ФИО</label><input class="inp" id="lead-name" placeholder="Иванов Иван"></div>
    <div class="fg"><label class="fl">Телефон</label><input class="inp" id="lead-tel" placeholder="+7..."></div>
    <div class="fg"><label class="fl">Источник</label>
      <select class="inp sel" id="lead-src"><option>Сайт</option><option>Соцсети</option><option>Рекомендация</option><option>Звонок</option><option>Повторный</option><option>Другое</option></select>
    </div>
    <div class="fg"><label class="fl">Интерес</label><input class="inp" id="lead-interest" placeholder="PRP, консультация ортопеда..."></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addlead')">Отмена</button><button class="btn bp" onclick="saveLead()">Добавить</button></div>
</div></div>

<div class="ov" id="m-addbonus"><div class="modal" style="width:420px;">
  <div class="mh"><div class="mt2">Начислить бонусы</div><div class="mx" onclick="closeM('m-addbonus')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="bon-patient"></select></div>
    <div class="g2">
      <div class="fg"><label class="fl">Баллы</label><input class="inp" type="number" id="bon-pts" placeholder="0"></div>
      <div class="fg"><label class="fl">Причина</label><input class="inp" id="bon-reason" placeholder="За визит, акция..."></div>
    </div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addbonus')">Отмена</button><button class="btn bp" onclick="saveBonus()">Начислить</button></div>
</div></div>

<div class="ov" id="m-addscenario"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Новый сценарий</div><div class="mx" onclick="closeM('m-addscenario')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Название</label><input class="inp" id="sc-name" placeholder="Напоминание о визите..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Триггер</label>
        <select class="inp sel" id="sc-trigger"><option>За 24ч до приёма</option><option>После приёма</option><option>Через 1 месяц без визита</option><option>День рождения</option><option>Завершение курса</option></select>
      </div>
      <div class="fg"><label class="fl">Канал</label>
        <select class="inp sel" id="sc-channel"><option>WhatsApp</option><option>SMS</option><option>Email</option><option>Telegram</option></select>
      </div>
    </div>
    <div class="fg"><label class="fl">Шаблон сообщения</label><textarea class="inp" id="sc-msg" rows="3" placeholder="Уважаемый {имя}, напоминаем о визите..."></textarea></div>
    <div style="display:flex;gap:6px;margin-top:4px;"><button class="btn bg xs" onclick="aiScenarioMsg()">🤖 AI-составить</button></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addscenario')">Отмена</button><button class="btn bp" onclick="saveScenario()">Создать</button></div>
</div></div>

<!-- ADD STOCK (full CRUD) -->
<div class="ov" id="m-addstock"><div class="modal" style="width:460px;">
  <div class="mh"><div class="mt2">Приход на склад</div><div class="mx" onclick="closeM('m-addstock')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Наименование *</label><input class="inp" id="st-name" placeholder="Пробирки PRP ECO TUBE..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Категория</label><select class="inp sel" id="st-cat"><option>PRP</option><option>Анестетики</option><option>ГК</option><option>Расходники</option><option>Препараты</option></select></div>
      <div class="fg"><label class="fl">Ед. измерения</label><select class="inp sel" id="st-unit"><option>шт</option><option>мл</option><option>уп</option><option>кг</option></select></div>
    </div>
    <div class="g3">
      <div class="fg"><label class="fl">Количество</label><input class="inp" type="number" id="st-qty" placeholder="0"></div>
      <div class="fg"><label class="fl">Минимум</label><input class="inp" type="number" id="st-min" placeholder="5"></div>
      <div class="fg"><label class="fl">Цена (₽/ед)</label><input class="inp" type="number" id="st-price" placeholder="0"></div>
    </div>
    <div class="fg"><label class="fl">Поставщик</label><input class="inp" id="st-supplier" placeholder="ООО МедСнаб..."></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--border);">
    <button class="btn" onclick="closeM('m-addstock')">Отмена</button>
    <button class="btn bp" onclick="saveStock()">Оприходовать</button>
  </div>
</div></div>
</body></html>`);
  w.document.close();
}

function printProtocol(tplKey){
  const t=TPLS[tplKey||curTpl];if(!t)return;
  const body=(document.getElementById('tpl-body')||{}).value||t.body;
  const w=window.open('','_blank','width=800,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${t.title}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11pt;color:#000;padding:20mm;max-width:800px;margin:0 auto;}
    h1{font-size:15pt;margin-bottom:4px;}
    .sub{font-size:9pt;color:#555;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;}
    pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11pt;line-height:1.7;}
    .footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;display:flex;justify-content:space-between;font-size:9pt;color:#555;}
    @media print{button{display:none!important;}}
  
/* ── ЭМК стили ── */
.emk-wrap{width:100%;max-width:1080px;height:100vh;background:#fff;display:flex;flex-direction:column;margin:0 auto;overflow:hidden;}
.emk-head{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:2px solid var(--border);flex-shrink:0;background:#fff;}
.emk-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4a6cf7,#818cf8);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:#fff;flex-shrink:0;}
.emk-tabs{display:flex;gap:0;border-bottom:2px solid var(--border);flex-shrink:0;overflow-x:auto;padding:0 20px;background:#fafafa;}
.emk-tab{padding:10px 16px;border:none;border-bottom:2px solid transparent;background:transparent;cursor:pointer;font-size:12px;font-weight:600;color:var(--text3);white-space:nowrap;margin-bottom:-2px;transition:all .15s;}
.emk-tab:hover{color:var(--blue);background:#eff6ff;}
.emk-tab.on{color:var(--blue);border-bottom-color:var(--blue);background:#fff;}
.emk-body{flex:1;overflow-y:auto;padding:18px 20px;}
.emk-body::-webkit-scrollbar{width:4px;}
.emk-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
.emk-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px;}
.emk-card-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.emk-row{display:flex;gap:8px;margin-bottom:6px;font-size:12px;align-items:baseline;}
.emk-row .lbl{color:var(--text3);width:140px;flex-shrink:0;font-size:11px;}
.emk-row .val{font-weight:500;color:var(--text1);}
.emk-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
.emk-stat{background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;}
.emk-stat .sv{font-size:18px;font-weight:800;color:var(--blue);}
.emk-stat .sl{font-size:10px;color:var(--text3);margin-top:2px;}
.emk-visit-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;}
.emk-visit-row:last-child{border-bottom:none;}
.emk-alert{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:8px 14px;font-size:12px;color:#856404;margin-bottom:10px;}
.emk-add-form{background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:10px;}
.emk-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;}

</style></head><body>
  <h1>${t.title}</h1>
  <div class="sub">Клиника «АльтернативА» · ${new Date().toLocaleDateString('ru-RU')} · Врач: ${CU?CU.name:'—'}</div>
  <pre>${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
  <div class="footer">
    <span>АльтернативА МИС</span><span>Стр. 1</span>
  </div>
  <div style="margin-top:16px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;">🖨 Печатать</button>
    &nbsp;
    <button onclick="window.close()" style="padding:8px 20px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;">Закрыть</button>
  </div>
  
<!-- ═══ MODALS: NEW MODULES ═══ -->
<div class="ov" id="m-addplan"><div class="modal" style="width:540px;">
  <div class="mh"><div class="mt2">Новый план лечения</div><div class="mx" onclick="closeM('m-addplan')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="pl-patient"></select></div>
    <div class="fg"><label class="fl">Диагноз</label><input class="inp" id="pl-diag" placeholder="M17.1 Гонартроз..."></div>
    <div class="g2"><div class="fg"><label class="fl">Начало</label><input class="inp" type="date" id="pl-start"></div>
    <div class="fg"><label class="fl">Окончание (план)</label><input class="inp" type="date" id="pl-end"></div></div>
    <div class="fg"><label class="fl">Услуги в курсе</label>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px;" id="pl-svcs-check">
        <label class="cr"><input type="checkbox" value="PRP-терапия × 3"> PRP-терапия × 3</label>
        <label class="cr"><input type="checkbox" value="УЗИ-контроль × 2"> УЗИ-контроль × 2</label>
        <label class="cr"><input type="checkbox" value="ЛФК × 10"> ЛФК × 10</label>
        <label class="cr"><input type="checkbox" value="Массаж × 5"> Массаж × 5</label>
        <label class="cr"><input type="checkbox" value="Физиотерапия"> Физиотерапия</label>
      </div>
    </div>
    <div class="fg"><label class="fl">Цель лечения / примечание</label><textarea class="inp" id="pl-note" rows="2" placeholder="Снижение ВАШ до 2/10, восстановление ROM..."></textarea></div>
    <div class="fg"><label class="fl">Стоимость курса (₽)</label><input class="inp" type="number" id="pl-cost" placeholder="0"></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addplan')">Отмена</button><button class="btn bp" onclick="savePlan()">Создать план</button></div>
</div></div>

<div class="ov" id="m-addpay"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Принять оплату</div><div class="mx" onclick="closeM('m-addpay')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="pay-patient"></select></div>
    <div class="fg"><label class="fl">Услуга</label><select class="inp sel" id="pay-svc"></select></div>
    <div class="g2">
      <div class="fg"><label class="fl">Сумма (₽)</label><input class="inp" type="number" id="pay-sum" placeholder="0"></div>
      <div class="fg"><label class="fl">Способ оплаты</label>
        <select class="inp sel" id="pay-method"><option value="Наличные">Наличные</option><option value="Карта">Карта/Эквайринг</option><option value="Безнал">Безналичный</option></select>
      </div>
    </div>
    <div class="fg"><label class="fl">Примечание</label><input class="inp" id="pay-note" placeholder="Необязательно"></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addpay')">Отмена</button><button class="btn bp" onclick="savePayment()">Принять оплату</button></div>
</div></div>

<div class="ov" id="m-addtask"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Новая задача</div><div class="mx" onclick="closeM('m-addtask')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Название задачи</label><input class="inp" id="tk-title" placeholder="Позвонить пациенту, заказать расходники..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Приоритет</label>
        <select class="inp sel" id="tk-priority"><option value="Обычное">Обычное</option><option value="Важно">Важно</option><option value="Срочно">Срочно</option></select>
      </div>
      <div class="fg"><label class="fl">Срок</label><input class="inp" type="date" id="tk-due"></div>
    </div>
    <div class="fg"><label class="fl">Исполнитель</label>
      <select class="inp sel" id="tk-assignee">
        <option value="Шкарпов А.А.">Шкарпов А.А. (врач)</option>
        <option value="Администратор">Администратор</option>
        <option value="Горзина Л.П.">Горзина Л.П. (руководитель)</option>
      </select>
    </div>
    <div class="fg"><label class="fl">Описание</label><textarea class="inp" id="tk-desc" rows="2" placeholder="Подробности задачи..."></textarea></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addtask')">Отмена</button><button class="btn bp" onclick="saveTask()">Создать</button></div>
</div></div>

<div class="ov" id="m-addlead"><div class="modal" style="width:440px;">
  <div class="mh"><div class="mt2">Новый лид</div><div class="mx" onclick="closeM('m-addlead')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Имя / ФИО</label><input class="inp" id="lead-name" placeholder="Иванов Иван"></div>
    <div class="fg"><label class="fl">Телефон</label><input class="inp" id="lead-tel" placeholder="+7..."></div>
    <div class="fg"><label class="fl">Источник</label>
      <select class="inp sel" id="lead-src"><option>Сайт</option><option>Соцсети</option><option>Рекомендация</option><option>Звонок</option><option>Повторный</option><option>Другое</option></select>
    </div>
    <div class="fg"><label class="fl">Интерес</label><input class="inp" id="lead-interest" placeholder="PRP, консультация ортопеда..."></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addlead')">Отмена</button><button class="btn bp" onclick="saveLead()">Добавить</button></div>
</div></div>

<div class="ov" id="m-addbonus"><div class="modal" style="width:420px;">
  <div class="mh"><div class="mt2">Начислить бонусы</div><div class="mx" onclick="closeM('m-addbonus')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Пациент</label><select class="inp sel" id="bon-patient"></select></div>
    <div class="g2">
      <div class="fg"><label class="fl">Баллы</label><input class="inp" type="number" id="bon-pts" placeholder="0"></div>
      <div class="fg"><label class="fl">Причина</label><input class="inp" id="bon-reason" placeholder="За визит, акция..."></div>
    </div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addbonus')">Отмена</button><button class="btn bp" onclick="saveBonus()">Начислить</button></div>
</div></div>

<div class="ov" id="m-addscenario"><div class="modal" style="width:480px;">
  <div class="mh"><div class="mt2">Новый сценарий</div><div class="mx" onclick="closeM('m-addscenario')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Название</label><input class="inp" id="sc-name" placeholder="Напоминание о визите..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Триггер</label>
        <select class="inp sel" id="sc-trigger"><option>За 24ч до приёма</option><option>После приёма</option><option>Через 1 месяц без визита</option><option>День рождения</option><option>Завершение курса</option></select>
      </div>
      <div class="fg"><label class="fl">Канал</label>
        <select class="inp sel" id="sc-channel"><option>WhatsApp</option><option>SMS</option><option>Email</option><option>Telegram</option></select>
      </div>
    </div>
    <div class="fg"><label class="fl">Шаблон сообщения</label><textarea class="inp" id="sc-msg" rows="3" placeholder="Уважаемый {имя}, напоминаем о визите..."></textarea></div>
    <div style="display:flex;gap:6px;margin-top:4px;"><button class="btn bg xs" onclick="aiScenarioMsg()">🤖 AI-составить</button></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;"><button class="btn bg" onclick="closeM('m-addscenario')">Отмена</button><button class="btn bp" onclick="saveScenario()">Создать</button></div>
</div></div>

<!-- ADD STOCK (full CRUD) -->
<div class="ov" id="m-addstock"><div class="modal" style="width:460px;">
  <div class="mh"><div class="mt2">Приход на склад</div><div class="mx" onclick="closeM('m-addstock')">✕</div></div>
  <div class="mg">
    <div class="fg"><label class="fl">Наименование *</label><input class="inp" id="st-name" placeholder="Пробирки PRP ECO TUBE..."></div>
    <div class="g2">
      <div class="fg"><label class="fl">Категория</label><select class="inp sel" id="st-cat"><option>PRP</option><option>Анестетики</option><option>ГК</option><option>Расходники</option><option>Препараты</option></select></div>
      <div class="fg"><label class="fl">Ед. измерения</label><select class="inp sel" id="st-unit"><option>шт</option><option>мл</option><option>уп</option><option>кг</option></select></div>
    </div>
    <div class="g3">
      <div class="fg"><label class="fl">Количество</label><input class="inp" type="number" id="st-qty" placeholder="0"></div>
      <div class="fg"><label class="fl">Минимум</label><input class="inp" type="number" id="st-min" placeholder="5"></div>
      <div class="fg"><label class="fl">Цена (₽/ед)</label><input class="inp" type="number" id="st-price" placeholder="0"></div>
    </div>
    <div class="fg"><label class="fl">Поставщик</label><input class="inp" id="st-supplier" placeholder="ООО МедСнаб..."></div>
  </div>
  <div style="display:flex;gap:7px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--border);">
    <button class="btn" onclick="closeM('m-addstock')">Отмена</button>
    <button class="btn bp" onclick="saveStock()">Оприходовать</button>
  </div>
</div></div>
</body></html>`);
  w.document.close();
}

function saveDocx(){
  // Build DOCX as blob using the Blob + msSaveBlob approach via HTML→RTF workaround
  // We'll use the template body content
  const tplBody=document.getElementById('tpl-body');
  const docTxt=document.getElementById('doc-txt');
  let content='';
  let title='Документ АльтернативА';

  if(tplBody && tplBody.value.trim()){
    content=tplBody.value;
    title=(document.getElementById('tpl-title')||{}).textContent||title;
  } else if(docTxt && docTxt.textContent.trim()){
    content=docTxt.textContent;
    title='Сформированный документ';
  } else {
    toast('⚠️ Нет содержимого для сохранения. Откройте шаблон или сформируйте документ.');
    return;
  }
  generateDocxBlob(title, content, CU?CU.name:'—', new Date().toLocaleDateString('ru-RU'));
}

function savePatientDocx(id){
  PATIENTS=loadData('mis_patients',[]);
  const p=PATIENTS.find(x=>x.id===id);if(!p)return;
  const full=p.fam+(p.nam?' '+p.nam:'')+(p.pat?' '+p.pat:'');
  const age=p.dob?calcAge(p.dob)+'лет':'—';
  const content=`КАРТА ПАЦИЕНТА — ${full}\n\nДата: ${new Date().toLocaleDateString('ru-RU')}\n\nПЕРСОНАЛЬНЫЕ ДАННЫЕ:\nФИО: ${full}\nДата рождения: ${p.dob||'—'}\nВозраст: ${age}\nПол: ${p.sex||'—'}\nТелефон: ${p.tel||'—'}\nEmail: ${p.email||'—'}\nИсточник: ${p.src||'—'}\nДата регистрации: ${p.created||'—'}\n\nКЛИНИЧЕСКИЕ ДАННЫЕ:\nДиагноз (МКБ-10): ${p.diag||'—'}\nСтатус: ${p.status||'—'}\nСледующий визит: ${p.next||'—'}\n\nПримечания:\n${p.note||'—'}\n\n\nВрач: ${CU?CU.name:'___________'}         Подпись: ___________`;
  generateDocxBlob('Карта пациента — '+full, content, CU?CU.name:'—', new Date().toLocaleDateString('ru-RU'));
}

function generateDocxBlob(title, content, doctor, date){
  // RTF-based Word-compatible document (opens in Word/LibreOffice)
  const lines = content.split('\n');
  let rtfContent = '{\\rtf1\\ansi\\deff0\n';
  rtfContent += '{\\fonttbl{\\f0\\froman\\fcharset204 Times New Roman;}{\\f1\\fswiss\\fcharset204 Arial;}\n}\n';
  rtfContent += '{\\colortbl;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}\n';
  rtfContent += '\\paperw11906\\paperh16838\\margl1800\\margr1800\\margt1440\\margb1440\n';
  // Header
  rtfContent += '{\\header\\pard\\qr\\f1\\fs18\\cf2 '+escRtf('АльтернативА МИС · '+date)+'\\par}\n';
  // Title
  rtfContent += '\\pard\\qc\\f0\\fs28\\b '+escRtf(title)+'\\b0\\par\n';
  rtfContent += '\\pard\\ql\\f1\\fs18\\cf2 '+escRtf('Врач: '+doctor+' · '+date)+'\\par\n';
  rtfContent += '\\pard\\ql\\fs18 \\par\n';
  // Body
  for(const line of lines){
    const trimmed = line.trim();
    if(!trimmed){ rtfContent += '\\pard\\fs20 \\par\n'; continue; }
    const isBold = /^[А-ЯЁA-Z][А-ЯЁA-Z\s]+:/.test(trimmed) || /^[═─]+/.test(trimmed);
    rtfContent += '\\pard\\ql\\f0\\fs20'+(isBold?'\\b ':' ')+escRtf(trimmed)+(isBold?'\\b0':' ')+'\\par\n';
  }
  // Footer
  rtfContent += '\\pard\\ql\\fs18 \\par\n';
  rtfContent += '\\pard\\ql\\f1\\fs18\\cf2 '+escRtf('Подпись врача: ________________     Печать: ________________')+'\\par\n';
  rtfContent += '}';
  
  const blob = new Blob([rtfContent], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/[^a-zA-Zа-яёА-ЯЁ0-9\s]/g,'').trim()+'.doc';
  a.click();
  URL.revokeObjectURL(url);
  toast('💾 Документ сохранён: '+a.download);
}

function escRtf(s){
  if(!s)return '';
  let r='';
  for(const ch of s){
    const code=ch.charCodeAt(0);
    if(code<128){
      if(ch==='\\'||ch==='{' ||ch==='}')r+='\\'+ch;
      else r+=ch;
    } else {
      // Unicode: use \uN? form
      r+='\\u'+code+'?';
    }
  }
  return r;
}

// ═══════════════════════════════════════════
// ═══ INIT ═══
document.addEventListener('DOMContentLoaded',()=>{
  // Init schedule
  if(document.getElementById('sched-grid')) renderSched();
  // Restore API key
  const savedKey=localStorage.getItem('mis_api_key');
  if(savedKey){
    const inp=document.getElementById('api-key-inp');
    if(inp)inp.value=savedKey;
    (document.getElementById('api-key-bar')||{}).classList.add('hidden');
  }
  const t=TPLS['ortho'];
  const tb=document.getElementById('tpl-body');
  if(tb){document.getElementById('tpl-title').textContent=t.title;document.getElementById('tpl-desc').textContent=t.desc;tb.textContent=t.body;}
  // set today date on visit modal
  const nvd=document.getElementById('nv-date');
  if(nvd)nvd.value=new Date().toISOString().split('T')[0];
});

// ═══════════════════════════════════════════════════════
// ЭМК — ЭЛЕКТРОННАЯ МЕДИЦИНСКАЯ КАРТА
// ═══════════════════════════════════════════════════════
let EMK_PID = null;

const ST_LABEL = {wait:'Ожидает',conf:'Подтверждён',here:'Пришёл',done:'Завершён',cancel:'Отменён'};
const ST_BG    = {wait:'#fef9c3',conf:'#dbeafe',here:'#dcfce7',done:'#f1f5f9',cancel:'#fee2e2'};
const ST_CLR   = {wait:'#92400e',conf:'#1e3a5f',here:'#14532d',done:'#475569',cancel:'#7f1d1d'};
const ST_DOT   = {wait:'#f59e0b',conf:'#3b82f6',here:'#22c55e',done:'#94a3b8',cancel:'#ef4444'};
const ST_ICON  = {wait:'⏳',conf:'📋',here:'🏥',done:'✅',cancel:'❌'};

  const pts = loadData('mis_patients',[]);
  const p   = pts.find(x=>x.id===ptId);
  if(!p){ toast('Пациент не найден'); return; }

  // Шапка
  const full = (p.fam||'')+(p.nam?' '+p.nam:'')+(p.pat?' '+p.pat:'');
  const ini  = full.trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
  const avEl = document.getElementById('emk-av');
  if(avEl){ avEl.textContent=ini||'??'; }

  const nameEl = document.getElementById('emk-name');
  if(nameEl) nameEl.textContent = full||'Пациент';

  const age = calcAge(p.dob);
  const metaEl = document.getElementById('emk-meta');
  if(metaEl){
    const parts=[];
    if(p.dob) parts.push(p.dob);
    if(age)   parts.push(age+' лет');
    if(p.sex) parts.push(p.sex);
    if(p.tel) parts.push('📞 '+p.tel);
    if(p.email) parts.push('✉️ '+p.email);
    metaEl.textContent = parts.join('  ·  ');
  }

  const algEl = document.getElementById('emk-allergy-badge');
  if(algEl) algEl.style.display = p.allergy ? 'block' : 'none';

  // сброс на первую вкладку
  document.querySelectorAll('.emk-tab').forEach(t=>t.classList.remove('on'));
  const first = document.querySelector('.emk-tab');
  if(first) first.classList.add('on');
  _emkRender('overview');

  openM('m-emk');
}

  const pts = loadData('mis_patients',[]);
  const p   = pts.find(x=>x.id===EMK_PID);
  if(!p){ body.innerHTML='<div style="color:red;padding:20px;">Пациент не найден</div>'; return; }

  body.innerHTML = tab==='overview' ? _emkOverview(p)
    : tab==='visits'  ? _emkVisits(p)
    : tab==='diags'   ? _emkDiags(p)
    : tab==='labs'    ? _emkLabs(p)
    : tab==='protos'  ? _emkProtos(p)
    : tab==='meds'    ? _emkMeds(p)
    : tab==='files'   ? _emkFiles(p)
    : tab==='finance' ? _emkFinance(p)
    : '';
}

/* ════════════════════════════════════════
   ВКЛАДКА: ОБЗОР
════════════════════════════════════════ */
function _emkOverview(p){
  const appts = loadData('mis_appts',[]).filter(a=>a.ptId===p.id);
  const pays  = loadData('mis_payments',[]).filter(x=>x.ptId===p.id);
  const total = pays.reduce((s,x)=>s+(parseFloat(x.sum)||0),0);
  const done  = appts.filter(a=>a.status==='done').length;
  const next  = appts.filter(a=>(a.status==='wait'||a.status==='conf')&&a.date>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const age   = calcAge(p.dob);

  return `
  ${p.allergy?'<div class="emk-alert">⚠️ <b>Аллергия:</b> '+p.allergy+'</div>':''}
  ${p.drugs?'<div class="emk-alert" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;">💊 <b>Принимает:</b> '+p.drugs+'</div>':''}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
    <div class="emk-card">
      <div class="emk-card-title">Личные данные</div>
      <div class="emk-row"><span class="lbl">ФИО</span><span class="val"><b>${(p.fam||'')+(p.nam?' '+p.nam:'')+(p.pat?' '+p.pat:'')}</b></span></div>
      <div class="emk-row"><span class="lbl">Дата рождения</span><span class="val">${p.dob||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Возраст</span><span class="val">${age?age+' лет':'—'}</span></div>
      <div class="emk-row"><span class="lbl">Пол</span><span class="val">${p.sex||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Телефон</span><span class="val">${p.tel||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Email</span><span class="val">${p.email||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Источник</span><span class="val">${p.src||p.source||'—'}</span></div>
    </div>
    <div class="emk-card">
      <div class="emk-card-title">Медицинская информация</div>
      <div class="emk-row"><span class="lbl">Диагноз МКБ-10</span><span class="val" style="color:var(--blue);font-weight:700;">${p.diag||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Аллергия</span><span class="val" style="color:${p.allergy?'#ef4444':'#22c55e'};font-weight:600;">${p.allergy||'Нет'}</span></div>
      <div class="emk-row"><span class="lbl">Препараты</span><span class="val">${p.drugs||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Соп. заболевания</span><span class="val">${p.comorbid||'—'}</span></div>
      <div class="emk-row"><span class="lbl">Лечащий врач</span><span class="val">${p.doc||'Шкарпов А.А.'}</span></div>
      <div class="emk-row"><span class="lbl">Статус</span><span class="val"><span class="b b-gr" style="font-size:10px;">${p.status||'Активный'}</span></span></div>
    </div>
  </div>

  <div class="emk-stats">
    <div class="emk-stat"><div style="font-size:22px;">🗓</div><div class="sv">${appts.length}</div><div class="sl">Всего визитов</div></div>
    <div class="emk-stat"><div style="font-size:22px;">✅</div><div class="sv">${done}</div><div class="sl">Завершено</div></div>
    <div class="emk-stat"><div style="font-size:22px;">💰</div><div class="sv">${total.toLocaleString('ru-RU')} ₽</div><div class="sl">Оплачено</div></div>
    <div class="emk-stat"><div style="font-size:22px;">📅</div><div class="sv" style="font-size:13px;">${next?next.date:'—'}</div><div class="sl">Следующий визит</div></div>
  </div>

  <!-- Последние визиты -->
  <div class="emk-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div class="emk-card-title" style="margin:0;">Последние визиты</div>
      <button class="btn" style="font-size:11px;" onclick="emkTab('visits',null)">Все →</button>
    </div>
    ${appts.length===0?'<div style="color:var(--text3);font-size:12px;text-align:center;padding:16px;">Визитов нет</div>':
    appts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(a=>`
    <div class="emk-visit-row">
      <div style="width:8px;height:8px;border-radius:50%;background:${ST_DOT[a.status]||'#94a3b8'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.svc||'Визит'}</div>
        <div style="font-size:11px;color:var(--text3);">${a.date} ${a.time||''} · ${a.doc||'—'}</div>
      </div>
      <span class="emk-badge" style="background:${ST_BG[a.status]||'#f1f5f9'};color:${ST_CLR[a.status]||'#475569'};">${ST_LABEL[a.status]||a.status}</span>
      <button class="btn" style="font-size:10px;padding:2px 7px;" onclick="emkOpenApptProto('${a.id}')">📋</button>
    </div>`).join('')}
  </div>

  <!-- Заметки врача -->
  <div class="emk-card">
    <div class="emk-card-title">📝 Заметки врача</div>
    <textarea id="emk-notes" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;min-height:72px;resize:vertical;font-family:inherit;" placeholder="Клинические наблюдения, особенности...">${p.notes||''}</textarea>
    <button class="btn bp" style="font-size:12px;margin-top:7px;" onclick="emkSaveNotes()">💾 Сохранить</button>
  </div>`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ВИЗИТЫ
════════════════════════════════════════ */
function _emkVisits(p){
  const appts = loadData('mis_appts',[]).filter(a=>a.ptId===p.id).sort((a,b)=>b.date.localeCompare(a.date));
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:700;">История визитов <span style="font-size:12px;color:var(--text3);font-weight:400;">(${appts.length})</span></div>
    <button class="btn bp" style="font-size:12px;" onclick="emkNewVisit()">＋ Записать</button>
  </div>`;

  if(!appts.length) return html+`<div style="text-align:center;padding:50px;color:var(--text3);">
    <div style="font-size:48px;margin-bottom:12px;">🗓</div>
    <div style="font-size:14px;font-weight:600;">Визитов нет</div>
    <button class="btn bp" style="margin-top:12px;" onclick="emkNewVisit()">＋ Первая запись</button>
  </div>`;

  html += appts.map(a=>`
  <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
    <div style="width:38px;height:38px;border-radius:8px;background:${ST_BG[a.status]||'#f1f5f9'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${ST_ICON[a.status]||'📅'}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.svc||'Визит'}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px;">📅 ${a.date} ${a.time||''} &nbsp;·&nbsp; 👨‍⚕️ ${a.doc||'—'}${a.note?' &nbsp;·&nbsp; 💬 '+a.note:''}</div>
    </div>
    <select style="font-size:11px;border:1px solid var(--border);border-radius:7px;padding:3px 6px;" onchange="emkChangeApptStatus('${a.id}',this.value)">
      ${Object.keys(ST_LABEL).map(k=>`<option value="${k}" ${a.status===k?'selected':''}>${ST_LABEL[k]}</option>`).join('')}
    </select>
    <button class="btn bg" style="font-size:11px;padding:4px 8px;" onclick="emkOpenApptProto('${a.id}')">📋 Протокол</button>
    <button class="btn bd" style="font-size:11px;padding:4px 8px;" onclick="emkDelAppt('${a.id}')">✕</button>
  </div>`).join('');
  return html;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ДИАГНОЗЫ
════════════════════════════════════════ */
function _emkDiags(p){
  const diags = loadData('mis_diags_'+p.id,[]);
  const typeLabel={main:'Основной',comorbid:'Сопутствующий',add:'Дополнительный'};
  const typeBg={main:'#dbeafe',comorbid:'#fef9c3',add:'#f1f5f9'};
  const typeClr={main:'#1e3a5f',comorbid:'#78350f',add:'#475569'};

  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:700;">Диагнозы МКБ-10</div>
    <button class="btn bp" style="font-size:12px;" onclick="document.getElementById('emk-diag-form').style.display='block'">＋ Добавить</button>
  </div>

  ${p.diag?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:12px;">
    <div style="font-size:10px;color:#1e40af;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Основной диагноз (из карточки)</div>
    <div style="font-size:15px;font-weight:700;color:#1e3a5f;">${p.diag}</div>
  </div>`:''}

  ${diags.map(d=>`
  <div class="emk-card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:8px;">
    <span class="emk-badge" style="background:${typeBg[d.type]||'#f1f5f9'};color:${typeClr[d.type]||'#475569'};">${typeLabel[d.type]||d.type}</span>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:700;">${d.code} — ${d.name}</div>
      <div style="font-size:11px;color:var(--text3);">${d.date||'—'} · ${d.doc||'—'}</div>
    </div>
    <button class="btn bd" style="font-size:11px;" onclick="emkDelDiag('${p.id}','${d.id}')">✕</button>
  </div>`).join('')}

  ${!diags.length&&!p.diag?`<div style="text-align:center;padding:40px;color:var(--text3);"><div style="font-size:48px;">🔍</div><div style="margin-top:8px;">Диагнозов нет</div></div>`:''}

  <div class="emk-add-form" id="emk-diag-form" style="display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Новый диагноз</div>
    <div style="display:grid;grid-template-columns:140px 1fr 160px;gap:8px;margin-bottom:8px;">
      <input class="fc" id="dg-code" placeholder="M17.1" style="padding:6px 10px;font-size:12px;">
      <input class="fc" id="dg-name" placeholder="Гонартроз правого коленного сустава, 2 ст." style="padding:6px 10px;font-size:12px;">
      <select class="fc sel" id="dg-type" style="padding:6px 10px;font-size:12px;">
        <option value="main">Основной</option>
        <option value="comorbid">Сопутствующий</option>
        <option value="add">Дополнительный</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn bp" style="font-size:12px;" onclick="emkSaveDiag('${p.id}')">Добавить</button>
      <button class="btn" style="font-size:12px;" onclick="document.getElementById('emk-diag-form').style.display='none'">Отмена</button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: АНАЛИЗЫ
════════════════════════════════════════ */
function _emkLabs(p){
  const labs = loadData('mis_labs_'+p.id,[]);
  const sIcon={norm:'✅',high:'⬆️',low:'⬇️',warn:'⚠️'};
  const sClr ={norm:'#22c55e',high:'#ef4444',low:'#3b82f6',warn:'#f59e0b'};

  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:700;">Лабораторные данные</div>
    <button class="btn bp" style="font-size:12px;" onclick="document.getElementById('emk-lab-form').style.display='block'">＋ Добавить</button>
  </div>

  ${labs.length?`<div class="emk-card" style="padding:0;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;">
      <thead style="background:#f8fafc;">
        <tr>${['Показатель','Значение','Норма','Статус','Дата',''].map(h=>`<th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${labs.map(l=>`<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:9px 12px;font-size:12px;font-weight:600;">${l.name}</td>
          <td style="padding:9px 12px;font-size:13px;font-weight:800;color:${sClr[l.status]||'#0f172a'};">${l.value} <span style="font-size:10px;font-weight:400;">${l.unit||''}</span></td>
          <td style="padding:9px 12px;font-size:11px;color:var(--text3);">${l.norm||'—'}</td>
          <td style="padding:9px 12px;font-size:12px;">${sIcon[l.status]||'—'} ${l.status==='norm'?'Норма':l.status==='high'?'Выше':l.status==='low'?'Ниже':'Внимание'}</td>
          <td style="padding:9px 12px;font-size:11px;color:var(--text3);">${l.date||'—'}</td>
          <td style="padding:9px 12px;"><button class="btn bd" style="font-size:10px;" onclick="emkDelLab('${p.id}','${l.id}')">✕</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`:
  `<div style="text-align:center;padding:40px;color:var(--text3);"><div style="font-size:48px;">🧪</div><div style="margin-top:8px;">Анализов нет</div></div>`}

  <div class="emk-add-form" id="emk-lab-form" style="display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Добавить показатель</div>
    <div style="display:grid;grid-template-columns:2fr 100px 100px 140px 130px;gap:8px;margin-bottom:8px;">
      <input class="fc" id="lb-name" placeholder="Тромбоциты" style="padding:6px 10px;font-size:12px;">
      <input class="fc" id="lb-val" placeholder="234" style="padding:6px 10px;font-size:12px;">
      <input class="fc" id="lb-unit" placeholder="×10⁹/л" style="padding:6px 10px;font-size:12px;">
      <input class="fc" id="lb-norm" placeholder="150–400" style="padding:6px 10px;font-size:12px;">
      <select class="fc sel" id="lb-status" style="padding:6px 10px;font-size:12px;">
        <option value="norm">Норма</option><option value="high">Выше нормы</option>
        <option value="low">Ниже нормы</option><option value="warn">Внимание</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn bp" style="font-size:12px;" onclick="emkSaveLab('${p.id}')">Добавить</button>
      <button class="btn" style="font-size:12px;" onclick="document.getElementById('emk-lab-form').style.display='none'">Отмена</button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ПРОТОКОЛЫ
════════════════════════════════════════ */
function _emkProtos(p){
  const all = loadData('mis_protocols',[]).filter(x=>x.ptId===p.id);
  const typeLabel={consult:'Осмотр',prp:'PRP-терапия',inject:'Инъекция / блокада',
    uzi:'УЗИ суставов',massage:'Массаж',iv:'Инфузия',pod:'Подология',svf:'SVF-терапия',rehab2:'Реабилитация / ЛФК'};
  const typeIcon={consult:'🩺',prp:'💉',inject:'💊',uzi:'🔬',massage:'🤲',iv:'💧',pod:'🦶',svf:'🧬',rehab2:'🏃'};

  if(!all.length) return `<div style="text-align:center;padding:50px;color:var(--text3);">
    <div style="font-size:48px;">📄</div>
    <div style="font-size:14px;font-weight:600;margin-top:12px;">Протоколов нет</div>
    <div style="font-size:12px;margin-top:6px;">Они сохраняются после выполнения процедур</div>
  </div>`;

  return `<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Протоколы процедур (${all.length})</div>
  ${all.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(pr=>`
  <div class="emk-card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:8px;">
    <div style="font-size:28px;">${typeIcon[pr.type]||'📄'}</div>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:700;">${typeLabel[pr.type]||pr.type}</div>
      <div style="font-size:11px;color:var(--text3);">${pr.date||'—'} · ${pr.doc||'—'}</div>
    </div>
    <button class="btn bg" style="font-size:11px;" onclick="toast('🖨 Функция печати протокола')">🖨 Печать</button>
  </div>`).join('')}`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ПРЕПАРАТЫ
════════════════════════════════════════ */
function _emkMeds(p){
  const meds = loadData('mis_meds_'+p.id,[]);

  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:700;">Назначения / Препараты</div>
    <button class="btn bp" style="font-size:12px;" onclick="document.getElementById('emk-med-form').style.display='block'">＋ Назначить</button>
  </div>

  ${p.drugs?`<div class="emk-alert">💊 <b>Текущие препараты (со слов пациента):</b> ${p.drugs}</div>`:''}

  ${meds.length?meds.map(m=>`
  <div class="emk-card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:8px;">
    <div style="font-size:24px;">💊</div>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:700;">${m.name}${m.dose?' &nbsp;'+m.dose:''}</div>
      <div style="font-size:11px;color:var(--text3);">${m.scheme||''} ${m.until?' · до '+m.until:''} · ${m.doc||'—'}</div>
    </div>
    <span class="emk-badge" style="background:${m.active?'#dcfce7':'#f1f5f9'};color:${m.active?'#14532d':'#64748b'};">${m.active?'Активно':'Отменено'}</span>
    <button class="btn" style="font-size:10px;" onclick="emkToggleMed('${p.id}','${m.id}')">${m.active?'Отменить':'Возобновить'}</button>
    <button class="btn bd" style="font-size:11px;" onclick="emkDelMed('${p.id}','${m.id}')">✕</button>
  </div>`).join('')
  :`<div style="text-align:center;padding:40px;color:var(--text3);"><div style="font-size:48px;">💊</div><div style="margin-top:8px;">Назначений нет</div></div>`}

  <div class="emk-add-form" id="emk-med-form" style="display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Новое назначение</div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:8px;">
      <input class="fc" id="md-name" placeholder="Мелоксикам" style="padding:6px 10px;font-size:12px;">
      <input class="fc" id="md-dose" placeholder="7.5 мг" style="padding:6px 10px;font-size:12px;">
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:8px;">
      <input class="fc" id="md-scheme" placeholder="1 раз/день, утром, после еды, 10 дней" style="padding:6px 10px;font-size:12px;">
      <input class="fc" type="date" id="md-until" style="padding:6px 10px;font-size:12px;">
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn bp" style="font-size:12px;" onclick="emkSaveMed('${p.id}')">Назначить</button>
      <button class="btn" style="font-size:12px;" onclick="document.getElementById('emk-med-form').style.display='none'">Отмена</button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ФАЙЛЫ
════════════════════════════════════════ */
function _emkFiles(p){
  const files = loadData('mis_files_'+p.id,[]);

  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:700;">Документы и файлы</div>
    <label class="btn bp" style="font-size:12px;cursor:pointer;">
      ＋ Загрузить
      <input type="file" multiple style="display:none;" onchange="emkUpload(event,'${p.id}')">
    </label>
  </div>

  ${!files.length?`<div style="text-align:center;padding:50px;color:var(--text3);">
    <div style="font-size:48px;">📎</div>
    <div style="font-size:14px;font-weight:600;margin-top:12px;">Файлов нет</div>
    <div style="font-size:12px;margin-top:6px;">Загружайте снимки МРТ, рентген, анализы, согласия</div>
    <label class="btn bp" style="margin-top:14px;cursor:pointer;display:inline-block;">
      ＋ Загрузить файл <input type="file" multiple style="display:none;" onchange="emkUpload(event,'${p.id}')">
    </label>
  </div>`:''}

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
  ${files.map(f=>{
    const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    const isPdf = /\.pdf$/i.test(f.name);
    const ico = isImg?'🖼️':isPdf?'📄':'📎';
    const sz = f.size>1024*1024?(f.size/1024/1024).toFixed(1)+' МБ':f.size>1024?Math.round(f.size/1024)+' КБ':f.size+' Б';
    return `<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;position:relative;">
      <div style="font-size:36px;margin-bottom:6px;">${ico}</div>
      <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${f.name}">${f.name}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">${sz} · ${f.date}</div>
      <button class="btn bd" style="font-size:10px;margin-top:7px;width:100%;" onclick="emkDelFile('${p.id}','${f.id}')">Удалить</button>
    </div>`;
  }).join('')}
  </div>`;
}

/* ════════════════════════════════════════
   ВКЛАДКА: ФИНАНСЫ
════════════════════════════════════════ */
function _emkFinance(p){
  const pays = loadData('mis_payments',[]).filter(x=>x.ptId===p.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total = pays.reduce((s,x)=>s+(parseFloat(x.sum)||0),0);
  const avg   = pays.length ? Math.round(total/pays.length) : 0;
  const mIcon = {Наличные:'💵',Карта:'💳',Безнал:'🏦'};

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
    <div class="emk-stat"><div style="font-size:22px;">💰</div><div class="sv">${total.toLocaleString('ru-RU')} ₽</div><div class="sl">Оплачено всего</div></div>
    <div class="emk-stat"><div style="font-size:22px;">🧾</div><div class="sv">${pays.length}</div><div class="sl">Оплат</div></div>
    <div class="emk-stat"><div style="font-size:22px;">📊</div><div class="sv">${avg.toLocaleString('ru-RU')} ₽</div><div class="sl">Средний чек</div></div>
  </div>

  <div class="emk-card" style="padding:0;overflow:hidden;">
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;">История оплат</div>
    ${!pays.length?'<div style="padding:24px;text-align:center;color:var(--text3);">Оплат нет</div>':''}
    ${pays.map(pay=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:20px;">${mIcon[pay.method]||'💰'}</div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:600;">${pay.svc||'Оплата'}</div>
        <div style="font-size:11px;color:var(--text3);">${pay.date||'—'} · ${pay.method||'—'} · ${pay.doc||'—'}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:#22c55e;">${(parseFloat(pay.sum)||0).toLocaleString('ru-RU')} ₽</div>
    </div>`).join('')}
  </div>`;
}

/* ════════════════════════════════════════
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
════════════════════════════════════════ */
function emkSaveNotes(){
  const pts=loadData('mis_patients',[]);
  const p=pts.find(x=>x.id===EMK_PID); if(!p) return;
  const ta=document.getElementById('emk-notes');
  if(ta) p.notes=ta.value;
  saveData('mis_patients',pts);
  toast('✅ Заметки сохранены');
}

function emkNewVisit(){
  closeM('m-emk');
  setTimeout(()=>{
    if(typeof populateNVPatients==='function') populateNVPatients();
    if(typeof populateNVServices==='function') populateNVServices();
    const dIn=document.getElementById('nv-date2');
    if(dIn&&!dIn.value) dIn.value=new Date().toISOString().slice(0,10);
    const sel=document.getElementById('nv-pt2');
    if(sel&&EMK_PID) for(let i=0;i<sel.options.length;i++) if(sel.options[i].value===EMK_PID){sel.selectedIndex=i;break;}
    openM('m-newvisit2');
  },250);
}

function emkEditPt(){
  closeM('m-emk');
  setTimeout(()=>{ if(typeof editPatient==='function') editPatient(EMK_PID); },200);
}

function emkPrint(){
  const nm=document.getElementById('emk-name');
  const mt=document.getElementById('emk-meta');
  const bd=document.getElementById('emk-body');
  if(!bd) return;
  const win=window.open('','_blank','width=900,height=700');
  if(!win) return;
  win.document.write('<html><head><title>ЭМК</title><style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #ccc;padding:6px;} button,input[type=file],label{display:none!important;} select{border:none;}</style></head><body>');
  win.document.write('<h2>'+(nm?nm.textContent:'ЭМК')+'</h2>');
  win.document.write('<p style="color:#666;">'+(mt?mt.textContent:'')+'</p><hr>');
  win.document.write(bd.innerHTML);
  win.document.write('<script>window.print();<\/script></body></html>');
  win.document.close();
}

function emkChangeApptStatus(apptId, status){
  const appts=loadData('mis_appts',[]);
  const a=appts.find(x=>x.id===apptId); if(!a) return;
  a.status=status;
  saveData('mis_appts',appts);
  if(typeof renderSched==='function') renderSched();
  toast('✅ Статус обновлён: '+ST_LABEL[status]);
}

function emkDelAppt(apptId){
  if(!confirm('Удалить эту запись?')) return;
  let appts=loadData('mis_appts',[]);
  appts=appts.filter(x=>x.id!==apptId);
  saveData('mis_appts',appts);
  if(typeof renderSched==='function') renderSched();
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===EMK_PID);
  if(p) _emkRender('visits');
  toast('🗑 Запись удалена');
}

function emkOpenApptProto(apptId){
  const appts=loadData('mis_appts',[]);
  const a=appts.find(x=>x.id===apptId); if(!a) return;
  if(typeof openServiceProtocol==='function') openServiceProtocol(a);
}

// Диагнозы
function emkSaveDiag(ptId){
  const code=document.getElementById('dg-code');
  const name=document.getElementById('dg-name');
  const type=document.getElementById('dg-type');
  if(!code||!code.value.trim()){toast('⚠️ Укажите код МКБ-10');return;}
  const diags=loadData('mis_diags_'+ptId,[]);
  diags.push({id:'d_'+Date.now(),code:code.value.trim(),name:name?name.value:'',
    type:type?type.value:'add',date:new Date().toLocaleDateString('ru-RU'),doc:CU?CU.name:''});
  saveData('mis_diags_'+ptId,diags);
  if(type&&type.value==='main'){
    const pts=loadData('mis_patients',[]);
    const p=pts.find(x=>x.id===ptId);
    if(p){p.diag=code.value.trim()+(name&&name.value?' — '+name.value:'');saveData('mis_patients',pts);}
  }
  code.value=''; if(name) name.value='';
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('diags');
  toast('✅ Диагноз добавлен');
}
function emkDelDiag(ptId,id){
  let d=loadData('mis_diags_'+ptId,[]); d=d.filter(x=>x.id!==id);
  saveData('mis_diags_'+ptId,d);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('diags'); toast('🗑 Удалено');
}

// Анализы
function emkSaveLab(ptId){
  const name=document.getElementById('lb-name');
  if(!name||!name.value.trim()){toast('⚠️ Укажите название показателя');return;}
  const labs=loadData('mis_labs_'+ptId,[]);
  labs.push({id:'l_'+Date.now(),name:name.value.trim(),
    value:(document.getElementById('lb-val')||{value:''}).value,
    unit:(document.getElementById('lb-unit')||{value:''}).value,
    norm:(document.getElementById('lb-norm')||{value:''}).value,
    status:(document.getElementById('lb-status')||{value:'norm'}).value,
    date:new Date().toLocaleDateString('ru-RU')});
  saveData('mis_labs_'+ptId,labs);
  name.value='';
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('labs'); toast('✅ Показатель добавлен');
}
function emkDelLab(ptId,id){
  let d=loadData('mis_labs_'+ptId,[]); d=d.filter(x=>x.id!==id);
  saveData('mis_labs_'+ptId,d);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('labs'); toast('🗑 Удалено');
}

// Препараты
function emkSaveMed(ptId){
  const name=document.getElementById('md-name');
  if(!name||!name.value.trim()){toast('⚠️ Укажите препарат');return;}
  const meds=loadData('mis_meds_'+ptId,[]);
  meds.push({id:'m_'+Date.now(),name:name.value.trim(),
    dose:(document.getElementById('md-dose')||{value:''}).value,
    scheme:(document.getElementById('md-scheme')||{value:''}).value,
    until:(document.getElementById('md-until')||{value:''}).value,
    doc:CU?CU.name:'',active:true,date:new Date().toLocaleDateString('ru-RU')});
  saveData('mis_meds_'+ptId,meds);
  name.value='';
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('meds'); toast('✅ Назначение добавлено');
}
function emkToggleMed(ptId,id){
  const meds=loadData('mis_meds_'+ptId,[]);
  const m=meds.find(x=>x.id===id); if(!m) return;
  m.active=!m.active;
  saveData('mis_meds_'+ptId,meds);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('meds'); toast(m.active?'✅ Возобновлено':'⛔ Отменено');
}
function emkDelMed(ptId,id){
  let d=loadData('mis_meds_'+ptId,[]); d=d.filter(x=>x.id!==id);
  saveData('mis_meds_'+ptId,d);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('meds'); toast('🗑 Удалено');
}

// Файлы
function emkUpload(event,ptId){
  const files=event.target.files; if(!files||!files.length) return;
  const stored=loadData('mis_files_'+ptId,[]);
  Array.from(files).forEach(f=>{
    stored.push({id:'f_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      name:f.name,size:f.size,type:f.type,date:new Date().toLocaleDateString('ru-RU')});
  });
  saveData('mis_files_'+ptId,stored);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('files'); toast('✅ Загружено: '+files.length+' файл(ов)');
}
function emkDelFile(ptId,id){
  let d=loadData('mis_files_'+ptId,[]); d=d.filter(x=>x.id!==id);
  saveData('mis_files_'+ptId,d);
  const pts=loadData('mis_patients',[]); const p=pts.find(x=>x.id===ptId);
  if(p) _emkRender('files'); toast('🗑 Файл удалён');
}


// ═══════════════════════════════════════════════════════
// РАБОЧИЙ СТОЛ ВРАЧА — DOCTOR WORKSPACE
// ═══════════════════════════════════════════════════════

function renderDoctor(){
  const page = document.getElementById('p-doctor');
  if(!page) return;
  page.innerHTML = buildDoctorPage();
  initDoctorPage();
}

function buildDoctorPage(){
  const today = new Date();
  const isoToday = today.toISOString().slice(0,10);
  const todayStr = today.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  const docName = CU ? CU.name : 'Врач';
  const docInitials = CU ? CU.initials : '??';

  const appts = loadData('mis_appts',[]);
  const todayAppts = appts.filter(a=>a.date===isoToday && a.status!=='cancel').sort((a,b)=>a.time.localeCompare(b.time));
  const pts = loadData('mis_patients',[]);
  const tasks = loadData('mis_tasks',[]).filter(t=>!t.done&&(t.assignee===docName||t.assignee==='Все'));
  const protos = loadData('mis_protocols',[]);
  const todayDone = todayAppts.filter(a=>a.status==='done').length;
  const todayWait = todayAppts.filter(a=>a.status==='wait'||a.status==='conf'||a.status==='here').length;
  const nextAppt = todayAppts.find(a=>a.status==='wait'||a.status==='conf'||a.status==='here');

  return `
  <style>
  .dr-wrap{display:flex;flex-direction:column;gap:0;min-height:100%;}
  .dr-header{background:linear-gradient(135deg,#1e3a5f 0%,#2d5a9e 50%,#4a6cf7 100%);border-radius:16px;padding:22px 26px;margin-bottom:16px;color:#fff;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden;}
  .dr-header::before{content:'';position:absolute;right:-30px;top:-30px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06);}
  .dr-header::after{content:'';position:absolute;right:60px;bottom:-40px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.04);}
  .dr-av{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0;z-index:1;}
  .dr-info{flex:1;z-index:1;}
  .dr-name{font-family:var(--serif);font-size:20px;font-weight:700;margin-bottom:3px;}
  .dr-sub{font-size:12px;opacity:.75;}
  .dr-stats-mini{display:flex;gap:16px;z-index:1;}
  .dr-sm{text-align:center;}
  .dr-sm-v{font-size:22px;font-weight:800;}
  .dr-sm-l{font-size:10px;opacity:.7;margin-top:1px;}

  .dr-grid{display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:start;}
  @media(max-width:900px){.dr-grid{grid-template-columns:1fr;}}

  .dr-panel{background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;}
  .dr-ph{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);background:#fafafa;}
  .dr-ph-title{font-size:13px;font-weight:700;color:var(--text1);display:flex;align-items:center;gap:6px;}
  .dr-ph-sub{font-size:11px;color:var(--text3);}
  .dr-pb{padding:0;}

  .dr-apt-row{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .12s;position:relative;}
  .dr-apt-row:last-child{border-bottom:none;}
  .dr-apt-row:hover{background:#f8fafc;}
  .dr-apt-row.apt-here{background:#f0fdf4;}
  .dr-apt-row.apt-done{opacity:.55;}
  .dr-apt-row.apt-next{background:#eff6ff;border-left:3px solid var(--blue);}

  .dr-apt-time{font-size:11px;font-weight:800;color:var(--text2);width:38px;flex-shrink:0;text-align:center;}
  .dr-apt-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .dr-apt-info{flex:1;min-width:0;}
  .dr-apt-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dr-apt-svc{font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dr-apt-actions{display:flex;gap:4px;flex-shrink:0;opacity:0;transition:opacity .15s;}
  .dr-apt-row:hover .dr-apt-actions{opacity:1;}

  .dr-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;}
  .dr-stat-card{background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;}
  .dr-stat-v{font-size:22px;font-weight:800;color:var(--blue);}
  .dr-stat-l{font-size:10px;color:var(--text3);margin-top:3px;}

  .dr-patient-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;}
  .dr-patient-row:hover{background:#f8fafc;}
  .dr-patient-row:last-child{border-bottom:none;}
  .dr-pt-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}

  .dr-task-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f1f5f9;}
  .dr-task-row:last-child{border-bottom:none;}
  .dr-task-check{width:18px;height:18px;border:2px solid var(--border);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .dr-task-check:hover{border-color:var(--blue);background:#eff6ff;}

  .now-indicator{position:absolute;left:0;right:0;height:2px;background:#ef4444;z-index:5;}
  .now-indicator::before{content:'';position:absolute;left:0;top:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;}

  .dr-search{width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:12px;background:#fafafa;margin:0;outline:none;}
  .dr-search:focus{border-color:var(--blue);background:#fff;}

  .quick-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;background:#f8fafc;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:11px;color:var(--text2);font-weight:600;transition:all .15s;}
  .quick-btn:hover{background:var(--blue);color:#fff;border-color:var(--blue);}
  .quick-btn .qi{font-size:22px;}
  </style>

  <div class="dr-wrap">
    <!-- ШАПКА ВРАЧА -->
    <div class="dr-header">
      <div class="dr-av">${docInitials}</div>
      <div class="dr-info">
        <div class="dr-name">Добро пожаловать, ${docName.split(' ')[0]}!</div>
        <div class="dr-sub">📅 ${todayStr.charAt(0).toUpperCase()+todayStr.slice(1)} &nbsp;·&nbsp; Травматолог-ортопед &nbsp;·&nbsp; Клиника АльтернативА</div>
      </div>
      <div class="dr-stats-mini">
        <div class="dr-sm"><div class="dr-sm-v">${todayAppts.length}</div><div class="dr-sm-l">Записей</div></div>
        <div style="width:1px;background:rgba(255,255,255,.2);"></div>
        <div class="dr-sm"><div class="dr-sm-v">${todayDone}</div><div class="dr-sm-l">Принято</div></div>
        <div style="width:1px;background:rgba(255,255,255,.2);"></div>
        <div class="dr-sm"><div class="dr-sm-v">${todayWait}</div><div class="dr-sm-l">Ожидают</div></div>
        <div style="width:1px;background:rgba(255,255,255,.2);"></div>
        <div class="dr-sm"><div class="dr-sm-v">${tasks.length}</div><div class="dr-sm-l">Задач</div></div>
      </div>
    </div>

    <!-- Быстрые действия -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px;">
      <div class="quick-btn" onclick="openNewVisit()"><span class="qi">📅</span>Запись</div>
      <div class="quick-btn" onclick="go('sched')"><span class="qi">🗓</span>Расписание</div>
      <div class="quick-btn" onclick="go('patients')"><span class="qi">👥</span>Пациенты</div>
      <div class="quick-btn" onclick="openM('m-proto-consult')"><span class="qi">🩺</span>Протокол</div>
      <div class="quick-btn" onclick="openM('m-proto-prp')"><span class="qi">💉</span>PRP</div>
      <div class="quick-btn" onclick="openM('m-proto-uzi')"><span class="qi">🔬</span>УЗИ</div>
    </div>

    <!-- Следующий пациент (если есть) -->
    ${nextAppt ? `<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:14px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:14px;">
      <div style="font-size:32px;">⏭</div>
      <div style="flex:1;">
        <div style="font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Следующий пациент</div>
        <div style="font-size:16px;font-weight:800;color:#1e3a5f;margin-top:2px;">${nextAppt.patient}</div>
        <div style="font-size:12px;color:#3b82f6;margin-top:2px;">${nextAppt.time} &nbsp;·&nbsp; ${nextAppt.svc}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn" style="font-size:12px;background:#fff;border-color:#bfdbfe;" onclick="emkChangeApptStatus('${nextAppt.id}','here');renderDoctor()">🏥 Пришёл</button>
        <button class="btn bp" style="font-size:12px;" onclick="openEmk('${nextAppt.ptId||''}')">📋 ЭМК</button>
      </div>
    </div>` : ''}

    <!-- Основная сетка -->
    <div class="dr-grid">

      <!-- Левая колонка: Расписание дня -->
      <div>
        <div class="dr-panel">
          <div class="dr-ph">
            <div class="dr-ph-title">📅 Приёмы сегодня</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="dr-ph-sub">${todayAppts.length} записей</span>
              <button class="btn" style="font-size:10px;padding:3px 8px;" onclick="go('sched')">Все →</button>
            </div>
          </div>
          <div class="dr-pb" id="dr-today-list">
            ${buildTodayList(todayAppts, pts)}
          </div>
        </div>

        <!-- Статистика врача -->
        <div class="dr-panel" style="margin-top:12px;">
          <div class="dr-ph">
            <div class="dr-ph-title">📊 Моя статистика</div>
            <select style="font-size:11px;border:1px solid var(--border);border-radius:6px;padding:3px 6px;" id="dr-stat-period" onchange="updateDrStats()">
              <option value="today">Сегодня</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>
          <div class="dr-stat-grid" id="dr-stats-grid">
            ${buildDrStats(appts, isoToday, 'today')}
          </div>
        </div>
      </div>

      <!-- Правая колонка -->
      <div style="display:flex;flex-direction:column;gap:12px;">

        <!-- Поиск пациента -->
        <div class="dr-panel">
          <div class="dr-ph">
            <div class="dr-ph-title">🔍 Быстрый поиск пациента</div>
          </div>
          <div style="padding:10px 14px;">
            <input class="dr-search" id="dr-pt-search" placeholder="Введите имя, телефон или диагноз..." oninput="drSearchPatient(this.value)">
          </div>
          <div id="dr-search-results" style="max-height:220px;overflow-y:auto;"></div>
        </div>

        <!-- Мои пациенты (последние посетившие) -->
        <div class="dr-panel">
          <div class="dr-ph">
            <div class="dr-ph-title">👥 Мои пациенты</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="dr-ph-sub">Последние визиты</span>
              <button class="btn" style="font-size:10px;padding:3px 8px;" onclick="go('patients')">Все →</button>
            </div>
          </div>
          <div id="dr-my-patients">
            ${buildMyPatients(appts, pts, docName, isoToday)}
          </div>
        </div>

        <!-- Задачи врача -->
        <div class="dr-panel">
          <div class="dr-ph">
            <div class="dr-ph-title">✅ Задачи</div>
            <button class="btn bp" style="font-size:10px;padding:3px 8px;" onclick="drAddTask()">＋</button>
          </div>
          <div id="dr-tasks-list">
            ${buildDrTasks(tasks)}
          </div>
          <div id="dr-add-task-form" style="display:none;padding:10px 14px;border-top:1px solid var(--border);background:#f8fafc;">
            <input class="fc" id="dr-new-task" placeholder="Новая задача..." style="width:100%;padding:7px 10px;font-size:12px;margin-bottom:6px;">
            <div style="display:flex;gap:6px;">
              <button class="btn bp" style="font-size:11px;" onclick="drSaveTask()">Добавить</button>
              <button class="btn" style="font-size:11px;" onclick="document.getElementById('dr-add-task-form').style.display='none'">Отмена</button>
            </div>
          </div>
        </div>

        <!-- Недавние протоколы -->
        <div class="dr-panel">
          <div class="dr-ph">
            <div class="dr-ph-title">📄 Последние протоколы</div>
          </div>
          <div>
            ${buildRecentProtos(protos)}
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

function buildTodayList(appts, pts){
  if(!appts.length) return `<div style="text-align:center;padding:32px 16px;color:var(--text3);">
    <div style="font-size:36px;margin-bottom:8px;">☀️</div>
    <div style="font-size:13px;font-weight:600;">Приёмов на сегодня нет</div>
    <button class="btn bp" style="font-size:11px;margin-top:10px;" onclick="openNewVisit()">＋ Создать запись</button>
  </div>`;

  const DOT = {wait:'#f59e0b',conf:'#3b82f6',here:'#22c55e',done:'#94a3b8',cancel:'#ef4444'};
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();

  return appts.map((a,i)=>{
    const [h,m] = (a.time||'00:00').split(':').map(Number);
    const apptMin = h*60+m;
    const isNext = a.status!=='done'&&a.status!=='cancel'&&apptMin>=nowMin&&appts.filter(x=>x.status!=='done'&&x.status!=='cancel').indexOf(a)===0;
    const rowCls = a.status==='here'?'apt-here':a.status==='done'?'apt-done':isNext?'apt-next':'';

    return `<div class="dr-apt-row ${rowCls}" onclick="drOpenAppt('${a.id}','${a.ptId||''}')">
      <div class="dr-apt-time">${a.time||'—'}</div>
      <div class="dr-apt-dot" style="background:${DOT[a.status]||'#94a3b8'};"></div>
      <div class="dr-apt-info">
        <div class="dr-apt-name">${a.patient||'Пациент'}</div>
        <div class="dr-apt-svc">${a.svc||'Визит'}</div>
      </div>
      <div class="dr-apt-actions">
        ${a.status!=='done'?`<button class="btn" style="font-size:9px;padding:2px 5px;" onclick="event.stopPropagation();drStatusQuick('${a.id}','here');renderDoctor()">🏥</button>
        <button class="btn bg" style="font-size:9px;padding:2px 5px;" onclick="event.stopPropagation();drStatusQuick('${a.id}','done');renderDoctor()">✓</button>`:''}
        <button class="btn bp" style="font-size:9px;padding:2px 5px;" onclick="event.stopPropagation();${a.ptId?`openEmk('${a.ptId}')`:'toast(\'ЭМК: нет ID пациента\')'}">ЭМК</button>
      </div>
    </div>`;
  }).join('');
}

function buildMyPatients(appts, pts, docName, isoToday){
  // patients who had visits today or recently
  const myAppts = appts.filter(a=>a.doc===docName||!a.doc).sort((a,b)=>b.date.localeCompare(a.date));
  const seen = new Set();
  const myPts = [];
  myAppts.forEach(a=>{
    if(a.ptId && !seen.has(a.ptId)){
      seen.add(a.ptId);
      const p = pts.find(x=>x.id===a.ptId);
      if(p) myPts.push({p,lastAppt:a});
    }
  });
  const show = myPts.slice(0,8);

  if(!show.length) return `<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">Нет пациентов</div>`;

  const COLORS=['#4a6cf7','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
  return show.map((item,i)=>{
    const {p,lastAppt} = item;
    const full = (p.fam||'')+(p.nam?' '+p.nam:'');
    const ini = full.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    const age = calcAge(p.dob);
    const isToday2 = lastAppt.date===isoToday;
    return `<div class="dr-patient-row" onclick="openEmk('${p.id}')">
      <div class="dr-pt-av" style="background:${COLORS[i%8]}22;color:${COLORS[i%8]};">${ini}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${full}</div>
        <div style="font-size:10px;color:var(--text3);">${age?age+' лет · ':''}${p.diag||'Диагноз не указан'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:10px;color:${isToday2?'#22c55e':'var(--text3)'};font-weight:${isToday2?'700':'400'};">${isToday2?'Сегодня':lastAppt.date}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:1px;">${lastAppt.svc||''}</div>
      </div>
    </div>`;
  }).join('');
}

function buildDrTasks(tasks){
  if(!tasks.length) return `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px;">Задач нет ✓</div>`;
  const PRIOR = {high:'🔴',mid:'🟡',low:'🟢'};
  return tasks.slice(0,6).map(t=>`
  <div class="dr-task-row">
    <div class="dr-task-check" onclick="drCompleteTask('${t.id}')">
      ${t.done?'✓':''}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:12px;font-weight:600;">${PRIOR[t.priority]||'⚪'} ${t.text||t.title||'Задача'}</div>
      ${t.due?`<div style="font-size:10px;color:var(--text3);">До ${t.due}</div>`:''}
    </div>
  </div>`).join('');
}

function buildRecentProtos(protos){
  const typeLabel={consult:'Осмотр',prp:'PRP',inject:'Инъекция',uzi:'УЗИ',massage:'Массаж',iv:'Инфузия',pod:'Подология',svf:'SVF',rehab2:'Реабилитация'};
  const typeIcon={consult:'🩺',prp:'💉',inject:'💊',uzi:'🔬',massage:'🤲',iv:'💧',pod:'🦶',svf:'🧬',rehab2:'🏃'};
  const recent = protos.slice().sort((a,b)=>(b.created||'').localeCompare(a.created||'')).slice(0,5);
  if(!recent.length) return `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px;">Протоколов нет</div>`;
  return recent.map(pr=>`
  <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f1f5f9;">
    <div style="font-size:20px;">${typeIcon[pr.type]||'📄'}</div>
    <div style="flex:1;">
      <div style="font-size:12px;font-weight:600;">${typeLabel[pr.type]||pr.type}</div>
      <div style="font-size:10px;color:var(--text3);">${pr.date||'—'}</div>
    </div>
  </div>`).join('');
}

function buildDrStats(appts, isoToday, period){
  const now = new Date();
  let filtered;
  if(period==='today'){
    filtered = appts.filter(a=>a.date===isoToday);
  } else if(period==='week'){
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
    filtered = appts.filter(a=>a.date>=weekAgo.toISOString().slice(0,10));
  } else {
    const monthAgo = new Date(now); monthAgo.setDate(1);
    filtered = appts.filter(a=>a.date>=monthAgo.toISOString().slice(0,10));
  }
  const done = filtered.filter(a=>a.status==='done').length;
  const pays = loadData('mis_payments',[]).filter(p=>{
    if(period==='today') return p.date===isoToday;
    if(period==='week'){const wa=new Date();wa.setDate(wa.getDate()-7);return p.date>=wa.toISOString().slice(0,10);}
    const ma=new Date();ma.setDate(1);return p.date>=ma.toISOString().slice(0,10);
  });
  const rev = pays.reduce((s,p)=>s+(parseFloat(p.sum)||0),0);
  const prps = filtered.filter(a=>(a.svc||'').toLowerCase().includes('prp')).length;
  const pts_unique = new Set(filtered.map(a=>a.ptId)).size;

  return `
    <div class="dr-stat-card"><div class="dr-stat-v">${filtered.length}</div><div class="dr-stat-l">Записей</div></div>
    <div class="dr-stat-card"><div class="dr-stat-v">${done}</div><div class="dr-stat-l">Принято</div></div>
    <div class="dr-stat-card"><div class="dr-stat-v">${pts_unique}</div><div class="dr-stat-l">Пациентов</div></div>
    <div class="dr-stat-card"><div class="dr-stat-v">${prps}</div><div class="dr-stat-l">PRP-процедур</div></div>
    <div class="dr-stat-card" style="grid-column:1/-1;"><div class="dr-stat-v" style="color:#22c55e;">${rev.toLocaleString('ru-RU')} ₽</div><div class="dr-stat-l">Выручка</div></div>`;
}

function initDoctorPage(){
  // nothing async needed
}

// ── Вспомогательные функции врача ──
function drOpenAppt(apptId, ptId){
  if(ptId) openEmk(ptId);
  else {
    const a = loadData('mis_appts',[]).find(x=>x.id===apptId);
    if(a) showApptPopup(apptId);
  }
}

function drStatusQuick(apptId, status){
  const appts = loadData('mis_appts',[]);
  const a = appts.find(x=>x.id===apptId); if(!a) return;
  a.status = status;
  saveData('mis_appts',appts);
  if(typeof renderSched==='function') renderSched();
  toast('✅ '+{here:'Пришёл',done:'Завершён',cancel:'Отменён'}[status]);
}

function drSearchPatient(q){
  const res = document.getElementById('dr-search-results');
  if(!res) return;
  if(!q||q.length<2){ res.innerHTML=''; return; }
  const pts = loadData('mis_patients',[]);
  const found = pts.filter(p=>(p.fam+' '+p.nam+' '+(p.pat||'')+' '+(p.tel||'')+' '+(p.diag||'')).toLowerCase().includes(q.toLowerCase())).slice(0,6);
  if(!found.length){ res.innerHTML='<div style="padding:12px 16px;font-size:12px;color:var(--text3);">Не найдено</div>'; return; }
  const COLORS=['#4a6cf7','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  res.innerHTML = found.map((p,i)=>{
    const full=(p.fam||'')+(p.nam?' '+p.nam:'');
    const ini=full.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" onclick="openEmk('${p.id}')">
      <div style="width:30px;height:30px;border-radius:50%;background:${COLORS[i%6]}22;color:${COLORS[i%6]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">${ini}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;">${full}</div>
        <div style="font-size:10px;color:var(--text3);">${calcAge(p.dob)?calcAge(p.dob)+' лет · ':''} ${p.tel||''} ${p.diag?'· '+p.diag:''}</div>
      </div>
      <span style="font-size:10px;background:#eff6ff;color:var(--blue);padding:2px 7px;border-radius:8px;font-weight:600;">ЭМК →</span>
    </div>`;
  }).join('');
}

function updateDrStats(){
  const sel = document.getElementById('dr-stat-period');
  const grid = document.getElementById('dr-stats-grid');
  if(!sel||!grid) return;
  const appts = loadData('mis_appts',[]);
  const isoToday = new Date().toISOString().slice(0,10);
  grid.innerHTML = buildDrStats(appts, isoToday, sel.value);
}

function drAddTask(){
  const f = document.getElementById('dr-add-task-form');
  if(f){ f.style.display='block'; const inp=document.getElementById('dr-new-task'); if(inp) inp.focus(); }
}

function drSaveTask(){
  const inp = document.getElementById('dr-new-task');
  if(!inp||!inp.value.trim()){ toast('⚠️ Введите задачу'); return; }
  const tasks = loadData('mis_tasks',[]);
  tasks.push({id:'t_'+Date.now(),text:inp.value.trim(),done:false,priority:'mid',
    assignee:CU?CU.name:'',created:new Date().toLocaleDateString('ru-RU')});
  saveData('mis_tasks',tasks);
  inp.value='';
  const f=document.getElementById('dr-add-task-form');
  if(f) f.style.display='none';
  renderDoctor();
  toast('✅ Задача добавлена');
}

function drCompleteTask(id){
  const tasks = loadData('mis_tasks',[]);
  const t = tasks.find(x=>x.id===id); if(!t) return;
  t.done=!t.done;
  saveData('mis_tasks',tasks);
  renderDoctor();
  toast(t.done?'✅ Выполнено':'↩ Возвращено');
}

// ═══════════════════════════════════════════
  const protos = loadData('mis_protocols',[]);
  const proto = protos.filter(p=>p.ptId===ptId).sort((a,b)=>b.date>a.date?1:-1)[0] || {};
  const doc = getPdfDoc();
  let y = pdfAddHeader(doc, 'Pervichnyy osmotr ortopeda', 
    (pt.fam||'')+(pt.nam?' '+pt.nam:'')+'  |  '+new Date().toLocaleDateString('ru-RU'));
  
  y = pdfSection(doc, 'Dannie patsienta', y+4);
  pdfTextField(doc,'FIO',(pt.fam||'')+(pt.nam?' '+pt.nam:'')+(pt.pat?' '+pt.pat:''),22,y+2,80);
  pdfTextField(doc,'Data rozhdeniya',pt.dob||'—',110,y+2,38);
  pdfTextField(doc,'Pol',pt.sex||'—',155,y+2,30);
  y += 16;
  pdfTextField(doc,'Diagnoz',pt.diag||'—',22,y,165);
  y += 14;

  y = pdfSection(doc,'Zhaloby i anamnez',y+2);
  y = pdfTextBlock(doc, proto.complaints||'—', 22, y+5, 165);
  y += 4;

  y = pdfSection(doc,'Lokalnyy status',y+2);
  y = pdfTextBlock(doc, proto.localStatus||'—', 22, y+5, 165);
  y += 4;

  y = pdfSection(doc,'Plan lecheniya',y+2);
  y = pdfTextBlock(doc, proto.plan||'—', 22, y+5, 165);
  y += 8;

  // Подписи
  doc.setFontSize(8);
  doc.setTextColor(15,23,42);
  doc.text('Vrach: ' + toTranslit(CU?CU.name:''), 22, y+6);
  doc.text('Podpis: ___________________', 22, y+14);
  doc.text('Data: ' + new Date().toLocaleDateString('ru-RU'), 120, y+14);

  pdfAddFooter(doc);
  doc.save('osmotr_ortopeda_'+(pt.fam||'patient')+'.pdf');
  toast('📄 PDF сохранён');
}

// ─── PDF: Протокол PRP ───
  const protos = loadData('mis_protocols',[]);
  const proto = protos.filter(p=>p.ptId===ptId && (p.type||'').toLowerCase().includes('prp'))
    .sort((a,b)=>b.date>a.date?1:-1)[0] || {};
  const doc = getPdfDoc();
  let y = pdfAddHeader(doc,'Protokol PRP-terapii',
    (pt.fam||'')+(pt.nam?' '+pt.nam:'')+'  |  '+new Date().toLocaleDateString('ru-RU'));

  y = pdfSection(doc,'Dannie patsienta',y+4);
  pdfTextField(doc,'FIO',(pt.fam||'')+(pt.nam?' '+pt.nam:''),22,y+2,100);
  pdfTextField(doc,'Diagnoz (ICD-10)',pt.diag||'—',22,y+16,165);
  y += 30;

  y = pdfSection(doc,'Proverka protivopokazaniy',y+2);
  const contra = [
    'Onkologicheskie zabolevaniya — net',
    'Sistemnye bolezni krovi — net',
    'Aktivnaya infektsiya — net',
    'Trombotsitopeniya — net',
    'Antikoagulyantnyy priem — net',
    'Beremennost — net'
  ];
  contra.forEach((item,i)=>{
    doc.setFontSize(9);
    doc.setTextColor(15,23,42);
    doc.text('☑  '+item, 26, y+5+(i*6));
  });
  y += 44;

  y = pdfSection(doc,'Parametry protsedury',y+2);
  pdfTextField(doc,'Obem zabranoy krovi',proto.bloodVol||'___ ml',22,y+5,50);
  pdfTextField(doc,'Obem PRP',proto.prpVol||'___ ml',80,y+5,40);
  pdfTextField(doc,'Zona vvedeniya',proto.zone||'—',128,y+5,58);
  y += 16;
  pdfTextField(doc,'Kontrol',proto.control||'pod UZI-navigatsiey',22,y,80);
  pdfTextField(doc,'Nomer inyektsii v kurse',proto.injNum||'—',110,y,75);
  y += 16;

  y = pdfSection(doc,'Rekomendatsii posle protsedury',y+2);
  const recs = [
    'Ogranichit nagruzku: 3 dnya',
    'Isklyuchit NVPS: 5 dney',
    'Isklyuchit teplovye protsedury: 48 ch',
    'Reaktsionnaya bol v techenie 24-72 ch — norma',
    'Sleduyushchaya inyektsiya cherez: ___ dney'
  ];
  recs.forEach((r,i)=>{
    doc.setFontSize(9);
    doc.setTextColor(51,65,85);
    doc.text('• '+r, 26, y+5+(i*5.5));
  });
  y += 38;

  doc.setFontSize(8);
  doc.setTextColor(15,23,42);
  doc.text('Vrach: '+toTranslit(CU?CU.name:''),22,y+6);
  doc.text('Podpis vracha: ___________________',22,y+14);
  doc.text('Podpis patsienta: ___________________',100,y+14);

  pdfAddFooter(doc);
  doc.save('prp_protokol_'+(pt.fam||'patient')+'.pdf');
  toast('📄 PDF сохранён');
}

// ─── PDF: УЗИ заключение ───
  const pays = loadData('mis_payments',[]);
  const pay = pays.find(p=>p.id===payId);
  if(!pay){toast('⚠️ Oplata ne naydena');return;}
  const pt = (PATIENTS||[]).find(p=>p.id===pay.ptId)||{};
  const doc = getPdfDoc();
  let y = pdfAddHeader(doc,'Kvitantsiya ob oplate','# '+payId);

  y = pdfSection(doc,'Patsient',y+4);
  pdfTextField(doc,'FIO',(pt.fam||'')+(pt.nam?' '+pt.nam:''),22,y+2,100);
  pdfTextField(doc,'Data',pay.date||'',130,y+2,58);
  y += 18;

  y = pdfSection(doc,'Sostav oplaty',y+2);
  doc.setFontSize(9);
  doc.setTextColor(15,23,42);
  doc.text('Usluga: '+toTranslit(pay.svc||'—'), 22, y+6);
  doc.text('Vrach: '+toTranslit(pay.doc||CU&&CU.name||'—'), 22, y+12);
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.setTextColor(74,108,247);
  doc.text('ITOGO: '+(pay.amount||0)+' rub.', 22, y+22);
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.setTextColor(100,116,139);
  doc.text('Status: '+toTranslit(pay.status||'Oplacheno'), 22, y+30);
  y += 38;

  doc.setTextColor(15,23,42);
  doc.text('Podpis kassira: ___________________', 22, y);
  doc.text('Pech': ___________________', 110, y);

  pdfAddFooter(doc);
  doc.save('kvitantsiya_'+payId+'.pdf');
  toast('📄 PDF сохранён');
}

// ─── PDF: ЭМК сводка ───
  const appts = loadData('mis_appts',[]).filter(a=>a.ptId===ptId);
  const doc = getPdfDoc();
  let y = pdfAddHeader(doc,'Elektronnaya meditsinskaya karta',
    (pt.fam||'')+(pt.nam?' '+pt.nam:'')+'  |  '+new Date().toLocaleDateString('ru-RU'));

  y = pdfSection(doc,'Dannie patsienta',y+4);
  pdfTextField(doc,'FIO',(pt.fam||'')+(pt.nam?' '+pt.nam:'')+(pt.pat?' '+pt.pat:''),22,y+2,120);
  pdfTextField(doc,'Pol',pt.sex||'—',150,y+2,38);
  pdfTextField(doc,'Osnov. diagnoz',pt.diag||'—',22,y+16,165);
  pdfTextField(doc,'Status',pt.status||'—',22,y+30,80);
  pdfTextField(doc,'Istochnik',pt.src||'—',110,y+30,80);
  y += 44;

  y = pdfSection(doc,'Istoriya vizitov ('+appts.length+')',y+2);
  if(appts.length===0){
    doc.setFontSize(9);doc.setTextColor(100,116,139);
    doc.text('Vizitov net', 22, y+6);
    y += 12;
  } else {
    appts.slice(0,8).forEach((a,i)=>{
      doc.setFontSize(9);doc.setTextColor(15,23,42);
      doc.text((i+1)+'. '+toTranslit(a.date||'')+'  '+toTranslit(a.svc||'Vizit')+'  '+toTranslit(a.status||''), 24, y+5+(i*6));
    });
    y += Math.min(appts.length,8)*6+8;
  }

  y = pdfSection(doc,'Primechaniya vracha',y+2);
  y = pdfTextBlock(doc, pt.note||'—', 22, y+5, 165);
  y += 6;

  doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text('Dokument sformirovan: '+new Date().toLocaleString('ru-RU')+'  |  '+toTranslit(CU?CU.name:''), 22, y);

  pdfAddFooter(doc);
  doc.save('emk_'+(pt.fam||'patient')+'.pdf');
  toast('📄 PDF EMK sokhrayon');
}

// ─── Кнопка PDF в ЭМК ───
function emkPdf(){
  const ptId = currentEmkPtId||window._emkPtId;
  if(!ptId){toast('Otkroyte EMK patsienta');return;}
  generatePdfEmk(ptId);
}


// ═══════════════════════════════════════════
// СИСТЕМА УВЕДОМЛЕНИЙ — WhatsApp & Telegram
// ═══════════════════════════════════════════

  const appts = loadData('mis_appts',[]).filter(a=>a.ptId===currentNotifPtId);
  const nextAppt = appts.find(a=>a.date>=new Date().toISOString().slice(0,10));
  
  function fillVars(text){
    return text
      .replace(/\{имя\}/g, ptName||'Пациент')
      .replace(/\{дата\}/g, nextAppt?nextAppt.date:today)
      .replace(/\{время\}/g, nextAppt?nextAppt.time:'10:00')
      .replace(/\{врач\}/g, CU?CU.name:'Врач')
      .replace(/\{следующий_визит\}/g, nextAppt?nextAppt.date:'по назначению');
  }

  const channel = document.querySelector('input[name="notif-channel"]:checked');
  const ch = channel ? channel.value : 'whatsapp';
  const text = ch==='telegram' ? fillVars(tpl.text_tg) : fillVars(tpl.text_wa);
  
  cont.innerHTML = `
    <div style="background:#075e54;color:#fff;padding:6px 12px;border-radius:8px 8px 0 0;font-size:11px;font-weight:600;">
      ${ch==='telegram'?'✈️ Telegram':'📱 WhatsApp'} — Предпросмотр
    </div>
    <div style="background:#e5ddd5;padding:12px;border-radius:0 0 8px 8px;min-height:80px;">
      <div style="background:#fff;border-radius:0 8px 8px 8px;padding:10px 14px;max-width:90%;font-size:12px;line-height:1.6;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,.1);">
        ${text.replace(/\*(.*?)\*/g,'<strong>$1</strong>').replace(/_(.*?)_/g,'<em>$1</em>').replace(/
/g,'<br>')}
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
      <button class="btn bg sm" onclick="sendNotifWhatsApp()">📱 Открыть в WhatsApp</button>
      <button class="btn bp sm" onclick="sendNotifTelegram()">✈️ Открыть в Telegram</button>
      <button class="btn bw sm" onclick="copyNotifText()">📋 Скопировать</button>
    </div>`;
  
  // Сохраняем текст для кнопок
  window._notifText = text;
  window._notifPt = pt;
}

function sendNotifWhatsApp(){
  const pt = window._notifPt || {};
  const phone = (pt.tel||'').replace(/\D/g,'');
  const text = encodeURIComponent(window._notifText||'');
  if(phone){
    window.open('https://wa.me/'+phone+'?text='+text,'_blank');
  } else {
    window.open('https://wa.me/?text='+text,'_blank');
    toast('⚠️ Telefon patsienta ne ukazan — otkryt obshchiy WhatsApp');
  }
}

function sendNotifTelegram(){
  if(!currentNotifTpl) return;
  const appts = loadData('mis_appts',[]).filter(a=>a.ptId===currentNotifPtId);
  const nextAppt = appts.find(a=>a.date>=new Date().toISOString().slice(0,10));
  const today = new Date().toLocaleDateString('ru-RU');
  const text = tpl.text_tg
    .replace(/\{имя\}/g, ptName||'Пatsient')
    .replace(/\{дата\}/g, nextAppt?nextAppt.date:today)
    .replace(/\{время\}/g, nextAppt?nextAppt.time:'10:00')
    .replace(/\{врач\}/g, CU?CU.name:'Vrach')
    .replace(/\{следующий_визит\}/g, nextAppt?nextAppt.date:'po naznacheniyu');
  window.open('https://t.me/share/url?text='+encodeURIComponent(text),'_blank');
}

function copyNotifText(){
  if(!window._notifText) return;
  const ta = document.createElement('textarea');
  ta.value = window._notifText;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  toast('📋 Tekst skopirovan v bufer obmena');
}

function openBulkNotif(){
  openM('m-bulk-notif');
  renderBulkNotifList();
}

function renderBulkNotifList(){
  const cont = document.getElementById('bulk-notif-list');
  if(!cont) return;
  const pts = (PATIENTS||[]).filter(p=>p.status==='Активный'||p.status==='На лечении');
  cont.innerHTML = pts.slice(0,20).map(p=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;">
      <input type="checkbox" class="bulk-pt-cb" value="${p.id}" style="cursor:pointer;">
      <div style="flex:1;font-size:12px;font-weight:600;">${p.fam}${p.nam?' '+p.nam:''}</div>
      <div style="font-size:10px;color:var(--text3);">${p.diag||''}</div>
      <div style="font-size:10px;color:${p.tel?'#10b981':'#f59e0b'};">${p.tel||'bez telefona'}</div>
    </div>`).join('');
}

function selectAllBulk(v){
  document.querySelectorAll('.bulk-pt-cb').forEach(cb=>cb.checked=v);
}

function startBulkSend(){
  const tplKey = (document.getElementById('bulk-tpl')||{}).value || 'reminder_24h';
    const appts = loadData('mis_appts',[]).filter(a=>a.ptId===pt.id);
    const nextAppt = appts.find(a=>a.date>=new Date().toISOString().slice(0,10));
    let text = tpl.text_wa
      .replace(/\{имя\}/g, ptName)
      .replace(/\{дата\}/g, nextAppt?nextAppt.date:today)
      .replace(/\{время\}/g, nextAppt?nextAppt.time:'10:00')
      .replace(/\{врач\}/g, CU?CU.name:'Vrach')
      .replace(/\{следующий_визит\}/g, nextAppt?nextAppt.date:'po naznacheniyu');
    const url = phone 
      ? 'https://wa.me/'+phone+'?text='+encodeURIComponent(text)
      : 'https://wa.me/?text='+encodeURIComponent(text);
    window.open(url,'_blank');
    i++;
    setTimeout(sendNext, 1500);
  }
  sendNext();
}

function toggleExportMenu(){
  const m = document.getElementById('export-menu');
  if(m) m.style.display = m.style.display==='none' ? 'block' : 'none';
}
document.addEventListener('click', function(e){
  const wrap = document.getElementById('export-menu-wrap');
  const menu = document.getElementById('export-menu');
  if(wrap && menu && !wrap.contains(e.target)) menu.style.display='none';
});

