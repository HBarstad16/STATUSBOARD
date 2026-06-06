(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const normTerm=s=>String(s||'').trim().replace(/\s+/g,' ');
  const knownLabels=['Received DTG','Recieved DTG','Receiced DTG','Title','Summary','From','To','DTG','Message','Text','Event','Category','Severity','Priority','Status'];
  const labelPattern='('+knownLabels.map(x=>x.replace(/\s+/g,'\\s+')).join('|')+')';
  const labelRe=new RegExp('^\\s*'+labelPattern+'\\s*[:\\-]?\\s*(.*)$','i');
  function canonicalTag(tag){
    const t=normTerm(tag).toLowerCase();
    if(t==='recieved dtg'||t==='receiced dtg')return 'Received DTG';
    const hit=knownLabels.find(x=>x.toLowerCase()===t);return hit||normTerm(tag);
  }
  function parseTaggedLine(raw){
    const line=String(raw||'').trim();if(!line)return null;
    let m=line.match(labelRe);
    if(m)return {tag:canonicalTag(m[1]),text:normTerm(m[2]||'')};
    // Also support tight tekstlogg/text exports such as Titlehallo or Summarydette er tekst.
    for(const lab of knownLabels){
      const compact=lab.replace(/\s+/g,'');
      if(line.toLowerCase().startsWith(compact.toLowerCase()) && line.length>compact.length){
        return {tag:canonicalTag(lab),text:normTerm(line.slice(compact.length))};
      }
    }
    return {tag:'Tekst',text:normTerm(line)};
  }
  function shouldSplitLog(line,current){
    const raw=String(line||'').trim();
    if(!raw)return false;
    if(/^[-–—_=*]{5,}$/.test(raw))return true;
    if(/^[^A-Za-zÆØÅæøå0-9]{4,}$/.test(raw))return true;
    const parsed=parseTaggedLine(raw);
    if(parsed && parsed.tag==='Title' && current.lines.some(x=>x.tag==='Title'||x.tag==='Received DTG'))return true;
    return false;
  }
  function parseTextLogs28(text,fileName){
    const rawLines=String(text||'').replace(/\r/g,'').split('\n');
    const entries=[];let cur={lines:[],fileName:fileName||''};
    const push=()=>{cur.lines=cur.lines.filter(l=>normTerm(l.text));if(cur.lines.length){cur.tags=[...new Set(cur.lines.map(l=>l.tag).filter(Boolean))];cur.text=cur.lines.map(l=>`${l.tag}: ${l.text}`).join('\n');entries.push(cur);}cur={lines:[],fileName:fileName||''};};
    let blankRun=0;
    for(const raw of rawLines){
      const line=String(raw||'').trim();
      if(!line){blankRun++; if(blankRun>=3 && cur.lines.length)push(); continue;}
      blankRun=0;
      if(shouldSplitLog(line,cur)){if(cur.lines.length)push(); if(/^[-–—_=*]{5,}$/.test(line)||/^[^A-Za-zÆØÅæøå0-9]{4,}$/.test(line))continue;}
      const parsed=parseTaggedLine(line); if(!parsed)continue;
      if(parsed.tag==='Tekst' && cur.lines.length){
        // Untagged continuation lines belong to the previous field unless the previous field is very long.
        const prev=cur.lines[cur.lines.length-1];
        prev.text=normTerm(prev.text+' '+parsed.text);
      }else{
        cur.lines.push(parsed);
      }
    }
    push();
    return entries;
  }
  function normalizeLog28(mod){
    if(!Array.isArray(mod.entries))mod.entries=[];
    mod.entries=mod.entries.map(e=>{
      if(Array.isArray(e.lines))return e;
      const lines=String(e.text||'').split('\n').map(parseTaggedLine).filter(Boolean);
      return {...e,lines,tags:[...new Set(lines.map(l=>l.tag))],text:lines.map(l=>`${l.tag}: ${l.text}`).join('\n')};
    });
    const terms=[...new Set(mod.entries.flatMap(e=>(e.lines||[]).map(l=>l.tag)).filter(Boolean))];
    const old=Array.isArray(mod.filters)?mod.filters:[];
    mod.filters=terms.map(term=>{const found=old.find(f=>String(f.term).toLowerCase()===String(term).toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  function activeTerms28(mod){normalizeLog28(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
  function boldTerms28(mod){normalizeLog28(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
  function entryVisibleLines28(entry,active){
    const lines=Array.isArray(entry.lines)?entry.lines:[];
    if(!active.length)return lines.filter(l=>normTerm(l.text));
    return lines.filter(l=>active.includes(String(l.tag||'').toLowerCase()) && normTerm(l.text));
  }
  function logHTML28(mod){
    normalizeLog28(mod);const active=activeTerms28(mod),bolds=boldTerms28(mod);
    const blocks=(mod.entries||[]).map(e=>entryVisibleLines28(e,active)).filter(lines=>lines.length);
    return `<div class="content log-content v28"><div class="log-list v28">${blocks.length?blocks.map(lines=>`<div class="log-entry v28">${lines.map(l=>{const isBold=bolds.includes(String(l.tag||'').toLowerCase());return `<div class="log-line v28"><span class="log-line-tag v28 ${isBold?'bold':''}">${esc(l.tag||'Tekst')}</span><span class="log-line-text v28 ${isBold?'bold':''}">${esc(l.text||'')}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp en .txt-fil i adminmenyen.</div>`}</div></div>`;
  }
  async function loadTextLog28(file,mod){
    try{const text=await file.text();mod.entries=parseTextLogs28(text,file.name);mod.fileName=file.name;normalizeLog28(mod);save();renderAll();}
    catch(err){alert('Klarte ikke å lese tekstfilen: '+(err?.message||err));}
  }
  function timelines28(){try{const v=typeof activeView==='function'?activeView():null;return v&&Array.isArray(v.modules)?v.modules.filter(m=>m.type==='timeline'):[];}catch(e){return [];}}
  function modLabel28(m){return m.name||m.title||((window.moduleDefs&&moduleDefs[m.type]?.label)||m.type||'Modul');}
  function parseReceived28(value){
    const raw=String(value||'').trim();
    let m=raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m)return null;let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0),0);return Number.isFinite(d.getTime())?d.toISOString():null;
  }
  function field28(entry,tag){const l=(entry.lines||[]).find(x=>String(x.tag).toLowerCase()===tag.toLowerCase());return l?l.text:'';}
  function timelineEventsFromLog28(logMod){
    normalizeLog28(logMod);const out=[];
    (logMod.entries||[]).forEach((entry,idx)=>{const title=field28(entry,'Title')||('Logg '+(idx+1));const dtg=field28(entry,'Received DTG');const iso=parseReceived28(dtg);if(iso)out.push({name:title,time:iso,color:'#f8fafc',source:'log-text',logIndex:idx,dtg});});
    return out;
  }
  function addLogToTimeline28(logMod,timelineMod){
    if(!timelineMod)return 0;if(!Array.isArray(timelineMod.events))timelineMod.events=[];
    const events=timelineEventsFromLog28(logMod);const existing=new Set(timelineMod.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let added=0;
    events.forEach(ev=>{const key=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(existing.has(key))return;timelineMod.events.push(ev);existing.add(key);added++;});
    if(events.length){const times=events.map(e=>new Date(e.time).getTime()).filter(Number.isFinite);if(times.length){const min=Math.min(...times),max=Math.max(...times);const curStart=new Date(timelineMod.start||min).getTime(),curEnd=new Date(timelineMod.end||max).getTime();if(!Number.isFinite(curStart)||min<curStart)timelineMod.start=new Date(min-15*60*1000).toISOString();if(!Number.isFinite(curEnd)||max>curEnd)timelineMod.end=new Date(max+15*60*1000).toISOString();}}
    return added;
  }
  const prevContent28=contentHTML;
  contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML28(mod);return prevContent28(mod);};
  const prevSettings28=settingsSpecific;
  settingsSpecific=function(mod){
    if(!mod||mod.type!=='log')return prevSettings28(mod);
    normalizeLog28(mod);
    const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v28" data-log-filter-v28="${i}"><strong>${esc(f.term)}</strong><label><input class="log-filter-enabled-v28" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v28" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');
    const tls=timelines28();const chosen=mod.logTimelineTargetId||(tls[0]&&tls[0].id)||'';const opts=tls.map(t=>`<option value="${esc(t.id)}" ${t.id===chosen?'selected':''}>${esc(modLabel28(t))}</option>`).join('');const count=timelineEventsFromLog28(mod).length;
    return `<div class="log-admin-grid v28"><input id="logTextFileAdminV28" class="log-admin-file v28" type="file" accept=".txt,text/plain"><button id="logPickTextAdminV28" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v28">Bruk en .txt-fil. Linjer som <strong>Title</strong>, <strong>Received DTG</strong>, <strong>Summary</strong> og <strong>From</strong> blir automatisk filter-tags. Ingen tekstlogg.js eller ekstra filer trengs.</p><div class="field"><label>Lim inn loggtekst manuelt</label><textarea id="logPasteTextV28" class="log-admin-textarea v28" placeholder="Title: ...\nReceived DTG 09.05.2026 17:02:18\nSummary: ..."></textarea></div><button id="logLoadPastedV28" class="tool-btn" type="button">Last inn limt tekst</button><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><div class="log-to-timeline-v28"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV28">${opts||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v28">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV28" class="tool-btn primary" type="button" ${tls.length?'':'disabled'}>Plasser logghendelser på tidslinjen</button></div><button id="logClearV28" class="tool-btn danger" type="button">Tøm logg</button></div>`;
  };
  const prevRender28=renderSelectedSettings;
  renderSelectedSettings=function(){
    prevRender28();let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return;
    const file=document.getElementById('logTextFileAdminV28');document.getElementById('logPickTextAdminV28')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])loadTextLog28(file.files[0],mod);});
    document.getElementById('logLoadPastedV28')?.addEventListener('click',()=>{const txt=document.getElementById('logPasteTextV28')?.value||'';mod.entries=parseTextLogs28(txt,'limt tekst');mod.fileName='limt tekst';normalizeLog28(mod);save();renderAll();});
    document.querySelectorAll('[data-log-filter-v28]').forEach(row=>{const i=+row.dataset.logFilterV28;row.querySelector('.log-filter-enabled-v28')?.addEventListener('change',e=>{normalizeLog28(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v28')?.addEventListener('change',e=>{normalizeLog28(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});
    document.getElementById('logTimelineTargetV28')?.addEventListener('change',e=>{mod.logTimelineTargetId=e.target.value;save();renderSelectedSettings();});
    document.getElementById('logToTimelineV28')?.addEventListener('click',()=>{const tls=timelines28();const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.getElementById('logTimelineTargetV28')?.value))||tls[0];const added=addLogToTimeline28(mod,target);save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?'':'r'} på tidslinjen.`:'Fant ingen nye logghendelser. Sjekk at loggen har Title og Received DTG.'),0);});
    document.getElementById('logClearV28')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});
  };
  const prevNormalize28=normalizeMod;
  normalizeMod=function(mod){prevNormalize28(mod);if(mod&&mod.type==='log')normalizeLog28(mod);};
  if(window.moduleDefs&&moduleDefs.log){moduleDefs.log.hint='TXT-logg med filter';moduleDefs.log.label='Log';}
  try{renderAll();}catch(e){console.error('log text v28 patch failed',e);}
})();
