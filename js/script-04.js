/* Request patch v7: reliable cell font size, timeline placement, and log field/filter parsing */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .cell-font-size-v7{border:1px solid rgba(147,197,253,.24);background:rgba(59,130,246,.08);border-radius:14px;padding:10px;margin-bottom:10px;}
        .cell-font-size-v7 .cell-font-size-row{display:grid;grid-template-columns:1fr 78px;gap:8px;align-items:center;}
        .cell-font-size-v7 input[type=number]{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(2,6,23,.64);color:white;}
        .timeline-track.v7{height:235px;margin:0 26px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v7.placing{cursor:crosshair;animation:timelinePlacePulseV7 1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.95);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.13);}
        @keyframes timelinePlacePulseV7{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,.22)}50%{box-shadow:0 0 0 13px rgba(96,165,250,.07)}}
        .timeline-line.v7{position:absolute;left:0;right:0;top:138px;height:5px;border-radius:999px;background:rgba(226,232,240,.9);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:3;}
        .timeline-tick.v7{position:absolute;top:121px;width:2px;height:40px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:5;}
        .timeline-tick-label.v7{position:absolute;top:164px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:5;}
        .timeline-period-v7{position:absolute;top:151px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:2;overflow:visible;}
        .timeline-period-v7 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v7{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:3px;min-width:116px;text-align:center;z-index:8;pointer-events:none;}
        .timeline-event-v7 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:950;background:rgba(15,23,42,.86);border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;white-space:nowrap;line-height:1.1;}
        .timeline-event-v7 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.1;max-width:150px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.58);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:3px 7px;}
        .timeline-event-v7 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:16px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));margin-top:1px;}
        .timeline-event-v7 .ev-stem{width:2px;height:var(--stem,22px);background:currentColor;border-radius:999px;opacity:.85;margin-top:-3px;}
        .timeline-place-help.v7{border:1px solid rgba(96,165,250,.42);border-radius:14px;background:rgba(59,130,246,.16);padding:9px 10px;color:#dbeafe;font-size:12px;line-height:1.35;display:flex;gap:8px;align-items:flex-start;}
        .timeline-admin-compact .tl-place-event.v7{font-weight:950;border-color:rgba(147,197,253,.38);background:rgba(59,130,246,.22);}
        .log-content.v7{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v7{display:grid;gap:12px;overflow:auto;}
        .log-entry.v7{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:13px;line-height:1.45;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-entry-tags.v7{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
        .log-tag.v7{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.08);font-size:.78em;color:#cbd5e1;}
        .log-tag.v7.bold{font-weight:950;color:white;background:rgba(96,165,250,.24);border-color:rgba(147,197,253,.40);}
        .log-admin-grid.v7{display:grid;gap:10px;}
        .log-filter-row.v7{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px;background:rgba(2,6,23,.32);}
        .log-filter-row.v7 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v7 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v7 input{width:18px;height:18px;}
        .log-admin-file.v7{display:none;}
        .log-admin-note.v7{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function esc7(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg7(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp7(n,a,b){return Math.max(a,Math.min(b,n));}
      function d7(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt7(value,unit){const d=d7(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d);}catch{return String(value||'');}}
      function toDT7(value){const d=d7(value);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
      function fromDT7(v){if(!v)return new Date().toISOString();const d=new Date(v);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
      function pctToTime7(mod,pct){const start=d7(mod.start),end=d7(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp7(pct,0,1)).toISOString();}
      function timeKey7(ev){return d7(ev.time).toISOString().slice(0,16);}
      function rgba7(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity);}catch{}return hex||'#60a5fa';}
      function clean7(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}

      const prevCellStyleCSS7=cellStyleCSS;
      cellStyleCSS=function(mod,r,c){const base=prevCellStyleCSS7(mod,r,c)||'';const st=getCellStyle(mod,r,c)||{};return base+`;font-size:${Number(st.fontSize||1)}em!important;`;};
      const prevReadFull7=typeof readFullCellStyleControls==='function'?readFullCellStyleControls:null;
      if(prevReadFull7){
        readFullCellStyleControls=function(){
          const targets=typeof selectedCellTargets==='function'?selectedCellTargets():[];
          const primary=targets[0];
          const existing=primary?(getCellStyle(getModule(primary.moduleId),primary.row,primary.col)||{}):{};
          const out={...existing,...prevReadFull7()};
          const val=document.getElementById('cellFontSizeV7')?.value || document.getElementById('cellFontSizeNumberV7')?.value;
          if(val)out.fontSize=Math.max(.5,Math.min(4,Number(val)||1));
          return out;
        };
      }
      function addCellFontSizeControl7(){
        const targets=typeof selectedCellTargets==='function'?selectedCellTargets():[]; if(!targets.length||document.getElementById('cellFontSizeV7'))return;
        const mod=getModule(targets[0].moduleId); if(!mod||mod.type!=='table')return;
        const st=getCellStyle(mod,targets[0].row,targets[0].col)||{}; const val=Number(st.fontSize||1);
        const html=`<div class="field cell-font-size-v7"><label>Tekststørrelse ${targets.length>1?'for markerte celler':'for cellen'}</label><div class="cell-font-size-row"><input id="cellFontSizeV7" type="range" min="0.5" max="4" step="0.1" value="${val}"><input id="cellFontSizeNumberV7" type="number" min="0.5" max="4" step="0.1" value="${val}"></div></div>`;
        cellSettings.insertAdjacentHTML('afterbegin',html);
        const apply=v=>{const n=Math.max(.5,Math.min(4,Number(v)||1));targets.forEach(t=>{const m=getModule(t.moduleId);if(!m)return;setCellStyle(m,t.row,t.col,{...(getCellStyle(m,t.row,t.col)||{}),fontSize:n});const td=document.querySelector(`.mod[data-id="${t.moduleId}"] td[data-row="${t.row}"][data-col="${t.col}"]`);if(td)td.style.fontSize=n+'em';});save();};
        const range=document.getElementById('cellFontSizeV7'),num=document.getElementById('cellFontSizeNumberV7');
        range?.addEventListener('input',e=>{if(num)num.value=e.target.value;apply(e.target.value);});
        num?.addEventListener('input',e=>{if(range)range.value=e.target.value;apply(e.target.value);});
      }
      const prevRenderCellSettings7=renderCellSettings;
      renderCellSettings=function(){prevRenderCellSettings7();addCellFontSizeControl7();};

      timelineHTML=function(mod){
        const start=d7(mod.start),end=d7(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp7(((d7(v).getTime()-min)/(max-min))*100,0,100);const unit=mod.timeUnit||'hour';const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100;const t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v7" style="left:${pct}%"></div><div class="timeline-tick-label v7" style="left:${pct}%">${esc7(fmt7(t,unit))}</div>`;}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v7" style="left:${left}%;width:${w}%;background:${rgba7(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc7(p.name||'')}</span></div>`;}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=timeKey7(ev);const level=used[key]||0;used[key]=level+1;const top=Math.max(-34,26-(level*56));const stem=Math.max(16,138-(top+90));return `<div class="timeline-event-v7" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;color:${esc7(ev.color||'#f8fafc')};--stem:${stem}px" title="${esc7((ev.name||'')+' '+fmt7(ev.time,'hour'))}"><div class="ev-time">${esc7(fmt7(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc7(ev.name||'Hendelse')}</div><div class="ev-arrow"></div><div class="ev-stem"></div></div>`;}).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track v7 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v7"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${esc7(fmt7(mod.start,unit))}</span><span>${esc7(fmt7(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v7"><strong>⏱</strong><span>Klikk direkte på tidslinjen der hendelsen skal plasseres. Tidspunktet settes fra plasseringen.</span></div>':''}</div></div>`;
      };
      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour';const open=mod.timelineOpenSection||'events';const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}"><div class="field"><label>Navn</label><input class="tl-p-name" value="${esc7(p.name||'')}" placeholder="Periode"></div><div class="grid-mini"><div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDT7(p.start||mod.start)}"></div><div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDT7(p.end||mod.end)}"></div></div><div class="grid-color"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${esc7(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div><button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button></div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin v7 ${placing&&window.__timelinePlace.index===i?'timeline-place-active':''}" data-index="${i}" data-time="${esc7(ev.time||mod.start)}"><div class="event-top"><div class="field"><label>Navn</label><input class="tl-e-name" value="${esc7(ev.name||'')}" placeholder="Hendelse"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${esc7(ev.color||'#f8fafc')}"></div></div><div class="event-time-row"><div class="time-chip"><span title="Klikk plasser-knappen, deretter klikk på tidslinjen">⏱</span><div><span>Tid fra plassering</span><br><strong>${esc7(fmt7(ev.time,unit==='date'?'date':'hour'))}</strong></div></div><button class="tool-btn tl-place-event v7" type="button">⏱ Plasser på tidslinje</button></div><button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button></div>`).join('');
        return `<div class="timeline-admin-compact v4 v7"><div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDT7(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDT7(mod.end)}"></div></div><div class="timeline-small-grid"><div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div><p class="small">Bruk ⏱ og klikk på selve tidslinjen for å sette tidspunktet.</p><details class="timeline-details" ${open==='periods'?'open':''}><summary>Perioder (${mod.periods?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button></div><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div></details><details class="timeline-details" ${open==='events'?'open':''}><summary>Hendelser (${mod.events?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddEvent" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button></div>${placing?'<div class="timeline-place-help v7"><strong>⏱</strong><span>Tidslinjen lyser opp. Klikk på ønsket tidspunkt på boardet.</span></div>':''}<div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div></details></div>`;
      };
      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDT7(s.value);if(e)mod.end=fromDT7(e.value);if(u)mod.timeUnit=u.value;if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDT7(row.querySelector('.tl-p-start')?.value),end:fromDT7(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>({name:row.querySelector('.tl-e-name')?.value||'',time:row.dataset.time||mod.start,color:row.querySelector('.tl-e-color')?.value||'#f8fafc'}));save();
      };
      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        document.querySelectorAll('.timeline-details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)mod.timelineOpenSection=d.querySelector('summary')?.textContent?.toLowerCase().includes('periode')?'periods':'events';save();}));
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('input',()=>readTimelineControls(mod));el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll();});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};renderAll();});
        document.querySelectorAll('.tl-place-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+btn.closest('.timeline-event-admin').dataset.index};renderAll();});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>{inp.addEventListener('input',()=>readTimelineControls(mod));inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>{inp.addEventListener('input',()=>readTimelineControls(mod));inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll();});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll();});
      };

      const knownLogKeys7=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold7(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function txt7(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown7(s){const raw=clean7(s);for(const key of knownLogKeys7){const re=new RegExp('^('+reg7(key)+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean7(m[2])};}return null;}
      function splitCamelField7(s){const raw=clean7(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{2,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,'');const rest=clean7(m[2]);if(tag.length>1&&tag.length<35&&rest)return {tag,text:rest};return null;}
      function lineFromItems7(items){
        items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;
        for(const it of items){const t=txt7(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10));const gap=lastEnd==null?0:it.x-lastEnd;const needsSpace=gap>size*0.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(normal);all+=(all&&needsSpace?' ':'')+t;if(isBold7(it)){tags.push(t.replace(/[:：]\s*$/,'').trim());}else{normal+=(normal&&needsSpace?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}
        let text=clean7(normal);const allText=clean7(all);const fromKnown=detectKnown7(allText)||splitCamelField7(allText);
        if(!tags.length&&fromKnown){tags=[fromKnown.tag];text=fromKnown.text;}
        if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg7(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean7(stripped);}
        tags=tags.map(t=>clean7(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);
        return {text,all:allText,tags};
      }
      function normalizeLog7(mod){if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));}
      function activeLog7(mod){normalizeLog7(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldLog7(mod){normalizeLog7(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term);}
      function entryMatch7(e,terms){if(!terms.length)return true;const tags=(e.tags||[]).map(x=>String(x).toLowerCase());const text=String(e.text||'').toLowerCase();return terms.some(t=>tags.includes(t)||text.includes(t));}
      function logHTML7(mod){normalizeLog7(mod);const terms=activeLog7(mod);const bolds=boldLog7(mod);const entries=(mod.entries||[]).filter(e=>entryMatch7(e,terms));return `<div class="content log-content v7"><div class="log-list v7">${entries.length?entries.map(e=>`<div class="log-entry v7">${formatLog7(e,bolds)}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}
      function formatLog7(entry,bolds){const tags=(entry.tags||[]).filter(Boolean);const tagHTML=tags.length?`<div class="log-entry-tags v7">${tags.map(t=>`<span class="log-tag v7 ${bolds.includes(t)?'bold':''}">${esc7(t)}</span>`).join('')}</div>`:'';let text=esc7(entry.text||'');bolds.forEach(t=>{text=text.replace(new RegExp('\\b'+reg7(esc7(t))+'\\b','g'),`<b>${esc7(t)}</b>`);});return tagHTML+text;}
      async function ensurePdf7(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      async function extractPdfLogsV7(file,mod){
        try{const pdfjs=await ensurePdf7();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const lines=[];const boldSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>txt7(it));raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);for(const g of groups){const line=lineFromItems7(g.items);if(/^(?:[-–—_]{8,}|={8,})$/.test(line.all.replace(/\s/g,''))){lines.push({separator:true});continue;}line.tags.forEach(t=>boldSet.add(t));if(line.text||line.tags.length)lines.push(line);}lines.push({separator:true,soft:true});}
          let boldTerms=[...boldSet].map(x=>clean7(x)).filter(x=>x.length>1).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
          const entries=[];let cur={textLines:[],tags:new Set()};const flush=()=>{const text=clean7(cur.textLines.join('\n'));const tags=[...cur.tags].filter(Boolean);if(text||tags.length)entries.push({text,tags});cur={textLines:[],tags:new Set()};};
          for(const line of lines){if(line.separator&&!line.soft){flush();continue;}if(line.separator&&line.soft)continue;(line.tags||[]).forEach(t=>cur.tags.add(clean7(t)));if(line.text)cur.textLines.push(line.text);}flush();
          if(!boldTerms.length){entries.forEach(e=>(e.tags||[]).forEach(t=>boldSet.add(t)));boldTerms=[...boldSet];}
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));mod.filters=boldTerms.slice(0,140).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.map(e=>({text:e.text,tags:[...new Set((e.tags||[]).map(t=>clean7(t)).filter(Boolean))]})).filter(e=>e.text||e.tags.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }
      const prevContent7=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML7(mod);return prevContent7(mod);};
      const prevSettings7=settingsSpecific;settingsSpecific=function(mod){if(mod.type==='timeline')return timelineSettingsHTML(mod);if(mod.type!=='log')return prevSettings7(mod);normalizeLog7(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v7" data-index="${i}"><strong>${esc7(f.term)}</strong><label><input class="log-filter-enabled-v7" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v7" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');return `<div class="log-admin-grid v7"><input id="logPdfFileAdminV7" class="log-admin-file v7" type="file" accept="application/pdf"><button id="logPickAdminV7" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v7">Feltnavn som Title, DTG, Summary og From blir filtre. Verdien/vanlig tekst blir stående i loggen.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV7" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
      const prevNormalize7=normalizeMod;normalizeMod=function(mod){prevNormalize7(mod);if(mod.type==='log')normalizeLog7(mod);if(mod.type==='timeline'&&!mod.timelineOpenSection)mod.timelineOpenSection='events';};
      const prevRenderSelected7=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected7();const mod=selected();if(!mod)return;if(mod.type==='timeline')bindTimelineControls(mod);if(mod.type==='log'){const file=document.getElementById('logPdfFileAdminV7');document.getElementById('logPickAdminV7')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV7(file.files[0],mod);});document.querySelectorAll('.log-filter-row.v7').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v7')?.addEventListener('change',e=>{normalizeLog7(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v7')?.addEventListener('change',e=>{normalizeLog7(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});document.getElementById('logClearV7')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});}};
      const prevWire7=wireModule;wireModule=function(el,mod){prevWire7(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime7(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v7 render failed',e);}
    })();
