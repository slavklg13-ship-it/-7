// АльтернативА МИС — notifications.js
// Auto-generated module

const NOTIF_TEMPLATES = {
  reminder_24h: {
    name: 'Напоминание за 24 часа',
    icon: '🔔',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}','{дата}','{время}','{врач}'],
    text_wa: 'Уважаемый(ая) {имя}!

Напоминаем о вашем визите в клинику АльтернативА:
📅 {дата} в {время}
👨‍⚕️ Врач: {врач}

Пожалуйста, приходите за 5 минут до приёма. Если планы изменились — позвоните нам заранее.

✅ Ждём вас!',
    text_tg: '🏥 *АльтернативА*

Добрый день, *{имя}*!
Напоминаем о визите завтра:

📅 *{дата}* в *{время}*
👨‍⚕️ {врач}

_Если не можете прийти — пожалуйста, сообщите заранее._',
  },
  after_visit: {
    name: 'Благодарность после приёма',
    icon: '💙',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}','{дата}','{следующий_визит}'],
    text_wa: 'Уважаемый(ая) {имя}!

Спасибо за визит {дата}! Надеемся, что вы чувствуете себя хорошо.

Если появятся вопросы или дискомфорт — не стесняйтесь обращаться к нам.

Следующий визит: {следующий_визит}

💙 Клиника АльтернативА',
    text_tg: '💙 *АльтернативА*

*{имя}*, спасибо за визит!

Если есть вопросы по лечению — пишите нас в любое время.

📅 Следующий визит: *{следующий_визит}*',
  },
  prp_prep: {
    name: 'Подготовка к PRP',
    icon: '💉',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}','{дата}','{время}'],
    text_wa: 'Уважаемый(ая) {имя}!

Напоминаем о PRP-процедуре {дата} в {время}.

📋 *Как подготовиться:*
✓ За 3 дня — отменить НПВС (аспирин, ибупрофен)
✓ За 2 дня — исключить алкоголь
✓ В день процедуры — лёгкий завтрак
✓ Взять анализы крови (если есть)

⚠️ После процедуры возможна боль 1-3 дня — это нормально.

Ждём вас! 🏥',
    text_tg: '💉 *Подготовка к PRP*

*{имя}*, ваша процедура — *{дата}* в *{время}*

*Что нужно сделать:*
• Отменить НПВС за 3 дня
• Исключить алкоголь за 2 дня
• Лёгкий завтрак в день процедуры

_Вопросы? Напишите нам!_',
  },
  return_1month: {
    name: 'Возврат через месяц',
    icon: '🔄',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}'],
    text_wa: 'Уважаемый(ая) {имя}!

Мы думаем о вас 😊 Прошёл месяц с вашего последнего визита.

Контрольный осмотр — важная часть лечения. Запишитесь к нам, и врач оценит динамику вашего состояния.

📞 Позвоните нам или запишитесь онлайн.

Клиника АльтернативА',
    text_tg: '🔄 *АльтернативА*

*{имя}*, прошёл месяц с вашего визита.

Контрольный осмотр поможет оценить результаты лечения. Запишитесь удобным способом 🏥',
  },
  birthday: {
    name: 'Поздравление с Днём Рождения',
    icon: '🎉',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}'],
    text_wa: 'Уважаемый(ая) {имя}!

🎉 Поздравляем с Днём рождения!

Желаем вам здоровья, бодрости и лёгкости движений! В честь вашего дня рождения дарим *скидку 10%* на следующий визит.

💙 Клиника АльтернативА',
    text_tg: '🎉 *С Днём рождения, {имя}!*

Желаем здоровья и радости! 🌟

Дарим скидку *10%* на ваш следующий визит в клинику АльтернативА.',
  },
  pod_care: {
    name: 'Рекомендации подолога',
    icon: '🦶',
    channels: ['whatsapp','telegram'],
    vars: ['{имя}','{следующий_визит}'],
    text_wa: 'Уважаемый(ая) {имя}!

Спасибо за визит к подологу!

📋 *Рекомендации по уходу:*
✓ Ежедневное увлажнение кожи стоп
✓ Обрезка ногтей прямо, не закругляя
✓ Удобная обувь с широким носком
✓ При дискомфорте — не откладывайте визит

Следующий визит: {следующий_визит}

🦶 До встречи!',
    text_tg: '🦶 *Рекомендации подолога*

*{имя}*, следуйте назначениям:
• Увлажняйте кожу стоп ежедневно
• Обрезайте ногти прямо
• Носите удобную обувь

📅 Следующий визит: *{следующий_визит}*',
  },
};

let currentNotifPtId = null;
let currentNotifTpl = null;

function openNotifModal(ptId){
  currentNotifPtId = ptId;
  const pt = (PATIENTS||[]).find(p=>p.id===ptId)||{};
  const el = document.getElementById('notif-pt-name');
  if(el) el.textContent = (pt.fam||'')+(pt.nam?' '+pt.nam:'');
  renderNotifTemplates();
  openM('m-notif');
}

function renderNotifTemplates(){
  const cont = document.getElementById('notif-tpl-list');
  if(!cont) return;
  cont.innerHTML = Object.entries(NOTIF_TEMPLATES).map(([key,tpl])=>`
    <div class="notif-tpl-card ${currentNotifTpl===key?'selected':''}" onclick="selectNotifTpl('${key}')" style="
      border:2px solid ${currentNotifTpl===key?'#4a6cf7':'#e2e8f0'};
      border-radius:10px;padding:10px 14px;cursor:pointer;margin-bottom:8px;
      background:${currentNotifTpl===key?'#eff6ff':'#f8fafc'};
      transition:all .15s;">
      <div style="font-size:16px;margin-bottom:4px;">${tpl.icon} <strong style="font-size:13px;">${tpl.name}</strong></div>
      <div style="font-size:11px;color:var(--text3);">${tpl.channels.map(c=>c==='whatsapp'?'📱 WhatsApp':'✈️ Telegram').join(' · ')}</div>
    </div>`).join('');
}

function selectNotifTpl(key){
  currentNotifTpl = key;
  renderNotifTemplates();
  renderNotifPreview();
}

function renderNotifPreview(){
  const cont = document.getElementById('notif-preview');
  if(!cont || !currentNotifTpl) return;
  const tpl = NOTIF_TEMPLATES[currentNotifTpl];
  const pt = (PATIENTS||[]).find(p=>p.id===currentNotifPtId)||{};
  const ptName = (pt.fam||'')+(pt.nam?' '+pt.nam:'');
  const today = new Date().toLocaleDateString('ru-RU');
  const tpl = NOTIF_TEMPLATES[currentNotifTpl];
  const pt = (PATIENTS||[]).find(p=>p.id===currentNotifPtId)||{};
  const ptName = (pt.fam||'')+(pt.nam?' '+pt.nam:'');
  const tpl = NOTIF_TEMPLATES[tplKey];
  const selected = [...document.querySelectorAll('.bulk-pt-cb:checked')].map(cb=>cb.value);
  if(!selected.length){toast('⚠️ Vyberite patsientov');return;}
  closeM('m-bulk-notif');
  let i=0;
  function sendNext(){
    if(i>=selected.length){toast('✅ Rassylka zavershena: '+selected.length+' soobshcheniy');return;}
    const pt = (PATIENTS||[]).find(p=>p.id===selected[i])||{};
    const phone = (pt.tel||'').replace(/\D/g,'');
    const ptName = (pt.fam||'')+(pt.nam?' '+pt.nam:'');
    const today = new Date().toLocaleDateString('ru-RU');