(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clean=s=>String(s||'').trim().replace(/[ \t]+/g,' ');
  const labels=['Received DTG','Recieved DTG','Receiced DTG','Title','Summary','From','To','DTG','Message','Text','Event','Category','Severity','Priority','Status'];
  const canonical=t=>{const x=clean(t).toLowerCase(); if(x==='recieved dtg'||x==='receiced dtg')return 'Received DTG'; const hit=labels.find(l=>l.toLowerCase()===x); return hit||clean(t);};
  const labelStarts=labels.slice().sort((a,b)=>b.length-a.length);
  function parseLine29(raw){
    const line=clean(raw); if(!line)return null;
    for(const lab of labelStarts){
      const compact=lab.replace(/\s+/g,'');
      const re=new RegExp('^'+lab.replace(/\s+/g,'\\s+')+'(?:\\s*[:\\-]\\s*|\\s+|)(.*)$','i');
      const m=line.match(re);
      if(m){
        const rest=clean(m[1]||'');
        // Avoid treating a bare label with no text as a normal content line.
        return {tag:canonical(lab),text:rest};
      }
      if(line.toLowerCase().startsWith(compact.toLowerCase()) && line.length>compact.length){
        return {tag:canonical(lab),text:clean(line.slice(compact.length))};
      }
    }
    return {tag:'Tekst',text:line};
  }
  function isSep29(line){const s=String(line||'').trim();return /^[_\-=–—*]{6,}$/.test(s)||/^[^A-Za-zÆØÅæøå0-9]{5,}$/.test(s);}
  function parseTextLogs29(text,fileName){
    const lines=String(text||'').replace(/\r/g,'').split('\n');
    const entries=[]; let cur={lines:[],fileName:fileName||''};
    const flush=()=>{cur.lines=cur.lines.filter(l=>clean(l.text)); if(cur.lines.length){cur.tags=[...new Set(cur.lines.map(l=>l.tag).filter(Boolean))]; cur.text=cur.lines.map(l=>`${l.tag}: ${l.text}`).join('\n'); entries.push(cur);} cur={lines:[],fileName:fileName||''};};
    let blank=0;
    for(const raw of lines){
      const line=String(raw||'').trim();
      if(!line){blank++; if(blank>=3&&cur.lines.length)flush(); continue;}
      blank=0;
      if(isSep29(line)){if(cur.lines.length)flush(); continue;}
      const parsed=parseLine29(line); if(!parsed)continue;
      if(parsed.tag==='Title' && cur.lines.some(l=>l.tag==='Title'||l.tag==='Received DTG'))flush();
      if(parsed.tag==='Tekst' && cur.lines.length){
        const prev=cur.lines[cur.lines.length-1]; prev.text=clean(prev.text+' '+parsed.text);
      }else if(parsed.text){
        cur.lines.push(parsed);
      }
    }
    flush(); return entries;
  }
  function normalize29(mod){
    if(!Array.isArray(mod.entries))mod.entries=[];
    mod.entries=mod.entries.map(e=>{
      let lines=Array.isArray(e.lines)?e.lines:String(e.text||'').split('\n').map(parseLine29).filter(Boolean);
      lines=lines.map(l=>({tag:canonical(l.tag||'Tekst'),text:clean(l.text||'')})).filter(l=>l.text);
      return {...e,lines,tags:[...new Set(lines.map(l=>l.tag))],text:lines.map(l=>`${l.tag}: ${l.text}`).join('\n')};
    });
    const old=Array.isArray(mod.filters)?mod.filters:[];
    const terms=[...new Set(mod.entries.flatMap(e=>(e.lines||[]).map(l=>l.tag)).filter(Boolean))];
    mod.filters=terms.map(term=>{const found=old.find(f=>String(f.term).toLowerCase()===String(term).toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  function active29(mod){normalize29(mod);return mod.filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase());}
  function bold29(mod){normalize29(mod);return mod.filters.filter(f=>f.bold).map(f=>String(f.term).toLowerCase());}
  function visibleLines29(entry,active){const lines=Array.isArray(entry.lines)?entry.lines:[]; if(!active.length)return lines.filter(l=>clean(l.text)); return lines.filter(l=>active.includes(String(l.tag).toLowerCase())&&clean(l.text));}
  function logHTML29(mod){normalize29(mod); const a=active29(mod),b=bold29(mod); const blocks=(mod.entries||[]).map(e=>visibleLines29(e,a)).filter(x=>x.length);
    return `<div class="content log-content v29"><div class="log-list v29">${blocks.length?blocks.map(lines=>`<div class="log-entry v29">${lines.map(l=>{const isB=b.includes(String(l.tag).toLowerCase());return `<div class="log-line v29"><span class="log-line-tag v29 ${isB?'bold':''}">${esc(l.tag||'Tekst')}</span><span class="log-line-text v29 ${isB?'bold':''}">${esc(l.text||'')}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn en .txt-logg i adminmenyen.</div>`}</div></div>`;
  }
  async function loadText29(file,mod){try{const text=await file.text();mod.entries=parseTextLogs29(text,file.name);mod.fileName=file.name;normalize29(mod);save();renderAll();}catch(err){alert('Klarte ikke å lese tekstfilen: '+(err?.message||err));}}
  function timelines29(){try{const v=activeView();return v&&Array.isArray(v.modules)?v.modules.filter(m=>m.type==='timeline'):[];}catch(e){return [];}}
  function modLabel29(m){return m.name||m.title||((window.moduleDefs&&moduleDefs[m.type]?.label)||m.type||'Modul');}
  function parseReceived29(value){const raw=clean(value);const m=raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if(!m)return null;let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));return Number.isFinite(d.getTime())?d.toISOString():null;}
  function field29(e,tag){const l=(e.lines||[]).find(x=>String(x.tag).toLowerCase()===tag.toLowerCase());return l?l.text:'';}
  function events29(mod){normalize29(mod); const out=[];(mod.entries||[]).forEach((e,i)=>{const title=field29(e,'Title')||('Logg '+(i+1));const dtg=field29(e,'Received DTG');const iso=parseReceived29(dtg);if(iso)out.push({name:title,time:iso,color:'#f8fafc',source:'log-text',logIndex:i,dtg});});return out;}
  function addToTimeline29(logMod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=events29(logMod);const existing=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let added=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(existing.has(k))return;tl.events.push(ev);existing.add(k);added++;});if(evs.length){const times=evs.map(e=>new Date(e.time).getTime()).filter(Number.isFinite);if(times.length){const min=Math.min(...times),max=Math.max(...times);const cs=new Date(tl.start||min).getTime(),ce=new Date(tl.end||max).getTime();if(!Number.isFinite(cs)||min<cs)tl.start=new Date(min-15*60*1000).toISOString();if(!Number.isFinite(ce)||max>ce)tl.end=new Date(max+15*60*1000).toISOString();}}return added;}
  const prevContent=contentHTML; contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML29(mod);return prevContent(mod);};
  const prevSettings=settingsSpecific; settingsSpecific=function(mod){if(!mod||mod.type!=='log')return prevSettings(mod); normalize29(mod); const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v29" data-log-filter-v29="${i}"><strong>${esc(f.term)}</strong><label><input class="log-filter-enabled-v29" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v29" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join(''); const tls=timelines29();const chosen=mod.logTimelineTargetId||(tls[0]&&tls[0].id)||'';const opts=tls.map(t=>`<option value="${esc(t.id)}" ${t.id===chosen?'selected':''}>${esc(modLabel29(t))}</option>`).join(''); const count=events29(mod).length; return `<div class="log-admin-grid v29"><input id="logTextFileAdminV29" class="log-admin-file v29" type="file" accept=".txt,text/plain"><button id="logPickTextAdminV29" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v29">Støtter linjer som <strong>Title hallo</strong>, <strong>Received DTG 04.06.2026 06:04:18</strong>, <strong>Summary dette er tekst</strong> og <strong>From meg</strong>. Lange streker/underscore separerer logger.</p><div class="field"><label>Lim inn loggtekst manuelt</label><textarea id="logPasteTextV29" class="log-admin-textarea v29" placeholder="Title hallo\nReceived DTG 04.06.2026 06:04:18\nSummary dette er tekst\nFrom meg"></textarea></div><button id="logLoadPastedV29" class="tool-btn" type="button">Last inn limt tekst</button><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><div class="log-to-timeline-v29"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV29">${opts||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v29">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV29" class="tool-btn primary" type="button" ${tls.length?'':'disabled'}>Plasser logghendelser på tidslinjen</button></div><button id="logClearV29" class="tool-btn danger" type="button">Tøm logg</button></div>`; };
  const prevRender=renderSelectedSettings; renderSelectedSettings=function(){prevRender(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return; const file=document.getElementById('logTextFileAdminV29'); document.getElementById('logPickTextAdminV29')?.addEventListener('click',()=>file?.click()); file?.addEventListener('change',()=>{if(file.files?.[0])loadText29(file.files[0],mod);}); document.getElementById('logLoadPastedV29')?.addEventListener('click',()=>{const txt=document.getElementById('logPasteTextV29')?.value||'';mod.entries=parseTextLogs29(txt,'limt tekst');mod.fileName='limt tekst';normalize29(mod);save();renderAll();}); document.querySelectorAll('[data-log-filter-v29]').forEach(row=>{const i=+row.dataset.logFilterV29;row.querySelector('.log-filter-enabled-v29')?.addEventListener('change',e=>{normalize29(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v29')?.addEventListener('change',e=>{normalize29(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});}); document.getElementById('logTimelineTargetV29')?.addEventListener('change',e=>{mod.logTimelineTargetId=e.target.value;save();renderSelectedSettings();}); document.getElementById('logToTimelineV29')?.addEventListener('click',()=>{const tls=timelines29();const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.getElementById('logTimelineTargetV29')?.value))||tls[0];const added=addToTimeline29(mod,target);save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?'':'r'} på tidslinjen.`:'Fant ingen nye logghendelser. Sjekk at loggen har Title og Received DTG.'),0);}); document.getElementById('logClearV29')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();}); };
  const prevNorm=normalizeMod; normalizeMod=function(mod){prevNorm(mod); if(mod&&mod.type==='log')normalize29(mod);};
  try{renderAll();}catch(e){console.error('log text v29 patch failed',e);}
})();
