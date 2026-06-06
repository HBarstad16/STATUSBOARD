/* Request patch v8: log line tags/filtering, better tekstlogg log separation, bottom-aligned timeline */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-wrap.v8{height:100%;min-height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;overflow:visible;}
        .timeline-track.v8{height:230px;margin:0 26px 10px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v8.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.85);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v8{position:absolute;left:0;right:0;top:158px;height:5px;border-radius:999px;background:rgba(226,232,240,.9);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v8{position:absolute;top:141px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v8{position:absolute;top:184px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v8{position:absolute;top:176px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:3;overflow:visible;}
        .timeline-period-v8 span{position:absolute;left:50%;top:34px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v8{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:116px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v8 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.86);border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v8 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:155px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.56);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:3px 7px;}
        .timeline-event-v8 .ev-connector{width:2px;height:var(--connector-height,42px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v8 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v8{padding:0 26px 2px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;}
        .log-content.v8{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v8{display:grid;gap:14px;overflow:auto;}
        .log-entry.v8{border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(2,6,23,.42);padding:13px;line-height:1.45;box-shadow:0 10px 28px rgba(0,0,0,.16);}
        .log-entry-title.v8{font-size:.76em;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;font-weight:900;}
        .log-line.v8{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding:3px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v8:first-of-type{border-top:none;}
        .log-line-text.v8{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-line-text.v8.bold{font-weight:950;color:#fff;}
        .log-tag-inline.v8{display:inline-flex;border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;}
        .log-tag-inline.v8.bold{font-weight:950;color:white;background:rgba(96,165,250,.30);border-color:rgba(191,219,254,.45);}
        .log-empty.v8{border:1px dashed rgba(255,255,255,.25);border-radius:16px;padding:18px;text-align:center;color:#cbd5e1;}
        .log-filter-row.v8{display:grid;grid-template-columns:1fr 62px 62px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:8px;background:rgba(2,6,23,.34);}
        .log-filter-row.v8 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v8 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v8 input{width:18px;height:18px;}
        .log-admin-grid.v8{display:grid;gap:10px;}
        .log-admin-file.v8{display:none;}
        .log-admin-note.v8{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function esc8(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg8(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp8(n,a,b){return Math.max(a,Math.min(b,n));}
      function d8(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt8(value,unit){const d=d8(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime8(mod,pct){const start=d8(mod.start),end=d8(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp8(pct,0,1)).toISOString();}
      function clean8(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function colorRgba8(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey8(ev){return d8(ev.time).toISOString().slice(0,16);}

      timelineHTML=function(mod){
        const start=d8(mod.start), end=d8(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp8(((d8(v).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const lineTop=158;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick v8" style="left:${pct}%"></div><div class="timeline-tick-label v8" style="left:${pct}%">${esc8(fmt8(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v8" style="left:${left}%;width:${w}%;background:${colorRgba8(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc8(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey8(ev); const level=used[key]||0; used[key]=level+1; const top=Math.max(4,78-(level*54)); const connector=Math.max(22,lineTop-top-60); return `<div class="timeline-event-v8" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;--connector-height:${connector}px;color:${esc8(ev.color||'#f8fafc')}" title="${esc8((ev.name||'')+' '+fmt8(ev.time,'hour'))}"><div class="ev-time">${esc8(fmt8(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc8(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v8"><div class="timeline-track v8 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v8"></div>${periods}${ticks}${events}</div><div class="timeline-scale v8"><span>${esc8(fmt8(mod.start,unit))}</span><span>${esc8(fmt8(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres. Tidspunktet settes automatisk ut fra posisjonen.</span></div>':''}</div></div>`;
      };

      function normalizeLog8(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{
          if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:clean8(l.text||''),tags:(l.tags||[]).map(clean8).filter(Boolean)})).filter(l=>l.text||l.tags.length)};
          const tags=(e.tags||[]).map(clean8).filter(Boolean); const lines=String(e.text||'').split(/\n+/).map(x=>clean8(x)).filter(Boolean).map(text=>({text,tags}));
          return {lines,tags};
        }).filter(e=>e.lines&&e.lines.length);
      }
      function enabledTerms8(mod){normalizeLog8(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldTerms8(mod){normalizeLog8(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function lineMatch8(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function logHTML8(mod){
        normalizeLog8(mod);const terms=enabledTerms8(mod),bolds=boldTerms8(mod);
        const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>lineMatch8(l,terms))})).filter(e=>e.lines.length);
        return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine8(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;
      }
      function formatLogLine8(line,bolds){
        const tags=(line.tags||[]).filter(Boolean);const isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));
        const tagHTML=tags.map(t=>`<span class="log-tag-inline v8 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc8(t)}</span>`).join('');
        return `<div class="log-line v8"><span class="log-line-text v8 ${isBold?'bold':''}">${esc8(line.text||'')}</span>${tagHTML}</div>`;
      }

      const knownKeys8=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold8(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText8(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown8(s){const raw=clean8(s);for(const key of knownKeys8){const re=new RegExp('^('+reg8(key)+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean8(m[2])};}return null;}
      function splitCamel8(s){const raw=clean8(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{1,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,'');const rest=clean8(m[2]);if(tag.length>1&&tag.length<40&&rest)return {tag,text:rest};return null;}
      function lineFromItems8(items){
        items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;
        for(const it of items){const t=itemText8(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10));const gap=lastEnd==null?0:it.x-lastEnd;const addSpace=(base)=>base&&gap>size*0.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(base);all+=(addSpace(all)?' ':'')+t;if(isBold8(it)){tags.push(t.replace(/[:：-]\s*$/,'').trim());}else{normal+=(addSpace(normal)?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}
        let text=clean8(normal),allText=clean8(all);const known=detectKnown8(allText)||splitCamel8(allText);
        if(known){tags=[known.tag];text=known.text;}
        if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg8(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean8(stripped);}
        tags=tags.map(t=>clean8(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);
        return {text,all:allText,tags};
      }
      async function ensurePdf8(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      async function extractPdfLogsV8(file,mod){
        try{const pdfjs=await ensurePdf8();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const pieces=[];const tagSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){
            const page=await pdf.getPage(p);const content=await page.getTextContent();
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText8(it));
            raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);
            const gaps=[];for(let i=1;i<groups.length;i++)gaps.push(Math.abs(groups[i-1].y-groups[i].y));const sorted=gaps.slice().sort((a,b)=>a-b);const med=sorted.length?sorted[Math.floor(sorted.length/2)]:12;const gapLimit=Math.max(22,med*2.4);
            let prevY=null;
            for(const g of groups){if(prevY!==null&&Math.abs(prevY-g.y)>gapLimit)pieces.push({separator:true});prevY=g.y;const line=lineFromItems8(g.items);if(/^(?:[-–—_]{6,}|={6,})$/.test(line.all.replace(/\s/g,''))){pieces.push({separator:true});continue;}line.tags.forEach(t=>tagSet.add(t));if(line.text||line.tags.length)pieces.push({line});}
            pieces.push({separator:true,page:true});
          }
          const entries=[];let cur={lines:[]};const flush=()=>{if(cur.lines.length)entries.push(cur);cur={lines:[]};};
          for(const part of pieces){if(part.separator){flush();continue;}if(part.line){cur.lines.push({text:clean8(part.line.text),tags:[...new Set((part.line.tags||[]).map(clean8).filter(Boolean))]});}}
          flush();
          const terms=[...tagSet].map(clean8).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));
          mod.filters=terms.slice(0,160).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.filter(e=>e.lines.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContent8=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML8(mod);return prevContent8(mod);};
      const prevSettings8=settingsSpecific;settingsSpecific=function(mod){if(mod.type!=='log')return prevSettings8(mod);normalizeLog8(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v8" data-index="${i}"><strong>${esc8(f.term)}</strong><label><input class="log-filter-enabled-v8" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v8" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');return `<div class="log-admin-grid v8"><input id="logPdfFileAdminV8" class="log-admin-file v8" type="file" accept="application/pdf"><button id="logPickAdminV8" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v8">Feltnavn blir filter-tags. Huk av «Vis» for å vise bare linjer med den taggen. Uten valgte «Vis»-filtre vises alt.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV8" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
      const prevNormalize8=normalizeMod;normalizeMod=function(mod){prevNormalize8(mod);if(mod.type==='log')normalizeLog8(mod);};
      const prevRenderSelected8=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected8();const mod=selected();if(!mod)return;if(mod.type==='log'){const file=document.getElementById('logPdfFileAdminV8');document.getElementById('logPickAdminV8')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV8(file.files[0],mod);});document.querySelectorAll('.log-filter-row.v8').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v8')?.addEventListener('change',e=>{normalizeLog8(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v8')?.addEventListener('change',e=>{normalizeLog8(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});document.getElementById('logClearV8')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});}};
      const prevWire8=wireModule;wireModule=function(el,mod){prevWire8(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime8(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v8 render failed',e);}
    })();
