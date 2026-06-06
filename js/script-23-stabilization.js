(function(){
  "use strict";

  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const dateMs=value=>{const ms=new Date(value).getTime();return Number.isFinite(ms)?ms:Date.now();};
  const pad=value=>String(value).padStart(2,"0");
  const localValue=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`:"";};
  const fromLocal=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString();};
  const rgba=(hex,opacity)=>{const clean=String(hex||"#60a5fa").replace("#","");const full=clean.length===3?clean.split("").map(x=>x+x).join(""):clean;const n=parseInt(full,16);return Number.isFinite(n)?`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`:`rgba(96,165,250,${opacity})`;};
  const currentMod=()=>{try{return selected&&selected();}catch(e){return null;}};

  // Preserve focus and caret when legacy handlers re-render Admin on every keystroke.
  const renderBeforeFocus=renderAll;
  renderAll=function(){
    const active=document.activeElement;
    const focus=active&&active.closest?.(".admin-panel")?{
      id:active.id,
      cls:[...active.classList||[]][0]||"",
      row:active.closest?.("[data-index],[data-tl-period],[data-tl-event]")?.getAttribute("data-index")||
          active.closest?.("[data-tl-period]")?.getAttribute("data-tl-period")||
          active.closest?.("[data-tl-event]")?.getAttribute("data-tl-event"),
      start:active.selectionStart,
      end:active.selectionEnd
    }:null;
    const result=renderBeforeFocus.apply(this,arguments);
    if(focus){
      let next=focus.id?document.getElementById(focus.id):null;
      if(!next&&focus.cls){
        const list=[...document.querySelectorAll(`.${CSS.escape(focus.cls)}`)];
        next=list.find(el=>{
          const row=el.closest("[data-index],[data-tl-period],[data-tl-event]");
          return !focus.row||row?.getAttribute("data-index")===focus.row||row?.getAttribute("data-tl-period")===focus.row||row?.getAttribute("data-tl-event")===focus.row;
        });
      }
      if(next){next.focus({preventScroll:true});try{next.setSelectionRange(focus.start,focus.end);}catch(e){}}
    }
    return result;
  };

  function timelineNormalize(mod){
    if(!mod.start)mod.start=new Date(Date.now()-3600000).toISOString();
    if(!mod.end)mod.end=new Date(Date.now()+3*3600000).toISOString();
    if(!Array.isArray(mod.periods))mod.periods=[];
    if(!Array.isArray(mod.events))mod.events=[];
    mod.timelineDensity=["hour","half","quarter"].includes(mod.timelineDensity)?mod.timelineDensity:"hour";
    mod.timelineTicks=clamp(Number(mod.timelineTicks??mod.tickCount??6),0,50);
    mod.tickCount=mod.timelineTicks;
  }
  const timelineNormalizeBefore=normalizeMod;
  normalizeMod=function(mod){timelineNormalizeBefore(mod);if(mod?.type==="timeline")timelineNormalize(mod);};

  function timelineFmt(value,withDate=false){
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return "";
    const time=d.toLocaleTimeString("no-NO",{hour:"2-digit",minute:"2-digit"});
    return withDate?`${pad(d.getDate())}.${pad(d.getMonth()+1)} ${time}`:time;
  }
  timelineHTML=function(mod){
    timelineNormalize(mod);
    const min=dateMs(mod.start),max=Math.max(dateMs(mod.end),min+60000),span=max-min;
    const pos=value=>clamp(((dateMs(value)-min)/span)*100,0,100);
    const between=mod.timelineTicks,major=between+2,subdivisions=mod.timelineDensity==="quarter"?4:mod.timelineDensity==="half"?2:1;
    const labelSize=clamp(14-(major*.42),8,12);
    const ticks=[];
    for(let i=0;i<major;i++){
      const pct=(i/(major-1))*100;
      const time=min+span*(i/(major-1));
      ticks.push(`<div class="timeline-stable-tick" style="left:${pct}%"></div><div class="timeline-stable-label" style="left:${pct}%">${esc(timelineFmt(time,false))}</div>`);
      if(i<major-1&&subdivisions>1)for(let s=1;s<subdivisions;s++)ticks.push(`<div class="timeline-stable-tick minor" style="left:${pct+((100/(major-1))*s/subdivisions)}%"></div>`);
    }
    const days=[];const midnight=new Date(min);midnight.setHours(24,0,0,0);
    for(let t=midnight.getTime();t<max;t+=86400000){const d=new Date(t);days.push(`<div class="timeline-stable-day" style="left:${pos(t)}%"><span>${pad(d.getDate())}.${pad(d.getMonth()+1)}</span></div>`);}
    const periods=mod.periods.map(period=>{const left=pos(period.start),right=pos(period.end);return `<div class="timeline-stable-period" style="left:${left}%;width:${Math.max(1,right-left)}%;background:${rgba(period.color,period.opacity??.55)}"><span>${esc(period.name||"")}</span></div>`;}).join("");
    const events=mod.events.map(event=>`<div class="timeline-stable-event" style="left:${pos(event.time||event.start)}%;color:${esc(event.color||"#f8fafc")}"><strong>${esc(event.name||"Hendelse")}</strong><i></i></div>`).join("");
    const nowPos=pos(Date.now());
    const placing=window.__timelinePlace?.moduleId===mod.id||window.__timelinePlaceTarget?.modId===mod.id;
    return `<div class="content timeline-content-stable"><div class="timeline-stable-stage ${placing?"placing":""}" data-timeline-track="1" style="--timeline-label-size:${labelSize}px"><div class="timeline-stable-line"></div>${periods}${days.join("")}${ticks.join("")}<div class="timeline-now-stable" style="left:${nowPos}%"><span>NÅ</span></div>${events}</div>${placing?'<div class="timeline-stable-help">Klikk på tidslinjen der hendelsen skal plasseres.</div>':""}</div>`;
  };

  function timelineAdmin(mod){
    timelineNormalize(mod);
    const periods=mod.periods.map((p,i)=>`<div class="timeline-admin-card" data-stable-period="${i}"><div class="field"><label>Navn</label><input class="stable-period-name" value="${esc(p.name||"Periode")}"></div><div class="grid2"><div class="field"><label>Start</label><input class="stable-period-start" type="datetime-local" value="${localValue(p.start)}"></div><div class="field"><label>Slutt</label><input class="stable-period-end" type="datetime-local" value="${localValue(p.end)}"></div></div><div class="grid2"><div class="field"><label>Farge</label><input class="stable-period-color" type="color" value="${esc(p.color||"#60a5fa")}"></div><div class="field"><label>Opacity</label><input class="stable-period-opacity" type="range" min=".1" max="1" step=".05" value="${p.opacity??.55}"></div></div><button class="tool-btn danger stable-period-delete">Slett periode</button></div>`).join("");
    const events=mod.events.map((e,i)=>`<div class="timeline-admin-card" data-stable-event="${i}"><div class="field"><label>Hendelse</label><input class="stable-event-name" value="${esc(e.name||"Hendelse")}"></div><div class="grid2"><div class="field"><label>Tid</label><input class="stable-event-time" type="datetime-local" value="${localValue(e.time||e.start)}"></div><div class="field"><label>Farge</label><input class="stable-event-color" type="color" value="${esc(e.color||"#f8fafc")}"></div></div><div class="row"><button class="tool-btn stable-event-place">Plasser på tidslinjen</button><button class="tool-btn danger stable-event-delete">Slett</button></div></div>`).join("");
    return `<div class="timeline-admin-compact"><div class="grid2"><div class="field"><label>Start</label><input id="stableTimelineStart" type="datetime-local" value="${localValue(mod.start)}"></div><div class="field"><label>Slutt</label><input id="stableTimelineEnd" type="datetime-local" value="${localValue(mod.end)}"></div></div><div class="grid2"><div class="field"><label>Visning</label><select id="stableTimelineDensity"><option value="hour" ${mod.timelineDensity==="hour"?"selected":""}>Hele timer</option><option value="half" ${mod.timelineDensity==="half"?"selected":""}>Hver halvtime</option><option value="quarter" ${mod.timelineDensity==="quarter"?"selected":""}>Hvert kvarter</option></select></div><div class="field"><label>Antall streker mellom start/slutt</label><input id="stableTimelineTicks" type="number" min="0" max="50" value="${mod.timelineTicks}"></div></div><details class="timeline-details" open><summary>Perioder (${mod.periods.length})</summary><div class="timeline-detail-body"><button id="stableAddPeriod" class="tool-btn">+ Legg til periode</button>${periods}</div></details><details class="timeline-details" open><summary>Hendelser (${mod.events.length})</summary><div class="timeline-detail-body"><button id="stableAddEvent" class="tool-btn primary">+ Ny hendelse</button>${events}</div></details></div>`;
  }

  function timelineRead(mod){
    const start=document.getElementById("stableTimelineStart"),end=document.getElementById("stableTimelineEnd"),density=document.getElementById("stableTimelineDensity"),ticks=document.getElementById("stableTimelineTicks");
    if(start)mod.start=fromLocal(start.value);if(end)mod.end=fromLocal(end.value);if(density)mod.timelineDensity=density.value;if(ticks)mod.timelineTicks=clamp(Number(ticks.value)||0,0,50);
    document.querySelectorAll("[data-stable-period]").forEach(row=>{const p=mod.periods[+row.dataset.stablePeriod];if(!p)return;p.name=row.querySelector(".stable-period-name").value;p.start=fromLocal(row.querySelector(".stable-period-start").value);p.end=fromLocal(row.querySelector(".stable-period-end").value);p.color=row.querySelector(".stable-period-color").value;p.opacity=Number(row.querySelector(".stable-period-opacity").value);});
    document.querySelectorAll("[data-stable-event]").forEach(row=>{const event=mod.events[+row.dataset.stableEvent];if(!event)return;event.name=row.querySelector(".stable-event-name").value;event.time=fromLocal(row.querySelector(".stable-event-time").value);event.color=row.querySelector(".stable-event-color").value;});
    save();
  }

  function repoTags(){
    const defaults=["Title","Received DTG","Summary","From"];
    const configured=Array.isArray(state.repository?.logTags)?state.repository.logTags:[];
    return [...new Set([...defaults,...configured].map(x=>String(x).trim()).filter(Boolean))];
  }
  function logNormalize(mod){
    if(!Array.isArray(mod._stableLogEntries))mod._stableLogEntries=JSON.parse(JSON.stringify(Array.isArray(mod.entries)?mod.entries:[]));
    if(!Array.isArray(mod._stableLogFilters))mod._stableLogFilters=JSON.parse(JSON.stringify(Array.isArray(mod.filters)?mod.filters:[]));
    mod.entries=JSON.parse(JSON.stringify(mod._stableLogEntries));
    const tags=repoTags(),old=new Map(mod._stableLogFilters.map(f=>[String(f.term).toLowerCase(),f]));
    mod.filters=tags.map(term=>({term,enabled:!!old.get(term.toLowerCase())?.enabled,bold:!!old.get(term.toLowerCase())?.bold}));
    mod._stableLogFilters=JSON.parse(JSON.stringify(mod.filters));
  }
  function taggedLine(line,tags){
    const clean=String(line||"").trim();
    for(const tag of tags){const re=new RegExp(`^${String(tag).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b\\s*[:\\-]?\\s*(.*)$`,"i");const match=clean.match(re);if(match)return {tag,text:match[1].trim()};}
    return null;
  }
  function parseLogs(text){
    const tags=repoTags(),entries=[];let current={lines:[]};
    const flush=()=>{if(current.lines.length)entries.push(current);current={lines:[]};};
    String(text||"").replace(/\r/g,"").split("\n").forEach(raw=>{const line=raw.trim();if(!line){flush();return;}if(/^[_\-=–—*]{6,}$/.test(line)){flush();return;}const parsed=taggedLine(line,tags);if(parsed){if(parsed.tag.toLowerCase()==="title"&&current.lines.some(x=>x.tag.toLowerCase()==="title"))flush();current.lines.push(parsed);}else if(current.lines.length)current.lines[current.lines.length-1].text+=` ${line}`;else current.lines.push({tag:"Text",text:line});});flush();return entries;
  }
  function logHTMLStable(mod){
    logNormalize(mod);const active=new Set(mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase())),bold=new Set(mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase()));
    const entries=mod.entries.map(entry=>({lines:(entry.lines||[]).filter(line=>!active.size||active.has(String(line.tag).toLowerCase()))})).filter(entry=>entry.lines.length);
    return `<div class="content log-content"><div class="log-list">${entries.length?entries.map(entry=>`<div class="log-entry">${entry.lines.map(line=>`<div class="log-line"><span class="log-line-tag ${bold.has(String(line.tag).toLowerCase())?"bold":""}">${esc(line.tag)}</span><span class="log-line-text ${bold.has(String(line.tag).toLowerCase())?"bold":""}">${esc(line.text)}</span></div>`).join("")}</div>`).join(""):'<div class="log-empty">Ingen logger matcher valgte filtre.</div>'}</div></div>`;
  }
  const contentBeforeStable=contentHTML;
  contentHTML=function(mod){if(mod?.type==="log")return logHTMLStable(mod);return contentBeforeStable(mod);};

  function logAdmin(mod){
    logNormalize(mod);
    const rows=mod.filters.map((f,i)=>`<div class="log-filter-row stable" data-stable-filter="${i}"><strong>${esc(f.term)}</strong><label><input class="stable-filter-show" type="checkbox" ${f.enabled?"checked":""}>Vis</label><label><input class="stable-filter-bold" type="checkbox" ${f.bold?"checked":""}>Bold</label></div>`).join("");
    return `<div class="log-admin-grid"><input id="stableLogFile" class="log-admin-file" type="file" accept=".txt,text/plain"><button id="stableLogPick" class="tool-btn primary">Last opp tekstfil</button><div class="field"><label>Lim inn loggtekst</label><textarea id="stableLogText" placeholder="Tom linje starter ny logg"></textarea></div><button id="stableLogLoad" class="tool-btn">Last inn tekst</button><p class="small">Tags hentes fra Repository → Log. En tom linje eller skillelinje starter en ny logg.</p>${rows}<button id="stableLogClear" class="tool-btn danger">Tøm logg</button></div>`;
  }
  const settingsBeforeStable=settingsSpecific;
  settingsSpecific=function(mod){if(mod?.type==="timeline")return timelineAdmin(mod);if(mod?.type==="log")return logAdmin(mod);return settingsBeforeStable(mod);};

  const renderSelectedBeforeStable=renderSelectedSettings;
  renderSelectedSettings=function(){
    renderSelectedBeforeStable();
    const mod=currentMod();if(!mod)return;
    if(mod.type==="timeline"){
      const commit=()=>{timelineRead(mod);renderBoard();};
      ["stableTimelineStart","stableTimelineEnd","stableTimelineDensity","stableTimelineTicks"].forEach(id=>document.getElementById(id)?.addEventListener("change",commit));
      document.querySelectorAll("[data-stable-period] input,[data-stable-event] input").forEach(input=>input.addEventListener("change",commit));
      document.getElementById("stableAddPeriod")?.addEventListener("click",()=>{timelineRead(mod);mod.periods.push({name:"Periode",start:mod.start,end:mod.end,color:"#60a5fa",opacity:.55});save();renderAll();});
      document.getElementById("stableAddEvent")?.addEventListener("click",()=>{timelineRead(mod);mod.events.push({name:"Hendelse",time:mod.start,color:"#f8fafc"});save();renderAll();});
      document.querySelectorAll(".stable-period-delete").forEach(btn=>btn.addEventListener("click",()=>{const row=btn.closest("[data-stable-period]");timelineRead(mod);mod.periods.splice(+row.dataset.stablePeriod,1);save();renderAll();}));
      document.querySelectorAll(".stable-event-delete").forEach(btn=>btn.addEventListener("click",()=>{const row=btn.closest("[data-stable-event]");timelineRead(mod);mod.events.splice(+row.dataset.stableEvent,1);save();renderAll();}));
      document.querySelectorAll(".stable-event-place").forEach(btn=>btn.addEventListener("click",()=>{const row=btn.closest("[data-stable-event]");timelineRead(mod);window.__timelinePlace={moduleId:mod.id,index:+row.dataset.stableEvent};renderAll();}));
    }
    if(mod.type==="log"){
      logNormalize(mod);
      const file=document.getElementById("stableLogFile");
      document.getElementById("stableLogPick")?.addEventListener("click",()=>file?.click());
      file?.addEventListener("change",async()=>{if(!file.files?.[0])return;mod._stableLogEntries=parseLogs(await file.files[0].text());mod.entries=JSON.parse(JSON.stringify(mod._stableLogEntries));logNormalize(mod);save();renderAll();});
      document.getElementById("stableLogLoad")?.addEventListener("click",()=>{mod._stableLogEntries=parseLogs(document.getElementById("stableLogText")?.value||"");mod.entries=JSON.parse(JSON.stringify(mod._stableLogEntries));logNormalize(mod);save();renderAll();});
      document.querySelectorAll("[data-stable-filter]").forEach(row=>{const index=+row.dataset.stableFilter;row.querySelector(".stable-filter-show")?.addEventListener("change",e=>{logNormalize(mod);if(mod.filters[index])mod.filters[index].enabled=e.target.checked;mod._stableLogFilters=JSON.parse(JSON.stringify(mod.filters));save();renderBoard();});row.querySelector(".stable-filter-bold")?.addEventListener("change",e=>{logNormalize(mod);if(mod.filters[index])mod.filters[index].bold=e.target.checked;mod._stableLogFilters=JSON.parse(JSON.stringify(mod.filters));save();renderBoard();});});
      document.getElementById("stableLogClear")?.addEventListener("click",()=>{mod._stableLogEntries=[];mod.entries=[];save();renderAll();});
    }
  };

  function tableTargets(mod){
    const targets=(typeof selectedCellTargets==="function"?selectedCellTargets():[]).filter(t=>t.moduleId===mod.id);
    return targets.length?targets:state.selectedCell?.moduleId===mod.id?[state.selectedCell]:[];
  }
  function stableCellStyle(mod,row,col){if(!mod._stableCellStyles)mod._stableCellStyles={};const key=`${row}:${col}`;if(!mod._stableCellStyles[key])mod._stableCellStyles[key]={...(getCellStyle(mod,row,col)||{})};return mod._stableCellStyles[key];}
  const cellStyleBeforeStable=cellStyleCSS;
  cellStyleCSS=function(mod,row,col){let css=cellStyleBeforeStable(mod,row,col)||"";const stable=mod?._stableCellStyles?.[`${row}:${col}`],actual=getCellStyle(mod,row,col)||{};const bold=stable?.bold??actual.bold,fontSize=stable?.fontSize??actual.fontSize;if(bold)css+=";font-weight:700!important;--cell-weight:700";if(fontSize)css+=`;font-size:${Number(fontSize)}em!important`;return css;};
  const tableHTMLBeforeStable=tableHTML;
  tableHTML=function(mod){let html=tableHTMLBeforeStable(mod);if(!mod?._stableCellStyles)return html;Object.entries(mod._stableCellStyles).forEach(([key,style])=>{const [row,col]=key.split(":");const extra=`${style.bold?";font-weight:700!important;--cell-weight:700":""}${style.fontSize?`;font-size:${Number(style.fontSize)}em!important`:""}`;if(extra)html=html.replace(new RegExp(`(<td[^>]*data-row="${row}"[^>]*data-col="${col}"[^>]*style=")([^"]*)`),`$1$2${extra}`);});return html;};
  function shiftStore(store,axis,index,delta){
    if(!store||Array.isArray(store))return store;
    const out={};Object.entries(store).forEach(([key,value])=>{const match=key.match(/^(\d+):(\d+)$/);if(!match){out[key]=value;return;}let r=+match[1],c=+match[2];if((axis==="row"?r:c)===index&&delta<0)return;if(axis==="row"&&r>=index)r+=delta;if(axis==="col"&&c>=index)c+=delta;if(r>=0&&c>=0)out[`${r}:${c}`]=value;});return out;
  }
  function insertRows(mod,after){const rows=[...new Set(tableTargets(mod).map(t=>t.row))],at=(rows.length?Math.max(...rows)+1:mod.rows.length);for(let i=0;i<(after||1);i++)mod.rows.splice(at,0,Array(colCount(mod)).fill(""));["cellStyles","cellWords","cellFunctions","mergedCells","_stableCellStyles"].forEach(k=>mod[k]=shiftStore(mod[k],"row",at,after||1));}
  function insertCols(mod,count=1){const cols=[...new Set(tableTargets(mod).map(t=>t.col))],at=(cols.length?Math.max(...cols)+1:colCount(mod));mod.rows.forEach(row=>row.splice(at,0,...Array(count).fill("")));["cellStyles","cellWords","cellFunctions","mergedCells","_stableCellStyles"].forEach(k=>mod[k]=shiftStore(mod[k],"col",at,count));}
  function deleteRowsStable(mod){const rows=[...new Set(tableTargets(mod).map(t=>t.row))].sort((a,b)=>b-a);rows.forEach(r=>{if(mod.rows.length>1){mod.rows.splice(r,1);["cellStyles","cellWords","cellFunctions","mergedCells","_stableCellStyles"].forEach(k=>mod[k]=shiftStore(mod[k],"row",r,-1));}});}
  function deleteColsStable(mod){const cols=[...new Set(tableTargets(mod).map(t=>t.col))].sort((a,b)=>b-a);cols.forEach(c=>{if(colCount(mod)>1){mod.rows.forEach(row=>row.splice(c,1));["cellStyles","cellWords","cellFunctions","mergedCells","_stableCellStyles"].forEach(k=>mod[k]=shiftStore(mod[k],"col",c,-1));}});}
  function finishTable(mod){state.selectedCells=[];state.selectedCell=null;save();renderAll();}
  const tableMenu=document.createElement("div");let tableMenuMod=null,tableMenuTargets=[],pendingTableSelection=null;tableMenu.className="table-context-stable";document.body.appendChild(tableMenu);
  document.addEventListener("click",event=>{const td=event.target.closest(".mod[data-type='table'] td[data-row][data-col]");if(!td||!state.editMode||(!event.shiftKey&&!event.ctrlKey&&!event.metaKey))return;const moduleId=td.closest(".mod").dataset.id,row=+td.dataset.row,col=+td.dataset.col;event.preventDefault();event.stopImmediatePropagation();if(event.shiftKey&&state.selectedCell?.moduleId===moduleId)selectCellRange(moduleId,state.selectedCell.row,state.selectedCell.col,row,col);else selectTableCell(moduleId,row,col,true);renderCellSettings();},true);
  document.addEventListener("pointerdown",event=>{if(event.button!==2)return;const td=event.target.closest(".mod[data-type='table'] td[data-row][data-col]");if(!td)return;const mod=getModule(td.closest(".mod").dataset.id);if(!mod)return;const marked=[...td.closest("table").querySelectorAll("td.cell-selected,td.cell-multi-selected")].map(cell=>({moduleId:mod.id,row:+cell.dataset.row,col:+cell.dataset.col}));if(marked.some(t=>t.row===+td.dataset.row&&t.col===+td.dataset.col)){pendingTableSelection=marked;state.selectedCells=marked;state.selectedCell=marked[0];event.stopImmediatePropagation();}},true);
  function showTableMenuStable(event,mod){
    event.preventDefault();event.stopImmediatePropagation();
    const td=event.target.closest("td[data-row][data-col]"),cell={moduleId:mod.id,row:+td.dataset.row,col:+td.dataset.col};
    if(pendingTableSelection?.length){state.selectedCells=pendingTableSelection;state.selectedCell=pendingTableSelection[0];pendingTableSelection=null;updateCellSelectionDOM();}
    if(!tableTargets(mod).some(t=>t.row===cell.row&&t.col===cell.col))selectTableCell(mod.id,cell.row,cell.col,false);
    tableMenuTargets=tableTargets(mod).length?tableTargets(mod):[cell];
    state.selectedCells=tableMenuTargets;state.selectedCell=tableMenuTargets[0];updateCellSelectionDOM();
    tableMenu.innerHTML='<button data-action="bold">Bold av/på</button><button data-action="insert-row">Sett inn rad under</button><button data-action="insert-col">Sett inn kolonne til høyre</button><button data-action="delete-row" class="danger">Slett markerte rader</button><button data-action="delete-col" class="danger">Slett markerte kolonner</button><button data-action="merge">Merge & center</button><button data-action="unmerge">Unmerge</button>';
    tableMenu.style.left=`${Math.min(event.clientX,innerWidth-240)}px`;tableMenu.style.top=`${Math.min(event.clientY,innerHeight-290)}px`;tableMenu.classList.add("show");tableMenuMod=mod;tableMenu.dataset.moduleId=mod.id;
  }
  document.addEventListener("contextmenu",event=>{const td=event.target.closest(".mod[data-type='table'] td[data-row][data-col]");if(!td||!state.editMode)return;const mod=getModule(td.closest(".mod").dataset.id);if(mod)showTableMenuStable(event,mod);},true);
  document.addEventListener("click",event=>{if(!event.target.closest(".table-context-stable"))tableMenu.classList.remove("show");},true);
  function runTableAction(action,mod){state.selectedCells=tableMenuTargets;state.selectedCell=tableMenuTargets[0]||state.selectedCell;if(action==="bold"){const targets=tableMenuTargets,next=targets.some(t=>Number(getComputedStyle(document.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"] td[data-row="${t.row}"][data-col="${t.col}"] .cell-display`)).fontWeight)<600);targets.forEach(t=>{const stable=stableCellStyle(mod,t.row,t.col);stable.bold=next;setCellStyle(mod,t.row,t.col,{...getCellStyle(mod,t.row,t.col),bold:next});});save();renderAll();}if(action==="insert-row"){insertRows(mod,1);finishTable(mod);}if(action==="insert-col"){insertCols(mod,1);finishTable(mod);}if(action==="delete-row"){deleteRowsStable(mod);finishTable(mod);}if(action==="delete-col"){deleteColsStable(mod);finishTable(mod);}if(action==="merge"){mergeCenterSelectedCells();}if(action==="unmerge"){unmergeSelectedCells();}tableMenu.classList.remove("show");}
  document.addEventListener("click",event=>{const action=event.target.closest(".table-context-stable button")?.dataset.action,mod=tableMenu.dataset.moduleId?getModule(tableMenu.dataset.moduleId):tableMenuMod;if(!action||!mod)return;event.preventDefault();event.stopImmediatePropagation();runTableAction(action,mod);},true);
  document.addEventListener("click",event=>{const id=event.target.id;if(!["tableDelRow","tableDelCol","tableInsertRowAfter","tableInsertColAfter"].includes(id))return;const mod=currentMod();if(!mod||mod.type!=="table")return;event.preventDefault();event.stopImmediatePropagation();if(id==="tableDelRow")deleteRowsStable(mod);if(id==="tableDelCol")deleteColsStable(mod);if(id==="tableInsertRowAfter")insertRows(mod,1);if(id==="tableInsertColAfter")insertCols(mod,1);finishTable(mod);},true);
  document.addEventListener("input",event=>{const id=event.target.id;if(!["cellBold","cellBoldV3","cellFontSize","cellFontSizeV7","cellFontSizeNumber"].includes(id))return;const mod=currentMod();if(!mod||mod.type!=="table")return;tableTargets(mod).forEach(t=>{const stable=stableCellStyle(mod,t.row,t.col);if(id.startsWith("cellBold"))stable.bold=event.target.checked;else stable.fontSize=Number(event.target.value)||1;});save();},true);

  try{renderAll();}catch(error){console.error("Stabiliseringspatch feilet",error);}
})();
