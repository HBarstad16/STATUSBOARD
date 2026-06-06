(function(){
  const TAGS=['Title','Received DTG','Summary','From'];
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clean=s=>String(s??'').trim().replace(/[ \t]+/g,' ');
  function normalizeLocal(mod){
    if(!mod||mod.type!=='log')return;
    if(!Array.isArray(mod.entries))mod.entries=[];
    const old=Array.isArray(mod.filters)?mod.filters:[];
    mod.filters=TAGS.map(term=>{const found=old.find(f=>String(f.term).toLowerCase()===term.toLowerCase());return {term,enabled:!!found?.enabled,bold:!!found?.bold};});
  }
  function activeTags(mod){normalizeLocal(mod);return mod.filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase());}
  function boldTags(mod){normalizeLocal(mod);return mod.filters.filter(f=>f.bold).map(f=>String(f.term).toLowerCase());}
  function visibleLines(entry,active){const lines=Array.isArray(entry.lines)?entry.lines:[]; if(!active.length)return lines; return lines.filter(l=>active.includes(String(l.tag||'').toLowerCase()));}
  function formatReceivedDtg(text){
    const s=clean(text);
    // 04.06.2026 06:04:18 -> 040604Z (DDHHMMZ). The source time is treated as Zulu.
    const m=s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::\d{2})?/);
    if(m){
      const dd=String(Number(m[1])).padStart(2,'0');
      const hh=String(Number(m[4])).padStart(2,'0');
      const mm=String(Number(m[5])).padStart(2,'0');
      return `${dd}${hh}${mm}Z`;
    }
    if(s && !/Z$/i.test(s) && /\d/.test(s))return s+'Z';
    return s;
  }
  function displayText(line){
    return String(line?.tag||'').toLowerCase()==='received dtg' ? formatReceivedDtg(line.text) : clean(line.text);
  }
  function logHTML32(mod){
    normalizeLocal(mod);
    const a=activeTags(mod), b=boldTags(mod);
    const blocks=(mod.entries||[]).map(e=>visibleLines(e,a)).filter(x=>x.length);
    return `<div class="content log-content v31"><div class="log-list v31">${blocks.length?blocks.map(lines=>`<div class="log-entry v31">${lines.map(l=>{const tag=TAGS.find(t=>t.toLowerCase()===String(l.tag||'').toLowerCase())||''; if(!tag)return ''; const isB=b.includes(tag.toLowerCase()); return `<div class="log-line v31"><span class="log-line-tag v31 ${isB?'bold':''}">${esc(tag)}</span><span class="log-line-text v31 ${isB?'bold':''}">${esc(displayText(l))}</span></div>`;}).join('')}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn en .txt-logg i adminmenyen.</div>`}</div></div>`;
  }
  const prevContent=contentHTML;
  contentHTML=function(mod){if(mod&&mod.type==='log')return logHTML32(mod);return prevContent(mod);};
  try{renderAll();}catch(e){console.error('log v32 DTG display patch failed',e);}
})();
