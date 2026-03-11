// АльтернативА МИС — schedule.js
// Auto-generated module

// SCHEDULE ENGINE
// ═══════════════════════════════════════════
let schedView = 'week';
let schedCurDate = new Date();
let activeApptId = null;

const TIMES = [];
for(let h=8;h<=20;h++){TIMES.push(h+':00');if(h<20)TIMES.push(h+':30');}

const STATUS_LABELS = {wait:'Ожидает',conf:'Подтверждён',here:'Пришёл',done:'Завершён',cancel:'Отменён'};
const STATUS_COLORS = {wait:'#f59e0b',conf:'#3b82f6',here:'#22c55e',done:'#94a3b8',cancel:'#ef4444'};

function schedToday(){schedCurDate=new Date();renderSched();}
function schedNav(d){
  if(schedView==='day') schedCurDate.setDate(schedCurDate.getDate()+d);
  else if(schedView==='week') schedCurDate.setDate(schedCurDate.getDate()+d*7);
  else schedCurDate.setMonth(schedCurDate.getMonth()+d);
  renderSched();
}
function schedSetView(v,btn){
  schedView=v;
  document.querySelectorAll('.sched-view-btns button').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderSched();
}

function getWeekDays(date){
  const d=new Date(date);
  const day=d.getDay();
  const mon=new Date(d);
  mon.setDate(d.getDate()-(day===0?6:day-1));
  const days=[];
  for(let i=0;i<7;i++){
    const dd=new Date(mon);
    dd.setDate(mon.getDate()+i);
    days.push(dd);
  }
  return days;
}

function fmtDate(d){
  return d.getDate()+'.'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'.'+d.getFullYear();
}
function fmtDateISO(d){
  return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate();
}
function isToday(d){
  const t=new Date();
  return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear();
}

function renderSched(){
function renderSchedWeek(appts){
  buildTimeCol();
  const days = getWeekDays(schedCurDate);
  const grid = document.getElementById('sched-grid');
  if(!grid) return;

  grid.innerHTML = days.map(day=>{
    const iso = fmtDateISO(day);
    const dayAppts = appts.filter(a=>a.date===iso);
    const DNAMES=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const headClass = 'sched-col-head'+(isToday(day)?' today':'');

    const slots = TIMES.map((t,ti)=>{
      const slotAppts = dayAppts.filter(a=>a.time===t);
      const apptHtml = slotAppts.map(a=>apptBlock(a)).join('');
      return '<div class="sched-slot" onclick="quickAdd(\''+iso+'\',\''+t+'\')" data-date="'+iso+'" data-time="'+t+'">'+apptHtml+'</div>';
    }).join('');

    return '<div class="sched-col">'+
      '<div class="'+headClass+'"><div class="day-name">'+DNAMES[day.getDay()]+'</div><div class="day-num">'+day.getDate()+'</div></div>'+
      '<div class="sched-col-body" id="scb-'+iso+'">'+slots+'</div>'+
      '</div>';
  }).join('');
}

function renderSchedDay(appts){
  buildTimeCol();
  const day = schedCurDate;
  const iso = fmtDateISO(day);
  const dayAppts = appts.filter(a=>a.date===iso);
  const grid = document.getElementById('sched-grid');
  if(!grid) return;

  const DNAMES=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const slots = TIMES.map(t=>{
    const slotAppts = dayAppts.filter(a=>a.time===t);
    return '<div class="sched-slot" onclick="quickAdd(\''+iso+'\',\''+t+'\')" style="height:56px;">'+
      slotAppts.map(a=>apptBlock(a)).join('')+'</div>';
  }).join('');

  grid.innerHTML = '<div class="sched-col" style="max-width:600px;">'+
    '<div class="sched-col-head'+(isToday(day)?' today':'')+'" style="padding:12px;">'+
      '<div class="day-name">'+DNAMES[day.getDay()]+'</div>'+
      '<div class="day-num" style="font-size:28px;">'+day.getDate()+' '+['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][day.getMonth()]+'</div>'+
    '</div>'+
    '<div class="sched-col-body">'+slots+'</div>'+
  '</div>';
}

function renderSchedMonth(appts){
  const grid = document.getElementById('sched-grid');
  const tc = document.getElementById('sched-time-col');
  if(tc) tc.style.display='none';
  if(!grid) return;

  const year=schedCurDate.getFullYear(), month=schedCurDate.getMonth();
  const first=new Date(year,month,1);
  const startDay=first.getDay()===0?6:first.getDay()-1;
  const daysInMonth=new Date(year,month+1,0).getDate();

  let html='<div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1;overflow-y:auto;">';
  const DNAMES=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  html+=DNAMES.map(d=>'<div style="padding:6px;text-align:center;font-size:11px;font-weight:700;color:var(--text3);background:#f8fafc;border-bottom:1px solid var(--border);">'+d+'</div>').join('');

  for(let i=0;i<startDay;i++) html+='<div style="background:#fafafa;border:1px solid #f1f5f9;min-height:80px;"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(year,month,d);
    const iso=fmtDateISO(dt);
    const dayAppts=appts.filter(a=>a.date===iso&&a.status!=='cancel');
    const todayCls=isToday(dt)?'background:#eff6ff;':'';
    html+='<div style="'+todayCls+'border:1px solid #f1f5f9;min-height:80px;padding:4px;cursor:pointer;" onclick="schedJumpDay(\''+iso+'\')">'+
      '<div style="font-size:12px;font-weight:'+(isToday(dt)?'800':'600')+';color:'+(isToday(dt)?'var(--blue)':'var(--text1)')+';">'+d+'</div>'+
      dayAppts.slice(0,3).map(a=>'<div style="font-size:9px;padding:1px 3px;border-radius:3px;margin-top:1px;background:'+STATUS_COLORS[a.status||'wait']+'22;color:'+STATUS_COLORS[a.status||'wait']+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+a.time+' '+a.patient+'</div>').join('')+
      (dayAppts.length>3?'<div style="font-size:9px;color:var(--text3);">+ещё '+(dayAppts.length-3)+'</div>':'')+
    '</div>';
  }
  html+='</div>';
  grid.innerHTML=html;
}

function schedJumpDay(iso){
  schedCurDate=new Date(iso);
  schedSetView('day', document.getElementById('sv-day'));
}

function apptBlock(a){
  const cls='sched-appt st-'+(a.status||'wait');
  return '<div class="'+cls+'" onclick="event.stopPropagation();showApptPopup(\''+a.id+'\')" title="'+a.patient+' — '+a.svc+'">'+
    '<div class="ap-time">'+a.time+'</div>'+
    '<div class="ap-name">'+a.patient+'</div>'+
    '<div class="ap-svc">'+a.svc+'</div>'+
  '</div>';
}

function quickAdd(date, time){
  openNewVisit(date, time);
}

function showApptPopup(id){