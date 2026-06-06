(function(){
  const TAGS=['Title','Received DTG','Summary','From'];
  const TAG_RE=/^(Title|Received\s+DTG|Summary|From)\b\s*[:\-]?\s*(.*)$/i;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clean=s=>String(s??'').trim().replace(/[ \t]+/g,' ');
  const canon=t=>{const x=clean(t).toLowerCase(); if(x==='title')return 'Title'; if(x==='received dtg')return 'Received DTG'; if(x==='summary')return 'Summary'; if(x==='from')return 'From'; return '';};
  const isSep=line=>/^[_\-=–—*]{6,}$/.test(clean(line));
  function parseTaggedLine(line){
    line=clean(String(line||'').replace(/^(Tekst|Text)\s*:\s*/i,''));
    const m=line.match(TAG_RE); if(!m)return null;
    const tag=canon(m[1]); return tag?{tag,text:clean(m[2])}:null;
  }
  function parseTextLogs33(text,fileName){
    const entries=[]; let cur={lines:[],fileName:fileName||''};
    const flush=()=>{cur.lines=cur.lines.filter(l=>l.tag&&clean(l.text)); if(cur.lines.length){cur.tags=[...new Set(cur.lines.map(l=>l.tag))]; cur.text=cur.lines.map(l=>`${l.tag}: ${l.text}`).join('\n'); entries.push(cur);} cur={lines:[],fileName:fileName||''};};
    String(text||'').replace(/\r/g,'').split('\n').forEach(raw=>{
      const line=clean(raw); if(!line)return;
      if(isSep(line)){flush();return;}
      const parsed=parseTaggedLine(line);
      if(parsed){ if(parsed.tag==='Title'&&cur.lines.some(l=>l.tag==='Title'))flush(); cur.lines.push(parsed); return; }
      const last=cur.lines[cur.lines.length-1]; if(last)last.text=clean(last.text+' '+line);
    });
    flush(); return entries;
  }
  function inferLines(lines){
    const out=[];
    (Array.isArray(lines)?lines:[]).forEach((l,i)=>{
      const direct=canon(l.tag); if(direct){out.push({tag:direct,text:clean(l.text)});return;}
      const parsed=parseTaggedLine(l.text||''); if(parsed){out.push(parsed);return;}
      const txt=clean(String(l.text||'').replace(/^(Tekst|Text)\s*:\s*/i,''));
      if(txt)out.push({tag:TAGS[i%4],text:txt});
    });
    return out;
  }
  function normalize33(mod){
    if(!mod||mod.type!=='log')return;
    if(!Array.isArray(mod.entries))mod.entries=[];
    mod.entries=mod.entries.map(e=>{
      let lines=[];
      if(Array.isArray(e.lines)&&e.lines.length)lines=inferLines(e.lines);
      if(!lines.length&&e.text)lines=parseTextLogs33(e.text,e.fileName||'').flatMap(x=>x.lines||[]);
      lines=lines.map(l=>({tag:canon(l.tag),text:clean(l.text)})).filter(l=>l.tag&&l.text);
      return {...e,lines,tags:[...new Set(lines.map(l=>l.tag))],text:lines.map(l=>`${l.tag}: ${l.text}`).join('\n')};
    }).filter(e=>e.lines&&e.lines.length);
    const old=Array.isArray(mod.filters)?mod.filters:[];
    mod.filters=TAGS.map(term=>{const found=old.find(f=>String(f.term||'').toLowerCase()===term.toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  function parseReceivedDate(v){
    const m=clean(v).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m)return null; let y=Number(m[3]); if(y<100)y+=2000;
    const d=new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));
    return Number.isFinite(d.getTime())?d:null;
  }
  function formatDTG(v){
    const d=parseReceivedDate(v); if(!d)return clean(v);
    const pad=n=>String(n).padStart(2,'0');
    return `${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}Z`;
  }
  function displayLineText(l){return l.tag==='Received DTG'?formatDTG(l.text):l.text;}
  function activeTags(mod){normalize33(mod);return mod.filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase());}
  function boldTags(mod){normalize33(mod);return mod.filters.filter(f=>f.bold).map(f=>String(f.term).toLowerCase());}
  function visibleLines(entry,active){const lines=entry.lines||[]; return active.length?lines.filter(l=>active.includes(String(l.tag).toLowerCase())):lines;}
  function logHTML33(mod){
    normalize33(mod); const a=activeTags(mod),b=boldTags(mod);
    const blocks=(mod.entries||[]).map(e=>visibleLines(e,a)).filter(lines=>lines.length);
    return `<div class="content log-content v33"><div class="log-list v33">${blocks.length?blocks.map(lines=>`<div class="log-entry v33">${lines.map(l=>{const isB=b.includes(String(l.tag).toLowerCase());return `<div class="log-line v33"><span class="log-line-tag v33 ${isB?'bold':''}">${esc(l.tag)}</span><span class="log-line-text v33 ${isB?'bold':''}">${esc(displayLineText(l))}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn en .txt-logg i adminmenyen.</div>`}</div></div>`;
  }
  async function loadText33(file,mod){try{const text=await file.text();mod.entries=parseTextLogs33(text,file.name);mod.fileName=file.name;normalize33(mod);save();renderAll();}catch(err){alert('Klarte ikke å lese tekstfilen: '+(err?.message||err));}}
  function timelines(){try{const v=activeView();return v&&Array.isArray(v.modules)?v.modules.filter(m=>m.type==='timeline'):[];}catch(e){return [];}}
  function modLabel(m){return m.name||m.title||((window.moduleDefs&&moduleDefs[m.type]?.label)||m.type||'Modul');}
  function field(e,tag){const line=(e.lines||[]).find(l=>l.tag===tag); return line?line.text:'';}
  function logEvents(mod){normalize33(mod); const out=[];(mod.entries||[]).forEach((e,i)=>{const title=field(e,'Title')||('Logg '+(i+1));const dtg=field(e,'Received DTG');const d=parseReceivedDate(dtg); if(d)out.push({name:title,time:d.toISOString(),color:'#f8fafc',source:'log-text',logIndex:i,dtg});}); return out;}
  function addToTimeline(mod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=logEvents(mod);const existing=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let added=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(existing.has(k))return;tl.events.push(ev);existing.add(k);added++;});return added;}
  const prevContent=contentHTML; contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML33(mod);return prevContent(mod);};
  const prevSettings=settingsSpecific; settingsSpecific=function(mod){
    if(!mod||mod.type!=='log')return prevSettings(mod); normalize33(mod);
    const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v33" data-log-filter-v33="${i}"><strong>${esc(f.term)}</strong><label><input class="log-filter-enabled-v33" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v33" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');
    const tls=timelines(); const chosen=mod.logTimelineTargetId||(tls[0]&&tls[0].id)||''; const opts=tls.map(t=>`<option value="${esc(t.id)}" ${t.id===chosen?'selected':''}>${esc(modLabel(t))}</option>`).join(''); const count=logEvents(mod).length;
    return `<div class="log-admin-grid v29"><input id="logTextFileAdminV33" class="log-admin-file v29" type="file" accept=".txt,text/plain"><button id="logPickTextAdminV33" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v29">Hardkodede logg-tags: <strong>Title</strong>, <strong>Received DTG</strong>, <strong>Summary</strong>, <strong>From</strong>. Received DTG vises som DDHHMMZ i modulen.</p><div class="field"><label>Lim inn loggtekst manuelt</label><textarea id="logPasteTextV33" class="log-admin-textarea v29" placeholder="Title hallo\nReceived DTG 04.06.2026 06:04:18\nSummary dette er tekst\nFrom meg"></textarea></div><button id="logLoadPastedV33" class="tool-btn" type="button">Last inn limt tekst</button><div>${rows}</div><div class="log-to-timeline-v29"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV33">${opts||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v29">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV33" class="tool-btn primary" type="button" ${tls.length?'':'disabled'}>Plasser logghendelser på tidslinjen</button></div><button id="logClearV33" class="tool-btn danger" type="button">Tøm logg</button></div>`;
  };
  const prevRender=renderSelectedSettings; renderSelectedSettings=function(){
    prevRender(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return; normalize33(mod);
    const file=document.getElementById('logTextFileAdminV33'); document.getElementById('logPickTextAdminV33')?.addEventListener('click',()=>file?.click()); file?.addEventListener('change',()=>{if(file.files?.[0])loadText33(file.files[0],mod);});
    document.getElementById('logLoadPastedV33')?.addEventListener('click',()=>{const txt=document.getElementById('logPasteTextV33')?.value||'';mod.entries=parseTextLogs33(txt,'limt tekst');mod.fileName='limt tekst';normalize33(mod);save();renderAll();});
    document.querySelectorAll('[data-log-filter-v33]').forEach(row=>{const i=+row.dataset.logFilterV33; row.querySelector('.log-filter-enabled-v33')?.addEventListener('change',e=>{normalize33(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();}); row.querySelector('.log-filter-bold-v33')?.addEventListener('change',e=>{normalize33(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});
    document.getElementById('logTimelineTargetV33')?.addEventListener('change',e=>{mod.logTimelineTargetId=e.target.value;save();renderSelectedSettings();});
    document.getElementById('logToTimelineV33')?.addEventListener('click',()=>{const tls=timelines();const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.getElementById('logTimelineTargetV33')?.value))||tls[0];const added=addToTimeline(mod,target);save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?'':'r'} på tidslinjen.`:'Fant ingen nye logghendelser. Sjekk at loggen har Title og Received DTG.'),0);});
    document.getElementById('logClearV33')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});
  };
  const prevNorm=normalizeMod; normalizeMod=function(mod){prevNorm(mod);if(mod&&mod.type==='log')normalize33(mod);};
  try{renderAll();}catch(e){console.error('log v33 final override failed',e);}
})();
