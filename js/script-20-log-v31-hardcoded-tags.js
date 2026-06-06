(function(){
  const TAGS=['Title','Received DTG','Summary','From'];
  const TAG_RE=/^(Title|Received\s+DTG|Summary|From)\b\s*[:\-]?\s*(.*)$/i;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clean=s=>String(s??'').trim().replace(/[ \t]+/g,' ');
  const canon=t=>{const x=clean(t).toLowerCase(); if(x==='title')return 'Title'; if(x==='received dtg')return 'Received DTG'; if(x==='summary')return 'Summary'; if(x==='from')return 'From'; return '';};
  function stripOldPrefix(line){return clean(String(line||'').replace(/^(Tekst|Text)\s*:\s*/i,''));}
  function isSep(line){const s=clean(line); return /^[_\-=–—*]{6,}$/.test(s);}
  function parseTaggedLine(line){
    line=stripOldPrefix(line);
    const m=line.match(TAG_RE);
    if(!m)return null;
    const tag=canon(m[1]);
    return tag?{tag,text:clean(m[2])}:null;
  }
  function parseTextLogs31(text,fileName){
    const entries=[]; let cur={lines:[],fileName:fileName||''};
    const flush=()=>{cur.lines=cur.lines.filter(l=>l.tag&&clean(l.text)); if(cur.lines.length){cur.tags=[...new Set(cur.lines.map(l=>l.tag))]; cur.text=cur.lines.map(l=>`${l.tag}: ${l.text}`).join('\n'); entries.push(cur);} cur={lines:[],fileName:fileName||''};};
    String(text||'').replace(/\r/g,'').split('\n').forEach(raw=>{
      const line=clean(raw); if(!line)return;
      if(isSep(line)){flush();return;}
      const parsed=parseTaggedLine(line);
      if(parsed){
        if(parsed.tag==='Title' && cur.lines.some(l=>l.tag==='Title'))flush();
        cur.lines.push(parsed);
        return;
      }
      // Non-tag line continues previous hardcoded tag, but never becomes its own "Tekst" tag.
      const last=cur.lines[cur.lines.length-1]; if(last)last.text=clean(last.text+' '+line);
    });
    flush(); return entries;
  }
  function inferFromOldLines(lines){
    const out=[];
    (Array.isArray(lines)?lines:[]).forEach((l,i)=>{
      const tag=canon(l.tag);
      if(tag){out.push({tag,text:clean(l.text)});return;}
      const parsed=parseTaggedLine(l.text||'');
      if(parsed){out.push(parsed);return;}
      // If older storage already lost the labels and only has four Tekst lines, infer the normal order.
      const inferred=TAGS[i%4];
      const txt=stripOldPrefix(l.text||'');
      if(txt)out.push({tag:inferred,text:txt});
    });
    return out;
  }
  function normalize31(mod){
    if(!mod||mod.type!=='log')return;
    if(!Array.isArray(mod.entries))mod.entries=[];
    mod.entries=mod.entries.map(e=>{
      let lines=[];
      if(Array.isArray(e.lines)&&e.lines.length)lines=inferFromOldLines(e.lines);
      if(!lines.length && e.text)lines=parseTextLogs31(e.text,e.fileName||'').flatMap(x=>x.lines||[]);
      lines=lines.map(l=>({tag:canon(l.tag),text:clean(l.text)})).filter(l=>l.tag&&l.text);
      return {...e,lines,tags:[...new Set(lines.map(l=>l.tag))],text:lines.map(l=>`${l.tag}: ${l.text}`).join('\n')};
    }).filter(e=>e.lines&&e.lines.length);
    const old=Array.isArray(mod.filters)?mod.filters:[];
    mod.filters=TAGS.map(term=>{const found=old.find(f=>String(f.term).toLowerCase()===term.toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  const active=mod=>{normalize31(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());};
  const bold=mod=>{normalize31(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());};
  function visibleLines(entry,activeTags){const lines=entry.lines||[]; if(!activeTags.length)return lines; return lines.filter(l=>activeTags.includes(String(l.tag).toLowerCase()));}
  function logHTML31(mod){normalize31(mod); const a=active(mod),b=bold(mod); const blocks=(mod.entries||[]).map(e=>visibleLines(e,a)).filter(x=>x.length); return `<div class="content log-content v31"><div class="log-list v31">${blocks.length?blocks.map(lines=>`<div class="log-entry v31">${lines.map(l=>{const isB=b.includes(String(l.tag).toLowerCase());return `<div class="log-line v31"><span class="log-line-tag v31 ${isB?'bold':''}">${esc(l.tag)}</span><span class="log-line-text v31 ${isB?'bold':''}">${esc(l.text)}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn en .txt-logg i adminmenyen.</div>`}</div></div>`;}
  async function loadText31(file,mod){try{const text=await file.text();mod.entries=parseTextLogs31(text,file.name);mod.fileName=file.name;normalize31(mod);save();renderAll();}catch(err){alert('Klarte ikke å lese tekstfilen: '+(err?.message||err));}}
  function timelines(){try{const v=activeView();return v&&Array.isArray(v.modules)?v.modules.filter(m=>m.type==='timeline'):[];}catch(e){return [];}}
  function modLabel(m){return m.name||m.title||((window.moduleDefs&&moduleDefs[m.type]?.label)||m.type||'Modul');}
  function field(e,tag){const line=(e.lines||[]).find(l=>l.tag===tag); return line?line.text:'';}
  function parseReceived(v){const m=clean(v).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if(!m)return null; let y=Number(m[3]); if(y<100)y+=2000; const d=new Date(y,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0)); return Number.isFinite(d.getTime())?d.toISOString():null;}
  function logEvents(mod){normalize31(mod); const out=[];(mod.entries||[]).forEach((e,i)=>{const title=field(e,'Title')||('Logg '+(i+1));const dtg=field(e,'Received DTG');const iso=parseReceived(dtg); if(iso)out.push({name:title,time:iso,color:'#f8fafc',source:'log-text',logIndex:i,dtg});}); return out;}
  function addToTimeline(mod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=logEvents(mod);const existing=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let added=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(existing.has(k))return;tl.events.push(ev);existing.add(k);added++;});return added;}
  const prevContent=contentHTML; contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML31(mod);return prevContent(mod);};
  const prevSettings=settingsSpecific; settingsSpecific=function(mod){if(!mod||mod.type!=='log')return prevSettings(mod); normalize31(mod); const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v31" data-log-filter-v31="${i}"><strong>${esc(f.term)}</strong><label><input class="log-filter-enabled-v31" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v31" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join(''); const tls=timelines(); const chosen=mod.logTimelineTargetId||(tls[0]&&tls[0].id)||''; const opts=tls.map(t=>`<option value="${esc(t.id)}" ${t.id===chosen?'selected':''}>${esc(modLabel(t))}</option>`).join(''); const count=logEvents(mod).length; return `<div class="log-admin-grid v29"><input id="logTextFileAdminV31" class="log-admin-file v29" type="file" accept=".txt,text/plain"><button id="logPickTextAdminV31" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v29">Hardkodede logg-tags: <strong>Title</strong>, <strong>Received DTG</strong>, <strong>Summary</strong>, <strong>From</strong>. Andre linjer blir lagt til forrige tag og vises ikke som Tekst.</p><div class="field"><label>Lim inn loggtekst manuelt</label><textarea id="logPasteTextV31" class="log-admin-textarea v29" placeholder="Title hallo\nReceived DTG 04.06.2026 06:04:18\nSummary dette er tekst\nFrom meg"></textarea></div><button id="logLoadPastedV31" class="tool-btn" type="button">Last inn limt tekst</button><div>${rows}</div><div class="log-to-timeline-v29"><div class="field" style="margin-bottom:0"><label>Logg til tidslinje</label><select id="logTimelineTargetV31">${opts||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><div class="count-v29">Fant ${count} logghendelse${count===1?'':'r'} med Title + Received DTG.</div><button id="logToTimelineV31" class="tool-btn primary" type="button" ${tls.length?'':'disabled'}>Plasser logghendelser på tidslinjen</button></div><button id="logClearV31" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
  const prevRender=renderSelectedSettings; renderSelectedSettings=function(){prevRender(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return; normalize31(mod); const file=document.getElementById('logTextFileAdminV31'); document.getElementById('logPickTextAdminV31')?.addEventListener('click',()=>file?.click()); file?.addEventListener('change',()=>{if(file.files?.[0])loadText31(file.files[0],mod);}); document.getElementById('logLoadPastedV31')?.addEventListener('click',()=>{const txt=document.getElementById('logPasteTextV31')?.value||'';mod.entries=parseTextLogs31(txt,'limt tekst');mod.fileName='limt tekst';normalize31(mod);save();renderAll();}); document.querySelectorAll('[data-log-filter-v31]').forEach(row=>{const i=+row.dataset.logFilterV31; row.querySelector('.log-filter-enabled-v31')?.addEventListener('change',e=>{normalize31(mod);mod.filters[i].enabled=e.target.checked;save();renderAll();}); row.querySelector('.log-filter-bold-v31')?.addEventListener('change',e=>{normalize31(mod);mod.filters[i].bold=e.target.checked;save();renderAll();});}); document.getElementById('logTimelineTargetV31')?.addEventListener('change',e=>{mod.logTimelineTargetId=e.target.value;save();renderSelectedSettings();}); document.getElementById('logToTimelineV31')?.addEventListener('click',()=>{const tls=timelines();const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.getElementById('logTimelineTargetV31')?.value))||tls[0];const added=addToTimeline(mod,target);save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?'':'r'} på tidslinjen.`:'Fant ingen nye logghendelser. Sjekk at loggen har Title og Received DTG.'),0);}); document.getElementById('logClearV31')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});};
  const prevNorm=normalizeMod; normalizeMod=function(mod){prevNorm(mod);if(mod&&mod.type==='log')normalize31(mod);};
  try{renderAll();}catch(e){console.error('log v31 hardcoded tag patch failed',e);}
})();
