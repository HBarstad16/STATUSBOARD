(function(){
      const esc14=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
      const ms14=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:Date.now();};
      const rgba14=(hex,opacity)=>{try{hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;}catch(e){return `rgba(96,165,250,${opacity})`;}};
      const fmt14=(value,unit)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';if(unit==='date')return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'});if(unit==='minute')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});};
      function normalize14(mod){
        if(!mod.start)mod.start=new Date(Date.now()-60*60*1000).toISOString();
        if(!mod.end)mod.end=new Date(Date.now()+3*60*60*1000).toISOString();
        if(!Array.isArray(mod.periods))mod.periods=[];
        if(!Array.isArray(mod.events))mod.events=[];
        if(!mod.timelineUnit)mod.timelineUnit='hour';
        if(mod.timelineTicks==null)mod.timelineTicks=6;
      }
      window.timelineHTML=function(mod){
        normalize14(mod);
        const min=ms14(mod.start),max=Math.max(ms14(mod.end),min+60000),unit=mod.timelineUnit||'hour';
        const pos=v=>Math.max(0,Math.min(100,((ms14(v)-min)/(max-min))*100));
        const placing=window.__timelinePlaceTarget&&window.__timelinePlaceTarget.modId===mod.id;
        const between=Math.max(0,Math.min(24,Number(mod.timelineTicks??6)));
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v14" style="left:${pct}%"></div><div class="timeline-tick-label v14" style="left:${pct}%">${esc14(fmt14(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v14" style="left:${left}%;width:${w}%;background:${rgba14(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc14(p.name||'')}</span></div>`}).join('');
        const buckets=new Map();
        (mod.events||[]).forEach(ev=>{const key=String(Math.round(ms14(ev.time||ev.start||mod.start)/60000));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ev);});
        const groups=[...buckets.values()].map(events=>({events,time:new Date(ms14(events[0].time||events[0].start||mod.start)),color:events[0].color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc14(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=46+(extra*13);return `<div class="timeline-event-group-v14" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc14(g.color||'#f8fafc')}" title="${esc14(fmt14(g.time,'hour'))}"><div class="ev-time">${esc14(fmt14(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v14"><div class="timeline-wrap v14"><div class="timeline-stage v14 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v14"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v14"><span>${esc14(fmt14(mod.start,unit))}</span><span>${esc14(fmt14(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v14"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      try{renderAll();}catch(e){console.error('v14 timeline render failed',e);}
    })();
