(function(){
  function esc25(s){return String(s??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function clean25(s){return String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
  function activeViewSafe25(){try{return typeof activeView==='function'?activeView():null;}catch(e){return null;}}
  function modName25(m){try{return m.name||((typeof moduleDefs==='object'&&moduleDefs[m.type])?moduleDefs[m.type].label:m.type)||m.id;}catch(e){return m.id||'Tidslinje';}}
  function logLines25(entry){
    if(!entry)return [];
    if(Array.isArray(entry.lines))return entry.lines.map(function(l){return {text:clean25(l.text||''),tags:(l.tags||[]).map(clean25).filter(Boolean)};}).filter(function(l){return l.text||l.tags.length;});
    const tags=(entry.tags||[]).map(clean25).filter(Boolean);
    return String(entry.text||'').split(/\n+/).map(clean25).filter(Boolean).map(function(text){return {text:text,tags:tags};});
  }
  function lineHasTag25(line,tag){const want=String(tag).toLowerCase();return (line.tags||[]).some(function(t){return String(t).toLowerCase()===want;});}
  function getTaggedText25(lines,tag){
    const exact=lines.find(function(l){return lineHasTag25(l,tag)&&clean25(l.text);});
    if(exact)return clean25(exact.text);
    const re=new RegExp('^'+tag+'\\s*[:：-]?\\s*(.+)$','i');
    for(const l of lines){const m=clean25(l.text).match(re);if(m&&m[1])return clean25(m[1]);}
    return '';
  }
  function findTitle25(lines){
    const t=getTaggedText25(lines,'Title');
    if(t)return t;
    const first=lines.find(function(l){return !lineHasTag25(l,'DTG')&&!lineHasTag25(l,'Received DTG')&&!/^rec(?:eived|ieved|eiced)\s+dtg\b/i.test(clean25(l.text))&&clean25(l.text);});
    return first?clean25(first.text).slice(0,80):'Logghendelse';
  }
  function findReceivedDTG25(lines){
    const joined=lines.map(function(l){return clean25(l.text);}).join(' ');
    // Matches common OCR/parser variants: Received DTG, Recieved DTG and Receiced DTG.
    const re=/\bRec(?:eived|ieved|eiced)\s+DTG\s*[:：-]?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/i;
    const m=joined.match(re);
    return m?clean25(m[1]):'';
  }
  function findDTG25(lines){
    // Prefer the explicit log line exactly as requested, e.g. "Received DTG 09.05.2026 17:02:18".
    const received=findReceivedDTG25(lines);
    if(received)return received;
    const dtg=getTaggedText25(lines,'DTG');
    if(dtg)return dtg;
    const joined=lines.map(function(l){return clean25(l.text);}).join(' ');
    const m=joined.match(/\b\d{6}Z\b|\b\d{2}[A-ZÆØÅ]{3}\d{2,4}\s+\d{2}:?\d{2}Z?\b|\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\b|\b\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?\s+\d{1,2}:\d{2}(?::\d{2})?\b/i);
    return m?m[0]:'';
  }
  const monthMap25={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,MAI:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,OKT:9,NOV:10,DEC:11,DES:11};
  function parseDTG25(value,baseDate){
    const raw=clean25(value).toUpperCase();
    if(!raw)return null;
    const base=new Date(baseDate||Date.now());
    const baseYear=Number.isFinite(base.getTime())?base.getFullYear():(new Date()).getFullYear();
    const baseMonth=Number.isFinite(base.getTime())?base.getMonth():(new Date()).getMonth();
    let m=raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0),0).toISOString();
    m=raw.match(/^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(m){let y=m[3]?Number(m[3]):baseYear;if(y<100)y+=2000;return new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0),0).toISOString();}
    m=raw.match(/^(\d{2})(\d{2})(\d{2})Z(?:\s*([A-ZÆØÅ]{3})\s*(\d{2,4})?)?/);
    if(m){const day=Number(m[1]),hh=Number(m[2]),mm=Number(m[3]);let month=baseMonth,year=baseYear;if(m[4]&&monthMap25[m[4]]!==undefined)month=monthMap25[m[4]];if(m[5]){year=Number(m[5]);if(year<100)year+=2000;}return new Date(Date.UTC(year,month,day,hh,mm,0,0)).toISOString();}
    m=raw.match(/^(\d{2})([A-ZÆØÅ]{3})(\d{2,4})\s+(\d{2}):?(\d{2})Z?/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;const mon=monthMap25[m[2]]??baseMonth;return new Date(Date.UTC(y,mon,Number(m[1]),Number(m[4]),Number(m[5]),0,0)).toISOString();}
    const d=new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null;
  }
  function extractLogTimelineEvents25(logMod,timelineMod){
    const base=timelineMod?.start||Date.now();
    const out=[];
    (logMod.entries||[]).forEach(function(entry,idx){
      const lines=logLines25(entry);
      const title=findTitle25(lines);
      const dtg=findDTG25(lines);
      const time=parseDTG25(dtg,base);
      if(time)out.push({name:title||('Logg '+(idx+1)),time:time,color:'#f8fafc',source:'log',logIndex:idx,dtg:dtg});
    });
    return out;
  }
  function timelineModules25(){const v=activeViewSafe25();return v&&Array.isArray(v.modules)?v.modules.filter(function(m){return m.type==='timeline';}):[];}
  function selectedLogMod25(){try{const m=typeof selected==='function'?selected():null;return m&&m.type==='log'?m:null;}catch(e){return null;}}
  function appendLogTimelineControls25(html,mod){
    const timelines=timelineModules25();
    const chosen=mod.logTimelineTargetId||(timelines[0]&&timelines[0].id)||'';
    const target=timelines.find(function(t){return t.id===chosen;})||timelines[0]||null;
    const count=target?extractLogTimelineEvents25(mod,target).length:0;
    const options=timelines.map(function(t){return `<option value="${esc25(t.id)}" ${t.id===chosen?'selected':''}>${esc25(modName25(t))}</option>`;}).join('');
    const block=`<div class="log-to-timeline-v25"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV25">${options||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v25">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV25" class="tool-btn primary" type="button" ${target?'':'disabled'}>Plasser logghendelser på tidslinjen</button><p class="hint-v25">Bruker <strong>Received DTG</strong>, <strong>Recieved DTG</strong> eller <strong>Receiced DTG</strong> som dato/klokkeslett, akkurat slik linjen står i loggen. <strong>Title</strong> brukes som hendelsestekst.</p></div>`;
    return html+block;
  }
  function addEventsToTimeline25(logMod,timelineMod){
    if(!timelineMod)return 0;
    if(!Array.isArray(timelineMod.events))timelineMod.events=[];
    const events=extractLogTimelineEvents25(logMod,timelineMod);
    const existing=new Set(timelineMod.events.map(function(e){return [e.source,e.logIndex,new Date(e.time||0).toISOString(),e.name].join('|');}));
    let added=0;
    events.forEach(function(ev){
      const key=[ev.source,ev.logIndex,new Date(ev.time).toISOString(),ev.name].join('|');
      if(existing.has(key))return;
      timelineMod.events.push(ev);existing.add(key);added++;
    });
    if(events.length){
      const times=events.map(function(e){return new Date(e.time).getTime();}).filter(Number.isFinite);
      if(times.length){
        const min=Math.min.apply(null,times),max=Math.max.apply(null,times);
        const curStart=new Date(timelineMod.start||min).getTime(),curEnd=new Date(timelineMod.end||max).getTime();
        if(!Number.isFinite(curStart)||min<curStart)timelineMod.start=new Date(min-15*60*1000).toISOString();
        if(!Number.isFinite(curEnd)||max>curEnd)timelineMod.end=new Date(max+15*60*1000).toISOString();
      }
    }
    return added;
  }
  const prevSettings25=settingsSpecific;
  settingsSpecific=function(mod){
    const html=prevSettings25(mod);
    if(mod&&mod.type==='log')return appendLogTimelineControls25(html,mod);
    return html;
  };
  const prevRender25=renderSelectedSettings;
  renderSelectedSettings=function(){
    prevRender25();
    const mod=selectedLogMod25();
    if(!mod)return;
    const sel=document.getElementById('logTimelineTargetV25');
    const btn=document.getElementById('logToTimelineV25');
    if(sel){sel.addEventListener('change',function(){mod.logTimelineTargetId=sel.value;save();renderSelectedSettings();});}
    if(btn){btn.addEventListener('click',function(){
      const timelines=timelineModules25();
      const target=timelines.find(function(t){return t.id===(mod.logTimelineTargetId||sel?.value);})||timelines[0];
      const added=addEventsToTimeline25(mod,target);
      save();renderAll();
      setTimeout(function(){alert(added?('La til '+added+' logghendelse'+(added===1?'':'r')+' på tidslinjen.'):('Fant ingen nye logghendelser å legge til. Sjekk at loggene har både Title og Received DTG.'));},0);
    });}
  };
  try{renderAll();}catch(e){console.error('v25 log-to-timeline failed',e);}
})();
