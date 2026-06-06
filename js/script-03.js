/* Request patch v6: click-to-place timeline events + better log tekstlogg parsing */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-track.v6{height:220px;margin:0 24px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v6.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.85);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        @keyframes timelinePlacePulse{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,.20)}50%{box-shadow:0 0 0 12px rgba(96,165,250,.06)}}
        .timeline-line.v6{position:absolute;left:0;right:0;top:124px;height:5px;border-radius:999px;background:rgba(226,232,240,.88);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:3;}
        .timeline-tick.v6{position:absolute;top:108px;width:2px;height:36px;background:rgba(248,250,252,.92);transform:translateX(-1px);border-radius:999px;z-index:5;}
        .timeline-tick-label.v6{position:absolute;top:148px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:5;}
        .timeline-period-v6{position:absolute;top:137px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:2;overflow:visible;}
        .timeline-period-v6 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v6{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:3px;min-width:116px;text-align:center;z-index:7;pointer-events:none;}
        .timeline-event-v6 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.82);border:1px solid rgba(147,197,253,.24);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v6 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:150px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.52);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:3px 7px;}
        .timeline-event-v6 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:20px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-place-help{border:1px solid rgba(96,165,250,.35);border-radius:14px;background:rgba(59,130,246,.12);padding:9px 10px;color:#dbeafe;font-size:12px;line-height:1.35;display:flex;gap:8px;align-items:flex-start;}
        .timeline-event-admin.v6 .event-top{display:grid;grid-template-columns:1fr 54px;gap:8px;align-items:end;}
        .timeline-event-admin.v6 .event-time-row{display:grid;grid-template-columns:1fr;gap:7px;}
        .timeline-event-admin.v6 .time-chip{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(2,6,23,.35);padding:8px;color:#cbd5e1;font-size:12px;}
        .timeline-event-admin.v6 .time-chip strong{color:white;font-size:13px;}
        .timeline-place-active{border-color:rgba(96,165,250,.65)!important;background:rgba(59,130,246,.16)!important;}
        .log-content.v6{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v6{display:grid;gap:12px;overflow:auto;}
        .log-entry.v6{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:13px;line-height:1.45;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-entry-tags.v6{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
        .log-tag.v6{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.08);font-size:.78em;color:#cbd5e1;}
        .log-tag.v6.bold{font-weight:950;color:white;background:rgba(96,165,250,.24);border-color:rgba(147,197,253,.40);}
        .log-admin-grid.v6{display:grid;gap:10px;}
        .log-filter-row.v6{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px;background:rgba(2,6,23,.32);}
        .log-filter-row.v6 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v6 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v6 input{width:18px;height:18px;}
        .log-admin-file.v6{display:none;}
        .log-admin-note.v6{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function htmlEscape(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp6(n,a,b){return Math.max(a,Math.min(b,n));}
      function d6(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt6(value,unit){const d=d6(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function toDTLocal6(value){const d=d6(value);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
      function fromDTLocal6(v){if(!v)return new Date().toISOString();const d=new Date(v);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
      function pctToTime(mod,pct){const start=d6(mod.start),end=d6(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp6(pct,0,1)).toISOString();}
      function sameKey6(ev){return d6(ev.time).toISOString().slice(0,16);}
      function colorRgba6(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function escReg6(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

      timelineHTML=function(mod){
        const start=d6(mod.start), end=d6(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp6(((d6(v).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick v6" style="left:${pct}%"></div><div class="timeline-tick-label v6" style="left:${pct}%">${htmlEscape(fmt6(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v6" style="left:${left}%;width:${w}%;background:${colorRgba6(p.color||'#60a5fa',p.opacity??0.55)}"><span>${htmlEscape(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey6(ev); const level=used[key]||0; used[key]=level+1; const top=Math.max(4,86-(level*48));return `<div class="timeline-event-v6" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;color:${htmlEscape(ev.color||'#f8fafc')}" title="${htmlEscape((ev.name||'')+' '+fmt6(ev.time,'hour'))}"><div class="ev-time">${htmlEscape(fmt6(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${htmlEscape(ev.name||'Hendelse')}</div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track v6 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v6"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${htmlEscape(fmt6(mod.start,unit))}</span><span>${htmlEscape(fmt6(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres. Tidspunktet settes automatisk ut fra posisjonen.</span></div>':''}</div></div>`;
      };

      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour'; const open=mod.timelineOpenSection||'events'; const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-p-name" value="${htmlEscape(p.name||'')}" placeholder="Periode"></div>
          <div class="grid-mini"><div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDTLocal6(p.start||mod.start)}"></div><div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDTLocal6(p.end||mod.end)}"></div></div>
          <div class="grid-color"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${htmlEscape(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div>
          <button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button>
        </div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin v6 ${placing&&window.__timelinePlace.index===i?'timeline-place-active':''}" data-index="${i}" data-time="${htmlEscape(ev.time||mod.start)}">
          <div class="event-top"><div class="field"><label>Navn</label><input class="tl-e-name" value="${htmlEscape(ev.name||'')}" placeholder="Hendelse"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${htmlEscape(ev.color||'#f8fafc')}"></div></div>
          <div class="event-time-row"><div class="time-chip"><span title="Klikk plasser-knappen, deretter klikk på tidslinjen">⏱</span><div><span>Tid fra plassering</span><br><strong>${htmlEscape(fmt6(ev.time,unit==='date'?'date':'hour'))}</strong></div></div><button class="tool-btn tl-place-event" type="button">⏱ Plasser på tidslinje</button></div>
          <button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button>
        </div>`).join('');
        return `<div class="timeline-admin-compact v4 v5 v6">
          <div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDTLocal6(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDTLocal6(mod.end)}"></div></div>
          <div class="timeline-small-grid"><div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div>
          <p class="small">Hendelser får tid når du plasserer dem på tidslinjen. Bruk ⏱-knappen og klikk på linjen.</p>
          <details class="timeline-details" ${open==='periods'?'open':''}><summary>Perioder (${mod.periods?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button></div><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div></details>
          <details class="timeline-details" ${open==='events'?'open':''}><summary>Hendelser (${mod.events?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddEvent" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Tidslinjen lyser opp. Klikk på ønsket tidspunkt på boardet.</span></div>':''}<div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div></details>
        </div>`;
      };

      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDTLocal6(s.value); if(e)mod.end=fromDTLocal6(e.value); if(u)mod.timeUnit=u.value; if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDTLocal6(row.querySelector('.tl-p-start')?.value),end:fromDTLocal6(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>({name:row.querySelector('.tl-e-name')?.value||'',time:row.dataset.time||mod.start,color:row.querySelector('.tl-e-color')?.value||'#f8fafc'}));
        save();
      };

      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        document.querySelectorAll('.timeline-details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)mod.timelineOpenSection=d.querySelector('summary')?.textContent?.toLowerCase().includes('periode')?'periods':'events';save();}));
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('input',()=>{readTimelineControls(mod);});el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll();});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};renderAll();});
        document.querySelectorAll('.tl-place-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+btn.closest('.timeline-event-admin').dataset.index};renderAll();});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll();});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll();});
      };

      function normalizeLog6(mod){if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));}
      function cleanText6(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function activeLogTerms6(mod){normalizeLog6(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldLogTerms6(mod){normalizeLog6(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term);}
      function logEntryMatches6(entry,terms){if(!terms.length)return true;const tags=(entry.tags||[]).map(x=>String(x).toLowerCase());const text=String(entry.text||'').toLowerCase();return terms.some(t=>tags.includes(t)||text.includes(t));}
      function logHTML6(mod){normalizeLog6(mod);const terms=activeLogTerms6(mod);const bolds=boldLogTerms6(mod);const entries=(mod.entries||[]).filter(e=>logEntryMatches6(e,terms));return `<div class="content log-content v6"><div class="log-list v6">${entries.length?entries.map(e=>`<div class="log-entry v6">${formatLogEntry6(e,bolds)}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn i tekstloggen blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}
      function formatLogEntry6(entry,bolds){const tags=(entry.tags||[]).filter(Boolean);const tagHTML=tags.length?`<div class="log-entry-tags v6">${tags.map(t=>`<span class="log-tag v6 ${bolds.includes(t)?'bold':''}">${htmlEscape(t)}</span>`).join('')}</div>`:'';let text=htmlEscape(entry.text||'');bolds.forEach(t=>{const re=new RegExp('\\b'+escReg6(htmlEscape(t))+'\\b','g');text=text.replace(re,`<b>${htmlEscape(t)}</b>`);});return tagHTML+text;}
      async function ensurePdfJs6(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      function itemIsBold6(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText6(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function lineFromItems6(items){
        items.sort((a,b)=>a.x-b.x);
        let visible='', all='', tags=[], lastEnd=null, lastSize=10;
        for(const it of items){const txt=itemText6(it); if(!txt)continue; const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10)); const gap=lastEnd==null?0:it.x-lastEnd; const needsSpace=gap>size*0.38 && !/^\s*[.,:;!?)]/.test(txt) && !/[([{]\s*$/.test(visible); const sep=needsSpace?'':'';
          all+=(all&&needsSpace?' ':'')+txt;
          if(itemIsBold6(it)){tags.push(txt.replace(/[:：]\s*$/,'').trim());}
          else{visible+=sep+txt;}
          lastEnd=(it.x||0)+(it.w||txt.length*size*.5); lastSize=size;
        }
        return {text:cleanText6(visible),all:cleanText6(all),tags:tags.filter(t=>t.length>1&&t.length<90)};
      }
      async function extractPdfLogsV6(file,mod){
        try{
          const pdfjs=await ensurePdfJs6();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const lines=[];const boldSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){
            const page=await pdf.getPage(p);const content=await page.getTextContent();
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText6(it));
            raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            let groups=[];
            for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}
            groups.sort((a,b)=>b.y-a.y);
            for(const g of groups){const line=lineFromItems6(g.items); if(/^(?:[-–—_]{8,}|={8,})$/.test(line.all.replace(/\s/g,''))){lines.push({separator:true});continue;} line.tags.forEach(t=>boldSet.add(t)); if(line.text||line.tags.length)lines.push(line);}
            lines.push({separator:true,soft:true});
          }
          const boldTerms=[...boldSet].map(x=>cleanText6(x).replace(/[:：]$/,'')).filter(x=>x.length>1).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i).slice(0,120);
          const entries=[];let cur={textLines:[],tags:new Set()};
          const flush=()=>{const text=cleanText6(cur.textLines.join('\n'));const tags=[...cur.tags].filter(Boolean);if(text||tags.length)entries.push({text,tags});cur={textLines:[],tags:new Set()};};
          for(const line of lines){if(line.separator&&!line.soft){flush();continue;} if(line.separator&&line.soft){continue;} (line.tags||[]).forEach(t=>cur.tags.add(cleanText6(t).replace(/[:：]$/,''))); if(line.text)cur.textLines.push(line.text);}
          flush();
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));
          mod.filters=boldTerms.map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.map(e=>({text:e.text,tags:[...new Set(e.tags.map(t=>cleanText6(t).replace(/[:：]$/,'')).filter(t=>boldTerms.some(b=>b.toLowerCase()===t.toLowerCase())))]})).filter(e=>e.text||e.tags.length);
          mod.fileName=file.name; save(); renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContentHTML6=contentHTML;
      contentHTML=function(mod){if(mod.type==='log')return logHTML6(mod);return prevContentHTML6(mod);};
      const prevSettingsSpecific6=settingsSpecific;
      settingsSpecific=function(mod){
        if(mod.type==='timeline')return timelineSettingsHTML(mod);
        if(mod.type!=='log')return prevSettingsSpecific6(mod);
        normalizeLog6(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v6" data-index="${i}"><strong>${htmlEscape(f.term)}</strong><label><input class="log-filter-enabled-v6" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v6" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');
        return `<div class="log-admin-grid v6"><input id="logPdfFileAdminV6" class="log-admin-file v6" type="file" accept="application/pdf"><button id="logPickAdminV6" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v6">Feltnavn i tekstloggen blir automatisk filtervalg. Vanlig tekst vises i loggen og forsøkes ryddet til hele linjer uten store tekstlogg-mellomrom.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV6" class="tool-btn danger" type="button">Tøm logg</button></div>`;
      };
      const prevNormalize6=normalizeMod;
      normalizeMod=function(mod){prevNormalize6(mod);if(mod.type==='log')normalizeLog6(mod);if(mod.type==='timeline'&&!mod.timelineOpenSection)mod.timelineOpenSection='events';};
      const prevRenderSelected6=renderSelectedSettings;
      renderSelectedSettings=function(){
        prevRenderSelected6();const mod=selected();if(!mod)return;
        if(mod.type==='timeline')bindTimelineControls(mod);
        if(mod.type==='log'){
          const file=document.getElementById('logPdfFileAdminV6');document.getElementById('logPickAdminV6')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV6(file.files[0],mod);});
          document.querySelectorAll('.log-filter-row.v6').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v6')?.addEventListener('change',e=>{normalizeLog6(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v6')?.addEventListener('change',e=>{normalizeLog6(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});
          document.getElementById('logClearV6')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});
        }
      };
      const prevWire6=wireModule;
      wireModule=function(el,mod){
        prevWire6(el,mod);
        if(mod.type==='timeline'){
          const track=el.querySelector('[data-timeline-track]');
          track?.addEventListener('click',e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();});
        }
      };
      try{renderAll();}catch(e){console.error('Request patch v6 render failed',e);}
    })();
