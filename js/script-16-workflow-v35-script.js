(function(){
  const MAX_HISTORY=60;
  let undoStack=[], redoStack=[], restoring=false, clipboardModule=null;
  const cloneObj=o=>JSON.parse(JSON.stringify(o));
  const stateJSON=()=>JSON.stringify(state);
  let lastSnapshot='';
  try{lastSnapshot=stateJSON();}catch(e){lastSnapshot='';}
  function replaceStateFromJSON(json){
    const obj=JSON.parse(json);
    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state,obj);
  }
  function pushCurrentChange(){
    if(restoring)return;
    let current; try{current=stateJSON();}catch(e){return;}
    if(!lastSnapshot){lastSnapshot=current;return;}
    if(current!==lastSnapshot){
      undoStack.push(lastSnapshot);
      if(undoStack.length>MAX_HISTORY)undoStack.shift();
      redoStack.length=0;
      lastSnapshot=current;
      updateWorkflowButtons();
    }
  }
  const baseSave=save;
  save=function(){pushCurrentChange(); return baseSave.apply(this,arguments);};
  function undo(){
    if(!undoStack.length)return;
    const current=stateJSON();
    const prev=undoStack.pop();
    redoStack.push(current);
    restoring=true;
    replaceStateFromJSON(prev);
    lastSnapshot=prev;
    try{baseSave();renderAll();}finally{restoring=false;updateWorkflowButtons();}
  }
  function redo(){
    if(!redoStack.length)return;
    const current=stateJSON();
    const next=redoStack.pop();
    undoStack.push(current);
    restoring=true;
    replaceStateFromJSON(next);
    lastSnapshot=next;
    try{baseSave();renderAll();}finally{restoring=false;updateWorkflowButtons();}
  }
  function updateWorkflowButtons(){
    const u=document.getElementById('undoBtnV35'),r=document.getElementById('redoBtnV35');
    if(u)u.disabled=!undoStack.length;
    if(r)r.disabled=!redoStack.length;
  }
  window.__statusboardUndoV35=undo; window.__statusboardRedoV35=redo;

  function ensureWorkflowState(){
    if(typeof state.snapEnabled!=='boolean')state.snapEnabled=false;
    if(!state.gridSize)state.gridSize=20;
    if(typeof state.showGridV35!=='boolean')state.showGridV35=false;
  }
  function ensureWorkflowPanel(){
    ensureWorkflowState();
    if(document.getElementById('workflowPanelV35')){updateWorkflowButtons();return;}
    const boardSection=[...document.querySelectorAll('.section')].find(s=>s.textContent.includes('Board'));
    if(!boardSection)return;
    const panel=document.createElement('div');
    panel.id='workflowPanelV35'; panel.className='workflow-panel-v35';
    panel.innerHTML=`<h3>Arbeidsflyt</h3>
      <div class="workflow-grid-v35"><button id="undoBtnV35" class="tool-btn" type="button">↶ Angre</button><button id="redoBtnV35" class="tool-btn" type="button">↷ Redo</button></div>
      <div class="workflow-grid-v35"><label><input id="snapEnabledV35" type="checkbox" ${state.snapEnabled?'checked':''}> Snap to grid</label><label><input id="showGridV35" type="checkbox" ${state.showGridV35?'checked':''}> Vis grid</label></div>
      <div class="field" style="margin-bottom:0"><label>Grid-størrelse px</label><input id="gridSizeV35" type="number" min="2" max="100" step="1" value="${Number(state.gridSize||20)}"></div>
      <p class="small">Hold Alt mens du flytter eller endrer størrelse for å ignorere snap.</p>`;
    boardSection.appendChild(panel);
    document.getElementById('undoBtnV35')?.addEventListener('click',undo);
    document.getElementById('redoBtnV35')?.addEventListener('click',redo);
    document.getElementById('snapEnabledV35')?.addEventListener('change',e=>{state.snapEnabled=e.target.checked;save();applyGridVisual();});
    document.getElementById('showGridV35')?.addEventListener('change',e=>{state.showGridV35=e.target.checked;save();applyGridVisual();});
    document.getElementById('gridSizeV35')?.addEventListener('change',e=>{state.gridSize=Math.max(2,Number(e.target.value)||20);save();applyGridVisual();});
    updateWorkflowButtons(); applyGridVisual();
  }
  function applyGridVisual(){
    ensureWorkflowState();
    board?.style.setProperty('--grid-size-v35',(Number(state.gridSize)||20)+'px');
    board?.classList.toggle('grid-visible-v35',!!state.showGridV35&&!!state.editMode);
  }
  const baseRenderAll=renderAll;
  renderAll=function(){const res=baseRenderAll.apply(this,arguments); try{ensureWorkflowPanel();applyGridVisual();}catch(e){console.warn('workflow panel failed',e);} return res;};

  function snap(n){const g=Math.max(2,Number(state.gridSize)||20); return Math.round(Number(n||0)/g)*g;}
  document.addEventListener('pointermove',e=>{
    if(!state.snapEnabled||e.altKey)return;
    try{
      if(typeof dragState!=='undefined'&&dragState){const m=getModule(dragState.id); if(m){m.x=snap(m.x);m.y=snap(m.y);dragState.el.style.left=px(m.x);dragState.el.style.top=px(m.y);}}
      if(typeof resizeState!=='undefined'&&resizeState){const m=getModule(resizeState.id); if(m){m.w=Math.max(moduleMinWidth(m),snap(m.w));m.h=Math.max(moduleMinHeight(m),snap(m.h));resizeState.el.style.width=px(m.w);resizeState.el.style.height=px(m.h);}}
    }catch(err){}
  });

  function copySelectedModule(){const m=selected&&selected(); if(!m)return false; clipboardModule=cloneObj(m); return true;}
  function pasteModule(){if(!clipboardModule)return false; const c=cloneObj(clipboardModule); c.id=uid(); c.x=(Number(c.x)||0)+24; c.y=(Number(c.y)||0)+24; activeView().modules.push(c); state.selectedId=c.id; save(); renderAll(); return true;}
  function duplicateSelectedModule(){const m=selected&&selected(); if(!m)return false; const c=cloneObj(m); c.id=uid(); c.x=(Number(c.x)||0)+24; c.y=(Number(c.y)||0)+24; activeView().modules.push(c); state.selectedId=c.id; save(); renderAll(); return true;}
  function deleteSelectedModule(){const m=selected&&selected(); if(!m)return false; activeView().modules=activeView().modules.filter(x=>x.id!==m.id); state.selectedId=null; save(); renderAll(); return true;}
  function bringSelectedFront(){const m=selected&&selected(); if(!m)return; const v=activeView(); v.modules=v.modules.filter(x=>x.id!==m.id); v.modules.push(m); save(); renderAll();}
  function sendSelectedBack(){const m=selected&&selected(); if(!m)return; const v=activeView(); v.modules=v.modules.filter(x=>x.id!==m.id); v.modules.unshift(m); save(); renderAll();}
  document.addEventListener('keydown',e=>{
    const tag=(document.activeElement?.tagName||'').toLowerCase();
    const typing=tag==='input'||tag==='textarea'||document.activeElement?.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if((e.ctrlKey||e.metaKey)&&((e.key.toLowerCase()==='y')||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();redo();return;}
    if(typing)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){if(copySelectedModule())e.preventDefault();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(pasteModule())e.preventDefault();}
  });

  const menu=document.createElement('div'); menu.id='ctxMenuV35'; menu.className='ctx-menu-v35'; document.body.appendChild(menu);
  function hideMenu(){menu.classList.remove('show');}
  function showMenu(x,y,items){menu.innerHTML=items.map(it=>it==='sep'?'<div class="sep"></div>':`<button type="button" data-act="${it.id}">${it.label}</button>`).join(''); menu._actions=items.filter(i=>i!=='sep'); menu.style.left=Math.min(x,window.innerWidth-230)+'px'; menu.style.top=Math.min(y,window.innerHeight-260)+'px'; menu.classList.add('show');}
  menu.addEventListener('click',e=>{const b=e.target.closest('button[data-act]'); if(!b)return; const item=(menu._actions||[]).find(i=>i.id===b.dataset.act); hideMenu(); item?.run?.();});
  document.addEventListener('click',e=>{if(!e.target.closest('#ctxMenuV35'))hideMenu();});
  document.addEventListener('contextmenu',e=>{
    if(!state.editMode)return;
    const modEl=e.target.closest('.mod');
    if(!modEl)return;
    e.preventDefault();
    const id=modEl.dataset.id; if(id)state.selectedId=id;
    const cell=e.target.closest('td[data-row][data-col]');
    if(cell){
      const m=getModule(id); const r=+cell.dataset.row,c=+cell.dataset.col; if(m&&m.type==='table'){try{selectTableCell(id,r,c,false);}catch(_){state.selectedCell={moduleId:id,row:r,col:c};state.selectedCells=[{moduleId:id,row:r,col:c}];}
      showMenu(e.clientX,e.clientY,[
        {id:'bold',label:'Bold',run:()=>{try{document.getElementById('cellBold')?.click();}catch(_){}}},
        {id:'center',label:'Midtstill',run:()=>{try{centerSelectedCells();renderAll();}catch(_){}}},
        {id:'merge',label:'Merge',run:()=>{try{mergeCenterSelectedCells();}catch(_){}}},
        {id:'unmerge',label:'Unmerge',run:()=>{try{unmergeSelectedCells();}catch(_){}}},'sep',
        {id:'row',label:'Legg til rad under',run:()=>{try{const row=Array(colCount(m)).fill('');m.rows.splice(r+1,0,row);save();renderAll();}catch(_){}}},
        {id:'col',label:'Legg til kolonne til høyre',run:()=>{try{m.rows.forEach(row=>row.splice(c+1,0,''));save();renderAll();}catch(_){}}},
        {id:'delrow',label:'Slett rad',run:()=>{try{m.rows.splice(r,1);save();renderAll();}catch(_){}}},
        {id:'delcol',label:'Slett kolonne',run:()=>{try{m.rows.forEach(row=>row.splice(c,1));save();renderAll();}catch(_){}}}
      ]); return;}
    }
    showMenu(e.clientX,e.clientY,[
      {id:'copy',label:'Kopier modul',run:copySelectedModule},
      {id:'paste',label:'Lim inn modul',run:pasteModule},
      {id:'dup',label:'Dupliser modul',run:duplicateSelectedModule},
      {id:'del',label:'Slett modul',run:deleteSelectedModule},'sep',
      {id:'front',label:'Flytt fremst',run:bringSelectedFront},
      {id:'back',label:'Flytt bakerst',run:sendSelectedBack}
    ]);
  });

  // Timeline now marker + autofit
  const prevTimelineHTML=window.timelineHTML||timelineHTML;
  function dt(v){const d=new Date(v); return Number.isFinite(d.getTime())?d:null;}
  function toIsoLocal(d){const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;}
  function autoFitTimeline(mod){
    const times=[];
    (mod.events||[]).forEach(e=>{const d=dt(e.time||e.start); if(d)times.push(d);});
    (mod.periods||[]).forEach(p=>{const a=dt(p.start),b=dt(p.end); if(a)times.push(a); if(b)times.push(b);});
    if(!times.length)return false;
    times.sort((a,b)=>a-b); const first=new Date(times[0]), last=new Date(times[times.length-1]);
    const pad=Math.max(15*60000,Math.round((last-first)*0.05));
    mod.start=toIsoLocal(new Date(first.getTime()-pad)); mod.end=toIsoLocal(new Date(last.getTime()+pad)); return true;
  }
  window.timelineHTML=function(mod){
    let html=prevTimelineHTML(mod);
    try{
      const s=dt(mod.start),e=dt(mod.end),now=new Date();
      if(s&&e&&e>s&&now>=s&&now<=e){const pct=((now-s)/(e-s))*100; html=html.replace('</div><div class="timeline-scale v14 v27">',`<div class="timeline-now-v35" style="left:${pct}%"><span>Nå</span></div></div><div class="timeline-scale v14 v27">`);}
    }catch(err){}
    return html;
  };
  const prevTimelineSettings=timelineSettingsHTML;
  timelineSettingsHTML=function(mod){
    let html=prevTimelineSettings(mod);
    if(mod&&mod.type==='timeline') html=html.replace('</div>',`<div class="timeline-autofit-row-v35"><button id="timelineAutoFitV35" class="tool-btn primary" type="button">Tilpass tidslinje til hendelser</button></div></div>`);
    return html;
  };
  const prevBindTimeline=typeof bindTimelineSettings==='function'?bindTimelineSettings:null;
  bindTimelineSettings=function(mod){if(prevBindTimeline)prevBindTimeline(mod); if(!mod||mod.type!=='timeline')return; document.getElementById('timelineAutoFitV35')?.addEventListener('click',()=>{if(autoFitTimeline(mod)){save();renderAll();}else alert('Fant ingen hendelser eller perioder å tilpasse tidslinjen til.');});};

  // Better log controls: search, show/hide all, filtered timeline export.
  function logVisibleFilterTerms(mod){if(!Array.isArray(mod.filters))return [];return mod.filters.filter(f=>f.enabled).map(f=>String(f.term||'').toLowerCase());}
  function logField(entry,tag){const l=(entry.lines||[]).find(x=>String(x.tag||'').toLowerCase()===tag.toLowerCase()); return l?String(l.text||''):'';}
  function parseReceivedDateV35(v){const m=String(v||'').trim().match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if(!m)return null; let y=+m[3]; if(y<100)y+=2000; const d=new Date(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0)); return Number.isFinite(d.getTime())?d:null;}
  function filteredLogEvents(mod){
    const active=logVisibleFilterTerms(mod);
    const search=String(mod.logSearchV35||'').trim().toLowerCase();
    const out=[];
    (mod.entries||[]).forEach((e,i)=>{
      const lines=e.lines||[];
      if(active.length&&!lines.some(l=>active.includes(String(l.tag||'').toLowerCase())))return;
      const hay=lines.map(l=>`${l.tag} ${l.text}`).join(' ').toLowerCase();
      if(search&&!hay.includes(search))return;
      const title=logField(e,'Title')||('Logg '+(i+1));
      const d=parseReceivedDateV35(logField(e,'Received DTG'));
      if(d)out.push({name:title,time:d.toISOString(),color:'#f8fafc',source:'log-filtered-v35',logIndex:i,dtg:logField(e,'Received DTG')});
    });
    return out;
  }
  function addFilteredToTimeline(mod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=filteredLogEvents(mod);const ex=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let n=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(ex.has(k))return;tl.events.push(ev);ex.add(k);n++;});return n;}
  const baseSettings=settingsSpecific;
  settingsSpecific=function(mod){
    let html=baseSettings(mod);
    if(!mod||mod.type!=='log')return html;
    const add=`<div class="log-filter-tools-v35"><button id="logShowAllV35" class="tool-btn" type="button">Vis alle tags</button><button id="logHideAllV35" class="tool-btn" type="button">Skjul alle tags</button><div class="field wide" style="margin-bottom:0"><label>Søk i logg</label><input id="logSearchV35" value="${String(mod.logSearchV35||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}" placeholder="Søk etter tekst"></div><button id="logFilteredTimelineV35" class="tool-btn primary wide" type="button">Plasser filtrerte logger på tidslinjen</button></div>`;
    return html.replace('<div class="log-to-timeline-v29">',add+'<div class="log-to-timeline-v29">');
  };
  const baseRenderSelected=renderSelectedSettings;
  renderSelectedSettings=function(){
    baseRenderSelected(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return;
    document.getElementById('logShowAllV35')?.addEventListener('click',()=>{(mod.filters||[]).forEach(f=>f.enabled=true);save();renderAll();});
    document.getElementById('logHideAllV35')?.addEventListener('click',()=>{(mod.filters||[]).forEach(f=>f.enabled=false);save();renderAll();});
    document.getElementById('logSearchV35')?.addEventListener('input',e=>{mod.logSearchV35=e.target.value;save();renderAll();});
    document.getElementById('logFilteredTimelineV35')?.addEventListener('click',()=>{const tls=(activeView().modules||[]).filter(m=>m.type==='timeline');const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.querySelector('[id^="logTimelineTarget"]')?.value))||tls[0];const n=addFilteredToTimeline(mod,target); if(target&&n){autoFitTimeline(target);save();renderAll();} setTimeout(()=>alert(n?`La til ${n} filtrerte logghendelse${n===1?'':'r'} på tidslinjen.`:'Fant ingen nye filtrerte logghendelser med Received DTG.'),0);});
  };
  try{renderAll();}catch(e){console.error('workflow v35 failed',e);}
})();
