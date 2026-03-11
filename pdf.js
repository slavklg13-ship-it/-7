// АльтернативА МИС — pdf.js
// Auto-generated module

// PDF GENERATOR — jsPDF
// ═══════════════════════════════════════════

function getPdfDoc(){
  const {jsPDF} = window.jspdf;
  return new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
}

// Загружаем кириллический шрифт через CDN (base64 subset)
// Используем встроенный helvetica + транслитерацию как fallback
function pdfAddHeader(doc, title, subtitle){
  const W=210, margin=20;
  // Шапка
  doc.setFillColor(74,108,247);
  doc.rect(0,0,W,18,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(13);
  doc.setFont('helvetica','bold');
  doc.text('Al'ternativa', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('ru-RU') + '  |  ' + (CU?CU.name:''), W-margin, 12, {align:'right'});
  // Заголовок документа
  doc.setTextColor(15,23,42);
  doc.setFontSize(15);
  doc.setFont('helvetica','bold');
  doc.text(toTranslit(title), margin, 30);
  if(subtitle){
    doc.setFontSize(9);
    doc.setFont('helvetica','normal');
    doc.setTextColor(100,116,139);
    doc.text(toTranslit(subtitle), margin, 37);
  }
  doc.setDrawColor(226,232,240);
  doc.line(margin, 40, W-margin, 40);
  return 46; // y cursor
}

function pdfAddFooter(doc){
  const W=210, H=297, margin=20;
  doc.setDrawColor(226,232,240);
  doc.line(margin, H-15, W-margin, H-15);
  doc.setFontSize(7);
  doc.setTextColor(148,163,184);
  doc.text('Al'ternativa MIS 2.0', margin, H-9);
  doc.text('str. 1', W-margin, H-9, {align:'right'});
}

function pdfTextField(doc, label, value, x, y, w){
  doc.setFontSize(7);
  doc.setFont('helvetica','normal');
  doc.setTextColor(100,116,139);
  doc.text(toTranslit(label), x, y);
  doc.setFontSize(9);
  doc.setTextColor(15,23,42);
  doc.setFont('helvetica','bold');
  doc.text(toTranslit(value||'—'), x, y+5);
  doc.setDrawColor(226,232,240);
  doc.line(x, y+6.5, x+w, y+6.5);
}

function pdfSection(doc, title, y){
  doc.setFillColor(248,250,252);
  doc.rect(20, y-4, 170, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica','bold');
  doc.setTextColor(74,108,247);
  doc.text(toTranslit(title.toUpperCase()), 22, y+0.5);
  return y + 7;
}

function pdfTextBlock(doc, text, x, y, maxW){
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.setTextColor(15,23,42);
  const lines = doc.splitTextToSize(toTranslit(text), maxW);
  doc.text(lines, x, y);
  return y + lines.length * 4.5;
}

// Транслитерация для PDF (jsPDF не поддерживает кириллицу без шрифтов)
function toTranslit(str){
  if(!str) return '';
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'sch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
    'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
    'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Sch',
    'Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
  };
  return String(str).split('').map(c=>map[c]!==undefined?map[c]:c).join('');
}

// ─── PDF: Протокол осмотра ортопеда ───
function generatePdfOrtho(ptId){
  const pt = (PATIENTS||[]).find(p=>p.id===ptId) || {};
function generatePdfPRP(ptId){
  const pt = (PATIENTS||[]).find(p=>p.id===ptId) || {};
function generatePdfUZI(ptId){
  const pt = (PATIENTS||[]).find(p=>p.id===ptId) || {};
  const doc = getPdfDoc();
  let y = pdfAddHeader(doc,'Protokol UZI sustavov',
    (pt.fam||'')+(pt.nam?' '+pt.nam:'')+'  |  '+new Date().toLocaleDateString('ru-RU'));

  y = pdfSection(doc,'Dannie patsienta',y+4);
  pdfTextField(doc,'FIO',(pt.fam||'')+(pt.nam?' '+pt.nam:''),22,y+2,100);
  pdfTextField(doc,'Data rozhdeniya',pt.dob||'—',130,y+2,58);
  y += 16;

  y = pdfSection(doc,'Parametry issledovaniya',y+2);
  pdfTextField(doc,'Sustav','_____________',22,y+5,50);
  pdfTextField(doc,'Storona','prav. / lev.',80,y+5,35);
  pdfTextField(doc,'Apparat','_____________',122,y+5,64);
  y += 18;

  const fields = [
    ['Sustavnaya shchel' (mm)','med: ___ / lat: ___'],
    ['Sustavnoy khryashch (mm)','_____ (norma 2-4 mm)'],
    ['Sinovial'naya obolochka','ne utolshchena / utolshchena'],
    ['Vypot v polosti','net / est: ___ ml'],
    ['Osteofit','net / est'],
    ['Menisk (dlya kolennogo)','norma / izmenen'],
  ];
  fields.forEach(([lbl,val],i)=>{
    pdfTextField(doc, lbl, val, 22, y+(i*14), 165);
  });
  y += fields.length*14 + 4;

  y = pdfSection(doc,'Zaklyuchenie',y+2);
  doc.setFontSize(9);
  doc.setTextColor(15,23,42);
  doc.text('Ekho-priznaki: _______________________________________________', 22, y+6);
  doc.text('(artroza ___ st. / sinovita / tendinopatii / bursita / drugoye)', 22, y+12);
  y += 22;

  pdfTextField(doc,'Rekomendatsii','',22,y,165);
  y += 14;

  doc.text('Vrach UZD: ___________________   Podpis: ___________________', 22, y+6);
  pdfAddFooter(doc);
  doc.save('uzi_zaklyuchenie_'+(pt.fam||'patient')+'.pdf');
  toast('📄 PDF сохранён');
}

// ─── PDF: Акт / Чек оплаты ───
function generatePdfReceipt(payId){
function generatePdfEmk(ptId){
  const pt = (PATIENTS||[]).find(p=>p.id===ptId);
  if(!pt){toast('Patsient ne nayden');return;}