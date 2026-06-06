(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dms=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:Date.now();};
  function norm(mod){
    if(!mod.start)mod.start=new Date(Date.now()-60*60*1000).toISOString();
    if(!mod.end)mod.end=new Date(Date.now()+3*60*60*1000).toISOString();
    if(!Array.isArray(mod.periods))mod.periods=[];
    if(!Array.isArray(mod.events))mod.events=[];
    // Support old and new property names, but use timelineUnit/timelineTicks as source of truth from now on.
    if(!mod.timelineUnit)mod.timelineUnit=mod.timeUnit||'hour';
    if(mod.timelineTicks==null)mod.timelineTicks=(mod.tickCount!=null?Number(mod.tickCount):6);
    mod.timeUnit=mod.timelineUnit;
    mod.tickCount=mod.timelineTicks;
  }
  function fmt(value,unit,withDate){
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
    if(unit==='date')return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'});
    if(unit==='minute')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
    if(withDate)return d.toLocaleString('no-NO',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }
  function rgba(hex,opacity){
    try{hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;}catch(e){return `rgba(96,165,250,${opacity})`;}
  }
  function midnightMarkers(min,max,pos){
    const markers=[];
    const first=new Date(min);first.setHours(24,0,0,0);
    for(let t=first.getTime();t<max;t+=24*60*60*1000){
      const d=new Date(t);
      markers.push(`<div class="timeline-nextday-v27" style="left:${pos(t)}%"><span>Neste dag ${esc(d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'}))}</span></div>`);
    }
    return markers.join('');
  }
  window.timelineHTML=function(mod){
    norm(mod);
    const min=dms(mod.start),max=Math.max(dms(mod.end),min+60000),unit=mod.timelineUnit||'hour';
    const pos=v=>clamp(((dms(v)-min)/(max-min))*100,0,100);
    const placing=(window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id)||(window.__timelinePlaceTarget&&window.__timelinePlaceTarget.modId===mod.id);
    const between=clamp(Number(mod.timelineTicks??6)||0,0,50);
    const ticks=Array.from({length:between+2},(_,i)=>{
      const pct=(i/(between+1))*100;
      const t=new Date(min+(max-min)*(i/(between+1)));
      const showDate=(i>0&&i<between+1&&new Date(min).getDate()!==t.getDate());
      return `<div class="timeline-tick v14 v27" style="left:${pct}%"></div><div class="timeline-tick-label v14 v27" style="left:${pct}%">${esc(fmt(t,unit,showDate))}</div>`;
    }).join('');
    const nextDays=midnightMarkers(min,max,pos);
    const periods=(mod.periods||[]).map(p=>{
      const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);
      return `<div class="timeline-period-v14 v27" style="left:${left}%;width:${w}%;background:${rgba(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc(p.name||'')}</span></div>`;
    }).join('');
    const buckets=new Map();
    (mod.events||[]).forEach(ev=>{const key=String(Math.round(dms(ev.time||ev.start||mod.start)/60000));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ev);});
    const groups=[...buckets.values()].map(events=>({events,time:new Date(dms(events[0].time||events[0].start||mod.start)),color:events[0].color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
    const rendered=groups.map(g=>{
      const names=g.events.map(ev=>`<div class="ev-name">${esc(ev.name||'Hendelse')}</div>`).join('');
      const extra=Math.max(0,g.events.length-1);
      const connector=46+(extra*13);
      return `<div class="timeline-event-group-v19 v27" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc(g.color||'#f8fafc')}" title="${esc(fmt(g.time,'hour',true))}"><div class="ev-card"><div class="ev-time">${esc(fmt(g.time,unit==='date'?'date':'hour',unit!=='date'))}</div><div class="ev-names">${names}</div></div><div class="ev-connector"></div></div>`;
    }).join('');
    return `<div class="content timeline-content-v14 timeline-content-v27"><div class="timeline-wrap v14 v27"><div class="timeline-stage v14 v27 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v14 v27"></div>${periods}${nextDays}${ticks}${rendered}</div><div class="timeline-scale v14 v27"><span>${esc(fmt(mod.start,unit,true))}</span><span>${esc(fmt(mod.end,unit,true))}</span></div>${placing?'<div class="timeline-place-help v14 v27"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
  };
  function pctToTime(mod,pct){const min=dms(mod.start),max=Math.max(dms(mod.end),min+60000);return new Date(min+(max-min)*clamp(pct,0,1)).toISOString();}
  const prevWire=wireModule;
  wireModule=function(el,mod){
    prevWire(el,mod);
    if(!mod||mod.type!=='timeline')return;
    const stage=el.querySelector('.timeline-stage.v27,[data-timeline-track]');
    if(!stage)return;
    const place=e=>{
      const placing=window.__timelinePlace;
      const placing2=window.__timelinePlaceTarget;
      const active=(placing&&placing.moduleId===mod.id)||(placing2&&placing2.modId===mod.id);
      if(!active)return;
      e.preventDefault();e.stopPropagation();
      const rect=stage.getBoundingClientRect();
      const pct=(e.clientX-rect.left)/Math.max(1,rect.width);
      const time=pctToTime(mod,pct);
      if(!Array.isArray(mod.events))mod.events=[];
      if(placing&&placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;
      else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});
      mod.timelineOpenSection='events';
      window.__timelinePlace=null;window.__timelinePlaceTarget=null;
      save();renderAll();
    };
    stage.addEventListener('pointerdown',place,true);
    stage.addEventListener('click',place,true);
  };
  function timelineAdminV27(mod){
    norm(mod);
    const unit=mod.timelineUnit||'hour';
    const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card v27" data-tl-period="${i}"><div class="grid-mini"><div class="field"><label>Start</label><input class="tlp-start-v27" type="datetime-local" value="${toDateTimeLocal(p.start)}"></div><div class="field"><label>Slutt</label><input class="tlp-end-v27" type="datetime-local" value="${toDateTimeLocal(p.end)}"></div></div><div class="field"><label>Navn</label><input class="tlp-name-v27" value="${esc(p.name||'Periode')}"></div><div class="grid-mini"><div class="field"><label>Farge</label><input class="tlp-color-v27" type="color" value="${esc(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tlp-opacity-v27" type="range" min="0.1" max="1" step="0.05" value="${p.opacity??0.55}"></div></div><button class="tool-btn danger tlp-remove-v27" type="button">Slett periode</button></div>`).join('');
    const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card v27" data-tl-event="${i}"><div class="field"><label>Tekst</label><input class="tle-name-v27" value="${esc(ev.name||'Hendelse')}"></div><div class="grid-mini"><div class="field"><label>Tid</label><input class="tle-time-v27" type="datetime-local" value="${toDateTimeLocal(ev.time||ev.start||mod.start)}"></div><div class="field"><label>Farge</label><input class="tle-color-v27" type="color" value="${esc(ev.color||'#f8fafc')}"></div></div><div class="row"><button class="tool-btn primary tle-place-v27" type="button">⏱ Plasser på linjen</button><button class="tool-btn danger tle-remove-v27" type="button">Slett</button></div></div>`).join('');
    return `<div class="timeline-admin-compact v27"><div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStartV27" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEndV27" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div></div><div class="timeline-small-grid"><div class="field"><label>Tidsformat</label><select id="timelineUnitV27"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker mellom start/slutt</label><input id="timelineTicksV27" type="number" min="0" max="50" value="${Number(mod.timelineTicks??6)}"></div></div><p class="small">Neste dag vises automatisk på linjen når perioden går over midnatt.</p><details class="timeline-details" ${mod.timelineOpenSection==='periods'?'open':''}><summary>Perioder (${mod.periods.length})</summary><div class="timeline-detail-body"><button id="timelineAddPeriodV27" class="tool-btn" type="button">+ Legg til periode</button>${periods||'<p class="small">Ingen perioder.</p>'}</div></details><details class="timeline-details" ${mod.timelineOpenSection==='events'?'open':''}><summary>Hendelser (${mod.events.length})</summary><div class="timeline-detail-body"><button id="timelineAddEventV27" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button>${events||'<p class="small">Ingen hendelser.</p>'}</div></details></div>`;
  }
  const prevSettings=settingsSpecific;
  settingsSpecific=function(mod){if(mod&&mod.type==='timeline')return timelineAdminV27(mod);return prevSettings(mod);};
  function readAdmin(mod){
    const s=document.getElementById('timelineStartV27'),e=document.getElementById('timelineEndV27'),u=document.getElementById('timelineUnitV27'),t=document.getElementById('timelineTicksV27');
    if(s)mod.start=fromDateTimeLocal(s.value);if(e)mod.end=fromDateTimeLocal(e.value);if(u){mod.timelineUnit=u.value;mod.timeUnit=u.value;}if(t){mod.timelineTicks=clamp(Number(t.value)||0,0,50);mod.tickCount=mod.timelineTicks;}
    document.querySelectorAll('[data-tl-period]').forEach(row=>{const i=+row.dataset.tlPeriod,p=mod.periods[i];if(!p)return;p.start=fromDateTimeLocal(row.querySelector('.tlp-start-v27')?.value);p.end=fromDateTimeLocal(row.querySelector('.tlp-end-v27')?.value);p.name=row.querySelector('.tlp-name-v27')?.value||'';p.color=row.querySelector('.tlp-color-v27')?.value||'#60a5fa';p.opacity=Number(row.querySelector('.tlp-opacity-v27')?.value||0.55);});
    document.querySelectorAll('[data-tl-event]').forEach(row=>{const i=+row.dataset.tlEvent,ev=mod.events[i];if(!ev)return;ev.name=row.querySelector('.tle-name-v27')?.value||'Hendelse';ev.time=fromDateTimeLocal(row.querySelector('.tle-time-v27')?.value);ev.color=row.querySelector('.tle-color-v27')?.value||'#f8fafc';});
  }
  const prevRender=renderSelectedSettings;
  renderSelectedSettings=function(){
    prevRender();
    const mod=selected&&selected();if(!mod||mod.type!=='timeline')return;
    const commit=()=>{readAdmin(mod);save();renderBoard();renderSelectedSettings();};
    ['timelineStartV27','timelineEndV27','timelineUnitV27','timelineTicksV27'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',commit);});
    document.querySelectorAll('[data-tl-period] input,[data-tl-event] input').forEach(el=>el.addEventListener('change',commit));
    document.getElementById('timelineAddPeriodV27')?.addEventListener('click',()=>{readAdmin(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55});save();renderAll();});
    document.getElementById('timelineAddEventV27')?.addEventListener('click',()=>{readAdmin(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};save();renderAll();});
    document.querySelectorAll('.tlp-remove-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-period]');readAdmin(mod);mod.periods.splice(+row.dataset.tlPeriod,1);save();renderAll();}));
    document.querySelectorAll('.tle-remove-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-event]');readAdmin(mod);mod.events.splice(+row.dataset.tlEvent,1);save();renderAll();}));
    document.querySelectorAll('.tle-place-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-event]');readAdmin(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+row.dataset.tlEvent};save();renderAll();}));
  };
  const prevNorm=normalizeMod;
  normalizeMod=function(mod){prevNorm(mod);if(mod&&mod.type==='timeline')norm(mod);};
  try{renderAll();}catch(e){console.error('timeline v27 patch failed',e);}
})();
