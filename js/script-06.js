/* Request patch v9: left-side log tags, bottom-anchored timeline, period on line, hide upper duplicate arrows */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-wrap.v9{height:100%;min-height:100%;position:relative;overflow:visible;padding:0 0 4px;}
        .timeline-track.v9{position:absolute;left:26px;right:26px;bottom:26px;height:235px;margin:0;overflow:visible;cursor:default;}
        .timeline-track.v9.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v9{position:absolute;left:0;right:0;bottom:34px;height:5px;border-radius:999px;background:rgba(226,232,240,.92);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v9{position:absolute;bottom:17px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v9{position:absolute;bottom:-10px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v9{position:absolute;bottom:27px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v9 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-v9{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:120px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v9 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.88);border:1px solid rgba(147,197,253,.32);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v9 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:165px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.58);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-v9 .ev-connector{width:2px;height:var(--connector-height,48px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v9 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-event-v9.hide-pointer .ev-connector,.timeline-event-v9.hide-pointer .ev-arrow{display:none;}
        .timeline-scale.v9{position:absolute;left:26px;right:26px;bottom:0;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v9{position:absolute;left:12px;right:12px;bottom:8px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.88);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
        .log-line.v9{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v9:first-of-type{border-top:none;}
        .log-tag-left.v9{display:inline-flex;border:1px solid rgba(147,197,253,.30);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;white-space:nowrap;justify-self:start;}
        .log-tag-left.v9.bold{font-weight:950;color:white;background:rgba(96,165,250,.31);border-color:rgba(191,219,254,.48);}
        .log-line-text.v9{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;min-width:0;}
        .log-line-text.v9.bold{font-weight:950;color:#fff;}
        .log-line-tags-stack.v9{display:flex;gap:5px;flex-wrap:wrap;}
      `;
      document.head.appendChild(style);

      function esc9(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp9(n,a,b){return Math.max(a,Math.min(b,n));}
      function d9(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt9(value,unit){const d=d9(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime9(mod,pct){const start=d9(mod.start),end=d9(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp9(pct,0,1)).toISOString();}
      function rgba9(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey9(ev){return d9(ev.time).toISOString().slice(0,16);}
      function normalizeLog9(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{
          if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:String(l.text||'').trim(),tags:(l.tags||[]).map(t=>String(t).trim()).filter(Boolean)})).filter(l=>l.text||l.tags.length)};
          const tags=(e.tags||[]).map(t=>String(t).trim()).filter(Boolean);const lines=String(e.text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(text=>({text,tags}));
          return {lines,tags};
        }).filter(e=>e.lines&&e.lines.length);
      }
      function enabled9(mod){normalizeLog9(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function bold9(mod){normalizeLog9(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function match9(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function formatLogLine9(line,bolds){
        const tags=(line.tags||[]).filter(Boolean);const isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));
        const tagHTML=tags.length?`<span class="log-line-tags-stack v9">${tags.map(t=>`<span class="log-tag-left v9 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc9(t)}</span>`).join('')}</span>`:`<span></span>`;
        return `<div class="log-line v9">${tagHTML}<span class="log-line-text v9 ${isBold?'bold':''}">${esc9(line.text||'')}</span></div>`;
      }
      function logHTML9(mod){
        normalizeLog9(mod);const terms=enabled9(mod),bolds=bold9(mod);
        const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>match9(l,terms))})).filter(e=>e.lines.length);
        return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine9(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;
      }

      timelineHTML=function(mod){
        const start=d9(mod.start),end=d9(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp9(((d9(v).getTime()-min)/(max-min))*100,0,100);const unit=mod.timeUnit||'hour';const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const lineBottom=34;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100;const t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v9" style="left:${pct}%"></div><div class="timeline-tick-label v9" style="left:${pct}%">${esc9(fmt9(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v9" style="left:${left}%;width:${w}%;background:${rgba9(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc9(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey9(ev);const level=used[key]||0;used[key]=level+1;const bottom=74+(level*58);const connector=Math.max(28,bottom-lineBottom-58);const hide=level>0?' hide-pointer':'';return `<div class="timeline-event-v9${hide}" data-event-index="${i}" style="left:${pos(ev.time)}%;bottom:${bottom}px;--connector-height:${connector}px;color:${esc9(ev.color||'#f8fafc')}" title="${esc9((ev.name||'')+' '+fmt9(ev.time,'hour'))}"><div class="ev-time">${esc9(fmt9(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc9(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v9"><div class="timeline-track v9 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v9"></div>${periods}${ticks}${events}</div><div class="timeline-scale v9"><span>${esc9(fmt9(mod.start,unit))}</span><span>${esc9(fmt9(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v9"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };

      const prevContent9=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML9(mod);return prevContent9(mod);};
      const prevNormalize9=normalizeMod;normalizeMod=function(mod){prevNormalize9(mod);if(mod.type==='log')normalizeLog9(mod);};
      const prevWire9=wireModule;wireModule=function(el,mod){prevWire9(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime9(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v9 render failed',e);}
    })();
