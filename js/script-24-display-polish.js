(function(){
  "use strict";

  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const pad=value=>String(value).padStart(2,"0");
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const selectedMod=()=>{try{return selected&&selected();}catch(e){return null;}};
  const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||""))?value:fallback;
  const moduleColors=mod=>{
    if(!state.design)state.design={};
    if(!state.design.moduleColors)state.design.moduleColors={};
    if(!state.design.moduleColors[mod.type])state.design.moduleColors[mod.type]={};
    return state.design.moduleColors[mod.type];
  };

  const displayFields={
    common:[
      ["displayText","All synlig tekst","#e2e8f0"],
      ["displayMuted","Sekundær tekst","#94a3b8"],
      ["displayBorder","Kantlinjer","#334155"]
    ],
    timeline:[
      ["timelineStageBg","Tidslinjebakgrunn","#111827"],
      ["timelineLine","Linje og streker","#e2e8f0"],
      ["timelineLabel","Klokkeslett","#cbd5e1"],
      ["timelineDay","Datomarkør","#fbbf24"],
      ["timelinePeriodText","Periodetekst","#e2e8f0"],
      ["timelineEventText","Hendelsestekst","#f8fafc"],
      ["timelineEventBg","Hendelsesbakgrunn","#020617"],
      ["timelineNow","NÅ-markør","#38bdf8"],
      ["timelineNowText","NÅ-tekst","#e0f2fe"],
      ["timelineNowBg","NÅ-bakgrunn","#075985"]
    ],
    log:[
      ["logText","Loggtekst","#e2e8f0"],
      ["logEntryBg","Loggboks bakgrunn","#020617"],
      ["logEntryBorder","Loggboks kant","#334155"],
      ["logTagText","Tag tekst","#dbeafe"],
      ["logTagBg","Tag bakgrunn","#1e3a8a"],
      ["logTagBorder","Tag kant","#60a5fa"]
    ],
    table:[
      ["tableText","Standard celletekst","#e2e8f0"],
      ["tableCellBg","Standard cellebakgrunn","#0f172a"],
      ["tableWrapBg","Bakgrunn rundt tabell","#020617"],
      ["tableBorder","Cellekant","#334155"]
    ],
    weather:[
      ["tableText","Tabelltekst","#e2e8f0"],
      ["tableCellBg","Cellebakgrunn","#0f172a"],
      ["tableBorder","Cellekant","#334155"],
      ["inputBg","Redigerbar TAF-bakgrunn","#020617"]
    ],
    time:[
      ["tableText","Klokketekst","#e2e8f0"],
      ["tableCellBg","Cellebakgrunn","#0f172a"],
      ["tableBorder","Cellekant","#334155"],
      ["inputBg","Velgerbakgrunn","#020617"]
    ],
    personell:[
      ["tableText","Tabelltekst","#e2e8f0"],
      ["tableCellBg","Cellebakgrunn","#0f172a"],
      ["tableBorder","Cellekant","#334155"],
      ["inputBg","Feltbakgrunn","#020617"],
      ["inputText","Felttekst","#f8fafc"],
      ["inputBorder","Feltkant","#334155"]
    ],
    checklist:[
      ["checkLine","Skillelinjer","#334155"],
      ["checkAccent","Avkryssing","#38bdf8"],
      ["checkDone","Ferdig tekst","#64748b"]
    ],
    alert:[
      ["alertBg","Varselbakgrunn","#052e1e"],
      ["alertText","Varseltekst","#34d399"],
      ["alertBorder","Varselkant","#334155"]
    ],
    note:[
      ["noteBg","Notatbakgrunn","#111827"],
      ["noteText","Notattekst","#f8fafc"]
    ],
    image:[
      ["imagePlaceholderBg","Plassholder bakgrunn","#111827"],
      ["imagePlaceholderText","Plassholder tekst","#cbd5e1"],
      ["imagePlaceholderBorder","Plassholder kant","#64748b"]
    ]
  };
  const cssVars={
    displayText:"--display-text",displayMuted:"--display-muted",displayBorder:"--display-border",
    timelineStageBg:"--timeline-stage-bg",timelineLine:"--timeline-line-color",timelineLabel:"--timeline-label-color",
    timelineDay:"--timeline-day-color",timelinePeriodText:"--timeline-period-text",timelineEventText:"--timeline-event-text",
    timelineEventBg:"--timeline-event-bg",timelineNow:"--timeline-now-color",timelineNowText:"--timeline-now-text",
    timelineNowBg:"--timeline-now-bg",logText:"--log-text-color",logEntryBg:"--log-entry-bg",
    logEntryBorder:"--log-entry-border",logTagText:"--log-tag-text",logTagBg:"--log-tag-bg",
    logTagBorder:"--log-tag-border",tableText:"--table-text-color",tableCellBg:"--table-cell-bg",
    tableWrapBg:"--table-wrap-bg",tableBorder:"--table-border",inputBg:"--input-bg",inputText:"--input-text",
    inputBorder:"--input-border",checkLine:"--check-line",checkAccent:"--check-accent",checkDone:"--check-done",
    alertBg:"--alert-bg",alertText:"--alert-text",alertBorder:"--alert-border",noteBg:"--note-bg",
    noteText:"--note-text",imagePlaceholderBg:"--image-placeholder-bg",imagePlaceholderText:"--image-placeholder-text",
    imagePlaceholderBorder:"--image-placeholder-border"
  };
  function moduleDisplayStyle(mod){
    const values=state.design?.moduleColors?.[mod.type]||{};
    return Object.entries(cssVars).map(([key,variable])=>values[key]?`${variable}:${values[key]}`:"").filter(Boolean).join(";");
  }
  const buildBefore=buildModule;
  buildModule=function(mod){
    const el=buildBefore(mod);
    const style=moduleDisplayStyle(mod);
    if(style)el.setAttribute("style",`${el.getAttribute("style")||""};${style}`);
    return el;
  };

  function enhanceDesignMenu(){
    if(state.currentAdminMenu!=="design")return;
    const mod=selectedMod(),card=document.querySelector(".design-card[data-design-type]");
    if(!mod||!card||card.querySelector(".design-display-colors"))return;
    const values=moduleColors(mod);
    const fields=[...displayFields.common,...(displayFields[mod.type]||[])];
    const wrap=document.createElement("div");
    wrap.className="design-display-colors";
    wrap.innerHTML=`<strong>Alle synlige elementer</strong><p class="small">Disse fargene gjelder displayinnholdet i ${esc(moduleDefs[mod.type]?.label||mod.type)}.</p><div class="grid2">${fields.map(([key,label,fallback])=>`<div class="field"><label>${esc(label)}</label><input type="color" data-display-color="${key}" value="${esc(color(values[key],fallback))}"></div>`).join("")}</div>`;
    card.querySelector(".design-clear-type")?.before(wrap);
    wrap.querySelectorAll("[data-display-color]").forEach(input=>input.addEventListener("input",()=>{
      values[input.dataset.displayColor]=input.value;
      save();
      renderBoard();
    }));
  }

  const renderAllBeforeDesign=renderAll;
  renderAll=function(){
    const result=renderAllBeforeDesign.apply(this,arguments);
    enhanceDesignMenu();
    return result;
  };

  function roundToInterval(date,minutes,up=false){
    const d=new Date(date);
    d.setSeconds(0,0);
    const value=d.getMinutes()/minutes;
    d.setMinutes((up?Math.ceil(value):Math.floor(value))*minutes);
    return d;
  }
  function timelineInterval(mod){return mod.timelineDensity==="quarter"?15:mod.timelineDensity==="half"?30:60;}
  function timeLabel(date){return `${pad(date.getHours())}:${pad(date.getMinutes())}`;}
  timelineHTML=function(mod){
    if(!mod.start)mod.start=new Date(Date.now()-3600000).toISOString();
    if(!mod.end)mod.end=new Date(Date.now()+3*3600000).toISOString();
    if(!Array.isArray(mod.periods))mod.periods=[];
    if(!Array.isArray(mod.events))mod.events=[];
    const min=new Date(mod.start).getTime(),max=Math.max(new Date(mod.end).getTime(),min+60000),span=max-min;
    const pos=value=>clamp(((new Date(value).getTime()-min)/span)*100,0,100);
    const interval=timelineInterval(mod),step=interval*60000,ticks=[];
    let tick=roundToInterval(min,interval,true).getTime();
    while(tick<=max&&ticks.length<240){
      const pct=pos(tick),date=new Date(tick);
      ticks.push(`<div class="timeline-stable-tick" style="left:${pct}%"></div><div class="timeline-stable-label" style="left:${pct}%">${timeLabel(date)}</div>`);
      tick+=step;
    }
    const labelSize=clamp(14-(ticks.length*.32),8,12);
    const days=[];const midnight=new Date(min);midnight.setHours(24,0,0,0);
    for(let t=midnight.getTime();t<max;t+=86400000){const d=new Date(t);days.push(`<div class="timeline-stable-day" style="left:${pos(t)}%"><span>${pad(d.getDate())}.${pad(d.getMonth()+1)}</span></div>`);}
    const rgba=(hex,opacity)=>{const clean=String(hex||"#60a5fa").replace("#",""),n=parseInt(clean.length===3?clean.split("").map(x=>x+x).join(""):clean,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;};
    const periods=mod.periods.map(p=>`<div class="timeline-stable-period" style="left:${pos(p.start)}%;width:${Math.max(1,pos(p.end)-pos(p.start))}%;background:${rgba(p.color,p.opacity??.55)}"><span>${esc(p.name||"")}</span></div>`).join("");
    const events=mod.events.map(e=>`<div class="timeline-stable-event" style="left:${pos(e.time||e.start)}%;color:${esc(e.color||"#f8fafc")}"><strong>${esc(e.name||"Hendelse")}</strong><i></i></div>`).join("");
    const placing=window.__timelinePlace?.moduleId===mod.id||window.__timelinePlaceTarget?.modId===mod.id;
    return `<div class="content timeline-content-stable"><div class="timeline-stable-stage ${placing?"placing":""}" data-timeline-track="1" style="--timeline-label-size:${labelSize}px"><div class="timeline-stable-line"></div>${periods}${days.join("")}${ticks.join("")}<div class="timeline-now-stable" style="left:${pos(Date.now())}%"><span>NÅ</span></div>${events}</div>${placing?'<div class="timeline-stable-help">Klikk på tidslinjen der hendelsen skal plasseres.</div>':""}</div>`;
  };

  const settingsBefore= settingsSpecific;
  settingsSpecific=function(mod){
    let html=settingsBefore(mod);
    if(mod?.type!=="timeline")return html;
    const density=mod.timelineDensity||"hour";
    const controls=`<div class="field"><label>Streker og klokkeslett</label><div class="timeline-density-buttons"><button class="tool-btn ${density==="hour"?"active":""}" data-timeline-density="hour" type="button">Hele timer</button><button class="tool-btn ${density==="half"?"active":""}" data-timeline-density="half" type="button">Halvtimer</button><button class="tool-btn ${density==="quarter"?"active":""}" data-timeline-density="quarter" type="button">Kvarter</button></div></div><div class="field"><label>Hurtig tidsperspektiv fra nå</label><div class="timeline-range-buttons">${[1,3,6,12,24].map(hours=>`<button class="tool-btn" data-timeline-hours="${hours}" type="button">${hours}t</button>`).join("")}</div></div>`;
    return html.replace('<div class="timeline-admin-compact">','<div class="timeline-admin-compact">'+controls).replace(/<div class="grid2"><div class="field"><label>Visning<\/label>[\s\S]*?id="stableTimelineTicks"[\s\S]*?<\/div><\/div>/,"");
  };

  const selectedBefore=renderSelectedSettings;
  renderSelectedSettings=function(){
    selectedBefore();
    const mod=selectedMod();if(!mod)return;
    if(mod.type==="timeline"){
      document.querySelectorAll("[data-timeline-density]").forEach(btn=>btn.addEventListener("click",()=>{
        mod.timelineDensity=btn.dataset.timelineDensity;save();renderAll();
      }));
      document.querySelectorAll("[data-timeline-hours]").forEach(btn=>btn.addEventListener("click",()=>{
        const interval=timelineInterval(mod),start=roundToInterval(Date.now(),interval),hours=Number(btn.dataset.timelineHours);
        mod.start=start.toISOString();mod.end=new Date(start.getTime()+hours*3600000).toISOString();save();renderAll();
      }));
    }
    if(mod.type==="log")bindLogExport(mod);
  };

  function dtgDisplay(value){
    const raw=String(value||"").trim();
    let match=raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if(match)return `${pad(match[1])}${pad(match[4])}${pad(match[5])}Z`;
    match=raw.match(/^(\d{2})(\d{2})(\d{2})Z$/i);
    if(match)return raw.toUpperCase();
    const d=new Date(raw);
    return Number.isFinite(d.getTime())?`${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`:raw;
  }
  function receivedTag(tag){return /^rec(?:eived|ieved|eiced)\s+dtg$/i.test(String(tag||"").trim());}
  function logHTMLPolished(mod){
    if(typeof logNormalize==="function")logNormalize(mod);
    const filters=Array.isArray(mod.filters)?mod.filters:[],active=new Set(filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase())),bold=new Set(filters.filter(f=>f.bold).map(f=>String(f.term).toLowerCase()));
    const entries=(mod.entries||[]).map(entry=>({lines:(entry.lines||[]).filter(line=>!active.size||active.has(String(line.tag).toLowerCase()))})).filter(entry=>entry.lines.length);
    return `<div class="content log-content"><div class="log-list">${entries.length?entries.map(entry=>`<div class="log-entry">${entry.lines.map(line=>{const isBold=bold.has(String(line.tag).toLowerCase()),text=receivedTag(line.tag)?dtgDisplay(line.text):line.text;return `<div class="log-line"><span class="log-line-tag ${isBold?"bold":""}">${esc(line.tag)}</span><span class="log-line-text ${isBold?"bold":""}">${esc(text)}</span></div>`;}).join("")}</div>`).join(""):'<div class="log-empty">Ingen logger matcher valgte filtre.</div>'}</div></div>`;
  }
  const contentBefore=contentHTML;
  contentHTML=function(mod){return mod?.type==="log"?logHTMLPolished(mod):contentBefore(mod);};

  const logSettingsBefore=settingsSpecific;
  settingsSpecific=function(mod){
    let html=logSettingsBefore(mod);
    if(mod?.type!=="log")return html;
    const tags=[...new Set((mod.filters||[]).map(f=>f.term).filter(t=>!receivedTag(t)))];
    if(!Array.isArray(mod.timelineTextTags)||!mod.timelineTextTags.length)mod.timelineTextTags=tags.filter(t=>String(t).toLowerCase()==="title");
    const timelines=(activeView().modules||[]).filter(m=>m.type==="timeline");
    const target=mod.logTimelineTargetId||timelines[0]?.id||"";
    const block=`<div class="design-card log-timeline-export"><strong>Eksporter logg til tidslinje</strong><div class="field"><label>Tidslinje</label><select id="polishLogTimeline">${timelines.map(t=>`<option value="${esc(t.id)}" ${t.id===target?"selected":""}>${esc(t.name||"Tidslinje")}</option>`).join("")||'<option value="">Ingen tidslinje i dette viewet</option>'}</select></div><p class="small">Velg feltene som skal bli hendelsestekst. Received DTG brukes bare som tidspunkt.</p><div class="log-export-tags">${tags.map(tag=>`<label><input type="checkbox" data-log-event-tag="${esc(tag)}" ${mod.timelineTextTags.includes(tag)?"checked":""}>${esc(tag)}</label>`).join("")}</div><button id="polishLogExport" class="tool-btn primary" type="button" ${timelines.length?"":"disabled"}>Eksporter valgte logger</button></div>`;
    return html+block;
  };
  function parseReceived(value){
    const m=String(value||"").trim().match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m)return null;let year=Number(m[3]);if(year<100)year+=2000;
    const d=new Date(year,Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));
    return Number.isFinite(d.getTime())?d:null;
  }
  function bindLogExport(mod){
    document.getElementById("polishLogTimeline")?.addEventListener("change",e=>{mod.logTimelineTargetId=e.target.value;save();});
    document.querySelectorAll("[data-log-event-tag]").forEach(box=>box.addEventListener("change",()=>{
      mod.timelineTextTags=[...document.querySelectorAll("[data-log-event-tag]:checked")].map(x=>x.dataset.logEventTag);save();
    }));
    document.getElementById("polishLogExport")?.addEventListener("click",()=>{
      const target=(activeView().modules||[]).find(m=>m.type==="timeline"&&m.id===(document.getElementById("polishLogTimeline")?.value||mod.logTimelineTargetId));
      if(!target)return;
      if(!Array.isArray(target.events))target.events=[];
      const selectedTags=new Set((mod.timelineTextTags||[]).map(x=>String(x).toLowerCase())),existing=new Set(target.events.map(e=>`${e.source}|${e.logModuleId}|${e.logIndex}`));let added=0;
      (mod._stableLogEntries||mod.entries||[]).forEach((entry,index)=>{
        const lines=entry.lines||[],received=lines.find(line=>receivedTag(line.tag)),date=parseReceived(received?.text);
        if(!date)return;
        const parts=lines.filter(line=>selectedTags.has(String(line.tag).toLowerCase())).map(line=>String(line.text||"").trim()).filter(Boolean);
        const key=`log-polish|${mod.id}|${index}`;if(existing.has(key))return;
        target.events.push({name:parts.join(" | ")||`Logg ${index+1}`,time:date.toISOString(),color:"#f8fafc",source:"log-polish",logModuleId:mod.id,logIndex:index});existing.add(key);added++;
      });
      save();renderAll();setTimeout(()=>alert(added?`La til ${added} logghendelse${added===1?"":"r"} på tidslinjen.`:"Fant ingen nye logger med Received DTG."),0);
    });
  }

  const cellStyleBefore=cellStyleCSS;
  cellStyleCSS=function(mod,row,col){
    const style=getCellStyle(mod,row,col)||{},stable=mod?._stableCellStyles?.[`${row}:${col}`]||{},parts=[cellStyleBefore(mod,row,col)||""];
    if(style.textColor)parts.push(`color:${style.textColor}!important`);
    if(style.bgColor&&Number(style.bgOpacity)>0){
      const hex=style.bgColor.replace("#",""),n=parseInt(hex,16),opacity=Number(style.bgOpacity);
      parts.push(`background-color:rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})!important`);
    }
    if(style.align)parts.push(`text-align:${style.align}!important`);
    if(style.vAlign)parts.push(`vertical-align:${style.vAlign}!important`);
    if(stable.bold??style.bold)parts.push("font-weight:700!important;--cell-weight:700");
    const size=stable.fontSize??style.fontSize;if(size)parts.push(`font-size:${Number(size)}em!important`);
    return parts.join(";");
  };

  try{renderAll();}catch(error){console.error("Display polish patch feilet",error);}
})();
