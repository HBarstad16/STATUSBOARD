(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clean=s=>String(s||'').trim().replace(/[ \t]+/g,' ');
  const labels=['Received DTG','Recieved DTG','Receiced DTG','Title','Summary','From','To','DTG','Message','Text','Event','Category','Severity','Priority','Status'];
  const canonical=t=>{const x=clean(t).toLowerCase(); if(x==='recieved dtg'||x==='receiced dtg')return 'Received DTG'; const hit=labels.find(l=>l.toLowerCase()===x); return hit||clean(t)||'Tekst';};
  const ordered=labels.slice().sort((a,b)=>b.length-a.length);
  function parseLine30(raw, fallbackTag){
    let line=clean(raw); if(!line)return null;
    // Fix lines saved by older patches, e.g. "Tekst: Title hallo".
    const old=line.match(/^(Tekst|Text)\s*:\s*(.+)$/i); if(old)line=clean(old[2]);
    for(const lab of ordered){
      const labRe=lab.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
      const re=new RegExp('^'+labRe+'(?:\\s*[:\\-]\\s*|\\s+)(.+)$','i');
      const m=line.match(re); if(m)return {tag:canonical(lab),text:clean(m[1])};
      const compact=lab.replace(/\s+/g,'');
      if(line.toLowerCase().startsWith(compact.toLowerCase()) && line.length>compact.length){
        return {tag:canonical(lab),text:clean(line.slice(compact.length).replace(/^[:\-]\s*/,''))};
      }
    }
    if(fallbackTag && !/^tekst$/i.test(fallbackTag) && !/^text$/i.test(fallbackTag))return {tag:canonical(fallbackTag),text:line};
    return {tag:'Tekst',text:line};
  }
  function isSep30(line){const s=String(line||'').trim();return /^[_\-=–—*]{6,}$/.test(s)||/^[^A-Za-zÆØÅæøå0-9]{5,}$/.test(s);}
  function parseTextLogs30(text,fileName){
    const lines=String(text||'').replace(/\r/g,'').split('\n'); const entries=[]; let cur={lines:[],fileName:fileName||''};
    const flush=()=>{cur.lines=cur.lines.filter(l=>clean(l.text)); if(cur.lines.length){cur.tags=[...new Set(cur.lines.map(l=>l.tag).filter(Boolean))]; cur.text=cur.lines.map(l=>`${l.tag}: ${l.text}`).join('\n'); entries.push(cur);} cur={lines:[],fileName:fileName||''};};
    let blank=0; for(const raw of lines){const line=String(raw||'').trim(); if(!line){blank++; if(blank>=3&&cur.lines.length)flush(); continue;} blank=0; if(isSep30(line)){if(cur.lines.length)flush(); continue;} const parsed=parseLine30(line); if(!parsed)continue; if(parsed.tag==='Title'&&cur.lines.some(l=>l.tag==='Title'||l.tag==='Received DTG'))flush(); if(parsed.tag==='Tekst'&&cur.lines.length){cur.lines[cur.lines.length-1].text=clean(cur.lines[cur.lines.length-1].text+' '+parsed.text);} else if(parsed.text){cur.lines.push(parsed);} }
    flush(); return entries;
  }
  function normalize30(mod){
    if(!Array.isArray(mod.entries))mod.entries=[];
    mod.entries=mod.entries.map(e=>{
      let source=[];
      if(Array.isArray(e.lines)&&e.lines.length){
        source=e.lines.map(l=>{
          const parsed=parseLine30(l.text, l.tag);
          if((!l.tag||/^tekst$/i.test(l.tag)||/^text$/i.test(l.tag)) && parsed)return parsed;
          if(l.tag && !/^tekst$/i.test(l.tag) && !/^text$/i.test(l.tag))return {tag:canonical(l.tag),text:clean(l.text||'')};
          return parsed||{tag:'Tekst',text:clean(l.text||'')};
        });
      }else{
        source=String(e.text||'').split('\n').map(line=>parseLine30(line)).filter(Boolean);
      }
      const lines=source.map(l=>({tag:canonical(l.tag||'Tekst'),text:clean(l.text||'')})).filter(l=>l.text);
      return {...e,lines,tags:[...new Set(lines.map(l=>l.tag))],text:lines.map(l=>`${l.tag}: ${l.text}`).join('\n')};
    });
    const old=Array.isArray(mod.filters)?mod.filters:[];
    const terms=[...new Set(mod.entries.flatMap(e=>(e.lines||[]).map(l=>l.tag)).filter(Boolean))];
    mod.filters=terms.map(term=>{const found=old.find(f=>String(f.term).toLowerCase()===String(term).toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  const active=mod=>{normalize30(mod);return mod.filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase());};
  const bold=mod=>{normalize30(mod);return mod.filters.filter(f=>f.bold).map(f=>String(f.term).toLowerCase());};
  const visible=(entry,a)=>{const lines=Array.isArray(entry.lines)?entry.lines:[]; if(!a.length)return lines.filter(l=>clean(l.text)); return lines.filter(l=>a.includes(String(l.tag).toLowerCase())&&clean(l.text));};
  function logHTML30(mod){normalize30(mod); const a=active(mod),b=bold(mod); const blocks=(mod.entries||[]).map(e=>visible(e,a)).filter(x=>x.length); return `<div class="content log-content v30"><div class="log-list v30">${blocks.length?blocks.map(lines=>`<div class="log-entry v30">${lines.map(l=>{const isB=b.includes(String(l.tag).toLowerCase());return `<div class="log-line v30"><span class="log-line-tag v30 ${isB?'bold':''}">${esc(l.tag||'Tekst')}</span><span class="log-line-text v30 ${isB?'bold':''}">${esc(l.text||'')}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn en .txt-logg i adminmenyen.</div>`}</div></div>`;}
  async function loadText30(file,mod){try{const text=await file.text();mod.entries=parseTextLogs30(text,file.name);mod.fileName=file.name;normalize30(mod);save();renderAll();}catch(err){alert('Klarte ikke å lese tekstfilen: '+(err?.message||err));}}
  function timelines(){try{const v=activeView();return v&&Array.isArray(v.modules)?v.modules.filter(m=>m.type==='timeline'):[];}catch(e){return [];}}
  function label(m){return m.name||m.title||((window.moduleDefs&&moduleDefs[m.type]?.label)||m.type||'Modul');}
  function parseReceived(value){const raw=clean(value);const m=raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if(!m)return null;let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));return Number.isFinite(d.getTime())?d.toISOString():null;}
  const field=(e,tag)=>{const l=(e.lines||[]).find(x=>String(x.tag).toLowerCase()===tag.toLowerCase());return l?l.text:'';};
  function events(mod){normalize30(mod); const out=[];(mod.entries||[]).forEach((e,i)=>{const title=field(e,'Title')||('Logg '+(i+1));const dtg=field(e,'Received DTG');const iso=parseReceived(dtg);if(iso)out.push({name:title,time:iso,color:'#f8fafc',source:'log-text',logIndex:i,dtg});});return out;}
  function addToTimeline(logMod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=events(logMod);const existing=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let added=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(existing.has(k))return;tl.events.push(ev);existing.add(k);added++;});if(evs.length){const times=evs.map(e=>new Date(e.time).getTime()).filter(Number.isFinite);if(times.length){const min=Math.min(...times),max=Math.max(...times);const cs=new Date(tl.start||min).getTime(),ce=new Date(tl.end||max).getTime();if(!Number.isFinite(cs)||min<cs)tl.start=new Date(min-15*60*1000).toISOString();if(!Number.isFinite(ce)||max>ce)tl.end=new Date(max+15*60*1000).toISOString();}}return added;}
  const prevContent=contentHTML; contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML30(mod);return prevContent(mod);};
  const prevSettings=settingsSpecific; settingsSpecific=function(mod){if(!mod||mod.type!=='log')return prevSettings(mod); normalize30(mod); const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v30" data-log-filter-v30="${i}"><strong>${esc(f.term)}</strong><label><input class="log-filter-enabled-v30" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v30" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join(''); const tls=timelines();const chosen=mod.logTimelineTargetId||(tls[0]&&tls[0].id)||'';const opts=tls.map(t=>`<option value="${esc(t.id)}" ${t.id===chosen?'selected':''}>${esc(label(t))}</option>`).join(''); const count=events(mod).length; return `<div class="log-admin-grid v29"><input id="logTextFileAdminV30" class="log-admin-file v29" type="file" accept=".txt,text/plain"><button id="logPickTextAdminV30" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v29">Støtter formatet ditt: Title hallo, Received DTG 04.06.2026 06:04:18, Summary ..., From ...</p><div class="field"><label>Lim inn loggtekst manuelt</label><textarea id="logPasteTextV30" class="log-admin-textarea v29" placeholder="Title hallo\nReceived DTG 04.06.2026 06:04:18\nSummary dette er tekst\nFrom meg"></textarea></div><button id="logLoadPastedV30" class="tool-btn" type="button">Last inn limt tekst</button><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><div class="log-to-timeline-v29"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV30">${opts||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v29">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV30" class="tool-btn primary" type="button" ${tls.length?'':'disabled'}>Plasser logghendelser på tidslinjen</button></div><button id="logClearV30" class="tool-btn danger" type="button">Tøm logg</button></div>`; };
  const prevRender=renderSelectedSettings; renderSelectedSettings=function(){prevRender(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return; normalize30(mod); const file=document.getElementById('logTextFileAdminV30'); document.getElementById('logPickTextAdminV30')?.addEventListener('click',()=>file?.click()); file?.addEventListener('change',()=>{if(file.files?.[0])loadText30(file.files[0],mod);}); document.getElementById('logLoadPastedV30')?.addEventListener('click',()=>{const txt=document.getElementById('logPasteTextV30')?.value||'';mod.entries=parseTextLogs30(txt,'limt tekst');mod.fileName='limt tekst';normalize30(mod);save();renderAll();}); document.querySelectorAll('[data-log-filter-v30]').forEach(row=>{const i=+row.dataset.logFilterV30;row.querySelector('.log-filter-enabled-v30')?.addEventListener('change',e=>{normalize30(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v30')?.addEventListener('change',e=>{normalize30(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});}); document.getElementById('logTimelineTargetV30')?.addEventListener('change',e=>{mod.logTimelineTargetId=e.target.value;save();renderSelectedSettings();}); document.getElementById('logToTimelineV30')?.addEventListener('click',()=>{const tls=timelines();const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.getElementById('logTimelineTargetV30')?.value))||tls[0];const added=addToTimeline(mod,target);save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?'':'r'} på tidslinjen.`:'Fant ingen nye logghendelser. Sjekk at loggen har Title og Received DTG.'),0);}); document.getElementById('logClearV30')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();}); };
  const prevNorm=normalizeMod; normalizeMod=function(mod){prevNorm(mod); if(mod&&mod.type==='log')normalize30(mod);};
  try{renderAll();}catch(e){console.error('log v30 fix failed',e);}
})();
