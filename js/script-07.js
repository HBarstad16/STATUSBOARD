/* Request patch v10: restore visible bottom-anchored timeline and split logs on tekstlogg form separators */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v10{height:100%;min-height:100%;overflow:hidden;padding:10px 0 8px;}
        .timeline-wrap.v10{height:100%;min-height:150px;position:relative;display:flex;flex-direction:column;justify-content:flex-end;overflow:visible;}
        .timeline-track.v10{position:relative;margin:auto 26px 0 26px;height:clamp(150px, calc(100% - 24px), 260px);min-height:150px;overflow:visible;cursor:default;flex:0 1 auto;}
        .timeline-track.v10.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:8px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v10{position:absolute;left:0;right:0;bottom:36px;height:5px;border-radius:999px;background:rgba(226,232,240,.94);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v10{position:absolute;bottom:19px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v10{position:absolute;bottom:-8px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v10{position:absolute;bottom:28px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v10 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-v10{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:120px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v10 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.88);border:1px solid rgba(147,197,253,.32);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v10 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:165px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.60);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-v10 .ev-connector{width:2px;height:var(--connector-height,48px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v10 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-event-v10.hide-pointer .ev-connector,.timeline-event-v10.hide-pointer .ev-arrow{display:none;}
        .timeline-scale.v10{height:18px;margin:2px 26px 0 26px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v10{position:absolute;left:12px;right:12px;bottom:28px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
        .log-line.v10{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v10:first-of-type{border-top:none;}
        .log-tag-left.v10{display:inline-flex;border:1px solid rgba(147,197,253,.30);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;white-space:nowrap;justify-self:start;}
        .log-tag-left.v10.bold{font-weight:950;color:white;background:rgba(96,165,250,.31);border-color:rgba(191,219,254,.48);}
        .log-line-text.v10{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;min-width:0;}
        .log-line-text.v10.bold{font-weight:950;color:#fff;}
        .log-line-tags-stack.v10{display:flex;gap:5px;flex-wrap:wrap;}
      `;
      document.head.appendChild(style);

      function esc10(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg10(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp10(n,a,b){return Math.max(a,Math.min(b,n));}
      function d10(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt10(value,unit){const d=d10(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime10(mod,pct){const start=d10(mod.start),end=d10(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp10(pct,0,1)).toISOString();}
      function clean10(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function rgba10(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey10(ev){return d10(ev.time).toISOString().slice(0,16);}

      timelineHTML=function(mod){
        const start=d10(mod.start),end=d10(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp10(((d10(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id,lineBottom=36;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v10" style="left:${pct}%"></div><div class="timeline-tick-label v10" style="left:${pct}%">${esc10(fmt10(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v10" style="left:${left}%;width:${w}%;background:${rgba10(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc10(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey10(ev),level=used[key]||0;used[key]=level+1;const bottom=86+(level*58),connector=Math.max(26,bottom-lineBottom-56),hide=level>0?' hide-pointer':'';return `<div class="timeline-event-v10${hide}" data-event-index="${i}" style="left:${pos(ev.time)}%;bottom:${bottom}px;--connector-height:${connector}px;color:${esc10(ev.color||'#f8fafc')}" title="${esc10((ev.name||'')+' '+fmt10(ev.time,'hour'))}"><div class="ev-time">${esc10(fmt10(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc10(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content timeline-content-v10"><div class="timeline-wrap v10"><div class="timeline-track v10 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v10"></div>${periods}${ticks}${events}</div><div class="timeline-scale v10"><span>${esc10(fmt10(mod.start,unit))}</span><span>${esc10(fmt10(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v10"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };

      function normalizeLog10(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:clean10(l.text||''),tags:(l.tags||[]).map(clean10).filter(Boolean)})).filter(l=>l.text||l.tags.length)};const tags=(e.tags||[]).map(clean10).filter(Boolean);return {lines:String(e.text||'').split(/\n+/).map(clean10).filter(Boolean).map(text=>({text,tags}))};}).filter(e=>e.lines&&e.lines.length);
      }
      function enabled10(mod){normalizeLog10(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function bold10(mod){normalizeLog10(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function match10(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function formatLogLine10(line,bolds){const tags=(line.tags||[]).filter(Boolean),isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));const tagHTML=tags.length?`<span class="log-line-tags-stack v10">${tags.map(t=>`<span class="log-tag-left v10 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc10(t)}</span>`).join('')}</span>`:'<span></span>';return `<div class="log-line v10">${tagHTML}<span class="log-line-text v10 ${isBold?'bold':''}">${esc10(line.text||'')}</span></div>`;}
      function logHTML10(mod){normalizeLog10(mod);const terms=enabled10(mod),bolds=bold10(mod);const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>match10(l,terms))})).filter(e=>e.lines.length);return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine10(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}

      const knownKeys10=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold10(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText10(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown10(s){const raw=clean10(s);for(const key of knownKeys10){const re=new RegExp('^('+key+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean10(m[2])};}return null;}
      function splitCamel10(s){const raw=clean10(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{1,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,''),rest=clean10(m[2]);if(tag.length>1&&tag.length<40&&rest)return {tag,text:rest};return null;}
      function lineFromItems10(items){items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;for(const it of items){const t=itemText10(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10)),gap=lastEnd==null?0:it.x-lastEnd;const addSpace=base=>base&&gap>size*.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(base);all+=(addSpace(all)?' ':'')+t;if(isBold10(it)){tags.push(t.replace(/[:：-]\s*$/,'').trim());}else{normal+=(addSpace(normal)?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}let text=clean10(normal),allText=clean10(all);const known=detectKnown10(allText)||splitCamel10(allText);if(known){tags=[known.tag];text=known.text;}if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg10(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean10(stripped);}tags=tags.map(t=>clean10(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);return {text,all:allText,tags};}
      async function ensurePdf10(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      function collectSeparatorYs10(opList){const ys=[];const nums=a=>{const out=[];(function walk(x){if(Array.isArray(x))x.forEach(walk);else if(typeof x==='number'&&Number.isFinite(x))out.push(x);})(a);return out;};for(let i=0;i<(opList.fnArray||[]).length;i++){const arr=nums(opList.argsArray[i]);for(let j=0;j+3<arr.length;j+=2){const x1=arr[j],y1=arr[j+1],x2=arr[j+2],y2=arr[j+3];if(Math.abs(y1-y2)<2&&Math.abs(x2-x1)>120)ys.push((y1+y2)/2);}for(let j=0;j+3<arr.length;j+=4){const x=arr[j],y=arr[j+1],w=arr[j+2],h=arr[j+3];if(Math.abs(w)>120&&Math.abs(h)<18)ys.push(y+h/2);}}return ys.filter((y,i,a)=>a.findIndex(v=>Math.abs(v-y)<3)===i);}
      function hasSeparatorBetween10(seps,a,b){const top=Math.max(a,b),bottom=Math.min(a,b);return seps.some(y=>y<top-2&&y>bottom+2);}
      async function extractPdfLogsV10(file,mod){
        try{const pdfjs=await ensurePdf10();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const pieces=[],tagSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();let seps=[];try{seps=collectSeparatorYs10(await page.getOperatorList());}catch{}
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText10(it));raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);
            const gaps=[];for(let i=1;i<groups.length;i++)gaps.push(Math.abs(groups[i-1].y-groups[i].y));const sorted=gaps.slice().sort((a,b)=>a-b),med=sorted.length?sorted[Math.floor(sorted.length/2)]:12,gapLimit=Math.max(24,med*2.6);
            let prevY=null,pendingTags=[];
            for(const g of groups){if(prevY!==null&&(Math.abs(prevY-g.y)>gapLimit||hasSeparatorBetween10(seps,prevY,g.y))){pieces.push({separator:true});pendingTags=[];}prevY=g.y;const line=lineFromItems10(g.items);if(/^(?:[-–—_]{6,}|={6,})$/.test(line.all.replace(/\s/g,''))){pieces.push({separator:true});pendingTags=[];continue;}line.tags.forEach(t=>tagSet.add(t));if(line.tags.length&&line.text){pieces.push({line:{text:clean10(line.text),tags:[...new Set(line.tags)]}});pendingTags=[];}else if(line.tags.length&&!line.text){pendingTags=[...new Set([...pendingTags,...line.tags])];}else if(line.text){pieces.push({line:{text:clean10(line.text),tags:[...new Set(pendingTags)]}});pendingTags=[];}}
            pieces.push({separator:true,page:true});}
          const entries=[];let cur={lines:[]};const flush=()=>{if(cur.lines.length)entries.push(cur);cur={lines:[]};};for(const part of pieces){if(part.separator){flush();continue;}if(part.line){cur.lines.push({text:clean10(part.line.text),tags:[...new Set((part.line.tags||[]).map(clean10).filter(Boolean))]});}}flush();
          const terms=[...tagSet].map(clean10).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i),existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));mod.filters=terms.slice(0,180).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));mod.entries=entries.filter(e=>e.lines.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContent10=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML10(mod);if(mod.type==='timeline')return timelineHTML(mod);return prevContent10(mod);};
      const prevNormalize10=normalizeMod;normalizeMod=function(mod){prevNormalize10(mod);if(mod.type==='log')normalizeLog10(mod);};
      const prevRenderSelected10=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected10();const mod=selected();if(!mod)return;if(mod.type==='log'){const old=document.getElementById('logPickAdminV8')||document.getElementById('logPickAdminV6');const oldFile=document.getElementById('logPdfFileAdminV8')||document.getElementById('logPdfFileAdminV6');old?.replaceWith(old.cloneNode(true));const pick=document.getElementById('logPickAdminV8')||document.getElementById('logPickAdminV6');const file=document.getElementById('logPdfFileAdminV8')||document.getElementById('logPdfFileAdminV6');pick?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV10(file.files[0],mod);});}};
      const prevWire10=wireModule;wireModule=function(el,mod){prevWire10(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime10(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v10 render failed',e);}
    })();


    /* Request patch v11: timeline bottom lock + grouped same-time events with one time label */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v11{height:100%;min-height:100%;position:relative;overflow:hidden;padding:0;}
        .timeline-wrap.v11{position:absolute;inset:0;overflow:visible;}
        .timeline-track.v11{position:absolute;left:26px;right:26px;bottom:32px;height:260px;max-height:calc(100% - 38px);min-height:150px;overflow:visible;cursor:default;}
        .timeline-track.v11.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:8px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v11{position:absolute;left:0;right:0;bottom:38px;height:5px;border-radius:999px;background:rgba(226,232,240,.96);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v11{position:absolute;bottom:21px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v11{position:absolute;bottom:-7px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v11{position:absolute;bottom:30px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v11 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-group-v11{position:absolute;transform:translateX(-50%);bottom:40px;display:grid;justify-items:center;gap:3px;min-width:128px;text-align:center;z-index:9;pointer-events:none;color:#f8fafc;}
        .timeline-event-group-v11 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.90);border:1px solid rgba(147,197,253,.36);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-group-v11 .ev-names{display:grid;gap:3px;justify-items:center;}
        .timeline-event-group-v11 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:175px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.64);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-group-v11 .ev-connector{width:2px;height:var(--connector-height,58px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-group-v11 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v11{position:absolute;left:26px;right:26px;bottom:6px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v11{position:absolute;left:12px;right:12px;bottom:68px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
      `;
      document.head.appendChild(style);
      function esc11(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp11(n,a,b){return Math.max(a,Math.min(b,n));}
      function d11(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt11(value,unit){const d=d11(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function rgba11(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function pctToTime11(mod,pct){const start=d11(mod.start),end=d11(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp11(pct,0,1)).toISOString();}
      function sameKey11(ev){return d11(ev.time).toISOString().slice(0,16);}
      timelineHTML=function(mod){
        const start=d11(mod.start),end=d11(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp11(((d11(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v11" style="left:${pct}%"></div><div class="timeline-tick-label v11" style="left:${pct}%">${esc11(fmt11(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v11" style="left:${left}%;width:${w}%;background:${rgba11(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc11(p.name||'')}</span></div>`}).join('');
        const groups=[];const byKey=new Map();
        (mod.events||[]).forEach((ev,i)=>{const key=sameKey11(ev);let g=byKey.get(key);if(!g){g={key,time:ev.time,color:ev.color||'#f8fafc',events:[]};byKey.set(key,g);groups.push(g);}g.events.push({...ev,index:i});if(!g.color&&ev.color)g.color=ev.color;});
        groups.sort((a,b)=>d11(a.time)-d11(b.time));
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc11(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=58+(extra*12);return `<div class="timeline-event-group-v11" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc11(g.color||'#f8fafc')}" title="${esc11(fmt11(g.time,'hour'))}"><div class="ev-time">${esc11(fmt11(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v11"><div class="timeline-wrap v11"><div class="timeline-track v11 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v11"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v11"><span>${esc11(fmt11(mod.start,unit))}</span><span>${esc11(fmt11(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v11"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      const prevContent11=contentHTML;contentHTML=function(mod){if(mod.type==='timeline')return timelineHTML(mod);return prevContent11(mod);};
      const prevWire11=wireModule;wireModule=function(el,mod){prevWire11(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime11(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v11 render failed',e);}
    })();

    /* Request patch v12: move timeline line down to align with period marking */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v12{height:100%;min-height:100%;position:relative;overflow:hidden;padding:0;}
        .timeline-wrap.v12{position:absolute;inset:0;overflow:visible;}
        .timeline-track.v12{position:absolute;left:26px;right:26px;bottom:0;height:100%;min-height:150px;overflow:visible;cursor:default;}
        .timeline-track.v12.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:-2px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v12{position:absolute;left:0;right:0;bottom:56px;height:5px;border-radius:999px;background:rgba(226,232,240,.96);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v12{position:absolute;bottom:39px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v12{position:absolute;bottom:11px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v12{position:absolute;bottom:48px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v12 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-group-v12{position:absolute;transform:translateX(-50%);bottom:62px;display:grid;justify-items:center;gap:3px;min-width:128px;text-align:center;z-index:9;pointer-events:none;color:#f8fafc;}
        .timeline-event-group-v12 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.90);border:1px solid rgba(147,197,253,.36);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-group-v12 .ev-names{display:grid;gap:3px;justify-items:center;}
        .timeline-event-group-v12 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:175px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.64);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-group-v12 .ev-connector{width:2px;height:var(--connector-height,42px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-group-v12 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v12{position:absolute;left:26px;right:26px;bottom:4px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v12{position:absolute;left:12px;right:12px;bottom:88px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
      `;
      document.head.appendChild(style);
      function esc12(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp12(n,a,b){return Math.max(a,Math.min(b,n));}
      function d12(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt12(value,unit){const d=d12(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function rgba12(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function pctToTime12(mod,pct){const start=d12(mod.start),end=d12(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp12(pct,0,1)).toISOString();}
      function sameKey12(ev){return d12(ev.time).toISOString().slice(0,16);}
      timelineHTML=function(mod){
        const start=d12(mod.start),end=d12(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp12(((d12(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v12" style="left:${pct}%"></div><div class="timeline-tick-label v12" style="left:${pct}%">${esc12(fmt12(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v12" style="left:${left}%;width:${w}%;background:${rgba12(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc12(p.name||'')}</span></div>`}).join('');
        const groups=[];const byKey=new Map();
        (mod.events||[]).forEach((ev,i)=>{const key=sameKey12(ev);let g=byKey.get(key);if(!g){g={key,time:ev.time,color:ev.color||'#f8fafc',events:[]};byKey.set(key,g);groups.push(g);}g.events.push({...ev,index:i});if(!g.color&&ev.color)g.color=ev.color;});
        groups.sort((a,b)=>d12(a.time)-d12(b.time));
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc12(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=42+(extra*12);return `<div class="timeline-event-group-v12" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc12(g.color||'#f8fafc')}" title="${esc12(fmt12(g.time,'hour'))}"><div class="ev-time">${esc12(fmt12(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v12"><div class="timeline-wrap v12"><div class="timeline-track v12 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v12"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v12"><span>${esc12(fmt12(mod.start,unit))}</span><span>${esc12(fmt12(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v12"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      const prevContent12=contentHTML;contentHTML=function(mod){if(mod.type==='timeline')return timelineHTML(mod);return prevContent12(mod);};
      const prevWire12=wireModule;wireModule=function(el,mod){prevWire12(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime12(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v12 render failed',e);}
    })();
