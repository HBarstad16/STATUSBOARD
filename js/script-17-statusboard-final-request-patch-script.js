(function(){
  "use strict";
  const PATCH_VERSION="statusboard-final-request-2026-06-05";
  const $=id=>document.getElementById(id);
  const esc=v=>(typeof escapeHTML==='function'?escapeHTML(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])));
  const cloneSafe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}};
  function ensureRepository(){
    if(!state.repository)state.repository={};
    if(!Array.isArray(state.repository.personell)){
      let base=[];try{base=(Array.isArray(PERSONELL_DATA)?PERSONELL_DATA:[]).map(p=>({function:p.function||'',functionNo:p.functionNo||'',name:p.name||'',personalNo:p.personalNo||'',phone:p.phone||''}));}catch(e){}
      state.repository.personell=base.length?base:[{function:'Leder',functionNo:'10',name:'Ola Nordmann',personalNo:'01',phone:''}];
    }
    if(!Array.isArray(state.repository.personellLocations)){
      let loc=[];try{loc=Array.isArray(PERSONELL_LOCATIONS)?PERSONELL_LOCATIONS:[];}catch(e){}
      state.repository.personellLocations=loc.length?loc:['UTE','Kantinen','Trening','Hvilerom'];
    }
    if(!Array.isArray(state.repository.logTags))state.repository.logTags=['Title','Received DTG','Recieved DTG','Receiced DTG','Summary','From'];
    if(!Array.isArray(state.repository.timelineLogTags))state.repository.timelineLogTags=['Title','Received DTG','Recieved DTG','Receiced DTG'];
    if(!Array.isArray(state.repository.alertLevels))state.repository.alertLevels=[
      {key:'normal',label:'NORMAL',text:'#34d399',bg:'#052e1e'},
      {key:'warning',label:'WARNING',text:'#fbbf24',bg:'#422006'},
      {key:'danger',label:'DANGER',text:'#fb7185',bg:'#450a0a'}
    ];
    if(!state.design)state.design={};
    state.design.fontFamily=state.design.fontFamily||'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    state.design.background=state.design.background||state.design.background2||state.design.background1||'#0f172a';
    state.design.background1=state.design.background;state.design.background2=state.design.background;state.design.background3=state.design.background;
    state.design.menuOpacity=Number.isFinite(+state.design.menuOpacity)?+state.design.menuOpacity:.82;
    state.design.boardInset=Number.isFinite(+state.design.boardInset)?+state.design.boardInset:0;
    state.design.madeByText=state.design.madeByText||'laget av';
    if(!state.design.moduleColors)state.design.moduleColors={};
    state.currentAdminMenu=state.currentAdminMenu||'admin';
  }
  function applyDesign(){
    ensureRepository();
    const root=document.documentElement;
    root.style.setProperty('--statusboard-font',state.design.fontFamily);
    root.style.setProperty('--bg1',state.design.background);root.style.setProperty('--bg2',state.design.background);root.style.setProperty('--bg3',state.design.background);
    root.style.setProperty('--admin-menu-opacity',String(state.design.menuOpacity));
    root.style.setProperty('--statusboard-madeby',JSON.stringify(state.design.madeByText||'laget av'));
    const shell=document.querySelector('.status-shell');if(shell)shell.style.inset=(Number(state.design.boardInset)||0)+'px';
  }
  function moduleColorFor(mod){ensureRepository();return (state.design.moduleColors&&state.design.moduleColors[mod.type])||{};}
  function moduleInlineStyle(mod){const c=moduleColorFor(mod);let s=''; if(c.bg)s+='--module-bg:'+c.bg+';'; if(c.contentBg)s+='--module-content-bg:'+c.contentBg+';'; if(c.border)s+='--module-border:'+c.border+';'; if(c.title)s+='--module-title-color:'+c.title+';'; if(c.tableBorder)s+='--table-border:'+c.tableBorder+';'; return s;}

  ensureRepository();
  try{if(moduleDefs&&moduleDefs.json)delete moduleDefs.json;}catch(e){}

  const oldRenderPalette=renderPalette;
  renderPalette=function(){oldRenderPalette();document.querySelectorAll('.module-card[data-type="json"]').forEach(x=>x.remove());};

  const oldBuildModule=buildModule;
  buildModule=function(mod){const el=oldBuildModule(mod);try{el.setAttribute('style',(el.getAttribute('style')||'')+';'+moduleInlineStyle(mod));}catch(e){}return el;};

  const oldAddModule=addModule;
  addModule=function(type,clientX,clientY){
    if(type==='json')type='table';
    oldAddModule(type,clientX,clientY);
    const mod=selected&&selected();
    if(mod&&mod.type==='timeline'){mod.periods=[];mod.events=[];if(!mod.timelineDensity)mod.timelineDensity='hour';save();renderAll();}
  };

  const oldNormalizeMod=normalizeMod;
  normalizeMod=function(mod){oldNormalizeMod(mod);if(mod&&mod.type==='timeline'){if(!Array.isArray(mod.periods))mod.periods=[];if(!Array.isArray(mod.events))mod.events=[];mod.timelineDensity=mod.timelineDensity||'hour';}if(mod&&mod.type==='alert'){mod.level=mod.level||'normal';}if(mod&&mod.type==='table'){if(!mod.colWidths)mod.colWidths={};if(!mod.rowHeights)mod.rowHeights={};}};

  function renderMenuSwitch(){return `<div class="admin-menu-switch"><button id="menuAdminFinal" class="tool-btn ${state.currentAdminMenu==='admin'?'active':''}" type="button">Admin</button><button id="menuDesignFinal" class="tool-btn ${state.currentAdminMenu==='design'?'active':''}" type="button">Design</button><button id="menuRepoFinal" class="tool-btn ${state.currentAdminMenu==='repository'?'active':''}" type="button">Repository</button></div>`;}
  function bindMenuSwitch(){[['menuAdminFinal','admin'],['menuDesignFinal','design'],['menuRepoFinal','repository']].forEach(([id,v])=>$(id)?.addEventListener('click',()=>{state.currentAdminMenu=v;renderAll();}));}
  function renderDesignMenu(){
    ensureRepository();
    const mod=selected&&selected();
    const type=mod?.type;
    const c=type?(state.design.moduleColors[type]||{}):{};
    const card=type?`<div class="design-card" data-design-type="${esc(type)}"><strong>${esc(mod.name||moduleDefs[type]?.label||type)}</strong><p class="small">Endringene gjelder alle moduler av typen ${esc(moduleDefs[type]?.label||type)}.</p><div class="grid2" style="margin-top:8px"><div class="field"><label>Modul</label><input class="design-mod-bg" type="color" value="${esc(c.bg||'#020617')}"></div><div class="field"><label>Innhold</label><input class="design-mod-content" type="color" value="${esc(c.contentBg||'#111827')}"></div><div class="field"><label>Modulkant</label><input class="design-mod-border" type="color" value="${esc(c.border||'#334155')}"></div><div class="field"><label>Tittel</label><input class="design-mod-title" type="color" value="${esc(c.title||'#f8fafc')}"></div>${type==='table'?`<div class="field"><label>Tabellkant</label><input class="design-table-border" type="color" value="${esc(c.tableBorder||'#334155')}"></div>`:''}</div><button class="tool-btn danger design-clear-type" type="button">Nullstill denne typen</button></div>`:'<p class="muted">Klikk på en modul på boardet for å vise designvalgene.</p>';
    return `<section class="section"><div class="section-title"><h2>Design</h2></div><div class="field"><label>Bakgrunnsfarge</label><input id="designBg" type="color" value="${esc(state.design.background)}"></div><div class="field"><label>Menybakgrunn opacity</label><input id="designMenuOpacity" type="range" min="0.25" max="1" step="0.05" value="${state.design.menuOpacity}"><div class="opacity-readout"><span>Transparent</span><span>${Math.round(state.design.menuOpacity*100)}%</span></div></div><div class="field"><label>Font fra PC-en</label><input id="designFont" value="${esc(state.design.fontFamily)}" placeholder="Arial, Aptos, Calibri, Inter..."></div><div class="field"><label>Board kantmarg</label><input id="designInset" type="range" min="0" max="30" step="1" value="${Number(state.design.boardInset)||0}"></div><div class="field"><label>Tekst i venstre topphjørne</label><input id="designMadeBy" value="${esc(state.design.madeByText||'laget av')}"></div><button id="designResetFinal" class="tool-btn danger" type="button">Nullstill design</button></section><section class="section"><div class="section-title"><h2>Valgt modul</h2></div>${card}</section>`;
  }
  function bindDesignMenu(){
    const map=[['designBg','background'],['designMenuOpacity','menuOpacity'],['designFont','fontFamily'],['designInset','boardInset'],['designMadeBy','madeByText']];
    map.forEach(([id,key])=>$(id)?.addEventListener('input',e=>{state.design[key]=key==='boardInset'||key==='menuOpacity'?Number(e.target.value):e.target.value;if(key==='background'){state.design.background1=state.design.background;state.design.background2=state.design.background;state.design.background3=state.design.background;}applyDesign();save();if(key!=='fontFamily')renderBoard();}));
    document.querySelectorAll('[data-design-type]').forEach(card=>{const t=card.dataset.designType;const update=()=>{state.design.moduleColors[t]={bg:card.querySelector('.design-mod-bg').value,contentBg:card.querySelector('.design-mod-content').value,border:card.querySelector('.design-mod-border').value,title:card.querySelector('.design-mod-title').value,tableBorder:card.querySelector('.design-table-border')?.value};save();renderBoard();};card.querySelectorAll('input').forEach(i=>i.addEventListener('input',update));card.querySelector('.design-clear-type')?.addEventListener('click',()=>{delete state.design.moduleColors[t];save();renderAll();});});
    $('designResetFinal')?.addEventListener('click',()=>{if(!confirm('Nullstille designfarger og font?'))return;delete state.design;ensureRepository();save();renderAll();});
  }
  function renderRepositoryMenu(){
    ensureRepository();
    const pRows=state.repository.personell.map((p,i)=>`<div class="repo-row" data-person-row="${i}"><input class="repo-func" placeholder="Funksjon" value="${esc(p.function)}"><input class="repo-name" placeholder="Navn" value="${esc(p.name)}"><input class="repo-phone" placeholder="Tlf eller funksjon+person" value="${esc(p.phone||((p.functionNo||'')+(p.personalNo||'')))}"><button class="mini-btn danger repo-del-person" type="button">×</button></div>`).join('');
    const aRows=state.repository.alertLevels.map((a,i)=>`<div class="repo-row alert" data-alert-row="${i}"><input class="repo-alert-key" placeholder="key" value="${esc(a.key)}"><input class="repo-alert-label" placeholder="Tekst" value="${esc(a.label)}"><input class="repo-alert-text" type="color" value="${esc(a.text||'#ffffff')}"><input class="repo-alert-bg" type="color" value="${esc(a.bg||'#000000')}"><button class="mini-btn danger repo-del-alert" type="button">×</button></div>`).join('');
    return `<section class="section"><div class="section-title"><h2>Repository: personell</h2><button id="repoAddPerson" class="mini-btn" type="button">+</button></div><p class="small">Telefon kan skrives direkte, eller bygges fra funksjonsnummer + personnummer i gammel struktur.</p>${pRows||'<p class="small">Ingen personell.</p>'}<div class="field"><label>Lokasjoner / dropdown</label><textarea id="repoLocations">${esc((state.repository.personellLocations||[]).join('\n'))}</textarea></div></section><section class="section"><div class="section-title"><h2>Repository: log</h2></div><div class="field"><label>Log line tags som skal kunne vises/filtreres</label><textarea id="repoLogTags">${esc((state.repository.logTags||[]).join('\n'))}</textarea></div><div class="field"><label>Tags som skal kunne sendes til tidslinje</label><textarea id="repoTimelineTags">${esc((state.repository.timelineLogTags||[]).join('\n'))}</textarea></div></section><section class="section"><div class="section-title"><h2>Repository: alert nivåer</h2><button id="repoAddAlert" class="mini-btn" type="button">+</button></div>${aRows}</section>`;
  }
  function bindRepositoryMenu(){
    function saveRepoFromDOM(){state.repository.personell=[...document.querySelectorAll('[data-person-row]')].map(row=>({function:row.querySelector('.repo-func').value.trim(),name:row.querySelector('.repo-name').value.trim(),phone:row.querySelector('.repo-phone').value.trim(),functionNo:'',personalNo:''})).filter(p=>p.function||p.name||p.phone);state.repository.personellLocations=($('repoLocations')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.logTags=($('repoLogTags')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.timelineLogTags=($('repoTimelineTags')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.alertLevels=[...document.querySelectorAll('[data-alert-row]')].map(row=>({key:row.querySelector('.repo-alert-key').value.trim()||'level',label:row.querySelector('.repo-alert-label').value.trim()||'ALERT',text:row.querySelector('.repo-alert-text').value,bg:row.querySelector('.repo-alert-bg').value}));save();renderBoard();}
    document.querySelectorAll('.admin-body input,.admin-body textarea').forEach(el=>el.addEventListener('input',saveRepoFromDOM));
    document.querySelectorAll('.repo-del-person').forEach(btn=>btn.addEventListener('click',()=>{btn.closest('[data-person-row]')?.remove();saveRepoFromDOM();}));
    document.querySelectorAll('.repo-del-alert').forEach(btn=>btn.addEventListener('click',()=>{btn.closest('[data-alert-row]')?.remove();saveRepoFromDOM();}));
    $('repoAddPerson')?.addEventListener('click',()=>{saveRepoFromDOM();state.repository.personell.push({function:'',name:'',phone:''});save();renderAll();});
    $('repoAddAlert')?.addEventListener('click',()=>{saveRepoFromDOM();state.repository.alertLevels.push({key:'info',label:'INFO',text:'#7dd3fc',bg:'#082f49'});save();renderAll();});
  }
  const adminBodyFinal=document.querySelector('.admin-body');
  const adminOriginalFinal=document.createElement('div');
  const adminMenuFinal=document.createElement('div');
  const adminAlternateFinal=document.createElement('div');
  adminOriginalFinal.className='admin-original-content-final';
  adminMenuFinal.className='admin-menu-host-final';
  adminAlternateFinal.className='admin-alternate-content-final';
  while(adminBodyFinal?.firstChild)adminOriginalFinal.appendChild(adminBodyFinal.firstChild);
  adminBodyFinal?.append(adminMenuFinal,adminOriginalFinal,adminAlternateFinal);

  function updateAdminMenu(){
    ensureRepository();applyDesign();
    const title=document.querySelector('.admin-head h1'),sub=document.querySelector('.admin-head p');
    if(title)title.textContent=state.currentAdminMenu==='design'?'Design':state.currentAdminMenu==='repository'?'Repository':'Admin';
    if(sub)sub.textContent=state.currentAdminMenu==='design'?'Farger, bakgrunn og font.':state.currentAdminMenu==='repository'?'Data som brukes av moduler.':'Alle kontroller er samlet her.';
    if(!adminBodyFinal)return;
    adminMenuFinal.innerHTML=renderMenuSwitch();
    bindMenuSwitch();
    const isAdmin=state.currentAdminMenu==='admin';
    adminOriginalFinal.hidden=!isAdmin;
    adminAlternateFinal.hidden=isAdmin;
    if(state.currentAdminMenu==='design'){adminAlternateFinal.innerHTML=renderDesignMenu();bindDesignMenu();}
    else if(state.currentAdminMenu==='repository'){adminAlternateFinal.innerHTML=renderRepositoryMenu();bindRepositoryMenu();}
    else adminAlternateFinal.innerHTML='';
  }
  const oldRenderAll=renderAll;
  renderAll=function(){ensureRepository();oldRenderAll();updateAdminMenu();};

  els.displayMode.onclick=()=>{state.editMode=!state.editMode;if(state.editMode){state.adminHidden=true;}else{state.adminHidden=true;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];}renderAll();};
  els.adminButton.onclick=()=>{if(!state.adminUnlocked){openAdminLogin();return;}if(state.editMode&&!state.adminHidden){state.adminHidden=true;renderAll();return;}state.editMode=true;state.adminHidden=false;state.currentAdminMenu='admin';renderAll();};

  const oldCreateExportState=createExportState;
  createExportState=function(){ensureRepository();const exported=(typeof oldCreateExportState==='function'?oldCreateExportState():cloneSafe(state));exported.repository=cloneSafe(state.repository);exported.design=cloneSafe(state.design);exported.exportVersion=PATCH_VERSION;exported.exportedAt=new Date().toISOString();return exported;};

  function repoPersonell(){ensureRepository();return state.repository.personell||[];}
  function repoPhone(func,name){const p=repoPersonell().find(x=>x.function===func&&x.name===name);return p?(p.phone||((p.functionNo||'')+(p.personalNo||''))):'';}
  personellPhone=function(func,name){return repoPhone(func,name);};
  personellHTML=function(mod){ensureRepository();if(!Array.isArray(mod.rows))mod.rows=[];const data=repoPersonell();const funcs=[...new Set(data.map(p=>p.function).filter(Boolean))];const listId='personell-location-list-'+mod.id;const locOpts=(state.repository.personellLocations||[]).map(loc=>`<option value="${esc(loc)}"></option>`).join('');const rows=mod.rows.map((row,i)=>{row.function=row.function||'';row.name=row.name||'';row.location=row.location||'';const names=data.filter(p=>!row.function||p.function===row.function).map(p=>p.name).filter(Boolean);const sizes=personellTextSizes(mod);return `<tr><td style="font-size:${Number(sizes.function)||1}em"><select class="person-function" data-row="${i}"><option value="">Blank / alle</option>${funcs.map(f=>`<option value="${esc(f)}" ${f===row.function?'selected':''}>${esc(f)}</option>`).join('')}</select></td><td style="font-size:${Number(sizes.name)||1}em"><select class="person-name" data-row="${i}"><option value="">Blank / alle navn</option>${names.map(n=>`<option value="${esc(n)}" ${n===row.name?'selected':''}>${esc(n)}</option>`).join('')}</select></td><td style="font-size:${Number(sizes.location)||1}em"><input class="person-location" list="${esc(listId)}" data-row="${i}" value="${esc(row.location)}" placeholder="Blank / lokasjon"></td><td style="font-size:${Number(sizes.phone)||1}em">${esc(repoPhone(row.function,row.name))}</td></tr>`;}).join('');return `<div class="content"><table class="personell-table"><tbody>${rows}</tbody></table><datalist id="${esc(listId)}">${locOpts}</datalist>${state.editMode?`<button class="tool-btn person-add" style="margin-top:10px">+ Personellrad</button>`:''}</div>`;};

  const oldSettingsSpecific=settingsSpecific;
  settingsSpecific=function(mod){
    if(mod&&mod.type==='alert'){ensureRepository();const opts=state.repository.alertLevels.map(a=>`<option value="${esc(a.key)}" ${mod.level===a.key?'selected':''}>${esc(a.label||a.key)}</option>`).join('');return `<div class="field"><label>Nivå fra repository</label><select id="alertLevel">${opts}</select></div>`;}
    if(mod&&mod.type==='timeline'){let html=oldSettingsSpecific(mod);html=html.replace(/<label>Tidsformat<\/label>[\s\S]*?<\/select>/,'<label>Visning</label><select id="timelineDensityFinal"><option value="hour" '+((mod.timelineDensity||'hour')==='hour'?'selected':'')+'>Hele timer</option><option value="half" '+(mod.timelineDensity==='half'?'selected':'')+'>Timer og halvtimer</option><option value="quarter" '+(mod.timelineDensity==='quarter'?'selected':'')+'>Timer, halvtimer og kvarter</option></select>');html=html.replace(/<p class="small">Neste dag[\s\S]*?<\/p>/,'<p class="small">Tidslinjen viser dato og klokkeslett. Perioder ligger under den hvite linjen, og NÅ markeres tydelig.</p>');return html;}
    if(mod&&mod.type==='log'){let html=oldSettingsSpecific(mod);ensureRepository();html+=`<div class="design-card"><strong>Repository-filter</strong><p class="small">Disse ordene kommer fra Repository → Log.</p><div class="field"><label>Vis bare tags</label><select id="logRepoVisibleTags" multiple size="${Math.min(8,Math.max(3,state.repository.logTags.length))}">${state.repository.logTags.map(t=>`<option value="${esc(t)}" ${(mod.repoVisibleTags||[]).includes(t)?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div class="field"><label>Send disse til tidslinje</label><select id="logRepoTimelineTags" multiple size="${Math.min(8,Math.max(3,state.repository.timelineLogTags.length))}">${state.repository.timelineLogTags.map(t=>`<option value="${esc(t)}" ${(mod.repoTimelineTags||[]).includes(t)?'selected':''}>${esc(t)}</option>`).join('')}</select></div></div>`;return html;}
    return oldSettingsSpecific(mod);
  };

  const oldAlertHTML=alertHTML;
  alertHTML=function(mod){ensureRepository();const lvl=state.repository.alertLevels.find(a=>a.key===mod.level)||state.repository.alertLevels[0];const text=mod.message||lvl?.label||'';return `<div class="alert-box" style="background:${esc(lvl?.bg||'#052e1e')};color:${esc(lvl?.text||'#34d399')}" contenteditable="true" data-key-direct="message">${esc(text)}</div>`;};

  const oldRenderSelectedSettings=renderSelectedSettings;
  renderSelectedSettings=function(){oldRenderSelectedSettings();const mod=selected&&selected();if(!mod)return;if(mod.type==='timeline'){$('timelineDensityFinal')?.addEventListener('change',e=>{mod.timelineDensity=e.target.value;mod.timelineUnit='hour';mod.timelineTicks=e.target.value==='hour'?0:e.target.value==='half'?1:3;save();renderAll();});}if(mod.type==='log'){$('logRepoVisibleTags')?.addEventListener('change',e=>{mod.repoVisibleTags=[...e.target.selectedOptions].map(o=>o.value);save();renderAll();});$('logRepoTimelineTags')?.addEventListener('change',e=>{mod.repoTimelineTags=[...e.target.selectedOptions].map(o=>o.value);save();renderSelectedSettings();});}};

  const oldTableHTML=tableHTML;
  tableHTML=function(mod){normalizeMerges(mod);if(!mod.colWidths)mod.colWidths={};if(!mod.rowHeights)mod.rowHeights={};const rows=mod.rows||[];return `<div class="content table-modern-wrap" style="${typeof tableDensityVars==='function'?tableDensityVars(mod):''}"><table class="status-table-modern"><tbody>${rows.map((row,r)=>`<tr style="${mod.rowHeights[r]!=null?'height:'+Number(mod.rowHeights[r])+'px':''}">${row.map((cell,c)=>{if(isHiddenMergedCell(mod,r,c))return '';const raw=String(cell??'');const merge=getMergeAt(mod,r,c);const classes=[isSelectedCell(mod.id,r,c)?'cell-selected':'',isMultiSelectedCell(mod.id,r,c)?'cell-multi-selected':'',merge?'cell-merged':''].filter(Boolean).join(' ');const span=merge?`${merge.rowspan>1?` rowspan="${merge.rowspan}"`:''}${merge.colspan>1?` colspan="${merge.colspan}"`:''}`:'';const width=mod.colWidths[c]!=null?`width:${Number(mod.colWidths[c])}px;min-width:${Number(mod.colWidths[c])}px;`:'';return `<td data-row="${r}" data-col="${c}"${span} class="${classes}" style="${width}${cellStyleCSS(mod,r,c)}"><div class="cell-display">${formatTextHTML(raw)}</div><textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${esc(raw)}</textarea><span class="cell-col-resizer" data-col-resize="${c}"></span><span class="cell-row-resizer" data-row-resize="${r}"></span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;};

  function parseExcelHTML(html){const doc=new DOMParser().parseFromString(html,'text/html');const trs=[...doc.querySelectorAll('tr')];if(!trs.length)return null;return trs.map(tr=>[...tr.children].filter(td=>/^(TD|TH)$/.test(td.tagName)).map(td=>({text:td.innerText.replace(/\r/g,''),align:(td.style.textAlign||td.getAttribute('align')||'').toLowerCase(),bold:(td.style.fontWeight&&Number(td.style.fontWeight)>=600)||/bold/i.test(td.style.fontWeight||'')||!!td.querySelector('b,strong'),fontSize:parseFloat(td.style.fontSize)||null})));}
  function pasteExcelAt(mod,r,c,e){const html=e.clipboardData?.getData('text/html')||'';const parsed=html&&parseExcelHTML(html);const plain=e.clipboardData?.getData('text/plain')||'';let grid=parsed;if(!grid){grid=plain.split(/\r?\n/).filter((line,i,arr)=>line!==''||i<arr.length-1).map(line=>line.split('\t').map(text=>({text,align:'',bold:false,fontSize:null})));}if(!grid||!grid.length)return false;e.preventDefault();const needRows=r+grid.length;const needCols=c+Math.max(...grid.map(x=>x.length));while(mod.rows.length<needRows)mod.rows.push(Array(colCount(mod)).fill(''));mod.rows.forEach(row=>{while(row.length<needCols)row.push('');});grid.forEach((row,rr)=>row.forEach((cell,cc)=>{const tr=r+rr,tc=c+cc;mod.rows[tr][tc]=cell.text;if(cell.align||cell.bold||cell.fontSize){const st={...getCellStyle(mod,tr,tc)};if(cell.align)st.align=cell.align;if(cell.bold)st.bold=true;if(cell.fontSize)st.fontSize=cell.fontSize;setCellStyle(mod,tr,tc,st);}}));selectCellRange(mod.id,r,c,r+grid.length-1,c+Math.max(...grid.map(x=>x.length))-1);save();renderAll();return true;}
  const oldCellStyleCSS=cellStyleCSS;
  cellStyleCSS=function(mod,r,c){const st=getCellStyle(mod,r,c);let css=oldCellStyleCSS(mod,r,c)||'';if(st.bold)css+=';font-weight:700;--cell-weight:700';if(st.fontSize)css+=';font-size:'+Number(st.fontSize)+'px';return css;};

  function installTableContext(){let menu=$('tableContextMenuFinal');if(!menu){menu=document.createElement('div');menu.id='tableContextMenuFinal';menu.className='table-context-menu';document.body.appendChild(menu);}return menu;}
  function showTableMenu(e,mod,r,c){e.preventDefault();e.stopPropagation();if(!isMultiSelectedCell(mod.id,r,c))selectTableCell(mod.id,r,c,false);const menu=installTableContext();menu.innerHTML=`<button data-act="bold">Bold valgte celler</button><button data-act="insert-row">Sett inn rad under</button><button data-act="insert-col">Sett inn kolonne til høyre</button><button data-act="del-row" class="danger">Slett valgte rader</button><button data-act="del-col" class="danger">Slett valgte kolonner</button><button data-act="merge">Merge & center</button><button data-act="unmerge">Unmerge</button>`;menu.style.left=Math.min(e.clientX,innerWidth-240)+'px';menu.style.top=Math.min(e.clientY,innerHeight-260)+'px';menu.classList.add('show');menu.onclick=ev=>{const act=ev.target?.dataset?.act;if(!act)return;ev.stopPropagation();if(act==='bold'){selectedCellTargets().forEach(t=>{const m=getModule(t.moduleId);setCellStyle(m,t.row,t.col,{...getCellStyle(m,t.row,t.col),bold:true});});save();renderAll();}if(act==='insert-row'){insertRowAfterSelection(mod);}if(act==='insert-col'){insertColAfterSelection(mod);}if(act==='del-row'){deleteSelectedRows(mod);}if(act==='del-col'){deleteSelectedCols(mod);}if(act==='merge'){mergeCenterSelectedCells();}if(act==='unmerge'){unmergeSelectedCells();}};}
  function deleteSelectedRows(mod){const rows=[...new Set(selectedCellTargets().filter(t=>t.moduleId===mod.id).map(t=>t.row))].sort((a,b)=>b-a);rows.forEach(r=>{if(mod.rows.length>1)mod.rows.splice(r,1);});save();state.selectedCells=[];state.selectedCell=null;renderAll();}
  function deleteSelectedCols(mod){const cols=[...new Set(selectedCellTargets().filter(t=>t.moduleId===mod.id).map(t=>t.col))].sort((a,b)=>b-a);cols.forEach(c=>mod.rows.forEach(row=>{if(row.length>1)row.splice(c,1);}));save();state.selectedCells=[];state.selectedCell=null;renderAll();}
  document.addEventListener('click',e=>{if(!e.target.closest('#tableContextMenuFinal'))$('tableContextMenuFinal')?.classList.remove('show');});

  const oldWireEditable=wireEditable;
  wireEditable=function(el,mod){oldWireEditable(el,mod);if(mod.type!=='table')return;el.querySelectorAll('.cell-editor').forEach(input=>{input.addEventListener('paste',e=>{pasteExcelAt(mod,+input.dataset.row,+input.dataset.col,e);},{capture:true});input.addEventListener('keydown',e=>{const keys={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};if(!keys[e.key]||e.shiftKey||e.altKey||e.ctrlKey||e.metaKey)return;const pos=input.selectionStart,atStart=pos===0,atEnd=pos===input.value.length;if((e.key==='ArrowLeft'&&!atStart)||(e.key==='ArrowRight'&&!atEnd))return;e.preventDefault();const [dr,dc]=keys[e.key];const nr=Math.max(0,Math.min((mod.rows||[]).length-1,+input.dataset.row+dr));const nc=Math.max(0,Math.min(colCount(mod)-1,+input.dataset.col+dc));selectTableCell(mod.id,nr,nc,false);renderAll();setTimeout(()=>{const ni=document.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"] .cell-editor[data-row="${nr}"][data-col="${nc}"]`);ni?.focus();},0);});});el.querySelectorAll('td').forEach(td=>{td.addEventListener('contextmenu',e=>showTableMenu(e,mod,+td.dataset.row,+td.dataset.col));});el.querySelectorAll('[data-col-resize]').forEach(h=>h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const c=+h.dataset.colResize,start=e.clientX,startW=Number(mod.colWidths[c]||h.closest('td').getBoundingClientRect().width||90);const move=ev=>{mod.colWidths[c]=Math.max(38,startW+ev.clientX-start);renderBoard();};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);save();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}));el.querySelectorAll('[data-row-resize]').forEach(h=>h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=+h.dataset.row,start=e.clientY,startH=Number(mod.rowHeights[r]||h.closest('tr').getBoundingClientRect().height||42);const move=ev=>{mod.rowHeights[r]=Math.max(24,startH+ev.clientY-start);renderBoard();};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);save();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}));};

  const oldShowWordDropdown=typeof showWordDropdown==='function'?showWordDropdown:null;
  if(oldShowWordDropdown){showWordDropdown=function(input,mod,r,c){oldShowWordDropdown(input,mod,r,c);setTimeout(()=>{document.querySelectorAll('#wordDropdown button,.word-dropdown button').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{try{hideWordDropdown();}catch(e){}},0),{once:true}));},0);};}

  function fmtTickFinal(d,density){const dt=new Date(d);return dt.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});}
  const oldTimelineHTML=timelineHTML;
  timelineHTML=function(mod){let html=oldTimelineHTML(mod);try{const min=new Date(mod.start).getTime(),max=Math.max(new Date(mod.end).getTime(),min+60000),now=Date.now();let nowLine='';if(now>=min&&now<=max){nowLine=`<div class="timeline-now-line-final" style="left:${((now-min)/(max-min))*100}%"></div>`;}html=html.replace('</div><div class="timeline-scale',nowLine+'</div><div class="timeline-scale');}catch(e){}return html;};

  function refreshNowLines(){document.querySelectorAll('.mod[data-type="timeline"]').forEach(el=>{const mod=getModule(el.dataset.id);if(!mod)return;const stage=el.querySelector('.timeline-stage,[data-timeline-track],.timeline-lane');if(!stage)return;stage.querySelectorAll('.timeline-now-line-final').forEach(x=>x.remove());const min=new Date(mod.start).getTime(),max=Math.max(new Date(mod.end).getTime(),min+60000),now=Date.now();if(now>=min&&now<=max){const line=document.createElement('div');line.className='timeline-now-line-final';line.style.left=((now-min)/(max-min))*100+'%';stage.appendChild(line);}});}setInterval(refreshNowLines,30000);

  const oldLogHTML=typeof logHTML33==='function'?logHTML33:(typeof logHTML31==='function'?logHTML31:null);
  function filterLogHTMLByRepo(html,mod){if(!mod.repoVisibleTags||!mod.repoVisibleTags.length)return html;const allowed=new Set(mod.repoVisibleTags.map(x=>String(x).toLowerCase()));const wrap=document.createElement('div');wrap.innerHTML=html;wrap.querySelectorAll('.log-line').forEach(line=>{const tag=(line.querySelector('.log-line-tag')?.textContent||'').trim().toLowerCase();if(tag&&!allowed.has(tag))line.remove();});return wrap.innerHTML;}
  if(oldLogHTML){window.logHTML33=function(mod){return filterLogHTMLByRepo(oldLogHTML(mod),mod);};}

  els.exportBtn.onclick=async()=>{persistSelectedCellSettings(false);ensureRepository();const text=JSON.stringify(createExportState(),null,2);downloadText('statusboard-dashboard-complete.json',text);try{await navigator.clipboard.writeText(text);}catch(e){}alert('Komplett JSON eksportert: views, moduler, design, repository, celleformat, ordlister, logg og bilder.');};
  els.loadImport.onclick=()=>{try{const imported=JSON.parse(els.importText.value);if(!imported.views||!Array.isArray(imported.views))throw new Error('Mangler views');state={...state,...imported,adminUnlocked:true,editMode:true,adminHidden:false};ensureRepository();els.importModal.classList.remove('show');renderAll();}catch(err){alert('Ugyldig JSON: '+(err.message||err));}};

  try{renderAll();}catch(e){console.error('Final requested Statusboard patch failed',e);} 
})();
