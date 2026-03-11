// АльтернативА МИС — emk.js
// Auto-generated module

function openEmk(ptId){
  EMK_PID = ptId;
  currentEmkPtId = ptId; window._emkPtId = ptId;
function emkTab(tab, btn){
  if(btn){
    document.querySelectorAll('.emk-tab').forEach(t=>t.classList.remove('on'));
    btn.classList.add('on');
  }
  _emkRender(tab);
}

function _emkRender(tab){
  const body = document.getElementById('emk-body');
  if(!body) return;