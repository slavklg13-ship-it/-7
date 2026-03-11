// АльтернативА МИС — reports.js
// Auto-generated module

function renderReports(){
// EXCEL ЭКСПОРТ — SheetJS
// ═══════════════════════════════════════════

function xlsxDownload(wb, filename){
  if(!window.XLSX){toast('⚠️ SheetJS не загружен');return;}
  XLSX.writeFile(wb, filename);
  toast('📊 Excel-файл сохранён: '+filename);
}

// ─── 1. Финансовый отчёт ───
function exportExcelFinance(){
  if(!window.XLSX){toast('⚠️ Загрузка библиотеки...');return;}
function exportExcelPatients(){
  if(!window.XLSX){toast('⚠️ Загрузка библиотеки...');return;}
function exportExcelSchedule(){
  if(!window.XLSX){toast('⚠️ Загрузка библиотеки...');return;}
function exportExcelStock(){
  if(!window.XLSX){toast('⚠️ Загрузка библиотеки...');return;}
function exportExcelSalary(){
  if(!window.XLSX){toast('⚠️ Загрузка библиотеки...');return;}