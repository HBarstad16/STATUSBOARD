/* Robust admin fallback for local HTML + CodePen.
       This script is intentionally separate from the main app script so admin access still works
       even if another part of the app throws an error. */
    (function(){
      var ADMIN_PASSWORD = "1234";
      var ADMIN_UNLOCK_KEY = "statusboardAdminUnlockedV1";
      function byId(id){ return document.getElementById(id); }
      function remember(){ try{ localStorage.setItem(ADMIN_UNLOCK_KEY,"true"); }catch(e){} }
      function remembered(){ try{ return localStorage.getItem(ADMIN_UNLOCK_KEY)==="true"; }catch(e){ return false; } }
      function removeNode(id){ var el=byId(id); if(el && el.parentNode) el.parentNode.removeChild(el); }
      function ensureAdminPanelVisible(){
        window.__statusboardFallbackAdminOpen = true;
        var app = byId('app');
        if(!app) return;
        app.classList.add('admin-open');
        app.classList.remove('admin-hidden');
        app.classList.add('edit-mode');
        app.classList.remove('display-mode');
        try{
          if(typeof window.__statusboardAdminUnlock === 'function'){ window.__statusboardAdminUnlock(); return; }
        }catch(e){}
        setTimeout(function(){
          var panel = byId('adminPanel');
          if(panel){
            panel.style.transform = 'translateX(0)';
            panel.style.zIndex = '2147483000';
            panel.style.pointerEvents = 'auto';
          }
        },0);
      }
      function closeAdminPanel(){
        window.__statusboardFallbackAdminOpen = false;
        var app = byId('app');
        if(app){
          app.classList.remove('admin-open');
          app.classList.add('admin-hidden');
          app.classList.add('edit-mode');
          app.classList.remove('display-mode');
        }
        try{
          if(typeof window.__statusboardAdminClose === 'function'){ window.__statusboardAdminClose(); return; }
        }catch(e){}
        var panel = byId('adminPanel');
        if(panel){ panel.style.transform = 'translateX(100%)'; }
      }
      function showFallbackLogin(){
        removeNode('adminFallbackLogin');
        var overlay = document.createElement('div');
        overlay.id = 'adminFallbackLogin';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.78);display:grid;place-items:center;padding:20px;font-family:Arial,Helvetica,sans-serif;';
        overlay.innerHTML = ''+
          '<div style="width:min(420px,100%);border:1px solid rgba(255,255,255,.18);border-radius:26px;background:#0f172a;color:white;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.65)">'+
          '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px">'+
          '<div><h2 style="margin:0;font-size:24px;letter-spacing:-.04em">Admin</h2><p style="margin:5px 0 0;color:#94a3b8;font-size:14px">Skriv passordet for å åpne adminpanelet.</p></div>'+
          '<button id="adminFallbackClose" type="button" style="border:0;border-radius:999px;width:34px;height:34px;background:rgba(255,255,255,.1);color:white;font-size:20px;cursor:pointer">×</button>'+
          '</div>'+
          '<label style="display:block;color:#cbd5e1;font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px">Passord</label>'+
          '<input id="adminFallbackPassword" type="password" value="" autocomplete="current-password" style="width:100%;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:#020617;color:white;padding:12px;outline:none;font-size:16px;margin-bottom:12px">'+
          '<button id="adminFallbackSubmit" type="button" style="width:100%;border:1px solid rgba(147,197,253,.35);border-radius:999px;background:rgba(59,130,246,.38);color:white;padding:12px 14px;cursor:pointer;font-weight:800">Åpne admin</button>'+
          '<p id="adminFallbackError" style="display:none;margin:10px 0 0;color:#fb7185;font-size:13px">Feil passord.</p>'+
          '</div>';
        document.body.appendChild(overlay);
        var input = byId('adminFallbackPassword');
        var submit = byId('adminFallbackSubmit');
        var close = byId('adminFallbackClose');
        var err = byId('adminFallbackError');
        function attempt(){
          if(input.value === ADMIN_PASSWORD){
            remember();
            removeNode('adminFallbackLogin');
            ensureAdminPanelVisible();
          }else{
            err.style.display = 'block';
            input.select();
          }
        }
        submit.addEventListener('click', attempt);
        input.addEventListener('keydown', function(e){ if(e.key === 'Enter') attempt(); });
        close.addEventListener('click', function(){ removeNode('adminFallbackLogin'); });
        setTimeout(function(){ input.focus(); }, 30);
      }
      window.openStatusboardAdmin = function(){
        if(remembered()){ ensureAdminPanelVisible(); return; }
        try{
          if(typeof window.__statusboardAdminUnlock === 'function'){ showFallbackLogin(); return; }
        }catch(e){}
        showFallbackLogin();
      };
      window.closeStatusboardAdmin = closeAdminPanel;
      function wire(){
        var btn = byId('adminButton');
        if(btn && !btn.__adminFallbackWired){
          btn.__adminFallbackWired = true;
          btn.setAttribute('type','button');
          btn.addEventListener('click', function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
            if(window.__statusboardFallbackAdminOpen){
              closeAdminPanel();
              setTimeout(closeAdminPanel,0);
              return;
            }
            window.openStatusboardAdmin();
          }, true);
        }
        var hide = byId('hideAdmin');
        if(hide && !hide.__adminFallbackWired){
          hide.__adminFallbackWired = true;
          hide.addEventListener('click', function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
            closeAdminPanel();
          }, true);
        }
        var close = byId('closeAdmin');
        if(close && !close.__adminFallbackWired){
          close.__adminFallbackWired = true;
          close.addEventListener('click', function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
            closeAdminPanel();
          }, true);
        }
      }
      document.addEventListener('keydown', function(e){
        if(e.ctrlKey && e.altKey && String(e.key).toLowerCase() === 'a'){
          e.preventDefault();
          window.openStatusboardAdmin();
        }
        if(e.key === 'Escape'){
          removeNode('adminFallbackLogin');
        }
      }, true);
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
      setTimeout(wire, 250);
      setTimeout(wire, 1000);
    })();


    /* Request patch v2: additional fixes */
    (function(){
      const originalWireModule=wireModule;
      const originalRenderBoard=renderBoard;

      function titleStyle(mod){
        const t=mod.titleStyle||{};
        const x=Number(t.x??14), y=Number(t.y??10), size=Number(t.size??1.05), align=t.align||"left";
        return `--title-x:${x}px;--title-y:${y}px;--title-size:${size}rem;--title-align:${escapeHTML(align)}`;
      }
      function noteJustify(align){return align==="center"?"center":align==="right"?"flex-end":"flex-start"}
      function noteVAlign(align){return align==="middle"?"center":align==="bottom"?"flex-end":"flex-start"}
      function ensureTableDimensions(mod){
        const cols=colCount(mod);
        if(!Array.isArray(mod.colWidths))mod.colWidths=[];
        if(!Array.isArray(mod.rowHeights))mod.rowHeights=[];
        for(let i=0;i<cols;i++)if(!mod.colWidths[i])mod.colWidths[i]=110;
        for(let r=0;r<(mod.rows||[]).length;r++)if(!mod.rowHeights[r])mod.rowHeights[r]=46;
      }
      const oldCellStyleCSS=cellStyleCSS;
      cellStyleCSS=function(mod,r,c){
        const style=getCellStyle(mod,r,c)||{};
        const base=oldCellStyleCSS(mod,r,c)||"";
        return base+`;--cell-weight:${style.bold?700:400};font-weight:${style.bold?700:400};vertical-align:${escapeHTML(style.vAlign||"middle")};`;
      };
      tableHTML=function(mod){
        normalizeMerges(mod);ensureTableDimensions(mod);
        const rows=mod.rows||[];
        const cols=colCount(mod);
        const colgroup=`<colgroup>${Array.from({length:cols},(_,i)=>`<col style="width:${Number(mod.colWidths[i]||110)}px">`).join("")}</colgroup>`;
        return `<div class="content table-wrap"><table class="status-table">${colgroup}<tbody>${rows.map((row,r)=>`<tr style="height:${Number(mod.rowHeights[r]||46)}px">${row.map((cell,c)=>{
          if(isHiddenMergedCell(mod,r,c))return "";
          const raw=String(cell??"");
          const merge=getMergeAt(mod,r,c);
          const classes=[isSelectedCell(mod.id,r,c)?"cell-selected":"",isMultiSelectedCell(mod.id,r,c)?"cell-multi-selected":"",merge?"cell-merged":""].filter(Boolean).join(" ");
          const spanAttrs=merge?`${merge.rowspan>1?` rowspan="${merge.rowspan}"`:""}${merge.colspan>1?` colspan="${merge.colspan}"`:""}`:"";
          return `<td data-row="${r}" data-col="${c}"${spanAttrs} class="${classes}" style="${cellStyleCSS(mod,r,c)}"><div class="cell-display">${formatTextHTML(raw)}</div><textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${escapeHTML(raw)}</textarea><span class="cell-col-resizer" data-row="${r}" data-col="${c}"></span><span class="cell-row-resizer" data-row="${r}" data-col="${c}"></span></td>`;
        }).join("")}</tr>`).join("")}</tbody></table></div>`;
      };
      timeHTML=function(mod){
        return `<div class="content"><table><tbody>${(mod.timeZones||[]).map((r,i)=>`<tr><td contenteditable="true" data-array="timeZones" data-row="${i}" data-key="label">${fmt(r.label||"")}</td><td class="time-value">${escapeHTML(timeFor(r.zone,mod.showSeconds))}</td></tr>`).join("")}</tbody></table></div>`;
      };
      noteHTML=function(mod){
        const align=mod.align||"left", v=mod.vAlign||"top";
        return `<div class="note-area" style="--note-align:${escapeHTML(align)};--note-h-justify:${noteJustify(align)};--note-v-align:${noteVAlign(v)}" ${state.editMode?"contenteditable=\"true\"":""} data-key-direct="text"><div class="note-text">${escapeHTML(mod.text||"")}</div></div>`;
      };
      timelineHTML=function(mod){
        const start=new Date(mod.start||new Date().toISOString());
        const end=new Date(mod.end||new Date(Date.now()+86400000).toISOString());
        const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=d=>clamp(((new Date(d).getTime()-min)/(max-min))*100,0,100);
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v2" style="left:${left}%;width:${w}%;background:${hexToRgba(p.color||"#60a5fa",p.opacity??0.55)}"><span>${escapeHTML(p.name||"")}</span></div>`}).join("");
        const events=(mod.events||[]).map(ev=>`<div class="timeline-event-v2" style="left:${pos(ev.time)}%;color:${escapeHTML(ev.color||"#f8fafc")}" title="${escapeHTML(ev.name||"")}"><div class="ev-label">${escapeHTML(ev.name||"")}</div><div class="ev-arrow"></div></div>`).join("");
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track"><div class="timeline-line"></div>${periods}${events}</div><div class="timeline-scale v2"><span>${escapeHTML(formatTimelineLabel(mod.start))}</span><span>${escapeHTML(formatTimelineLabel(mod.end))}</span></div></div></div>`;
      };
      function formatTimelineLabel(v){try{return new Intl.DateTimeFormat("no-NO",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch{return String(v||"")}}
      function timeSettingsHTML(mod){
        const rows=(mod.timeZones||[]).map((z,i)=>`<div class="grid2 time-zone-admin" data-index="${i}" style="margin-bottom:8px"><div class="field"><label>Navn</label><input class="time-label" value="${escapeHTML(z.label||"")}"></div><div class="field"><label>Tidssone</label><select class="time-zone-select">${timeZoneOptions(z.zone||"UTC")}</select></div><button class="mini-btn danger time-remove" type="button">×</button></div>`).join("");
        return `<div class="field"><label>Tidssoner</label><div id="timeZoneRows">${rows}</div></div><label class="small" style="display:flex;gap:8px;align-items:center"><input id="showSeconds" type="checkbox" ${mod.showSeconds?"checked":""}> Vis sekunder</label><button id="addTimeZone" class="tool-btn" style="margin-top:9px">+ Tidssone</button>`;
      }
      function titleSettingsHTML(mod){
        const t=mod.titleStyle||{};
        return `<div class="grid2" style="margin-top:10px"><div class="field"><label>Overskrift X</label><input id="titleX" type="number" value="${Number(t.x??14)}"></div><div class="field"><label>Overskrift Y</label><input id="titleY" type="number" value="${Number(t.y??10)}"></div><div class="field"><label>Overskrift størrelse</label><input id="titleSize" type="range" min=".6" max="3" step=".1" value="${Number(t.size??1.05)}"></div><div class="field"><label>Overskrift justering</label><select id="titleAlign"><option value="left" ${(t.align||"left")==="left"?"selected":""}>Venstre</option><option value="center" ${t.align==="center"?"selected":""}>Midtstilt</option><option value="right" ${t.align==="right"?"selected":""}>Høyre</option></select></div></div>`;
      }
      settingsSpecific=function(mod){
        if(mod.type==="table")return `<div class="grid2"><button id="tableAddRow" class="tool-btn">+ Rad nederst</button><button id="tableAddCol" class="tool-btn">+ Kolonne sist</button><button id="tableInsertRowAfter" class="tool-btn">+ Rad etter valgt</button><button id="tableInsertColAfter" class="tool-btn">+ Kolonne etter valgt</button><button id="tableDelRow" class="tool-btn danger">− Valgt/siste rad</button><button id="tableDelCol" class="tool-btn danger">− Valgt/siste kolonne</button></div><p class="small" style="margin-top:8px">Du kan dra i cellekantene for å endre bredde/høyde fysisk, som i Excel.</p>`;
        if(mod.type==="weather")return `<div class="grid2"><button id="addAirport" class="tool-btn">+ Flyplass</button><button id="refreshTaf" class="tool-btn">Hent TAF</button></div><p class="small" style="margin-top:8px">Skriv ICAO i første kolonne. TAF kan også limes inn manuelt.</p>`;
        if(mod.type==="time")return timeSettingsHTML(mod);
        if(mod.type==="alert")return `<div class="field"><label>Nivå</label><select id="alertLevel"><option value="normal" ${mod.level==="normal"?"selected":""}>Normal</option><option value="warning" ${mod.level==="warning"?"selected":""}>Warning</option><option value="danger" ${mod.level==="danger"?"selected":""}>Danger</option></select></div>`;
        if(mod.type==="checklist")return `<button id="addCheck" class="tool-btn">+ Punkt</button>`;
        if(mod.type==="json")return `<button id="jsonToTable" class="tool-btn">Konverter til vanlig tabell</button>`;
        if(mod.type==="note")return `<div class="field"><label>Tekstjustering horisontalt</label><select id="noteAlign"><option value="left" ${(mod.align||"left")==="left"?"selected":""}>Venstre</option><option value="center" ${mod.align==="center"?"selected":""}>Midtstilt</option><option value="right" ${mod.align==="right"?"selected":""}>Høyre</option></select></div><div class="field"><label>Tekstjustering høyde</label><select id="noteVAlign"><option value="top" ${(mod.vAlign||"top")==="top"?"selected":""}>Topp</option><option value="middle" ${mod.vAlign==="middle"?"selected":""}>Midtstilt</option><option value="bottom" ${mod.vAlign==="bottom"?"selected":""}>Bunn</option></select></div>`;
        if(mod.type==="image")return `<div class="field"><label>Bildetilpasning</label><select id="imageFit"><option value="contain" ${(mod.fit||"contain")==="contain"?"selected":""}>Vis hele bildet</option><option value="cover" ${mod.fit==="cover"?"selected":""}>Fyll modulen</option><option value="fill" ${mod.fit==="fill"?"selected":""}>Strekk</option></select></div><button id="clearImageAdmin" class="tool-btn danger">Fjern bilde</button><p class="small" style="margin-top:8px">Bilder lagres inne i JSON-eksporten som data-URL.</p>`;
        if(mod.type==="timeline")return timelineSettingsHTML(mod);
        if(mod.type==="personell"){const sz=personellTextSizes(mod);return `<button id="addPersonell" class="tool-btn">+ Personellrad</button><div class="grid2" style="margin-top:10px"><div class="field"><label>Tekst funksjon</label><input id="personSizeFunction" type="range" min=".6" max="2.8" step=".1" value="${sz.function}"></div><div class="field"><label>Tekst navn</label><input id="personSizeName" type="range" min=".6" max="2.8" step=".1" value="${sz.name}"></div><div class="field"><label>Tekst lokasjon</label><input id="personSizeLocation" type="range" min=".6" max="2.8" step=".1" value="${sz.location}"></div><div class="field"><label>Tekst telefon</label><input id="personSizePhone" type="range" min=".6" max="2.8" step=".1" value="${sz.phone}"></div></div><p class="small" style="margin-top:8px">Telefonnummer hentes fra PERSONELL_DATA i koden.</p>`;}
        return "";
      };
      function deleteSelectedRows(mod){
        const targets=selectedCellTargets().filter(t=>t.moduleId===mod.id);
        if(targets.length){[...new Set(targets.map(t=>t.row))].sort((a,b)=>b-a).forEach(r=>{if(mod.rows.length>1)mod.rows.splice(r,1)});state.selectedCell=null;state.selectedCells=[];renderAll();return;}
        if(mod.rows.length){mod.rows.pop();renderAll();}
      }
      function deleteSelectedCols(mod){
        const targets=selectedCellTargets().filter(t=>t.moduleId===mod.id);
        const cols=targets.length?[...new Set(targets.map(t=>t.col))].sort((a,b)=>b-a):[colCount(mod)-1];
        cols.forEach(c=>mod.rows.forEach(r=>{if(r.length>1)r.splice(c,1)}));
        state.selectedCell=null;state.selectedCells=[];renderAll();
      }
      renderSelectedSettings=function(){
        const mod=selected();
        if(!mod){selectedSettings.className="muted";selectedSettings.innerHTML="Velg en modul på boardet.";return}
        if(!mod.titleStyle)mod.titleStyle={x:14,y:10,size:1.05,align:"left"};
        selectedSettings.className="";
        selectedSettings.innerHTML=`
          <div class="field"><label>Modulnavn i admin</label><input id="setName" value="${escapeHTML(mod.name||moduleDefs[mod.type].label)}"></div>
          <div class="grid2"><div class="field"><label>X</label><input id="setX" type="number" value="${Math.round(mod.x)}"></div><div class="field"><label>Y</label><input id="setY" type="number" value="${Math.round(mod.y)}"></div></div>
          <div class="grid2"><div class="field"><label>Bredde</label><input id="setW" type="number" value="${Math.round(mod.w)}"></div><div class="field"><label>Høyde</label><input id="setH" type="number" value="${Math.round(mod.h)}"></div></div>
          <div class="field"><label>Modul zoom</label><input id="setScale" type="range" min=".6" max="2.4" step=".1" value="${mod.scale||1}"></div>
          <div class="switch-row"><div class="switch-text"><strong>Vis overskrift</strong><span>Bruker modulnavnet som overskrift på modulen.</span></div><label class="switch"><input id="setShowTitle" type="checkbox" ${mod.showTitle?"checked":""}><span class="slider"></span></label></div>
          ${mod.showTitle?titleSettingsHTML(mod):""}
          ${settingsSpecific(mod)}
          <div class="grid2"><button id="duplicateSelected" class="tool-btn">Dupliser</button><button id="deleteSelected" class="tool-btn danger">Slett</button></div>`;
        bind("setName","input",e=>{mod.name=e.target.value;renderAll()});
        ["X","Y","W","H"].forEach(k=>bind("set"+k,"change",e=>{mod[k.toLowerCase()]=Number(e.target.value)||0;renderAll()}));
        bind("setScale","input",e=>{mod.scale=Number(e.target.value);renderAll()});
        bind("setShowTitle","change",e=>{mod.showTitle=e.target.checked;renderAll()});
        ["titleX","titleY","titleSize","titleAlign"].forEach(id=>bind(id,"input",()=>{mod.titleStyle={x:Number(document.getElementById("titleX")?.value||14),y:Number(document.getElementById("titleY")?.value||10),size:Number(document.getElementById("titleSize")?.value||1.05),align:document.getElementById("titleAlign")?.value||"left"};renderAll()}));
        bind("duplicateSelected","click",()=>{const copy=clone(mod);copy.id=uid();copy.x+=24;copy.y+=24;activeView().modules.push(copy);selectModule(copy.id)});
        bind("deleteSelected","click",()=>{activeView().modules=activeView().modules.filter(m=>m.id!==mod.id);state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()});
        bind("tableAddRow","click",()=>{mod.rows.push(Array(colCount(mod)).fill(""));renderAll()});
        bind("tableAddCol","click",()=>{const n=colCount(mod)+1;mod.rows.forEach(r=>r.push(""));if(!mod.rows.length)mod.rows.push(Array(n).fill(""));renderAll()});
        bind("tableInsertRowAfter","click",()=>insertRowAfterSelection(mod));
        bind("tableInsertColAfter","click",()=>insertColAfterSelection(mod));
        bind("tableDelRow","click",()=>deleteSelectedRows(mod));
        bind("tableDelCol","click",()=>deleteSelectedCols(mod));
        bind("addAirport","click",()=>{mod.airports.push({icao:"",taf:"",updated:""});renderAll()});
        bind("refreshTaf","click",()=>refreshTAF(mod));
        bind("showSeconds","change",e=>{mod.showSeconds=e.target.checked;renderAll()});
        bind("addTimeZone","click",()=>{mod.timeZones.push({label:"",zone:"UTC"});renderAll()});
        document.querySelectorAll(".time-zone-admin").forEach(row=>{
          row.querySelector(".time-label")?.addEventListener("input",()=>{const z=mod.timeZones[+row.dataset.index];if(z){z.label=row.querySelector(".time-label").value;save();tick();}});
          row.querySelector(".time-zone-select")?.addEventListener("change",()=>{const z=mod.timeZones[+row.dataset.index];if(z){z.zone=row.querySelector(".time-zone-select").value;save();tick();}});
          row.querySelector(".time-remove")?.addEventListener("click",()=>{mod.timeZones.splice(+row.dataset.index,1);renderAll()});
        });
        bind("alertLevel","change",e=>{mod.level=e.target.value;renderAll()});
        bind("addCheck","click",()=>{mod.items.push({text:"",done:false});renderAll()});
        bind("jsonToTable","click",()=>jsonToTable(mod));
        bind("noteAlign","change",e=>{mod.align=e.target.value;renderAll()});
        bind("noteVAlign","change",e=>{mod.vAlign=e.target.value;renderAll()});
        bind("imageFit","change",e=>{mod.fit=e.target.value;renderAll()});
        bind("clearImageAdmin","click",()=>{mod.src="";renderAll()});
        bind("addPersonell","click",()=>{mod.rows.push({function:"",name:"",location:""});renderAll()});
        bindPersonellSizeControls(mod);
        bindTimelineControls(mod);
      };
      function ifRulesAdminHTML(fn){return `<div class="if-rules-box"><div class="section-title" style="margin-bottom:8px"><h2>IF-regel</h2><button id="addIfRule" class="mini-btn">+</button></div><div id="ifRulesList">${(fn.ifRules||[]).map((rule,i)=>ifRuleRowHTML(rule,i)).join("")}</div></div>`}
      function cellFunctionsAdminHTML(fn){return `<div class="section" style="margin:12px 0 0;padding:11px;background:rgba(2,6,23,.35)"><div class="section-title"><h2>Cellefunksjoner</h2></div>${ifRulesAdminHTML(fn)}<div class="switch-row"><div class="switch-text"><strong>DTG ved radendring</strong><span>Oppdaterer cellen med Zulu-DTG når tekst i samme rad faktisk endres.</span></div><label class="switch"><input id="dtgEnabled" type="checkbox" ${fn.dtgEnabled?"checked":""}><span class="slider"></span></label></div><div class="field" style="margin-top:10px"><label>Tidsgrunnlag</label><select id="dtgMode"><option value="AUTO" ${(!fn.dtgMode||fn.dtgMode==="AUTO")?"selected":""}>AUTO</option><option value="ALFA" ${fn.dtgMode==="ALFA"?"selected":""}>ALFA / UTC+1</option><option value="BRAVO" ${fn.dtgMode==="BRAVO"?"selected":""}>BRAVO / UTC+2</option></select></div></div>`}
      renderCellSettings=function(){
        const targets=selectedCellTargets(); const primary=targets[0]; const mod=primary?getModule(primary.moduleId):null;
        if(!primary||!mod||mod.type!=="table"){cellSettings.className="muted";cellSettings.innerHTML="Klikk én celle for å velge/redigere. Dra over flere celler for å markere et område.";return;}
        ensureCellFunctionStore(mod);
        const style=getCellStyle(mod,primary.row,primary.col); const textColor=style.textColor||"#e2e8f0",bgColor=style.bgColor||"#000000",bgOpacity=style.bgOpacity??0,align=style.align||"center",vAlign=style.vAlign||"middle";
        const multi=targets.length>1; cellSettings.className="";
        if(multi){
          const fn=getCellFunction(mod,primary.row,primary.col);
          cellSettings.innerHTML=`<p class="small" style="margin-bottom:9px">${targets.length} valgte celler. Endringer under kopieres til hver individuelle celle.</p><div class="field"><label>Ordliste for valgte celler</label><textarea id="cellWords" placeholder="Ett ord eller uttrykk per linje">${escapeHTML(getCellWords(mod,primary.row,primary.col).join("\n"))}</textarea></div><div class="field"><label>Cellefarger</label><div class="cell-style-row"><div><input id="cellTextColor" type="color" value="${escapeHTML(textColor)}"><p class="small">Tekst</p></div><div><input id="cellBgColor" type="color" value="${escapeHTML(bgColor)}"><p class="small">Celle</p></div></div></div><div class="field"><label>Cellefarge opacity</label><input id="cellBgOpacity" type="range" min="0" max="1" step="0.05" value="${bgOpacity}"><div class="opacity-readout"><span>Transparent</span><span id="cellOpacityLabel">${Math.round(bgOpacity*100)}%</span></div></div><div class="grid2"><div class="field"><label>Tekstjustering</label><select id="cellAlign"><option value="left" ${align==="left"?"selected":""}>Venstre</option><option value="center" ${align==="center"?"selected":""}>Midtstilt</option><option value="right" ${align==="right"?"selected":""}>Høyre</option></select></div><div class="field"><label>Høydejustering</label><select id="cellVAlign"><option value="top" ${vAlign==="top"?"selected":""}>Topp</option><option value="middle" ${vAlign==="middle"?"selected":""}>Midt</option><option value="bottom" ${vAlign==="bottom"?"selected":""}>Bunn</option></select></div></div><label class="small" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input id="cellBold" type="checkbox" ${style.bold?"checked":""}> Bold tekst</label>${cellFunctionsAdminHTML(fn)}<div class="grid2" style="margin-top:10px"><button id="mergeCenterCells" class="tool-btn primary">Merge & center</button><button id="unmergeCells" class="tool-btn">Unmerge</button><button id="resetCellDesign" class="tool-btn danger">Reset design</button></div>`;
          wireCellStyleControls(); wireAutoCellPanel(mod,targets,true); return;
        }
        const sc=primary, value=mod.rows?.[sc.row]?.[sc.col]??"", words=getCellWords(mod,sc.row,sc.col), fn=getCellFunction(mod,sc.row,sc.col);
        cellSettings.innerHTML=`<p class="small" style="margin-bottom:9px">${cellName(sc.row,sc.col)} · Rad ${sc.row+1}, kolonne ${sc.col+1}. Alt lagres automatisk.</p><div class="field"><label>Celleinnhold</label><textarea id="cellValue">${escapeHTML(value)}</textarea></div><div class="field"><label>Ordliste for denne cellen</label><textarea id="cellWords" placeholder="Ett ord eller uttrykk per linje">${escapeHTML(words.join("\n"))}</textarea></div><div class="field"><label>Cellefarger</label><div class="cell-style-row"><div><input id="cellTextColor" type="color" value="${escapeHTML(textColor)}"><p class="small">Tekst</p></div><div><input id="cellBgColor" type="color" value="${escapeHTML(bgColor)}"><p class="small">Celle</p></div></div></div><div class="field"><label>Cellefarge opacity</label><input id="cellBgOpacity" type="range" min="0" max="1" step="0.05" value="${bgOpacity}"><div class="opacity-readout"><span>Transparent</span><span id="cellOpacityLabel">${Math.round(bgOpacity*100)}%</span></div></div><div class="grid2"><div class="field"><label>Tekstjustering</label><select id="cellAlign"><option value="left" ${align==="left"?"selected":""}>Venstre</option><option value="center" ${align==="center"?"selected":""}>Midtstilt</option><option value="right" ${align==="right"?"selected":""}>Høyre</option></select></div><div class="field"><label>Høydejustering</label><select id="cellVAlign"><option value="top" ${vAlign==="top"?"selected":""}>Topp</option><option value="middle" ${vAlign==="middle"?"selected":""}>Midt</option><option value="bottom" ${vAlign==="bottom"?"selected":""}>Bunn</option></select></div></div><label class="small" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input id="cellBold" type="checkbox" ${style.bold?"checked":""}> Bold tekst</label>${cellFunctionsAdminHTML(fn)}<div class="grid2" style="margin-top:10px"><button id="unmergeCells" class="tool-btn">Unmerge</button><button id="centerSelectedCells" class="tool-btn">Midtstill</button><button id="resetCellDesign" class="tool-btn danger">Reset design</button></div>`;
        wireCellStyleControls(); wireAutoCellPanel(mod,targets,false);
      };
      function readFullCellStyleControls(){return {textColor:document.getElementById("cellTextColor")?.value||"#e2e8f0",bgColor:document.getElementById("cellBgColor")?.value||"#000000",bgOpacity:Number(document.getElementById("cellBgOpacity")?.value||0),align:document.getElementById("cellAlign")?.value||"center",vAlign:document.getElementById("cellVAlign")?.value||"middle",bold:!!document.getElementById("cellBold")?.checked};}
      readCellStyleControls=readFullCellStyleControls;
      function wireAutoCellPanel(mod,targets,multi){
        const saveWords=()=>{const words=(document.getElementById("cellWords")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);targets.forEach(t=>{const m=getModule(t.moduleId);if(m)setCellWords(m,t.row,t.col,words)});save();};
        const saveFn=()=>{const fn={ifRules:readIfRulesFromDOM(),dtgEnabled:!!document.getElementById("dtgEnabled")?.checked,dtgMode:document.getElementById("dtgMode")?.value||"AUTO"};targets.forEach(t=>{const m=getModule(t.moduleId);if(m){ensureCellFunctionStore(m);m.cellFunctions[`${t.row}:${t.col}`]=clone(fn)}});save();};
        document.getElementById("cellValue")?.addEventListener("input",e=>{const t=targets[0],m=getModule(t.moduleId);const old=m.rows[t.row][t.col];m.rows[t.row][t.col]=e.target.value;applyCellFunctions(m,t.row,t.col,{textChanged:old!==e.target.value});refreshTableCellDOM(m,t.row,t.col);save();});
        document.getElementById("cellWords")?.addEventListener("input",saveWords);
        ["cellTextColor","cellBgColor","cellBgOpacity","cellAlign","cellVAlign","cellBold"].forEach(id=>{const el=document.getElementById(id);el?.addEventListener("input",()=>{targets.forEach(t=>{const m=getModule(t.moduleId);if(m){setCellStyle(m,t.row,t.col,readFullCellStyleControls());refreshTableCellDOM(m,t.row,t.col)}});save();});el?.addEventListener("change",()=>el.dispatchEvent(new Event("input")))});
        bind("addIfRule","click",()=>{document.getElementById("ifRulesList").insertAdjacentHTML("beforeend",ifRuleRowHTML({enabled:true,source:"A1",match:"",output:""},Date.now()));wireIfRuleDeleteButtons();document.querySelectorAll("#ifRulesList input").forEach(inp=>inp.addEventListener("input",saveFn));});
        wireIfRuleDeleteButtons();document.querySelectorAll("#ifRulesList input,#dtgEnabled,#dtgMode").forEach(inp=>{inp.addEventListener("input",saveFn);inp.addEventListener("change",saveFn)});
        bind("resetCellDesign","click",()=>resetSelectedCellDesign());bind("centerSelectedCells","click",()=>centerSelectedCells());bind("mergeCenterCells","click",()=>mergeCenterSelectedCells());bind("unmergeCells","click",()=>unmergeSelectedCells());
      }
      // Override commit so admin panel and cell edits auto-save without needing button.
      persistSelectedCellSettings=function(rerender=false){const targets=selectedCellTargets();if(!targets.length)return;const words=(document.getElementById("cellWords")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);targets.forEach(t=>{const mod=getModule(t.moduleId);if(!mod)return;setCellWords(mod,t.row,t.col,words);setCellStyle(mod,t.row,t.col,readFullCellStyleControls());ensureCellFunctionStore(mod);mod.cellFunctions[`${t.row}:${t.col}`]={ifRules:readIfRulesFromDOM(),dtgEnabled:!!document.getElementById("dtgEnabled")?.checked,dtgMode:document.getElementById("dtgMode")?.value||"AUTO"};});save();if(rerender)renderAll();};
      buildModule=function(mod){
        const d=moduleDefs[mod.type]||moduleDefs.table; if(!mod.titleStyle)mod.titleStyle={x:14,y:10,size:1.05,align:"left"};
        const el=document.createElement("article");
        el.className="mod"+(mod.showTitle?" has-title":"");el.dataset.id=mod.id;el.dataset.type=mod.type;el.style.left=px(mod.x);el.style.top=px(mod.y);el.style.width=px(mod.w);el.style.height=px(mod.h);el.style.setProperty("--module-scale",String(mod.scale||1));el.setAttribute("style",`${el.getAttribute("style")||""};${titleStyle(mod)}`);el.classList.toggle("selected",mod.id===state.selectedId);
        el.innerHTML=`${mod.showTitle?`<div class="mod-title">${escapeHTML(mod.name||d.label||"Modul")}</div>`:""}<button class="drag-handle" type="button">↕ Flytt</button><div class="mod-tools"><button class="mini-btn dup-btn">⧉</button><button class="mini-btn danger del-btn">×</button></div><div class="module-content mod-inner">${contentHTML(mod)}</div><div class="resize-handle"></div>`;
        return el;
      };
      renderBoard=function(){
        board.querySelectorAll(".mod,.view-tabs-board").forEach(x=>x.remove());
        activeView().modules.forEach(mod=>{normalizeMod(mod);const el=buildModule(mod);board.appendChild(el);wireModule(el,mod)});
        const nav=document.createElement("div");nav.className="view-tabs-board";nav.innerHTML=(state.views||[]).map(v=>`<button class="view-tab-board ${v.id===state.activeViewId?"active":""}" data-view="${escapeHTML(v.id)}">${escapeHTML(v.name)}</button>`).join("");
        nav.querySelectorAll("button").forEach(btn=>btn.onclick=()=>{state.activeViewId=btn.dataset.view;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()});
        board.appendChild(nav);
        empty.style.display=activeView().modules.length?"none":"grid";
      };
      wireModule=function(el,mod){originalWireModule(el,mod);wireCellResizeHandles(el,mod);};
      function wireCellResizeHandles(el,mod){
        if(mod.type!=="table")return;ensureTableDimensions(mod);
        el.querySelectorAll(".cell-col-resizer").forEach(h=>h.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();const c=+h.dataset.col,startX=e.clientX,startW=Number(mod.colWidths[c]||110);h.setPointerCapture?.(e.pointerId);const move=ev=>{mod.colWidths[c]=Math.max(36,startW+ev.clientX-startX);renderAll()};const up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);save()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);}));
        el.querySelectorAll(".cell-row-resizer").forEach(h=>h.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();const r=+h.dataset.row,startY=e.clientY,startH=Number(mod.rowHeights[r]||46);h.setPointerCapture?.(e.pointerId);const move=ev=>{mod.rowHeights[r]=Math.max(24,startH+ev.clientY-startY);renderAll()};const up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);save()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);}));
      }
      // DTG only updates when text actually changed.
      const oldApplyCellFunctions=applyCellFunctions;
      applyCellFunctions=function(mod,changedRow,changedCol,options={}){if(options && options.textChanged===false)return;return oldApplyCellFunctions(mod,changedRow,changedCol,{...options,textChanged:true});};
      const oldCommitTableEditor=commitTableEditor;
      commitTableEditor=function(input,mod){const r=+input.dataset.row,c=+input.dataset.col;if(!mod.rows?.[r])return;const old=mod.rows[r][c];mod.rows[r][c]=input.value.trim();applyCellFunctions(mod,r,c,{textChanged:old!==mod.rows[r][c]});refreshTableCellDOM(mod,r,c);save();renderAll();};
      // Ensure rendered cells keep new width/height/bold without full render after style changes.
      const oldRefreshTableCellDOM=refreshTableCellDOM;
      refreshTableCellDOM=function(mod,r,c){oldRefreshTableCellDOM(mod,r,c);const td=board.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"] td[data-row="${r}"][data-col="${c}"]`);if(td){td.setAttribute("style",cellStyleCSS(mod,r,c));const disp=td.querySelector(".cell-display");if(disp)disp.innerHTML=formatTextHTML(mod.rows?.[r]?.[c]??"");}};
      const oldAddModule=addModule;
      addModule=function(type,clientX,clientY){oldAddModule(type,clientX,clientY);const mod=selected();if(mod&&mod.type==="timeline"){mod.w=820;mod.h=240;mod.start=new Date().toISOString();mod.end=new Date(Date.now()+4*3600000).toISOString();mod.periods=[{name:"Periode",start:mod.start,end:new Date(Date.now()+2*3600000).toISOString(),color:"#60a5fa",opacity:.55,textColor:"#ffffff"}];mod.events=[{name:"Hendelse",time:new Date(Date.now()+3600000).toISOString(),color:"#f8fafc"}];renderAll();}};
      const oldNormalizeMod=normalizeMod;
      normalizeMod=function(mod){oldNormalizeMod(mod);if(mod.type==="table")ensureTableDimensions(mod);if(!mod.titleStyle)mod.titleStyle={x:14,y:10,size:1.05,align:"left"};if(mod.type==="note"&&!mod.vAlign)mod.vAlign="top";};
      // Re-render once after overrides are active.
      try{renderAll()}catch(e){console.error("Request patch v2 render failed",e)}
    })();

    /* Request patch v3: timeline admin compaction, log module, title board editing, clearer bold, selected cell sizing */
    (function(){
      const css=document.createElement('style');
      css.textContent=`
        .timeline-admin-compact{display:grid;gap:10px}.timeline-admin-card{border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(2,6,23,.34);padding:10px;display:grid;gap:8px}.timeline-admin-card .field{margin:0}.timeline-admin-card .grid-mini{display:grid;grid-template-columns:1fr 1fr;gap:8px}.timeline-tick{position:absolute;top:78px;width:2px;height:26px;background:rgba(226,232,240,.9);transform:translateX(-1px);border-radius:999px}.timeline-tick-label{position:absolute;top:110px;transform:translateX(-50%);font-size:.72em;color:#cbd5e1;white-space:nowrap}.timeline-period-v3{position:absolute;top:86px;height:18px;border-radius:999px;transform:translateY(-50%);box-shadow:0 0 0 1px rgba(255,255,255,.18);overflow:visible}.timeline-period-v3 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75)}
        .mod-title{cursor:default}.edit-mode .mod.has-title .mod-title{pointer-events:auto;cursor:move;outline:1px dashed transparent}.edit-mode .mod.has-title .mod-title:hover{outline-color:rgba(147,197,253,.7);background:rgba(15,23,42,.35);border-radius:8px}.mod-title.centered-title{left:0!important;right:0!important;width:100%!important;max-width:100%!important;padding-inline:16px}.mod-title.right-title{left:0!important;right:0!important;width:100%!important;max-width:100%!important;padding-inline:16px}
        .bold-toggle{border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.08);display:flex;gap:9px;align-items:center;justify-content:center;font-weight:900;color:white}.bold-toggle input{width:18px;height:18px}.bold-toggle .b-icon{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.15);font-size:17px}.bold-toggle:has(input:checked){background:rgba(59,130,246,.32);border-color:rgba(147,197,253,.55)}
        .log-content{height:100%;display:flex;flex-direction:column;gap:10px}.log-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.log-toolbar input[type=text]{flex:1;min-width:140px;border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:rgba(2,6,23,.64);color:white}.log-list{display:grid;gap:10px;overflow:auto}.log-entry{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:12px;white-space:pre-wrap;line-height:1.4}.log-entry b,.log-bold{font-weight:950;color:#fff}.log-empty{border:1px dashed rgba(255,255,255,.25);border-radius:16px;padding:18px;text-align:center;color:#cbd5e1}.log-file{display:none}
        .cell-size-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cell-size-controls input{width:100%;border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:rgba(2,6,23,.64);color:white}.admin-panel .field input[type=number]::-webkit-inner-spin-button{opacity:.5}
      `;
      document.head.appendChild(css);

      moduleDefs.log={label:'Log',icon:'≡',iconClass:'note',hint:'Tekstlogg med filter'};

      function v3Date(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?new Date():d}
      function formatTL(value,unit){const d=v3Date(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      timelineHTML=function(mod){
        const start=v3Date(mod.start), end=v3Date(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=d=>clamp(((v3Date(d).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick" style="left:${pct}%"></div><div class="timeline-tick-label" style="left:${pct}%">${escapeHTML(formatTL(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v3" style="left:${left}%;width:${w}%;background:${hexToRgba(p.color||'#60a5fa',p.opacity??0.55)}"><span>${escapeHTML(p.name||'')}</span></div>`}).join('');
        const events=(mod.events||[]).map(ev=>`<div class="timeline-event-v2" style="left:${pos(ev.time)}%;color:${escapeHTML(ev.color||'#f8fafc')}" title="${escapeHTML(ev.name||'')}"><div class="ev-label">${escapeHTML(ev.name||'')}</div><div class="ev-arrow"></div></div>`).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track"><div class="timeline-line"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${escapeHTML(formatTL(mod.start,unit))}</span><span>${escapeHTML(formatTL(mod.end,unit))}</span></div></div></div>`;
      };
      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour';
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}"><div class="field"><label>Navn</label><input class="tl-p-name" value="${escapeHTML(p.name||'')}" placeholder="Periode"></div><div class="grid-mini"><div class="field"><label>Start</label><input class="tl-p-start" type="datetime-local" value="${toDateTimeLocal(p.start||mod.start)}"></div><div class="field"><label>Slutt</label><input class="tl-p-end" type="datetime-local" value="${toDateTimeLocal(p.end||mod.end)}"></div></div><div class="grid-mini"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${escapeHTML(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div><button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button></div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin" data-index="${i}"><div class="field"><label>Hendelse</label><input class="tl-e-name" value="${escapeHTML(ev.name||'')}" placeholder="Hendelse"></div><div class="grid-mini"><div class="field"><label>Tid</label><input class="tl-e-time" type="datetime-local" value="${toDateTimeLocal(ev.time||mod.start)}"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${escapeHTML(ev.color||'#f8fafc')}"></div></div><button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button></div>`).join('');
        return `<div class="timeline-admin-compact"><div class="grid2"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div></div><div class="grid2"><div class="field"><label>Visning</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker mellom start/slutt</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div><div class="section"><div class="section-title"><h2>Perioder</h2><button id="timelineAddPeriod" class="mini-btn">+</button></div><div id="timelinePeriods">${periods}</div></div><div class="section"><div class="section-title"><h2>Enkelthendelser</h2><button id="timelineAddEvent" class="mini-btn">+</button></div><div id="timelineEvents">${events}</div></div></div>`;
      };
      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDateTimeLocal(s.value); if(e)mod.end=fromDateTimeLocal(e.value); if(u)mod.timeUnit=u.value; if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDateTimeLocal(row.querySelector('.tl-p-start')?.value),end:fromDateTimeLocal(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>({name:row.querySelector('.tl-e-name')?.value||'',time:fromDateTimeLocal(row.querySelector('.tl-e-time')?.value),color:row.querySelector('.tl-e-color')?.value||'#f8fafc'})); save();
      };
      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return; ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id); el?.addEventListener('input',()=>{readTimelineControls(mod);renderAll()}); el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll()});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll()});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.events.push({name:'Hendelse',time:mod.start,color:'#f8fafc'});renderAll()});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>inp.addEventListener('input',()=>{readTimelineControls(mod);renderAll()}));
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>inp.addEventListener('input',()=>{readTimelineControls(mod);renderAll()}));
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll()});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll()});
      };

      function logHTML(mod){
        const filter=String(mod.filter||'').trim().toLowerCase(); const entries=(mod.entries||[]).filter(x=>!filter||String(x.text||'').toLowerCase().includes(filter));
        return `<div class="content log-content"><div class="log-toolbar edit-only"><input class="log-file" type="file" accept="application/pdf"><button class="tool-btn log-pick" type="button">Last opp tekstfil</button><input class="log-filter" type="text" placeholder="Filtrer innhold" value="${escapeHTML(mod.filter||'')}"></div><div class="log-list">${entries.length?entries.map(e=>`<div class="log-entry">${formatLogEntry(e)}</div>`).join(''):`<div class="log-empty">Last opp tekstfil og bruk filterfeltet for å vise relevante logger.</div>`}</div></div>`;
      }
      function formatLogEntry(e){let txt=escapeHTML(e.text||''); (e.bold||[]).sort((a,b)=>String(b).length-String(a).length).forEach(b=>{const safe=escapeRegExp(escapeHTML(b)); if(safe)txt=txt.replace(new RegExp(safe,'g'),`<span class="log-bold">${escapeHTML(b)}</span>`)}); return txt;}
      async function ensurePdfJs(){
        if(window.pdfjsLib)return window.pdfjsLib;
        await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return});
         return window.pdfjsLib;
      }
      async function extractPdfLogs(file,mod){
        try{const pdfjs=await ensurePdfJs(); const buf=await file.arrayBuffer(); const pdf=await pdfjs.getDocument({data:buf}).promise; let full=''; const bold=[];
          for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p); const content=await page.getTextContent(); let lastY=null,line=''; for(const item of content.items){const y=Math.round(item.transform?.[5]||0); if(lastY!==null&&Math.abs(y-lastY)>4){full+=line.trimEnd()+'\n'; line=''} line+=(item.str||'')+' '; const fn=String(item.fontName||''); if(/bold|black|heavy/i.test(fn)&&String(item.str||'').trim())bold.push(String(item.str).trim()); lastY=y;} if(line)full+=line.trimEnd()+'\n'; full+='\n';}
          const parts=full.split(/\n\s*(?:[-–—_]{8,}|={8,})\s*\n/g).map(x=>x.trim()).filter(Boolean); mod.entries=parts.map(text=>({text,bold:bold.filter(b=>text.includes(b)).slice(0,80)})); mod.fileName=file.name; save(); renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContentHTML=contentHTML; contentHTML=function(mod){if(mod.type==='log')return logHTML(mod); return prevContentHTML(mod)};
      const prevSettingsSpecific=settingsSpecific; settingsSpecific=function(mod){
        if(mod.type==='log')return `<div class="field"><label>Loggfilter</label><input id="logFilterAdmin" value="${escapeHTML(mod.filter||'')}" placeholder="Søk/filter"></div><button id="logClear" class="tool-btn danger">Tøm logg</button><p class="small" style="margin-top:8px">Tekstlogg leses lokalt i nettleseren. Logger deles på lange streker.</p>`;
        return prevSettingsSpecific(mod);
      };
      const prevNormalizeMod=normalizeMod; normalizeMod=function(mod){prevNormalizeMod(mod); if(mod.type==='timeline'){if(!mod.timeUnit)mod.timeUnit='hour'; if(mod.tickCount===undefined)mod.tickCount=3;} if(mod.type==='log'){if(!Array.isArray(mod.entries))mod.entries=[]; if(typeof mod.filter!=='string')mod.filter='';} if(!mod.titleStyle)mod.titleStyle={size:1.05,align:'left',x:14,y:10};};
      const prevAddModule=addModule; addModule=function(type,clientX,clientY){prevAddModule(type,clientX,clientY); const mod=selected(); if(mod&&mod.type==='log'){mod.w=560;mod.h=420;mod.entries=[];mod.filter='';renderAll();}};

      function titleStyleV3(mod){const t=mod.titleStyle||{}; const size=Number(t.size??1.05), align=t.align||'left', x=Number(t.x??14), y=Number(t.y??10); if(align==='center')return `--title-x:0px;--title-y:${y}px;--title-size:${size}rem;--title-align:center`; if(align==='right')return `--title-x:0px;--title-y:${y}px;--title-size:${size}rem;--title-align:right`; return `--title-x:${x}px;--title-y:${y}px;--title-size:${size}rem;--title-align:left`;}
      buildModule=function(mod){const d=moduleDefs[mod.type]||moduleDefs.table; if(!mod.titleStyle)mod.titleStyle={size:1.05,align:'left',x:14,y:10}; const el=document.createElement('article'); el.className='mod'+(mod.showTitle?' has-title':''); el.dataset.id=mod.id; el.dataset.type=mod.type; el.style.left=px(mod.x); el.style.top=px(mod.y); el.style.width=px(mod.w); el.style.height=px(mod.h); el.style.setProperty('--module-scale',String(mod.scale||1)); el.setAttribute('style',`${el.getAttribute('style')||''};${titleStyleV3(mod)}`); el.classList.toggle('selected',mod.id===state.selectedId); const align=mod.titleStyle?.align||'left'; el.innerHTML=`${mod.showTitle?`<div class="mod-title ${align==='center'?'centered-title':align==='right'?'right-title':''}">${escapeHTML(mod.name||d.label||'Modul')}</div>`:''}<button class="drag-handle" type="button">↕ Flytt</button><div class="mod-tools"><button class="mini-btn dup-btn">⧉</button><button class="mini-btn danger del-btn">×</button></div><div class="module-content mod-inner">${contentHTML(mod)}</div><div class="resize-handle"></div>`; return el;};
      function titleSettingsHTMLV3(mod){const t=mod.titleStyle||{}; return `<div class="grid2" style="margin-top:10px"><div class="field"><label>Overskrift størrelse</label><input id="titleSize" type="range" min=".6" max="3" step=".1" value="${Number(t.size??1.05)}"></div><div class="field"><label>Overskrift justering</label><select id="titleAlign"><option value="left" ${(t.align||'left')==='left'?'selected':''}>Venstre</option><option value="center" ${t.align==='center'?'selected':''}>Midtstilt</option><option value="right" ${t.align==='right'?'selected':''}>Høyre</option></select></div></div><p class="small" style="margin-top:6px">Flytt overskriften direkte på boardet ved å dra i overskriftsteksten.</p>`;}
      renderSelectedSettings=function(){
        const mod=selected(); if(!mod){selectedSettings.className='muted';selectedSettings.innerHTML='Velg en modul på boardet.';return} selectedSettings.className='';
        selectedSettings.innerHTML=`<div class="field"><label>Modulnavn i admin</label><input id="setName" value="${escapeHTML(mod.name||moduleDefs[mod.type].label)}"></div><div class="field"><label>Modul zoom</label><input id="setScale" type="range" min=".6" max="2.4" step=".1" value="${mod.scale||1}"></div><div class="switch-row"><div class="switch-text"><strong>Vis overskrift</strong><span>Bruker modulnavnet som overskrift på modulen.</span></div><label class="switch"><input id="setShowTitle" type="checkbox" ${mod.showTitle?'checked':''}><span class="slider"></span></label></div>${mod.showTitle?titleSettingsHTMLV3(mod):''}${settingsSpecific(mod)}<div class="grid2"><button id="duplicateSelected" class="tool-btn">Dupliser</button><button id="deleteSelected" class="tool-btn danger">Slett</button></div>`;
        bind('setName','input',e=>{mod.name=e.target.value;save();renderAll()}); bind('setScale','input',e=>{mod.scale=Number(e.target.value);renderAll()}); bind('setShowTitle','change',e=>{mod.showTitle=e.target.checked;renderAll()});
        bind('titleSize','input',e=>{mod.titleStyle=mod.titleStyle||{};mod.titleStyle.size=Number(e.target.value)||1.05;renderAll()}); bind('titleAlign','change',e=>{mod.titleStyle=mod.titleStyle||{};mod.titleStyle.align=e.target.value;renderAll()});
        bind('duplicateSelected','click',()=>{const copy=clone(mod);copy.id=uid();copy.x+=24;copy.y+=24;activeView().modules.push(copy);selectModule(copy.id)}); bind('deleteSelected','click',()=>{activeView().modules=activeView().modules.filter(m=>m.id!==mod.id);state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()});
        bind('tableAddRow','click',()=>{mod.rows.push(Array(colCount(mod)).fill(''));renderAll()}); bind('tableAddCol','click',()=>{const n=colCount(mod)+1;mod.rows.forEach(r=>r.push(''));if(!mod.rows.length)mod.rows.push(Array(n).fill(''));renderAll()}); bind('tableInsertRowAfter','click',()=>insertRowAfterSelection(mod)); bind('tableInsertColAfter','click',()=>insertColAfterSelection(mod)); bind('tableDelRow','click',()=>deleteSelectedOrLastRow(mod)); bind('tableDelCol','click',()=>deleteSelectedOrLastCol(mod));
        bind('addAirport','click',()=>{mod.airports.push({icao:'',taf:'',updated:''});renderAll()}); bind('refreshTaf','click',()=>refreshTAF(mod)); bind('addTimeZone','click',()=>{mod.timeZones.push({label:'',zone:'UTC'});renderAll()}); bind('showSeconds','change',e=>{mod.showSeconds=e.target.checked;renderAll()}); bind('timeZoneList','input',e=>{mod.timeZones=e.target.value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [label,zone]=line.split('|').map(x=>x.trim());return{label:label||zone||'',zone:zone||label||'UTC'}});renderAll()});
        document.querySelectorAll('.time-zone-admin').forEach(row=>{row.querySelector('.time-label')?.addEventListener('input',e=>{mod.timeZones[+row.dataset.index].label=e.target.value;save();renderAll()}); row.querySelector('.time-zone-select')?.addEventListener('change',e=>{mod.timeZones[+row.dataset.index].zone=e.target.value;save();renderAll()}); row.querySelector('.time-remove')?.addEventListener('click',()=>{mod.timeZones.splice(+row.dataset.index,1);renderAll()})});
        bind('alertLevel','change',e=>{mod.level=e.target.value;renderAll()}); bind('addCheck','click',()=>{mod.items.push({text:'',done:false});renderAll()}); bind('jsonToTable','click',()=>jsonToTable(mod)); bind('noteAlign','change',e=>{mod.align=e.target.value;renderAll()}); bind('noteVAlign','change',e=>{mod.vAlign=e.target.value;renderAll()}); bind('imageFit','change',e=>{mod.fit=e.target.value;renderAll()}); bind('clearImageAdmin','click',()=>{mod.src='';renderAll()}); bind('addPersonell','click',()=>{mod.rows.push({function:'',name:'',location:''});renderAll()}); if(typeof bindPersonellSizeControls==='function')bindPersonellSizeControls(mod); bindTimelineControls(mod); bind('logFilterAdmin','input',e=>{mod.filter=e.target.value;save();renderAll()}); bind('logClear','click',()=>{mod.entries=[];mod.fileName='';renderAll()});
      };

      function selectedRowsCols(){const ts=selectedCellTargets(); return {rows:[...new Set(ts.map(t=>t.row))],cols:[...new Set(ts.map(t=>t.col))]};}
      const prevRenderCellSettings=renderCellSettings; renderCellSettings=function(){prevRenderCellSettings(); const targets=selectedCellTargets(); if(!targets.length)return; const mod=getModule(targets[0].moduleId); if(!mod||mod.type!=='table')return; const {rows,cols}=selectedRowsCols(); const w=mod.colWidths?.[cols[0]]||110, h=mod.rowHeights?.[rows[0]]||46; const html=`<div class="field"><label>Celle-/markert størrelse</label><div class="cell-size-controls"><input id="cellWidthPx" type="number" min="36" value="${Math.round(w)}" placeholder="Bredde px"><input id="cellHeightPx" type="number" min="24" value="${Math.round(h)}" placeholder="Høyde px"></div></div>`; cellSettings.insertAdjacentHTML('afterbegin',html); const apply=()=>{if(!Array.isArray(mod.colWidths))mod.colWidths=[]; if(!Array.isArray(mod.rowHeights))mod.rowHeights=[]; const nw=Number(document.getElementById('cellWidthPx')?.value||w), nh=Number(document.getElementById('cellHeightPx')?.value||h); cols.forEach(c=>mod.colWidths[c]=Math.max(36,nw)); rows.forEach(r=>mod.rowHeights[r]=Math.max(24,nh)); save(); renderAll();}; document.getElementById('cellWidthPx')?.addEventListener('change',apply); document.getElementById('cellHeightPx')?.addEventListener('change',apply); const bold=document.getElementById('cellBold'); if(bold&&bold.parentElement&&!bold.parentElement.classList.contains('bold-toggle')){const label=document.createElement('label'); label.className='bold-toggle'; label.innerHTML=`<input id="cellBoldV3" type="checkbox" ${bold.checked?'checked':''}><span class="b-icon">B</span><span>Bold tekst</span>`; bold.parentElement.replaceWith(label); const cb=label.querySelector('input'); cb.addEventListener('change',()=>{targets.forEach(t=>{const m=getModule(t.moduleId);const st=getCellStyle(m,t.row,t.col);setCellStyle(m,t.row,t.col,{...st,bold:cb.checked});});save();renderAll();});}}

      const prevWireModule=wireModule; wireModule=function(el,mod){prevWireModule(el,mod); if(mod.showTitle){const title=el.querySelector('.mod-title'); title?.addEventListener('pointerdown',e=>{if(!state.editMode)return; e.preventDefault(); e.stopPropagation(); selectModule(mod.id,false); const startX=e.clientX,startY=e.clientY; mod.titleStyle=mod.titleStyle||{x:14,y:10,size:1.05,align:'left'}; const sx=Number(mod.titleStyle.x??14), sy=Number(mod.titleStyle.y??10); const move=ev=>{mod.titleStyle.x=Math.max(0,sx+ev.clientX-startX); mod.titleStyle.y=Math.max(0,sy+ev.clientY-startY); if(mod.titleStyle.align!=='left')mod.titleStyle.align='left'; renderAll();}; const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);save();}; document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);});}
        if(mod.type==='log'){const file=el.querySelector('.log-file'); el.querySelector('.log-pick')?.addEventListener('click',e=>{e.stopPropagation();file?.click()}); file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogs(file.files[0],mod)}); el.querySelector('.log-filter')?.addEventListener('input',e=>{mod.filter=e.target.value;save();renderAll()});}
      };
      try{renderAll()}catch(e){console.error('Request patch v3 render failed',e)}
    })();


    /* Request patch v4: tighter timeline admin layout for narrow admin panel */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-admin-compact.v4{display:grid;gap:9px;width:100%;max-width:100%;overflow:hidden;}
        .timeline-admin-compact.v4 *{min-width:0;box-sizing:border-box;}
        .timeline-admin-compact.v4 .timeline-main-grid{display:grid;grid-template-columns:1fr;gap:8px;}
        .timeline-admin-compact.v4 .timeline-small-grid{display:grid;grid-template-columns:1fr 92px;gap:8px;align-items:end;}
        .timeline-admin-compact.v4 .field{margin-bottom:0;}
        .timeline-admin-compact.v4 input,
        .timeline-admin-compact.v4 select{width:100%;max-width:100%;padding:8px 9px;border-radius:10px;}
        .timeline-admin-compact.v4 input[type="datetime-local"]{font-size:12px;letter-spacing:-.02em;}
        .timeline-admin-compact.v4 input[type="color"]{height:34px;min-height:34px;padding:0;border:none;background:transparent;}
        .timeline-admin-compact.v4 details.timeline-details{border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(2,6,23,.28);overflow:hidden;}
        .timeline-admin-compact.v4 details.timeline-details>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;cursor:pointer;color:#e2e8f0;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:12px;}
        .timeline-admin-compact.v4 details.timeline-details>summary::-webkit-details-marker{display:none;}
        .timeline-admin-compact.v4 details.timeline-details>summary:after{content:'▾';font-size:12px;color:#94a3b8;transition:.15s;}
        .timeline-admin-compact.v4 details.timeline-details[open]>summary:after{transform:rotate(180deg);}
        .timeline-admin-compact.v4 .timeline-detail-body{display:grid;gap:8px;padding:0 9px 9px;}
        .timeline-admin-compact.v4 .timeline-admin-card{padding:9px;border-radius:13px;gap:7px;overflow:hidden;}
        .timeline-admin-compact.v4 .timeline-admin-card .grid-mini{display:grid;grid-template-columns:1fr;gap:7px;}
        .timeline-admin-compact.v4 .timeline-admin-card .grid-color{display:grid;grid-template-columns:62px 1fr;gap:8px;align-items:end;}
        .timeline-admin-compact.v4 .timeline-admin-card .tool-btn{width:100%;padding:8px 10px;border-radius:10px;}
        .timeline-admin-compact.v4 .timeline-add-row{display:grid;grid-template-columns:1fr;gap:8px;}
        .timeline-admin-compact.v4 .timeline-add-row .tool-btn{width:100%;}
        .timeline-admin-compact.v4 .small{font-size:11px;line-height:1.35;}
        @media(min-width:390px){
          .timeline-admin-compact.v4 .timeline-main-grid{grid-template-columns:1fr 1fr;}
          .timeline-admin-compact.v4 .timeline-admin-card .grid-mini{grid-template-columns:1fr 1fr;}
        }
      `;
      document.head.appendChild(style);

      function tlSummaryLabel(prefix,count){return `${prefix} (${count})`;}
      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour';
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-p-name" value="${escapeHTML(p.name||'')}" placeholder="Periode"></div>
          <div class="grid-mini">
            <div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDateTimeLocal(p.start||mod.start)}"></div>
            <div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDateTimeLocal(p.end||mod.end)}"></div>
          </div>
          <div class="grid-color">
            <div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${escapeHTML(p.color||'#60a5fa')}"></div>
            <div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div>
          </div>
          <button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button>
        </div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-e-name" value="${escapeHTML(ev.name||'')}" placeholder="Hendelse"></div>
          <div class="grid-color">
            <div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${escapeHTML(ev.color||'#f8fafc')}"></div>
            <div class="field"><label>Tid</label><input class="tl-e-time" type="datetime-local" value="${toDateTimeLocal(ev.time||mod.start)}"></div>
          </div>
          <button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button>
        </div>`).join('');
        return `<div class="timeline-admin-compact v4">
          <div class="timeline-main-grid">
            <div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div>
            <div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div>
          </div>
          <div class="timeline-small-grid">
            <div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div>
            <div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div>
          </div>
          <p class="small">Start og slutt vises alltid. «Streker» er antall ekstra markører mellom start og slutt.</p>
          <details class="timeline-details" open>
            <summary>${escapeHTML(tlSummaryLabel('Perioder',mod.periods?.length||0))}</summary>
            <div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button></div><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div>
          </details>
          <details class="timeline-details">
            <summary>${escapeHTML(tlSummaryLabel('Hendelser',mod.events?.length||0))}</summary>
            <div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddEvent" class="tool-btn" type="button">+ Legg til hendelse</button></div><div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div>
          </details>
        </div>`;
      };

      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{
          const el=document.getElementById(id);
          el?.addEventListener('input',()=>{readTimelineControls(mod);renderAll()});
          el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll()});
        });
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll()});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.events.push({name:'Hendelse',time:mod.start,color:'#f8fafc'});renderAll()});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>inp.addEventListener('input',()=>{readTimelineControls(mod);save()}));
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll()}));
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>inp.addEventListener('input',()=>{readTimelineControls(mod);save()}));
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll()}));
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll()});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll()});
      };

      try{renderAll()}catch(e){console.error('Request patch v4 render failed',e)}
    })();
