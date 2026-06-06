const PASSWORD="1234";
    const STORAGE_KEY="statusboardAdminRewriteV1";
    const ADMIN_UNLOCK_KEY="statusboardAdminUnlockedV1";
    const moduleDefs={
      weather:{label:"TAF Weather",icon:"☁",iconClass:"weather",hint:"TAF-tabell"},
      time:{label:"World Time",icon:"◷",iconClass:"time",hint:"Klokker"},
      table:{label:"Table",icon:"▦",iconClass:"table",hint:"Tabell uten heading"},
      json:{label:"JSON Table",icon:"{ }",iconClass:"table",hint:"JSON til tabell"},
      checklist:{label:"Checklist",icon:"✓",iconClass:"check",hint:"Sjekkliste"},
      alert:{label:"Alert",icon:"!",iconClass:"alert",hint:"Varsel"},
      note:{label:"Note",icon:"✎",iconClass:"note",hint:"Notat"},
      image:{label:"Bilde",icon:"▣",iconClass:"note",hint:"Lim inn, dra inn eller velg bilde"},
      timeline:{label:"Tidslinje",icon:"—",iconClass:"time",hint:"Perioder og hendelser"},
      personell:{label:"Personell",icon:"☏",iconClass:"table",hint:"Funksjon, navn, lokasjon og tlf"}
    };
    const commonTimeZones=["UTC","Europe/Oslo","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Chicago","America/Los_Angeles","Asia/Dubai","Asia/Tokyo","Australia/Sydney"];
    function timeZoneOptions(selected){
      const fallbackZones=["UTC","Europe/Oslo","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Chicago","America/Los_Angeles","Asia/Dubai","Asia/Tokyo","Australia/Sydney"];
      const manualZones=(typeof commonTimeZones!=="undefined"&&Array.isArray(commonTimeZones))?commonTimeZones:fallbackZones;
      const browserZones=(typeof Intl!=="undefined"&&typeof Intl.supportedValuesOf==="function")?Intl.supportedValuesOf("timeZone"):[];
      const zones=[...new Set([...manualZones,...browserZones])];
      const current=selected||"UTC";
      if(!zones.includes(current))zones.unshift(current);
      return zones.map(z=>`<option value="${escapeHTML(z)}" ${z===current?"selected":""}>${escapeHTML(z)}</option>`).join("");
    }
    window.timeZoneOptions=timeZoneOptions;

    function timeZoneOptionsFallback(selected){
      const zones=["UTC","Europe/Oslo","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Chicago","America/Los_Angeles","Asia/Dubai","Asia/Tokyo","Australia/Sydney"];
      const current=selected||"UTC";
      if(!zones.includes(current))zones.unshift(current);
      return zones.map(z=>`<option value="${escapeHTML(z)}" ${z===current?"selected":""}>${escapeHTML(z)}</option>`).join("");
    }

    // Rediger denne databasen selv. functionNo + personalNo blir telefonnummeret.
    const PERSONELL_DATA=[
      {function:"Leder",functionNo:"10",name:"Ola Nordmann",personalNo:"01"},
      {function:"Leder",functionNo:"10",name:"Kari Nordmann",personalNo:"02"},
      {function:"Tekniker",functionNo:"20",name:"Per Hansen",personalNo:"11"},
      {function:"Operatør",functionNo:"30",name:"Anne Larsen",personalNo:"21"}
    ];

    // Rediger denne ordlisten selv. Brukes som forslag/dropdown i lokasjon-feltet i Personell-modulen.
    const PERSONELL_LOCATIONS=["OPS","Tårn","Brief","Hangar","Ute","Kjøretøy","Reserve"];

    const app=document.getElementById("app"),board=document.getElementById("board"),empty=document.getElementById("empty"),adminPanel=document.getElementById("adminPanel"),palette=document.getElementById("modulePalette"),tabs=document.getElementById("tabs"),selectedSettings=document.getElementById("selectedSettings"),cellSettings=document.getElementById("cellSettings"),wordDropdown=document.getElementById("wordDropdown");
    const els={adminButton:document.getElementById("adminButton"),closeAdmin:document.getElementById("closeAdmin"),hideAdmin:document.getElementById("hideAdmin"),loginModal:document.getElementById("loginModal"),passwordInput:document.getElementById("passwordInput"),loginBtn:document.getElementById("loginBtn"),closeLogin:document.getElementById("closeLogin"),newView:document.getElementById("newView"),renameView:document.getElementById("renameView"),deleteView:document.getElementById("deleteView"),displayMode:document.getElementById("displayMode"),fullscreen:document.getElementById("fullscreen"),exportBtn:document.getElementById("exportBtn"),importBtn:document.getElementById("importBtn"),importModal:document.getElementById("importModal"),closeImport:document.getElementById("closeImport"),importText:document.getElementById("importText"),loadImport:document.getElementById("loadImport"),rulesBtn:document.getElementById("rulesBtn"),resetDesignBtn:document.getElementById("resetDesignBtn"),rulesModal:document.getElementById("rulesModal"),closeRules:document.getElementById("closeRules"),addRule:document.getElementById("addRule"),saveRules:document.getElementById("saveRules"),rulesList:document.getElementById("rulesList"),resetBtn:document.getElementById("resetBtn"),fontScale:document.getElementById("fontScale")};

    let state={adminUnlocked:false,editMode:false,adminHidden:false,fontScale:1,selectedId:null,activeViewId:null,selectedCell:null,selectedCells:[],rules:[],views:[{id:uid(),name:"Main View",modules:[]}]};
    window.__statusboardAdminUnlock=function(){state.adminUnlocked=true;state.editMode=true;state.adminHidden=false;rememberAdminUnlock();try{document.getElementById("loginModal")?.classList.remove("show")}catch(e){};renderAll();};
    window.__statusboardAdminClose=function(){state.adminHidden=true;renderAll();};
    state.activeViewId=state.views[0].id;
    let dragState=null,resizeState=null,draggedPaletteType=null,cellSelectDrag=false,cellPointerDown=false,cellSelectionAnchor=null;

    load();
    renderAll();
    setInterval(tick,1000);

    function renderAll(){
      document.documentElement.style.setProperty("--font-scale",String(state.fontScale));
      els.fontScale.value=state.fontScale;
      app.classList.toggle("admin-open",state.adminUnlocked&&state.editMode&&!state.adminHidden);
      app.classList.toggle("admin-hidden",state.adminUnlocked&&state.editMode&&state.adminHidden);
      app.classList.toggle("edit-mode",state.editMode);
      app.classList.toggle("display-mode",!state.editMode);
      els.displayMode.textContent=state.editMode?"Display mode":"Edit mode";
      renderTabs();renderPalette();renderBoard();renderSelectedSettings();renderCellSettings();save();
    }

    function renderPalette(){
      palette.innerHTML="";
      Object.entries(moduleDefs).forEach(([type,d])=>{
        const card=document.createElement("div");card.className="module-card";card.draggable=true;card.dataset.type=type;
        card.innerHTML=`<div class="icon ${d.iconClass}">${d.icon}</div><div><strong>${escapeHTML(d.label)}</strong><span>${escapeHTML(d.hint)}</span></div>`;
        card.addEventListener("dragstart",()=>draggedPaletteType=type);
        card.addEventListener("click",()=>addModule(type));
        palette.appendChild(card);
      });
    }

    function renderTabs(){
      tabs.innerHTML="";
      state.views.forEach(v=>{
        const b=document.createElement("button");b.className="view-tab";b.classList.toggle("active",v.id===state.activeViewId);b.textContent=v.name;
        b.onclick=()=>{state.activeViewId=v.id;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];state.selectedCells=[];renderAll()};
        tabs.appendChild(b);
      });
    }

    function renderBoard(){
      board.querySelectorAll(".mod").forEach(x=>x.remove());
      activeView().modules.forEach(mod=>{normalizeMod(mod);const el=buildModule(mod);board.appendChild(el);wireModule(el,mod)});
      empty.style.display=activeView().modules.length?"none":"grid";
    }

    function buildModule(mod){
      const d=moduleDefs[mod.type]||moduleDefs.table;
      const el=document.createElement("article");
      el.className="mod"+(mod.showTitle?" has-title":"");el.dataset.id=mod.id;el.dataset.type=mod.type;el.style.left=px(mod.x);el.style.top=px(mod.y);el.style.width=px(mod.w);el.style.height=px(mod.h);el.style.setProperty("--module-scale",String(mod.scale||1));el.classList.toggle("selected",mod.id===state.selectedId);
      el.innerHTML=`${mod.showTitle?`<div class="mod-title">${escapeHTML(mod.name||moduleDefs[mod.type]?.label||"Modul")}</div>`:""}<button class="drag-handle" type="button">↕ Flytt</button><div class="mod-tools"><button class="mini-btn dup-btn">⧉</button><button class="mini-btn danger del-btn">×</button></div><div class="module-content mod-inner">${contentHTML(mod)}</div><div class="resize-handle"></div>`;
      return el;
    }

    function contentHTML(mod){
      if(mod.type==="weather")return weatherHTML(mod);
      if(mod.type==="time")return timeHTML(mod);
      if(mod.type==="table")return tableHTML(mod);
      if(mod.type==="json")return jsonHTML(mod);
      if(mod.type==="checklist")return checklistHTML(mod);
      if(mod.type==="alert")return alertHTML(mod);
      if(mod.type==="note")return noteHTML(mod);
      if(mod.type==="image")return imageHTML(mod);
      if(mod.type==="timeline")return timelineHTML(mod);
      if(mod.type==="personell")return personellHTML(mod);
      return "";
    }

    function tableHTML(mod){
      normalizeMerges(mod);
      const rows=mod.rows||[];
      return `<div class="content"><table><tbody>${rows.map((row,r)=>`<tr>${row.map((cell,c)=>{
        if(isHiddenMergedCell(mod,r,c))return "";
        const raw=String(cell??"");
        const merge=getMergeAt(mod,r,c);
        const classes=[isSelectedCell(mod.id,r,c)?"cell-selected":"",isMultiSelectedCell(mod.id,r,c)?"cell-multi-selected":"",merge?"cell-merged":""].filter(Boolean).join(" ");
        const spanAttrs=merge?`${merge.rowspan>1?` rowspan="${merge.rowspan}"`:""}${merge.colspan>1?` colspan="${merge.colspan}"`:""}`:"";
        return `<td data-row="${r}" data-col="${c}"${spanAttrs} class="${classes}" style="${cellStyleCSS(mod,r,c)}"><div class="cell-display">${formatTextHTML(raw)}</div><textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${escapeHTML(raw)}</textarea></td>`;
      }).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    function cellWordsHTML(mod,r,c){
      const words=getCellWords(mod,r,c);if(!words.length||state.editMode)return "";
      return `<div class="cell-words">${words.map(w=>`<button class="cell-word" data-word="${escapeHTML(w)}">${escapeHTML(w)}</button>`).join("")}</div>`;
    }
    function weatherHTML(mod){
      const rows=(mod.airports||[]).map((r,i)=>{const a=analyzeTAF(r.taf||"");return `<tr><td contenteditable="true" data-array="airports" data-row="${i}" data-key="icao">${fmt(r.icao||"")}</td><td><span class="status-pill ${a.className}">${a.status}</span></td><td>${escapeHTML(a.ceiling)}</td><td>${escapeHTML(a.visibility)}</td><td contenteditable="true" class="taf" data-array="airports" data-row="${i}" data-key="taf">${fmt(r.taf||"")}</td><td>${fmt(r.updated||"")}</td></tr>`}).join("");
      return `<div class="content"><table><tbody>${rows}</tbody></table></div>`;
    }
    function timeHTML(mod){
      return `<div class="content"><table><tbody>${(mod.timeZones||[]).map((r,i)=>`<tr><td contenteditable="true" data-array="timeZones" data-row="${i}" data-key="label">${fmt(r.label||"")}</td><td><select class="tz-select" data-row="${i}">${(typeof timeZoneOptions==="function"?timeZoneOptions(r.zone||"UTC"):timeZoneOptionsFallback(r.zone||"UTC"))}</select></td><td class="time-value">${escapeHTML(timeFor(r.zone,mod.showSeconds))}</td></tr>`).join("")}</tbody></table></div>`;
    }
    function jsonHTML(mod){
      const rows=parseJSONRows(mod.jsonText||"");return `<div class="content">${state.editMode?`<textarea class="json-area" placeholder='[{"Column":"Value"}]'>${escapeHTML(mod.jsonText||"")}</textarea>`:""}<div style="margin-top:${state.editMode?"10px":"0"}">${dynamicTableHTML(rows)}</div></div>`;
    }
    function checklistHTML(mod){return `<div class="content">${(mod.items||[]).map((item,i)=>`<div class="check-row ${item.done?"done":""}"><input type="checkbox" class="check-toggle" data-row="${i}" ${item.done?"checked":""}><span contenteditable="true" data-array="items" data-row="${i}" data-key="text">${fmt(item.text||"")}</span></div>`).join("")}</div>`}
    function alertHTML(mod){const cls=mod.level==="danger"?"alert-danger":mod.level==="warning"?"alert-warning":"alert-normal";return `<div class="alert-box ${cls}" contenteditable="true" data-key-direct="message">${fmt(mod.message||"")}</div>`}
    function noteHTML(mod){return `<textarea class="note-area" style="text-align:${escapeHTML(mod.align||"left")}" ${state.editMode?"":"readonly"}>${escapeHTML(mod.text||"")}</textarea>`}
    function imageHTML(mod){const src=mod.src||"";const fit=mod.fit||"contain";return `<div class="content image-content" tabindex="0" style="--image-fit:${escapeHTML(fit)}"><input class="image-file" type="file" accept="image/*" hidden>${src?`<img class="image-preview" src="${escapeHTML(src)}" alt="Bilde">`:`<div class="image-placeholder"><strong>Lim inn bilde her</strong><br><span>Ctrl+V, dra og slipp, eller velg bildefil.</span></div>`}<div class="image-actions edit-only"><button class="tool-btn image-pick" type="button">Velg bilde</button><button class="tool-btn danger image-clear" type="button">Fjern</button></div></div>`}
    function timelineHTML(mod){
      const start=new Date(mod.start||new Date().toISOString().slice(0,10));
      const end=new Date(mod.end||new Date(Date.now()+86400000).toISOString().slice(0,10));
      const min=start.getTime(),max=Math.max(min+86400000,end.getTime());
      const pos=d=>clamp(((new Date(d).getTime()-min)/(max-min))*100,0,100);
      const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(2,right-left);return `<div class="timeline-period" style="left:${left}%;width:${w}%;background:${hexToRgba(p.color||"#60a5fa",p.opacity??0.55)};color:${escapeHTML(p.textColor||"#ffffff")}" title="${escapeHTML(p.name||"")}">${escapeHTML(p.name||"")}</div>`}).join("");
      const events=(mod.events||[]).map(ev=>`<div class="timeline-event" style="left:${pos(ev.time)}%" title="${escapeHTML(ev.name||"")}"><div class="timeline-event-dot" style="background:${escapeHTML(ev.color||"#f8fafc")}"></div><div class="timeline-event-label">${escapeHTML(ev.name||"")}</div></div>`).join("");
      return `<div class="content"><div class="timeline-wrap"><div class="timeline-scale"><span>${escapeHTML(mod.start||"")}</span><span>${escapeHTML(mod.end||"")}</span></div><div class="timeline-lane">${periods}${events}</div></div></div>`;
    }
    function personellHTML(mod){
      if(!Array.isArray(mod.rows))mod.rows=[];
      const funcs=unique(PERSONELL_DATA.map(p=>p.function).filter(Boolean));
      const locationListId="personell-location-list-"+mod.id;
      const locationOptions=(PERSONELL_LOCATIONS||[]).map(loc=>`<option value="${escapeHTML(loc)}"></option>`).join("");
      const rows=mod.rows.map((row,i)=>{
        row.function=row.function||"";row.name=row.name||"";row.location=row.location||"";
        const names=PERSONELL_DATA.filter(p=>p.function===row.function).map(p=>p.name);
        const phone=personellPhone(row.function,row.name);
        const sizes=personellTextSizes(mod);
        return `<tr>
          <td style="font-size:${Number(sizes.function)||1}em"><select class="person-function" data-row="${i}"><option value="">Funksjon</option>${funcs.map(f=>`<option value="${escapeHTML(f)}" ${f===row.function?"selected":""}>${escapeHTML(f)}</option>`).join("")}</select></td>
          <td style="font-size:${Number(sizes.name)||1}em"><select class="person-name" data-row="${i}"><option value="">Navn</option>${names.map(n=>`<option value="${escapeHTML(n)}" ${n===row.name?"selected":""}>${escapeHTML(n)}</option>`).join("")}</select></td>
          <td style="font-size:${Number(sizes.location)||1}em"><input class="person-location" list="${escapeHTML(locationListId)}" data-row="${i}" value="${escapeHTML(row.location)}" placeholder="Lokasjon"></td>
          <td style="font-size:${Number(sizes.phone)||1}em">${escapeHTML(phone)}</td>
        </tr>`;
      }).join("");
      return `<div class="content"><table class="personell-table"><tbody>${rows}</tbody></table><datalist id="${escapeHTML(locationListId)}">${locationOptions}</datalist>${state.editMode?`<button class="tool-btn person-add" style="margin-top:10px">+ Personellrad</button>`:""}</div>`;
    }
    function personellPhone(func,name){const p=PERSONELL_DATA.find(x=>x.function===func&&x.name===name);return p?(String(p.functionNo||"")+String(p.personalNo||"")):""}
    function unique(arr){return [...new Set(arr)]}
    function dynamicTableHTML(rows){if(!rows.length)return `<p class="muted">Ingen JSON-data.</p>`;const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];return `<table><tbody>${rows.map(row=>`<tr>${cols.map(c=>`<td>${fmt(row[c]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`}

    function wireModule(el,mod){
      const handle=el.querySelector(".drag-handle");
      handle?.addEventListener("pointerdown",e=>{
        if(!state.editMode)return;
        e.preventDefault();e.stopPropagation();
        selectModule(mod.id,false);
        el.classList.add("selected","dragging");
        document.body.classList.add("dragging-module");
        dragState={id:mod.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:mod.x,y:mod.y,el};
        try{handle.setPointerCapture(e.pointerId)}catch{}
      });
      el.addEventListener("pointerdown",e=>{
        if(!state.editMode)return;
        if(e.target.closest("button,input,select,textarea,.resize-handle,.drag-handle")||e.target.isContentEditable)return;
        selectModule(mod.id);
      });
      el.addEventListener("click",e=>{
        if(state.editMode&&!e.target.closest("button,input,select,textarea")&&!e.target.isContentEditable){selectModule(mod.id)}
      });
      el.querySelector(".resize-handle").addEventListener("pointerdown",e=>{
        if(!state.editMode)return;
        e.preventDefault();e.stopPropagation();
        selectModule(mod.id,false);
        el.classList.add("selected","resizing");
        document.body.classList.add("dragging-module");
        resizeState={id:mod.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,w:mod.w,h:mod.h,el};
        try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
      });
      el.querySelector(".del-btn")?.addEventListener("click",e=>{e.stopPropagation();activeView().modules=activeView().modules.filter(m=>m.id!==mod.id);state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()});
      el.querySelector(".dup-btn")?.addEventListener("click",e=>{e.stopPropagation();const copy=clone(mod);copy.id=uid();copy.x+=24;copy.y+=24;activeView().modules.push(copy);selectModule(copy.id)});
      wireEditable(el,mod);
      wireSpecial(el,mod);
    }

    document.addEventListener("pointermove",e=>{
      if(dragState){
        const mod=getModule(dragState.id);if(!mod)return;
        const b=boardRect();
        mod.x=clamp(dragState.x+e.clientX-dragState.startX,0,Math.max(0,b.width-mod.w));
        mod.y=clamp(dragState.y+e.clientY-dragState.startY,0,Math.max(0,b.height-mod.h));
        dragState.el.style.left=px(mod.x);dragState.el.style.top=px(mod.y);
        save();
      }
      if(resizeState){
        const mod=getModule(resizeState.id);if(!mod)return;
        const b=boardRect();
        const minW=moduleMinWidth(mod),minH=moduleMinHeight(mod);
        mod.w=clamp(resizeState.w+e.clientX-resizeState.startX,minW,Math.max(minW,b.width-mod.x));
        mod.h=clamp(resizeState.h+e.clientY-resizeState.startY,minH,Math.max(minH,b.height-mod.y));
        resizeState.el.style.width=px(mod.w);resizeState.el.style.height=px(mod.h);
        save();
      }
    });
    document.addEventListener("pointerup",()=>{
      if(dragState){dragState.el.classList.remove("dragging");dragState=null;renderSelectedSettings()}
      if(resizeState){resizeState.el.classList.remove("resizing");resizeState=null;renderSelectedSettings()}
      document.body.classList.remove("dragging-module");
      cellSelectDrag=false;cellPointerDown=false;cellSelectionAnchor=null;
      document.body.classList.remove("selecting-cells");
    });

    function wireEditable(el,mod){
      el.querySelectorAll(".cell-editor").forEach(input=>{
        const td=input.closest("td");
        const activate=(evt,focusEditor=true)=>{
          const r=+input.dataset.row,c=+input.dataset.col;
          state.selectedId=mod.id;
          if(evt?.shiftKey&&state.selectedCell&&state.selectedCell.moduleId===mod.id){
            selectCellRange(mod.id,state.selectedCell.row,state.selectedCell.col,r,c);
          }else{
            selectTableCell(mod.id,r,c,false);
          }
          td?.classList.add("editing");
          autosizeTextarea(input);
          renderSelectedSettings();
          renderCellSettings();
          showWordDropdown(input,mod,r,c);
          if(focusEditor){input.focus();placeCaretEnd(input)}
          save();
        };
        const beginSelect=(e)=>{
          e.stopPropagation();
          const r=+input.dataset.row,c=+input.dataset.col;
          cellPointerDown=true;
          cellSelectDrag=true;
          cellSelectionAnchor={moduleId:mod.id,row:r,col:c};
          document.body.classList.add("selecting-cells");
          activate(e,true);
        };
        input.addEventListener("pointerdown",beginSelect);
        input.addEventListener("pointerenter",()=>{
          if(!cellPointerDown||!cellSelectionAnchor||cellSelectionAnchor.moduleId!==mod.id)return;
          const r=+input.dataset.row,c=+input.dataset.col;
          if(r===cellSelectionAnchor.row&&c===cellSelectionAnchor.col)return;
          selectCellRange(mod.id,cellSelectionAnchor.row,cellSelectionAnchor.col,r,c);
          renderCellSettings();
        });
        input.addEventListener("click",e=>{e.stopPropagation();activate(e,true)});
        input.addEventListener("focus",e=>{if(!cellPointerDown)activate(e,false)});
        input.addEventListener("paste",e=>{const text=e.clipboardData?.getData("text/plain")||"";if(text.includes("\t")||text.includes("\n")){e.preventDefault();pasteTableTextIntoModule(mod,+input.dataset.row,+input.dataset.col,text)}});
        input.addEventListener("input",()=>{
          const r=+input.dataset.row,c=+input.dataset.col;
          mod.rows[r][c]=input.value;
          autosizeTextarea(input);
          td?.setAttribute("style",cellStyleCSS(mod,r,c));
          applyCellFunctions(mod,r,c,{textChanged:true});
          refreshAllTableCells(mod);
          save();
        });
        input.addEventListener("blur",()=>{td?.classList.remove("editing");commitTableEditor(input,mod);setTimeout(hideWordDropdown,120)});
        input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();input.blur()}});
        td?.addEventListener("pointerdown",e=>{if(e.target===td)beginSelect(e)});
        td?.addEventListener("pointerenter",()=>{
          if(!cellPointerDown||!cellSelectionAnchor||cellSelectionAnchor.moduleId!==mod.id)return;
          const r=+input.dataset.row,c=+input.dataset.col;
          if(r===cellSelectionAnchor.row&&c===cellSelectionAnchor.col)return;
          selectCellRange(mod.id,cellSelectionAnchor.row,cellSelectionAnchor.col,r,c);
          renderCellSettings();
        });
        td?.addEventListener("click",e=>{if(e.target===td){input.focus();activate(e,true);placeCaretEnd(input)}});
        autosizeTextarea(input);
      });
      el.querySelectorAll("[contenteditable=true]").forEach(cell=>{
        cell.addEventListener("focus",()=>{if(cell.dataset.array){cell.textContent=mod[cell.dataset.array][+cell.dataset.row][cell.dataset.key]||""}else if(cell.dataset.keyDirect){cell.textContent=mod[cell.dataset.keyDirect]||""}});
        cell.addEventListener("blur",()=>{commitCell(cell,mod)});
        cell.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();cell.blur()}});
      });
    }
    function commitTableEditor(input,mod){
      const r=+input.dataset.row,c=+input.dataset.col;
      if(!mod.rows?.[r])return;
      const oldValue=mod.rows[r][c];
      mod.rows[r][c]=input.value.trim();
      applyCellFunctions(mod,r,c,{textChanged:oldValue!==mod.rows[r][c]});
      refreshTableCellDOM(mod,r,c);
      save();
      renderAll();
    }
    function commitCell(cell,mod){
      if(cell.dataset.array){const arr=cell.dataset.array,row=+cell.dataset.row,key=cell.dataset.key;if(mod[arr]?.[row])mod[arr][row][key]=cell.textContent.trim();renderAll();return}
      if(cell.dataset.keyDirect){mod[cell.dataset.keyDirect]=cell.textContent.trim();renderAll()}
    }
    function wireSpecial(el,mod){
      el.querySelector(".note-area")?.addEventListener("input",e=>{mod.text=e.target.value;save()});
      wireImageModule(el,mod);
      el.querySelector(".json-area")?.addEventListener("input",e=>{mod.jsonText=e.target.value;save()});
      el.querySelectorAll(".check-toggle").forEach(box=>box.addEventListener("change",()=>{mod.items[+box.dataset.row].done=box.checked;renderAll()}));
      el.querySelectorAll(".tz-select").forEach(sel=>sel.addEventListener("change",()=>{mod.timeZones[+sel.dataset.row].zone=sel.value;save()}));
      el.querySelectorAll(".person-function").forEach(sel=>sel.addEventListener("change",()=>{const r=mod.rows[+sel.dataset.row];if(!r)return;r.function=sel.value;r.name="";save();renderAll()}));
      el.querySelectorAll(".person-name").forEach(sel=>sel.addEventListener("change",()=>{const r=mod.rows[+sel.dataset.row];if(!r)return;r.name=sel.value;save();renderAll()}));
      el.querySelectorAll(".person-location").forEach(inp=>inp.addEventListener("input",()=>{const r=mod.rows[+inp.dataset.row];if(r){r.location=inp.value;save()}}));
      el.querySelector(".person-add")?.addEventListener("click",e=>{e.stopPropagation();if(!Array.isArray(mod.rows))mod.rows=[];mod.rows.push({function:"",name:"",location:""});renderAll()});
    }

    function wireImageModule(el,mod){
      if(mod.type!=="image")return;
      const box=el.querySelector(".image-content"),file=el.querySelector(".image-file");
      const pick=el.querySelector(".image-pick"),clear=el.querySelector(".image-clear");
      if(!box)return;
      const loadFile=f=>{if(!f||!String(f.type||"").startsWith("image/"))return;const reader=new FileReader();reader.onload=()=>{mod.src=String(reader.result||"");renderAll()};reader.readAsDataURL(f)};
      pick?.addEventListener("click",e=>{e.stopPropagation();file?.click()});
      clear?.addEventListener("click",e=>{e.stopPropagation();mod.src="";renderAll()});
      file?.addEventListener("change",()=>loadFile(file.files&&file.files[0]));
      box.addEventListener("pointerdown",()=>{selectModule(mod.id,false);box.focus()});
      box.addEventListener("paste",e=>{const items=[...(e.clipboardData?.items||[])];const item=items.find(x=>String(x.type||"").startsWith("image/"));if(item){e.preventDefault();loadFile(item.getAsFile())}});
      box.addEventListener("dragover",e=>{e.preventDefault();box.classList.add("drag-image")});
      box.addEventListener("dragleave",()=>box.classList.remove("drag-image"));
      box.addEventListener("drop",e=>{e.preventDefault();box.classList.remove("drag-image");loadFile(e.dataTransfer?.files?.[0])});
    }

    function renderSelectedSettings(){
      const mod=selected();
      if(!mod){selectedSettings.className="muted";selectedSettings.innerHTML="Velg en modul på boardet.";return}
      selectedSettings.className="";
      selectedSettings.innerHTML=`
        <div class="field"><label>Modulnavn i admin</label><input id="setName" value="${escapeHTML(mod.name||moduleDefs[mod.type].label)}"></div>
        <div class="grid2"><div class="field"><label>X</label><input id="setX" type="number" value="${Math.round(mod.x)}"></div><div class="field"><label>Y</label><input id="setY" type="number" value="${Math.round(mod.y)}"></div></div>
        <div class="grid2"><div class="field"><label>Bredde</label><input id="setW" type="number" value="${Math.round(mod.w)}"></div><div class="field"><label>Høyde</label><input id="setH" type="number" value="${Math.round(mod.h)}"></div></div>
        <div class="field"><label>Modul zoom</label><input id="setScale" type="range" min=".6" max="2.4" step=".1" value="${mod.scale||1}"></div>
        <div class="switch-row"><div class="switch-text"><strong>Vis overskrift</strong><span>Bruker modulnavnet som overskrift på modulen.</span></div><label class="switch"><input id="setShowTitle" type="checkbox" ${mod.showTitle?"checked":""}><span class="slider"></span></label></div>
        ${settingsSpecific(mod)}
        <div class="grid2"><button id="duplicateSelected" class="tool-btn">Dupliser</button><button id="deleteSelected" class="tool-btn danger">Slett</button></div>`;
      bind("setName","input",e=>{mod.name=e.target.value;save()});
      ["X","Y","W","H"].forEach(k=>bind("set"+k,"change",e=>{mod[k.toLowerCase()]=Number(e.target.value)||0;renderAll()}));
      bind("setScale","input",e=>{mod.scale=Number(e.target.value);renderAll()});
      bind("setShowTitle","change",e=>{mod.showTitle=e.target.checked;renderAll()});
      bind("duplicateSelected","click",()=>{const copy=clone(mod);copy.id=uid();copy.x+=24;copy.y+=24;activeView().modules.push(copy);selectModule(copy.id)});
      bind("deleteSelected","click",()=>{activeView().modules=activeView().modules.filter(m=>m.id!==mod.id);state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()});
      bind("tableAddRow","click",()=>{mod.rows.push(Array(colCount(mod)).fill(""));renderAll()});
      bind("tableAddCol","click",()=>{const n=colCount(mod)+1;mod.rows.forEach(r=>r.push(""));if(!mod.rows.length)mod.rows.push(Array(n).fill(""));renderAll()});
      bind("tableInsertRowAfter","click",()=>insertRowAfterSelection(mod));
      bind("tableInsertColAfter","click",()=>insertColAfterSelection(mod));
      bind("tableDelRow","click",()=>{if(mod.rows.length){mod.rows.pop();renderAll()}});
      bind("tableDelCol","click",()=>{mod.rows.forEach(r=>r.pop());renderAll()});
      bind("addAirport","click",()=>{mod.airports.push({icao:"",taf:"",updated:""});renderAll()});
      bind("refreshTaf","click",()=>refreshTAF(mod));
      bind("addTimeZone","click",()=>{mod.timeZones.push({label:"",zone:"UTC"});renderAll()});
      bind("showSeconds","change",e=>{mod.showSeconds=e.target.checked;renderAll()});
      bind("timeZoneList","input",e=>{mod.timeZones=e.target.value.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{const [label,zone]=line.split("|").map(x=>x.trim());return{label:label||zone||"",zone:zone||label||"UTC"}});renderAll()});
      bind("alertLevel","change",e=>{mod.level=e.target.value;renderAll()});
      bind("addCheck","click",()=>{mod.items.push({text:"",done:false});renderAll()});
      bind("jsonToTable","click",()=>jsonToTable(mod));
      bind("noteAlign","change",e=>{mod.align=e.target.value;renderAll()});
      bind("imageFit","change",e=>{mod.fit=e.target.value;renderAll()});
      bind("clearImageAdmin","click",()=>{mod.src="";renderAll()});
      bind("addPersonell","click",()=>{mod.rows.push({function:"",name:"",location:""});renderAll()});
      bindPersonellSizeControls(mod);
      bindTimelineControls(mod);
    }
    function settingsSpecific(mod){
      if(mod.type==="table")return `<div class="grid2"><button id="tableAddRow" class="tool-btn">+ Rad nederst</button><button id="tableAddCol" class="tool-btn">+ Kolonne sist</button><button id="tableInsertRowAfter" class="tool-btn">+ Rad etter valgt</button><button id="tableInsertColAfter" class="tool-btn">+ Kolonne etter valgt</button><button id="tableDelRow" class="tool-btn danger">− Rad</button><button id="tableDelCol" class="tool-btn danger">− Kolonne</button></div><p class="small" style="margin-top:8px">Tabellen har ingen table heading og ingen kolonneoverskrifter. Klikk en celle for celle-spesifikk ordliste.</p>`;
      if(mod.type==="weather")return `<div class="grid2"><button id="addAirport" class="tool-btn">+ Flyplass</button><button id="refreshTaf" class="tool-btn">Hent TAF</button></div><p class="small" style="margin-top:8px">Skriv ICAO i første kolonne. TAF kan også limes inn manuelt.</p>`;
      if(mod.type==="time")return `<div class="field"><label>Tidssoner: Navn | Zone</label><textarea id="timeZoneList">${(mod.timeZones||[]).map(x=>(x.label||"")+" | "+(x.zone||"UTC")).join("\n")}</textarea></div><label class="small" style="display:flex;gap:8px;align-items:center"><input id="showSeconds" type="checkbox" ${mod.showSeconds?"checked":""}> Vis sekunder</label><button id="addTimeZone" class="tool-btn" style="margin-top:9px">+ Tidssone</button>`;
      if(mod.type==="alert")return `<div class="field"><label>Nivå</label><select id="alertLevel"><option value="normal" ${mod.level==="normal"?"selected":""}>Normal</option><option value="warning" ${mod.level==="warning"?"selected":""}>Warning</option><option value="danger" ${mod.level==="danger"?"selected":""}>Danger</option></select></div>`;
      if(mod.type==="checklist")return `<button id="addCheck" class="tool-btn">+ Punkt</button>`;
      if(mod.type==="json")return `<button id="jsonToTable" class="tool-btn">Konverter til vanlig tabell</button>`;
      if(mod.type==="note")return `<div class="field"><label>Tekstjustering</label><select id="noteAlign"><option value="left" ${(mod.align||"left")==="left"?"selected":""}>Venstre</option><option value="center" ${mod.align==="center"?"selected":""}>Midtstilt</option><option value="right" ${mod.align==="right"?"selected":""}>Høyre</option></select></div>`;
      if(mod.type==="image")return `<div class="field"><label>Bildetilpasning</label><select id="imageFit"><option value="contain" ${(mod.fit||"contain")==="contain"?"selected":""}>Vis hele bildet</option><option value="cover" ${mod.fit==="cover"?"selected":""}>Fyll modulen</option><option value="fill" ${mod.fit==="fill"?"selected":""}>Strekk</option></select></div><button id="clearImageAdmin" class="tool-btn danger">Fjern bilde</button><p class="small" style="margin-top:8px">Bilder lagres inne i JSON-eksporten som data-URL.</p>`;
      if(mod.type==="timeline")return timelineSettingsHTML(mod);
      if(mod.type==="personell"){const sz=personellTextSizes(mod);return `<button id="addPersonell" class="tool-btn">+ Personellrad</button><div class="grid2" style="margin-top:10px"><div class="field"><label>Tekst funksjon</label><input id="personSizeFunction" type="range" min=".6" max="2.8" step=".1" value="${sz.function}"></div><div class="field"><label>Tekst navn</label><input id="personSizeName" type="range" min=".6" max="2.8" step=".1" value="${sz.name}"></div><div class="field"><label>Tekst lokasjon</label><input id="personSizeLocation" type="range" min=".6" max="2.8" step=".1" value="${sz.location}"></div><div class="field"><label>Tekst telefon</label><input id="personSizePhone" type="range" min=".6" max="2.8" step=".1" value="${sz.phone}"></div></div><p class="small" style="margin-top:8px">Telefonnummer hentes fra PERSONELL_DATA i koden.</p>`;}
      return "";
    }

    function renderCellSettings(){
      const targets=selectedCellTargets();
      const primary=targets[0];
      const mod=primary?getModule(primary.moduleId):null;
      if(!primary||!mod||mod.type!=="table"){
        cellSettings.className="muted";
        cellSettings.innerHTML="Klikk én celle for å velge/redigere. Dra over flere celler for å markere et område.";
        return;
      }
      ensureCellFunctionStore(mod);
      const multi=targets.length>1;
      const style=getCellStyle(mod,primary.row,primary.col);
      const textColor=style.textColor||"#e2e8f0",bgColor=style.bgColor||"#000000",bgOpacity=style.bgOpacity ?? 0,align=style.align||"center";
      cellSettings.className="";
      if(multi){
        cellSettings.innerHTML=`
          <p class="small" style="margin-bottom:9px">${targets.length} valgte celler. Dra over celler for å velge et område.</p>
          <div class="field"><label>Cellefarger</label><div class="cell-style-row"><div><input id="cellTextColor" type="color" value="${escapeHTML(textColor)}"><p class="small">Tekst</p></div><div><input id="cellBgColor" type="color" value="${escapeHTML(bgColor)}"><p class="small">Celle</p></div></div></div>
          <div class="field"><label>Cellefarge opacity</label><input id="cellBgOpacity" type="range" min="0" max="1" step="0.05" value="${bgOpacity}"><div class="opacity-readout"><span>Transparent</span><span id="cellOpacityLabel">${Math.round(bgOpacity*100)}%</span></div></div>
          <div class="field"><label>Tekstjustering</label><select id="cellAlign"><option value="left" ${align==="left"?"selected":""}>Venstre</option><option value="center" ${align==="center"?"selected":""}>Midtstilt</option><option value="right" ${align==="right"?"selected":""}>Høyre</option></select></div>
          <div class="grid2" style="margin-top:10px"><button id="mergeCenterCells" class="tool-btn primary">Merge & center</button><button id="unmergeCells" class="tool-btn">Unmerge</button><button id="centerSelectedCells" class="tool-btn">Midtstill valgte</button><button id="applyMultiCellStyle" class="tool-btn">Bruk på valgte</button><button id="resetCellDesign" class="tool-btn danger">Reset design</button></div>`;
        wireCellStyleControls();
        bind("applyMultiCellStyle","click",()=>applyCellAdminLiveStyleToTargets());
        bind("resetCellDesign","click",()=>resetSelectedCellDesign());
        bind("centerSelectedCells","click",()=>centerSelectedCells());
        bind("mergeCenterCells","click",()=>mergeCenterSelectedCells());
        bind("unmergeCells","click",()=>unmergeSelectedCells());
        return;
      }
      const sc=primary;
      const value=mod.rows?.[sc.row]?.[sc.col]??"",words=getCellWords(mod,sc.row,sc.col),fn=getCellFunction(mod,sc.row,sc.col);
      cellSettings.innerHTML=`
        <p class="small" style="margin-bottom:9px">${cellName(sc.row,sc.col)} · Rad ${sc.row+1}, kolonne ${sc.col+1}. Dra over celler for å markere flere.</p>
        <div class="field"><label>Celleinnhold</label><textarea id="cellValue">${escapeHTML(value)}</textarea></div>
        <div class="field"><label>Ordliste for denne cellen</label><textarea id="cellWords" placeholder="Ett ord eller uttrykk per linje">${escapeHTML(words.join("\n"))}</textarea></div>
        <div class="field"><label>Cellefarger</label><div class="cell-style-row"><div><input id="cellTextColor" type="color" value="${escapeHTML(textColor)}"><p class="small">Tekst</p></div><div><input id="cellBgColor" type="color" value="${escapeHTML(bgColor)}"><p class="small">Celle</p></div></div></div>
        <div class="field"><label>Cellefarge opacity</label><input id="cellBgOpacity" type="range" min="0" max="1" step="0.05" value="${bgOpacity}"><div class="opacity-readout"><span>Transparent</span><span id="cellOpacityLabel">${Math.round(bgOpacity*100)}%</span></div></div>
        <div class="field"><label>Tekstjustering</label><select id="cellAlign"><option value="left" ${align==="left"?"selected":""}>Venstre</option><option value="center" ${align==="center"?"selected":""}>Midtstilt</option><option value="right" ${align==="right"?"selected":""}>Høyre</option></select></div>
        <div class="section" style="margin:12px 0 0;padding:11px;background:rgba(2,6,23,.35)">
          <div class="section-title"><h2>Cellefunksjoner</h2></div>
          <div class="if-rules-box">
            <div class="section-title" style="margin-bottom:8px"><h2>IF-regel</h2><button id="addIfRule" class="mini-btn">+</button></div>
            <p class="small" style="margin-bottom:8px">Legg til så mange linjer du vil. Reglene gjelder bare ${cellName(sc.row,sc.col)}.</p>
            <div id="ifRulesList">${(fn.ifRules||[]).map((rule,i)=>ifRuleRowHTML(rule,i)).join("")}</div>
          </div>
          <div class="switch-row"><div class="switch-text"><strong>DTG ved radendring</strong><span>Oppdaterer denne cellen med Zulu-DTG når en celle i samme rad endres.</span></div><label class="switch"><input id="dtgEnabled" type="checkbox" ${fn.dtgEnabled?"checked":""}><span class="slider"></span></label></div>
          <div class="field" style="margin-top:10px"><label>Tidsgrunnlag</label><select id="dtgMode"><option value="AUTO" ${(!fn.dtgMode||fn.dtgMode==="AUTO")?"selected":""}>AUTO</option><option value="ALFA" ${fn.dtgMode==="ALFA"?"selected":""}>ALFA / UTC+1</option><option value="BRAVO" ${fn.dtgMode==="BRAVO"?"selected":""}>BRAVO / UTC+2</option></select></div>
        </div>
        <div class="grid2" style="margin-top:10px"><button id="saveCellWords" class="tool-btn primary">Lagre celle</button><button id="unmergeCells" class="tool-btn">Unmerge</button><button id="centerSelectedCells" class="tool-btn">Midtstill</button><button id="resetCellDesign" class="tool-btn danger">Reset design</button></div>`;
      wireCellStyleControls();
      bind("addIfRule","click",()=>{document.getElementById("ifRulesList").insertAdjacentHTML("beforeend",ifRuleRowHTML({enabled:true,source:"A1",match:"",output:""},Date.now()));wireIfRuleDeleteButtons()});
      wireIfRuleDeleteButtons();
      bind("saveCellWords","click",()=>persistSelectedCellSettings(true));
      bind("resetCellDesign","click",()=>resetSelectedCellDesign());
      bind("centerSelectedCells","click",()=>centerSelectedCells());
      bind("unmergeCells","click",()=>unmergeSelectedCells());
    }

    function wireCellStyleControls(){
      const opacity=document.getElementById("cellBgOpacity"),opacityLabel=document.getElementById("cellOpacityLabel");
      opacity?.addEventListener("input",()=>{opacityLabel.textContent=Math.round(Number(opacity.value)*100)+"%";applyCellAdminLiveStyleToTargets()});
      ["cellTextColor","cellBgColor","cellAlign"].forEach(id=>bind(id,"input",()=>applyCellAdminLiveStyleToTargets()));
      bind("cellAlign","change",()=>applyCellAdminLiveStyleToTargets());
    }

    function ifRuleRowHTML(rule,i){return `<div class="if-rule-row" data-index="${i}">
      <label class="switch" title="Av/på"><input class="if-rule-enabled" type="checkbox" ${rule.enabled?"checked":""}><span class="slider"></span></label>
      <div class="field"><label>Hvis celle</label><input class="if-rule-source" value="${escapeHTML(rule.source||"A1")}" placeholder="A1"></div>
      <div class="field"><label>Er ordet</label><input class="if-rule-match" value="${escapeHTML(rule.match||"")}" placeholder="KLAR"></div>
      <div class="field"><label>Skriv ord</label><input class="if-rule-output" value="${escapeHTML(rule.output||"")}" placeholder="OK"></div>
      <button type="button" class="mini-btn danger remove-if-rule" title="Fjern linje">×</button>
    </div>`}
    function wireIfRuleDeleteButtons(){document.querySelectorAll(".remove-if-rule").forEach(btn=>btn.onclick=()=>btn.closest(".if-rule-row")?.remove())}
    function readIfRulesFromDOM(){return [...document.querySelectorAll("#ifRulesList .if-rule-row")].map(row=>({enabled:row.querySelector(".if-rule-enabled")?.checked||false,source:(row.querySelector(".if-rule-source")?.value||"A1").trim().toUpperCase()||"A1",match:row.querySelector(".if-rule-match")?.value||"",output:row.querySelector(".if-rule-output")?.value||""})).filter(r=>r.source||r.match||r.output)}
    function applyCellAdminLiveStyle(mod,r,c){
      const style=readCellStyleControls();
      setCellStyle(mod,r,c,style);
      refreshTableCellDOM(mod,r,c);
      save();
    }
    function readCellStyleControls(){return {textColor:document.getElementById("cellTextColor")?.value||"#e2e8f0",bgColor:document.getElementById("cellBgColor")?.value||"#000000",bgOpacity:Number(document.getElementById("cellBgOpacity")?.value||0),align:document.getElementById("cellAlign")?.value||"center"}}
    function applyCellAdminLiveStyleToTargets(){selectedCellTargets().forEach(t=>{const mod=getModule(t.moduleId);if(mod)applyCellAdminLiveStyle(mod,t.row,t.col)});}
    function resetSelectedCellDesign(){selectedCellTargets().forEach(t=>{const mod=getModule(t.moduleId);if(mod){clearCellStyle(mod,t.row,t.col);refreshTableCellDOM(mod,t.row,t.col)}});renderCellSettings();save();}
    function centerSelectedCells(){
      const targets=selectedCellTargets();
      targets.forEach(t=>{
        const mod=getModule(t.moduleId);
        if(!mod)return;
        const style={...getCellStyle(mod,t.row,t.col),align:"center"};
        setCellStyle(mod,t.row,t.col,style);
        refreshTableCellDOM(mod,t.row,t.col);
      });
      renderCellSettings();
      save();
    }
    function resetDesignOnly(){
      if(!confirm("Reset design? Dette beholder innhold, moduler, IF-regler og personell, men fjerner farger/formatting og nullstiller tekststørrelse/visuell stil."))return;
      state.fontScale=1;
      state.rules=[];
      state.views.forEach(view=>(view.modules||[]).forEach(mod=>{
        mod.scale=1;
        if(mod.type==="table"){mod.cellStyles={};}
        if(mod.type==="note"){mod.align="left";}
        if(mod.type==="image"){mod.fit="contain";}
      }));
      state.selectedCells=[];
      state.selectedCell=null;
      renderAll();
    }

    board.addEventListener("dragover",e=>{e.preventDefault();board.classList.add("drag-over")});
    board.addEventListener("dragleave",()=>board.classList.remove("drag-over"));
    board.addEventListener("drop",e=>{e.preventDefault();board.classList.remove("drag-over");if(!draggedPaletteType)return;addModule(draggedPaletteType,e.clientX,e.clientY);draggedPaletteType=null});

    function addModule(type,clientX,clientY){
      const b=board.getBoundingClientRect();
      const mod={id:uid(),type,name:moduleDefs[type].label,x:clientX?clientX-b.left-170:30+activeView().modules.length*24,y:clientY?clientY-b.top-100:30+activeView().modules.length*24,w:360,h:220,scale:1};
      if(type==="weather"){mod.w=760;mod.h=280;mod.airports=[{icao:"ENGM",taf:"",updated:""}]}
      if(type==="time"){mod.w=420;mod.h=230;mod.timeZones=[{label:"Oslo",zone:"Europe/Oslo"},{label:"UTC",zone:"UTC"}];mod.showSeconds=true}
      if(type==="table"){mod.w=520;mod.h=300;mod.rows=[["",""]];mod.cellWordLists={};mod.cellStyles={};mod.cellFunctions={}}
      if(type==="json"){mod.w=520;mod.h=320;mod.jsonText=""}
      if(type==="checklist"){mod.w=360;mod.h=260;mod.items=[{text:"",done:false}]}
      if(type==="alert"){mod.w=420;mod.h=180;mod.level="normal";mod.message=""}
      if(type==="note"){mod.w=260;mod.h=150;mod.text="";mod.align="left"}
      if(type==="image"){mod.w=420;mod.h=300;mod.src="";mod.fit="contain"}
      if(type==="timeline"){mod.w=720;mod.h=220;const today=new Date();const tomorrow=new Date(Date.now()+86400000);mod.start=today.toISOString().slice(0,10);mod.end=tomorrow.toISOString().slice(0,10);mod.periods=[{name:"Periode",start:mod.start,end:mod.end,color:"#60a5fa",opacity:.55,textColor:"#ffffff"}];mod.events=[{name:"Hendelse",time:mod.start,color:"#f8fafc"}]}
      if(type==="personell"){mod.w=620;mod.h=300;mod.rows=[{function:"",name:"",location:""}]}
      fitModule(mod);activeView().modules.push(mod);selectModule(mod.id);
    }

    function selectModule(id,rerender=true){state.selectedId=id;if(rerender)renderAll();else save()}
    function activeView(){return state.views.find(v=>v.id===state.activeViewId)||state.views[0]}
    function selected(){return activeView().modules.find(m=>m.id===state.selectedId)||null}
    function getModule(id){return activeView().modules.find(m=>m.id===id)||null}
    function colCount(mod){return Math.max(1,...(mod.rows||[]).map(r=>r.length))}
    function normalizeMod(mod){mod.x=Number(mod.x)||30;mod.y=Number(mod.y)||30;mod.w=Number(mod.w)||360;mod.h=Number(mod.h)||220;mod.scale=Number(mod.scale)||1;if(mod.type==="table"){if(!mod.rows)mod.rows=[[""]];if(!mod.cellWordLists)mod.cellWordLists={};if(!mod.cellStyles)mod.cellStyles={};if(!mod.cellFunctions)mod.cellFunctions={};if(!mod.mergedCells)mod.mergedCells={};normalizeMerges(mod);const cols=colCount(mod);mod.rows.forEach(r=>{while(r.length<cols)r.push("")})}
      if(mod.type==="note"&&!mod.align)mod.align="left";
      if(mod.type==="image"){if(!mod.fit)mod.fit="contain";if(typeof mod.src!=="string")mod.src=""}
      if(mod.type==="timeline"){if(!mod.start)mod.start=new Date().toISOString().slice(0,10);if(!mod.end)mod.end=mod.start;if(!Array.isArray(mod.periods))mod.periods=[];if(!Array.isArray(mod.events))mod.events=[]}
      if(mod.type==="personell"){if(!Array.isArray(mod.rows))mod.rows=[{function:"",name:"",location:""}];personellTextSizes(mod)}
      }
    function moduleMinWidth(mod){return mod&&mod.type==="note"?80:140}
    function moduleMinHeight(mod){return mod&&mod.type==="note"?56:100}
    function fitModule(mod){const b=boardRect();const minW=moduleMinWidth(mod),minH=moduleMinHeight(mod);mod.w=clamp(mod.w,minW,Math.max(minW,b.width));mod.h=clamp(mod.h,minH,Math.max(minH,b.height));mod.x=clamp(mod.x,0,Math.max(0,b.width-mod.w));mod.y=clamp(mod.y,0,Math.max(0,b.height-mod.h))}
    function boardRect(){return board.getBoundingClientRect()}

    function getCellWords(mod,r,c){return (mod.cellWordLists||{})[`${r}:${c}`]||[]}
    function setCellWords(mod,r,c,words){if(!mod.cellWordLists)mod.cellWordLists={};mod.cellWordLists[`${r}:${c}`]=words}
    function getCellStyle(mod,r,c){return (mod.cellStyles||{})[`${r}:${c}`]||{}}
    function setCellStyle(mod,r,c,style){if(!mod.cellStyles)mod.cellStyles={};mod.cellStyles[`${r}:${c}`]=style}
    function clearCellStyle(mod,r,c){if(mod.cellStyles)delete mod.cellStyles[`${r}:${c}`]}
    function ensureCellFunctionStore(mod){if(!mod.cellFunctions)mod.cellFunctions={}}
    function normalizeCellFunction(fn){
      fn=fn||{};
      if(!Array.isArray(fn.ifRules)){
        const migrated=fn.ifEnabled||fn.ifSource||fn.ifMatch||fn.ifOutput?[{enabled:!!fn.ifEnabled,source:fn.ifSource||"A1",match:fn.ifMatch||"",output:fn.ifOutput||""}]:[];
        fn={...fn,ifRules:migrated};
        delete fn.ifEnabled;delete fn.ifSource;delete fn.ifMatch;delete fn.ifOutput;
      }
      return fn;
    }
    function getCellFunction(mod,r,c){ensureCellFunctionStore(mod);const key=`${r}:${c}`;const fn=normalizeCellFunction(mod.cellFunctions[key]||{});mod.cellFunctions[key]=fn;return fn}
    function setCellFunction(mod,r,c,fn){ensureCellFunctionStore(mod);mod.cellFunctions[`${r}:${c}`]=normalizeCellFunction(fn)}
    function hasCellFunction(mod,r,c){const fn=getCellFunction(mod,r,c);return !!((fn.ifRules||[]).some(x=>x.enabled)||fn.dtgEnabled)}

    function normalizeMerges(mod){
      if(!mod||mod.type!=="table")return;
      if(!mod.mergedCells)mod.mergedCells={};
      const rows=mod.rows||[],maxR=rows.length-1,maxC=colCount(mod)-1,next={};
      Object.values(mod.mergedCells||{}).forEach(m=>{
        const row=clamp(Number(m.row)||0,0,Math.max(0,maxR));
        const col=clamp(Number(m.col)||0,0,Math.max(0,maxC));
        const rowspan=clamp(Number(m.rowspan)||1,1,Math.max(1,maxR-row+1));
        const colspan=clamp(Number(m.colspan)||1,1,Math.max(1,maxC-col+1));
        if(rowspan>1||colspan>1)next[`${row}:${col}`]={row,col,rowspan,colspan};
      });
      mod.mergedCells=next;
    }
    function getMergeAt(mod,r,c){normalizeMerges(mod);return (mod.mergedCells||{})[`${r}:${c}`]||null}
    function mergeContainingCell(mod,r,c){
      normalizeMerges(mod);
      return Object.values(mod.mergedCells||{}).find(m=>r>=m.row&&r<m.row+m.rowspan&&c>=m.col&&c<m.col+m.colspan)||null;
    }
    function isHiddenMergedCell(mod,r,c){const m=mergeContainingCell(mod,r,c);return !!(m&&(m.row!==r||m.col!==c))}
    function rangesIntersect(a,b){return a.top<=b.bottom&&a.bottom>=b.top&&a.left<=b.right&&a.right>=b.left}
    function selectedRect(){
      const targets=selectedCellTargets();
      if(!targets.length)return null;
      const moduleId=targets[0].moduleId;
      if(targets.some(t=>t.moduleId!==moduleId))return null;
      return {moduleId,top:Math.min(...targets.map(t=>t.row)),bottom:Math.max(...targets.map(t=>t.row)),left:Math.min(...targets.map(t=>t.col)),right:Math.max(...targets.map(t=>t.col))};
    }
    function selectCellRange(moduleId,r1,c1,r2,c2){
      const top=Math.min(r1,r2),bottom=Math.max(r1,r2),left=Math.min(c1,c2),right=Math.max(c1,c2);
      const cells=[];
      for(let r=top;r<=bottom;r++)for(let c=left;c<=right;c++){
        const mod=getModule(moduleId);
        if(mod&&isHiddenMergedCell(mod,r,c))continue;
        cells.push({moduleId,row:r,col:c});
      }
      state.selectedCells=cells;
      state.selectedCell=cells[0]||{moduleId,row:top,col:left};
      updateCellSelectionDOM();
    }
    function updateCellSelectionDOM(){
      board.querySelectorAll("td.cell-selected,td.cell-multi-selected").forEach(x=>x.classList.remove("cell-selected","cell-multi-selected"));
      (state.selectedCells||[]).forEach(x=>{
        const td=board.querySelector(`.mod[data-id="${CSS.escape(x.moduleId)}"] td[data-row="${x.row}"][data-col="${x.col}"]`);
        if(td)td.classList.add(x.moduleId===state.selectedCell?.moduleId&&x.row===state.selectedCell?.row&&x.col===state.selectedCell?.col?"cell-selected":"cell-multi-selected");
      });
    }
    function mergeCenterSelectedCells(){
      const rect=selectedRect();
      if(!rect)return;
      const mod=getModule(rect.moduleId);
      if(!mod||mod.type!=="table")return;
      const rowspan=rect.bottom-rect.top+1,colspan=rect.right-rect.left+1;
      if(rowspan<2&&colspan<2)return;
      normalizeMerges(mod);
      const newRange={top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right};
      Object.entries(mod.mergedCells||{}).forEach(([key,m])=>{
        const oldRange={top:m.row,bottom:m.row+m.rowspan-1,left:m.col,right:m.col+m.colspan-1};
        if(rangesIntersect(newRange,oldRange))delete mod.mergedCells[key];
      });
      mod.mergedCells[`${rect.top}:${rect.left}`]={row:rect.top,col:rect.left,rowspan,colspan};
      setCellStyle(mod,rect.top,rect.left,{...getCellStyle(mod,rect.top,rect.left),align:"center"});
      state.selectedCell={moduleId:mod.id,row:rect.top,col:rect.left};
      state.selectedCells=[state.selectedCell];
      renderAll();
    }
    function unmergeSelectedCells(){
      const targets=selectedCellTargets();
      if(!targets.length)return;
      targets.forEach(t=>{
        const mod=getModule(t.moduleId);
        if(!mod||mod.type!=="table")return;
        normalizeMerges(mod);
        const m=mergeContainingCell(mod,t.row,t.col);
        if(m)delete mod.mergedCells[`${m.row}:${m.col}`];
      });
      renderAll();
    }
    function matchingFormatRule(value){const text=String(value??"").trim().toLowerCase();return [...(state.rules||[])].filter(r=>r.word).sort((a,b)=>String(b.word).length-String(a.word).length).find(r=>new RegExp(`(^|\\s)${escapeRegExp(String(r.word).trim().toLowerCase())}(?=\\s|$)`).test(text))||null}
    function cellStyleCSS(mod,r,c){
      const st=getCellStyle(mod,r,c);
      const manualOpacity=Number(st.bgOpacity ?? 0);
      const hasManualBg=!!st.bgColor && manualOpacity>0;
      const defaultText="#e2e8f0";
      const hasManualText=!!st.textColor && String(st.textColor).toLowerCase()!==defaultText;
      const textColor=hasManualText?st.textColor:null;
      const bgColor=hasManualBg?st.bgColor:null;
      const bgOpacity=hasManualBg?manualOpacity:0;
      const parts=[];
      if(textColor)parts.push(`color:${escapeHTML(textColor)}`);
      if(bgColor&&Number(bgOpacity)>0)parts.push(`background-color:${hexToRgba(bgColor,Number(bgOpacity))}`);
      if(st.align)parts.push(`text-align:${escapeHTML(st.align)}`);
      return parts.join(";");
    }
    function isSelectedCell(id,r,c){const s=state.selectedCell;return s&&s.moduleId===id&&s.row===r&&s.col===c}
    function isMultiSelectedCell(id,r,c){return Array.isArray(state.selectedCells)&&state.selectedCells.some(x=>x.moduleId===id&&x.row===r&&x.col===c)}
    function selectedCellKey(moduleId,row,col){return `${moduleId}:${row}:${col}`}
    function selectTableCell(moduleId,row,col,additive=false){
      if(!Array.isArray(state.selectedCells))state.selectedCells=[];
      const cell={moduleId,row,col};
      if(additive){
        const key=selectedCellKey(moduleId,row,col);
        const exists=state.selectedCells.some(x=>selectedCellKey(x.moduleId,x.row,x.col)===key);
        state.selectedCells=exists?state.selectedCells.filter(x=>selectedCellKey(x.moduleId,x.row,x.col)!==key):[...state.selectedCells,cell];
        state.selectedCell=cell;
      }else{
        state.selectedCells=[cell];
        state.selectedCell=cell;
      }
      updateCellSelectionDOM();
    }
    function selectedCellTargets(){
      const arr=Array.isArray(state.selectedCells)?state.selectedCells.filter(x=>getModule(x.moduleId)):[];
      if(arr.length)return arr;
      return state.selectedCell?[state.selectedCell]:[];
    }

    function applyCellFunctions(mod,changedRow,changedCol,opts={}){
      if(!mod||mod.type!=="table")return;
      ensureCellFunctionStore(mod);
      const funcs=Object.entries(mod.cellFunctions||{});
      const changedCells=[];
      funcs.forEach(([key,fn])=>{
        const [r,c]=key.split(":").map(Number);
        if(!mod.rows?.[r])return;
        (fn.ifRules||[]).filter(rule=>rule&&rule.enabled).forEach(rule=>{
          const src=cellRefToPos(rule.source||"A1");
          const srcVal=src&&mod.rows?.[src.row]?.[src.col]!==undefined?String(mod.rows[src.row][src.col]).trim():"";
          const match=String(rule.match||"").trim();
          const output=String(rule.output||"");
          if(srcVal===match && mod.rows[r][c]!==output){
            mod.rows[r][c]=output;
            changedCells.push([r,c]);
          }
        });
        if(opts.textChanged&&fn.dtgEnabled&&r===changedRow&&!(r===changedRow&&c===changedCol)){
          const dtg=formatDTGZulu(fn.dtgMode||"AUTO");
          if(mod.rows[r][c]!==dtg){
            mod.rows[r][c]=dtg;
            changedCells.push([r,c]);
          }
        }
      });
      if(changedCells.length){
        refreshAllTableCells(mod);
        const sc=state.selectedCell;
        if(sc&&sc.moduleId===mod.id)renderCellSettings();
        save();
      }
    }
    function refreshTableCellDOM(mod,r,c){
      const td=board.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"] td[data-row="${r}"][data-col="${c}"]`);
      if(!td)return;
      td.setAttribute("style",cellStyleCSS(mod,r,c));
      const input=td.querySelector(".cell-editor");
      const value=String(mod.rows?.[r]?.[c]??"");
      if(input&&input.value!==value){
        input.value=value;
        autosizeTextarea(input);
      }
    }
    function refreshAllTableCells(mod){
      if(!mod||mod.type!=="table")return;
      (mod.rows||[]).forEach((row,r)=>row.forEach((_,c)=>refreshTableCellDOM(mod,r,c)));
    }
    function cellName(row,col){return colName(col)+(row+1)}
    function colName(col){let s="",n=col+1;while(n>0){let r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s}
    function cellRefToPos(ref){const m=String(ref||"").trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);if(!m)return null;let col=0;for(const ch of m[1])col=col*26+(ch.charCodeAt(0)-64);return{row:Number(m[2])-1,col:col-1}}
    function formatDTGZulu(mode="AUTO"){
      const now=new Date();
      let d=now;
      if(mode==="ALFA"||mode==="BRAVO"){
        const offset=mode==="ALFA"?1:2;
        d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate(),now.getHours()-offset,now.getMinutes(),now.getSeconds()));
      }
      const months=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      return `${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z ${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
    }
    function pad2(n){return String(n).padStart(2,"0")}
    function autosizeTextarea(el){el.style.height="auto";el.style.height=Math.max(32,el.scrollHeight)+"px"}

    function showWordDropdown(cell,mod,r,c){
      const words=getCellWords(mod,r,c);
      if(!words.length){hideWordDropdown();return}
      wordDropdown.innerHTML=words.map(w=>`<button type="button" data-word="${escapeHTML(w)}">${escapeHTML(w)}</button>`).join("");
      const rect=cell.getBoundingClientRect();
      wordDropdown.style.left=Math.min(rect.left,window.innerWidth-280)+"px";
      wordDropdown.style.top=Math.min(rect.bottom+6,window.innerHeight-240)+"px";
      wordDropdown.classList.add("show");
      wordDropdown.querySelectorAll("button").forEach(btn=>btn.addEventListener("mousedown",e=>{
        e.preventDefault();
        const word=btn.dataset.word;
        if("value" in cell){cell.value=word;autosizeTextarea(cell)}else cell.textContent=word;
        mod.rows[r][c]=word;
        const td=cell.closest("td");
        td?.setAttribute("style",cellStyleCSS(mod,r,c));
        applyCellFunctions(mod,r,c,{textChanged:true});
        refreshAllTableCells(mod);
        refreshTableCellDOM(mod,r,c);
        const sc=state.selectedCell;
        if(sc&&sc.moduleId===mod.id&&sc.row===r&&sc.col===c)renderCellSettings();
        save();
        placeCaretEnd(cell);
      }));
    }
    function hideWordDropdown(){wordDropdown.classList.remove("show");wordDropdown.innerHTML=""}
    function placeCaretEnd(el){el.focus();if(typeof el.selectionStart==="number"){const n=el.value.length;el.setSelectionRange(n,n);return}const range=document.createRange();range.selectNodeContents(el);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}

    function clearSelectedCell(){
      if(!state.selectedCell)return;
      try{persistSelectedCellSettings(false)}catch(e){}
      state.selectedCell=null;
      state.selectedCells=[];
      board.querySelectorAll("td.cell-selected,td.cell-multi-selected").forEach(x=>x.classList.remove("cell-selected","cell-multi-selected"));
      board.querySelectorAll("td.editing").forEach(x=>x.classList.remove("editing"));
      hideWordDropdown();
      renderCellSettings();
      save();
    }

    document.addEventListener("pointerdown",e=>{
      const keepCellSelected=e.target.closest("td,.cell-editor,.word-dropdown,.admin-panel,.login-modal,.modal,.admin-entry");
      if(!keepCellSelected)clearSelectedCell();
      if(!e.target.closest("td[contenteditable=true],.cell-editor,.word-dropdown"))hideWordDropdown();
    });

    function openAdminLogin(){
      if(state.adminUnlocked){state.editMode=true;state.adminHidden=false;renderAll();return}
      if(!els.loginModal||!els.passwordInput){
        const value=prompt("Admin-passord:");
        if(value===PASSWORD)unlockAdmin();
        else if(value!==null)alert("Feil passord.");
        return;
      }
      els.loginModal.classList.add("show");
      els.passwordInput.value="";
      setTimeout(()=>{try{els.passwordInput.focus()}catch{}},50);
    }
    function unlockAdmin(){state.adminUnlocked=true;state.editMode=true;state.adminHidden=false;rememberAdminUnlock();els.loginModal.classList.remove("show");renderAll()}
    els.adminButton.onclick=()=>openAdminLogin();
    function hideAdminPanel(){state.adminHidden=true;renderAll()}
    els.closeAdmin.onclick=hideAdminPanel;
    if(els.hideAdmin)els.hideAdmin.onclick=hideAdminPanel;
    els.closeLogin.onclick=()=>els.loginModal.classList.remove("show");
    els.loginBtn.onclick=tryLogin;els.passwordInput.addEventListener("keydown",e=>{if(e.key==="Enter")tryLogin()});
    function tryLogin(){if(els.passwordInput.value===PASSWORD)unlockAdmin();else alert("Feil passord.")}
    document.addEventListener("keydown",e=>{
      if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="a"){
        e.preventDefault();
        if(state.adminUnlocked){state.editMode=true;state.adminHidden=false;renderAll();return}
        const value=prompt("Admin-passord:");
        if(value===PASSWORD)unlockAdmin();
        else if(value!==null)alert("Feil passord.");
      }
      if(e.key==="Escape"&&state.editMode&&state.adminUnlocked){state.adminHidden=true;renderAll()}
    });
    els.displayMode.onclick=()=>{state.editMode=!state.editMode;if(state.editMode)state.adminHidden=false;renderAll()};
    els.fullscreen.onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen();else document.exitFullscreen()};
    document.addEventListener("fullscreenchange",()=>els.fullscreen.textContent=document.fullscreenElement?"Exit fullscreen":"Fullscreen");
    els.newView.onclick=()=>{const v={id:uid(),name:"View "+(state.views.length+1),modules:[]};state.views.push(v);state.activeViewId=v.id;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];state.selectedCells=[];renderAll()};
    els.renameView.onclick=()=>{const v=activeView();const name=prompt("Nytt navn:",v.name);if(name&&name.trim()){v.name=name.trim();renderAll()}};
    els.deleteView.onclick=()=>{if(state.views.length===1)return alert("Du må ha minst én view.");if(!confirm("Slette aktiv view?"))return;state.views=state.views.filter(v=>v.id!==state.activeViewId);state.activeViewId=state.views[0].id;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];renderAll()};
    els.fontScale.oninput=e=>{state.fontScale=Number(e.target.value);renderAll()};
    els.resetBtn.onclick=()=>{if(confirm("Slette alt og starte på nytt?")){try{localStorage.removeItem(STORAGE_KEY)}catch(e){};location.reload()}};
    els.exportBtn.onclick=async()=>{persistSelectedCellSettings(false);const text=JSON.stringify(createExportState(),null,2);downloadText("statusboard-dashboard.json",text);try{await navigator.clipboard.writeText(text)}catch{};alert("Dashboard er lagret som JSON-fil med alle moduler, cellefarger, ordlister og cellefunksjoner.")};
    els.importBtn.onclick=()=>{els.importText.value="";els.importModal.classList.add("show")};els.closeImport.onclick=()=>els.importModal.classList.remove("show");els.loadImport.onclick=()=>{try{const imported=JSON.parse(els.importText.value);if(!imported.views||!Array.isArray(imported.views))throw new Error();state={...state,...imported,adminUnlocked:true,editMode:true,adminHidden:false};els.importModal.classList.remove("show");renderAll()}catch{alert("Ugyldig JSON.")}};
    els.rulesBtn.onclick=()=>{renderRules();els.rulesModal.classList.add("show")};els.closeRules.onclick=()=>els.rulesModal.classList.remove("show");els.addRule.onclick=()=>{saveRulesFromDOM(false);state.rules.push({word:"",textColor:"#ffffff",bgColor:"#000000",bgOpacity:0.35});renderRules()};els.saveRules.onclick=()=>{saveRulesFromDOM(true);els.rulesModal.classList.remove("show");renderAll()};
    function saveRulesFromDOM(dropEmpty=true){const rows=[...els.rulesList.querySelectorAll(".rule-row")];if(!rows.length)return;state.rules=rows.map(row=>({word:row.querySelector(".rule-word").value.trim(),textColor:row.querySelector(".rule-text-color").value,bgColor:row.querySelector(".rule-bg-color").value,bgOpacity:Number(row.querySelector(".rule-bg-opacity").value)})).filter(r=>dropEmpty?r.word:true);save()}
    function renderRules(){els.rulesList.innerHTML="";state.rules.forEach((rule,i)=>{const row=document.createElement("div");row.className="rule-row";const op=rule.bgOpacity ?? 0.35;row.innerHTML=`<input class="rule-word" value="${escapeHTML(rule.word)}" placeholder="Ord"><input title="Tekstfarge" class="rule-text-color" type="color" value="${escapeHTML(rule.textColor||rule.color||"#ffffff")}"><input title="Celle-/bakgrunnsfarge" class="rule-bg-color" type="color" value="${escapeHTML(rule.bgColor||"#000000")}"><input title="Opacity" class="rule-bg-opacity" type="range" min="0" max="1" step="0.05" value="${op}"><button class="mini-btn danger">×</button>`;row.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>saveRulesFromDOM(false)));row.querySelector("button").onclick=()=>{saveRulesFromDOM(false);state.rules.splice(i,1);renderRules();renderAll()};els.rulesList.appendChild(row)})}


    function persistSelectedCellSettings(rerender=true){
      const sc=state.selectedCell,mod=sc?getModule(sc.moduleId):null;
      if(!sc||!mod||mod.type!=="table")return;
      const valueEl=document.getElementById("cellValue");
      const wordsEl=document.getElementById("cellWords");
      const oldValue=mod.rows?.[sc.row]?mod.rows[sc.row][sc.col]:undefined;
      if(valueEl&&mod.rows?.[sc.row])mod.rows[sc.row][sc.col]=valueEl.value;
      if(wordsEl)setCellWords(mod,sc.row,sc.col,wordsEl.value.split("\n").map(x=>x.trim()).filter(Boolean));
      if(document.getElementById("cellTextColor"))setCellStyle(mod,sc.row,sc.col,readCellStyleControls());
      const fn=getCellFunction(mod,sc.row,sc.col);
      fn.ifRules=document.getElementById("ifRulesList")?readIfRulesFromDOM():(fn.ifRules||[]);
      const dtg=document.getElementById("dtgEnabled"),mode=document.getElementById("dtgMode");
      if(dtg)fn.dtgEnabled=dtg.checked;
      if(mode)fn.dtgMode=mode.value;
      setCellFunction(mod,sc.row,sc.col,fn);
      applyCellFunctions(mod,sc.row,sc.col,{textChanged:valueEl&&oldValue!==mod.rows[sc.row][sc.col]});
      if(rerender)renderAll();else{refreshAllTableCells(mod);save()}
    }

    function createExportState(){
      const exported=clone(state);
      exported.adminUnlocked=false;
      exported.editMode=false;
      exported.adminHidden=false;
      exported.selectedId=null;
      exported.selectedCell=null;exported.selectedCells=[];
      exported.exportedAt=new Date().toISOString();
      exported.exportVersion="statusboard-admin-v3";
      return exported;
    }


    function personellTextSizes(mod){
      if(!mod.personellTextSizes)mod.personellTextSizes={function:1,name:1,location:1,phone:1};
      ["function","name","location","phone"].forEach(k=>{mod.personellTextSizes[k]=Number(mod.personellTextSizes[k])||1});
      return mod.personellTextSizes;
    }
    function bindPersonellSizeControls(mod){
      const map={personSizeFunction:"function",personSizeName:"name",personSizeLocation:"location",personSizePhone:"phone"};
      Object.entries(map).forEach(([id,key])=>bind(id,"input",e=>{personellTextSizes(mod)[key]=Number(e.target.value)||1;renderAll()}));
    }
    function timelineSettingsHTML(mod){
      const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-row timeline-period-admin" data-index="${i}"><input class="tl-p-name" value="${escapeHTML(p.name||"")}" placeholder="Navn"><input class="tl-p-start" type="datetime-local" value="${toDateTimeLocal(p.start||mod.start)}"><input class="tl-p-end" type="datetime-local" value="${toDateTimeLocal(p.end||mod.end)}"><input class="tl-p-color" type="color" value="${escapeHTML(p.color||"#60a5fa")}"><button class="mini-btn danger tl-remove-period" type="button">×</button></div>`).join("");
      const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-row timeline-event-admin" data-index="${i}"><input class="tl-e-name" value="${escapeHTML(ev.name||"")}" placeholder="Hendelse"><input class="tl-e-time" type="datetime-local" value="${toDateTimeLocal(ev.time||mod.start)}"><span></span><input class="tl-e-color" type="color" value="${escapeHTML(ev.color||"#f8fafc")}"><button class="mini-btn danger tl-remove-event" type="button">×</button></div>`).join("");
      return `<div class="grid2"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div></div><div class="section" style="margin-top:10px"><div class="section-title"><h2>Perioder</h2><button id="timelineAddPeriod" class="mini-btn">+</button></div><div id="timelinePeriods">${periods}</div></div><div class="section" style="margin-top:10px"><div class="section-title"><h2>Enkelthendelser</h2><button id="timelineAddEvent" class="mini-btn">+</button></div><div id="timelineEvents">${events}</div></div>`;
    }
    function bindTimelineControls(mod){
      if(mod.type!=="timeline")return;
      bind("timelineStart","change",e=>{mod.start=fromDateTimeLocal(e.target.value);renderAll()});
      bind("timelineEnd","change",e=>{mod.end=fromDateTimeLocal(e.target.value);renderAll()});
      bind("timelineAddPeriod","click",()=>{mod.periods.push({name:"Periode",start:mod.start,end:mod.end,color:"#60a5fa",opacity:.55,textColor:"#ffffff"});renderAll()});
      bind("timelineAddEvent","click",()=>{mod.events.push({name:"Hendelse",time:mod.start,color:"#f8fafc"});renderAll()});
      document.querySelectorAll(".timeline-period-admin").forEach(row=>row.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>{readTimelineControls(mod);renderAll()})));
      document.querySelectorAll(".tl-remove-period").forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.periods.splice(+btn.closest(".timeline-period-admin").dataset.index,1);renderAll()});
      document.querySelectorAll(".timeline-event-admin").forEach(row=>row.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>{readTimelineControls(mod);renderAll()})));
      document.querySelectorAll(".tl-remove-event").forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.events.splice(+btn.closest(".timeline-event-admin").dataset.index,1);renderAll()});
    }
    function readTimelineControls(mod){
      const s=document.getElementById("timelineStart"),e=document.getElementById("timelineEnd");
      if(s)mod.start=fromDateTimeLocal(s.value);if(e)mod.end=fromDateTimeLocal(e.value);
      mod.periods=[...document.querySelectorAll(".timeline-period-admin")].map(row=>({name:row.querySelector(".tl-p-name")?.value||"",start:fromDateTimeLocal(row.querySelector(".tl-p-start")?.value),end:fromDateTimeLocal(row.querySelector(".tl-p-end")?.value),color:row.querySelector(".tl-p-color")?.value||"#60a5fa",opacity:.55,textColor:"#ffffff"}));
      mod.events=[...document.querySelectorAll(".timeline-event-admin")].map(row=>({name:row.querySelector(".tl-e-name")?.value||"",time:fromDateTimeLocal(row.querySelector(".tl-e-time")?.value),color:row.querySelector(".tl-e-color")?.value||"#f8fafc"}));
      save();
    }
    function toDateTimeLocal(value){const d=new Date(value||Date.now());if(Number.isNaN(d.getTime()))return "";const off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}
    function fromDateTimeLocal(value){return value?new Date(value).toISOString():new Date().toISOString()}
    function formatTextHTML(value){
      let html=escapeHTML(value);
      const rules=[...(state.rules||[])].filter(r=>String(r.word||"").trim()).sort((a,b)=>String(b.word).length-String(a.word).length);
      rules.forEach(rule=>{
        const word=escapeHTML(String(rule.word).trim());
        const re=new RegExp(`(^|\\s)(${escapeRegExp(word)})(?=\\s|$)`,`gi`);
        const style=`color:${escapeHTML(rule.textColor||rule.color||"#ffffff")};background-color:${hexToRgba(rule.bgColor||"#000000",rule.bgOpacity??0.35)}`;
        html=html.replace(re,(m,pre,w)=>`${pre}<span class="cf-word" style="${style}">${w}</span>`);
      });
      return html;
    }
    function pasteTableTextIntoModule(mod,startRow,startCol,text){
      const rows=String(text||"").replace(/\r/g,"").split("\n");
      if(rows.length&&rows[rows.length-1]==="")rows.pop();
      const data=rows.map(r=>r.split("\t"));
      if(!data.length)return;
      const neededRows=startRow+data.length;
      const neededCols=startCol+Math.max(...data.map(r=>r.length));
      while(mod.rows.length<neededRows)mod.rows.push(Array(colCount(mod)).fill(""));
      mod.rows.forEach(r=>{while(r.length<neededCols)r.push("")});
      data.forEach((row,ri)=>row.forEach((val,ci)=>{mod.rows[startRow+ri][startCol+ci]=val}));
      applyCellFunctions(mod,startRow,startCol,{textChanged:true});
      renderAll();
    }
    function insertRowAfterSelection(mod){
      const targets=selectedCellTargets().filter(t=>t.moduleId===mod.id);
      const after=targets.length?Math.max(...targets.map(t=>t.row)):mod.rows.length-1;
      mod.rows.splice(after+1,0,Array(colCount(mod)).fill(""));
      shiftCellMapsAfterRow(mod,after);
      renderAll();
    }
    function insertColAfterSelection(mod){
      const targets=selectedCellTargets().filter(t=>t.moduleId===mod.id);
      const after=targets.length?Math.max(...targets.map(t=>t.col)):colCount(mod)-1;
      mod.rows.forEach(r=>r.splice(after+1,0,""));
      shiftCellMapsAfterCol(mod,after);
      renderAll();
    }
    function shiftCellMapsAfterRow(mod,after){["cellWordLists","cellStyles","cellFunctions"].forEach(name=>{const src=mod[name]||{},next={};Object.entries(src).forEach(([key,val])=>{let [r,c]=key.split(":").map(Number);if(r>after)r++;next[`${r}:${c}`]=val});mod[name]=next});if(mod.mergedCells){Object.values(mod.mergedCells).forEach(m=>{if(m.row>after)m.row++});}}
    function shiftCellMapsAfterCol(mod,after){["cellWordLists","cellStyles","cellFunctions"].forEach(name=>{const src=mod[name]||{},next={};Object.entries(src).forEach(([key,val])=>{let [r,c]=key.split(":").map(Number);if(c>after)c++;next[`${r}:${c}`]=val});mod[name]=next});if(mod.mergedCells){Object.values(mod.mergedCells).forEach(m=>{if(m.col>after)m.col++});}}

    async function refreshTAF(mod){
      alert("Offline-versjon: automatisk TAF-henting er deaktivert. Lim inn TAF manuelt i værmodulen.");
    }
    function jsonToTable(mod){const rows=parseJSONRows(mod.jsonText||"");const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];mod.type="table";mod.name="Table";mod.rows=rows.length?rows.map(r=>cols.map(c=>String(r[c]??""))):[[""]];mod.cellWordLists={};mod.cellStyles={};mod.cellFunctions={};renderAll()}
    function tick(){activeView().modules.forEach(mod=>{if(mod.type==="time"){const el=board.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"]`);el?.querySelectorAll(".time-value").forEach((cell,i)=>{const row=mod.timeZones[i];if(row)cell.textContent=timeFor(row.zone,mod.showSeconds)})}})}

    function analyzeTAF(text){const t=String(text||"").toUpperCase();if(!t)return{status:"",className:"s-blue",ceiling:"",visibility:""};let vis=9999;(t.match(/\b\d{4}\b/g)||[]).forEach(v=>{const n=Number(v);if(n>=0&&n<=9999)vis=Math.min(vis,n)});let ceiling=null,re=/\b(SCT|BKN|OVC)(\d{3})(CB|TCU)?\b/g,m;while((m=re.exec(t))!==null){const ft=Number(m[2])*100;if(ceiling===null||ft<ceiling)ceiling=ft}let score=1;if(vis<2000||(ceiling!==null&&ceiling<800))score=4;else if(vis<4000||(ceiling!==null&&ceiling<1100))score=3;else if(vis<8000||(ceiling!==null&&ceiling<2000))score=2;return{status:["","GREEN","YELLOW","ORANGE","RED"][score],className:["","s-green","s-yellow","s-orange","s-red"][score],ceiling:ceiling===null?"":ceiling+" ft",visibility:vis===9999?"9999+":String(vis)}}
    function timeFor(zone,seconds){try{return new Intl.DateTimeFormat("no-NO",{timeZone:zone||"UTC",hour:"2-digit",minute:"2-digit",second:seconds?"2-digit":undefined,hour12:false}).format(new Date())}catch{return""}}
    function parseJSONRows(text){try{const parsed=JSON.parse(text||"[]");if(Array.isArray(parsed))return parsed.filter(x=>x&&typeof x==="object");if(parsed&&typeof parsed==="object")return[parsed];return[]}catch{return[]}}
    function copyToClipboard(text){navigator.clipboard?.writeText(text).catch(()=>{})}
    function downloadText(filename,text){const blob=new Blob([text],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
    function bind(id,event,fn){const el=document.getElementById(id);if(el)el.addEventListener(event,fn)}
    function rememberAdminUnlock(){try{localStorage.setItem(ADMIN_UNLOCK_KEY,"true")}catch(e){}}
    function isAdminRemembered(){try{return localStorage.getItem(ADMIN_UNLOCK_KEY)==="true"}catch(e){return false}}
    function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,editMode:false}))}catch(e){}}
    function load(){let saved=null;try{saved=localStorage.getItem(STORAGE_KEY)}catch(e){saved=null}if(!saved){state.adminUnlocked=isAdminRemembered();return}try{const parsed=JSON.parse(saved);if(parsed.views&&Array.isArray(parsed.views)){state={...state,...parsed,adminUnlocked:isAdminRemembered()||!!parsed.adminUnlocked,editMode:false,adminHidden:false};if(!state.rules)state.rules=[];if(!Array.isArray(state.selectedCells))state.selectedCells=[];if(!state.activeViewId)state.activeViewId=state.views[0].id}}catch{state.adminUnlocked=isAdminRemembered()}}
    function uid(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()+Math.random())}
    function clone(x){return JSON.parse(JSON.stringify(x))}
    function px(n){return `${Math.round(Number(n)||0)}px`}
    function clamp(v,min,max){return Math.min(max,Math.max(min,Number(v)||0))}
    function escapeHTML(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
    function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
    function hexToRgba(hex,opacity){
      hex=String(hex||"#000000").replace("#","");
      if(hex.length===3)hex=hex.split("").map(ch=>ch+ch).join("");
      const num=parseInt(hex,16);
      const r=(num>>16)&255,g=(num>>8)&255,b=num&255;
      return `rgba(${r},${g},${b},${clamp(Number(opacity),0,1)})`;
    }
    function fmt(value){return escapeHTML(value)}
    window.addEventListener("resize",()=>{renderAll()});


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
    /* Request patch v5: timeline event time/stacking, cell font size, admin-only tekstlogg log filters */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-track.v5{height:190px;margin:0 22px;position:relative;overflow:visible;}
        .timeline-line.v5{position:absolute;left:0;right:0;top:102px;height:5px;border-radius:999px;background:rgba(226,232,240,.86);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22)}
        .timeline-tick.v5{top:88px;height:31px;background:rgba(248,250,252,.9);z-index:4}
        .timeline-tick-label.v5{top:124px;font-size:.7em;z-index:4}
        .timeline-period-v5{position:absolute;top:117px;height:18px;border-radius:999px;transform:translateY(0);box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:2;overflow:visible;}
        .timeline-period-v5 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75)}
        .timeline-event-v5{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:4px;min-width:86px;text-align:center;z-index:5;}
        .timeline-event-v5 .ev-label{font-size:.8em;font-weight:950;white-space:nowrap;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.5);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:2px 7px;}
        .timeline-event-v5 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:18px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-admin-compact.v5 details.timeline-details>summary{position:sticky;top:0;background:rgba(2,6,23,.48);backdrop-filter:blur(8px);z-index:2}
        .timeline-admin-compact.v5 .timeline-event-admin .grid-time-color{display:grid;grid-template-columns:1fr 95px 54px;gap:7px;align-items:end;}
        .timeline-admin-compact.v5 .timeline-event-admin input[type=time]{font-size:12px;}
        .cell-font-size-row{display:grid;grid-template-columns:1fr 82px;gap:8px;align-items:end;margin-bottom:10px}.cell-font-size-row input{width:100%;border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:rgba(2,6,23,.64);color:white}
        .log-content.v5{height:100%;display:flex;flex-direction:column;gap:10px}.log-list.v5{display:grid;gap:10px;overflow:auto}.log-entry.v5{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:12px;line-height:1.45;white-space:pre-wrap}.log-entry-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.log-tag{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.08);font-size:.78em;color:#cbd5e1}.log-tag.bold{font-weight:950;color:white;background:rgba(96,165,250,.22);border-color:rgba(147,197,253,.35)}
        .log-admin-grid{display:grid;gap:9px}.log-filter-row{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px;background:rgba(2,6,23,.32)}.log-filter-row strong{font-size:13px;word-break:break-word}.log-filter-row label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px}.log-filter-row input{width:18px;height:18px}.log-admin-file{display:none}.log-admin-note{font-size:12px;color:var(--muted);line-height:1.35}
      `;
      document.head.appendChild(style);

      function d5(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?new Date():d}
      function fmt5(value,unit){const d=d5(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function sameEventKey(ev){const d=d5(ev.time);return d.toISOString().slice(0,16)}
      function safeTimeValue(v){const d=d5(v);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
      function datePart(v){const d=d5(v);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
      function combineDateAndTime(dateSource,timeValue){const base=d5(dateSource);const [hh,mm]=String(timeValue||'00:00').split(':').map(Number);base.setHours(Number.isFinite(hh)?hh:0,Number.isFinite(mm)?mm:0,0,0);return base.toISOString()}

      timelineHTML=function(mod){
        const start=d5(mod.start), end=d5(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp(((d5(v).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick v5" style="left:${pct}%"></div><div class="timeline-tick-label v5" style="left:${pct}%">${escapeHTML(fmt5(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v5" style="left:${left}%;width:${w}%;background:${hexToRgba(p.color||'#60a5fa',p.opacity??0.55)}"><span>${escapeHTML(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map(ev=>{const key=sameEventKey(ev); const level=used[key]||0; used[key]=level+1; const top=Math.max(4,72-(level*28));return `<div class="timeline-event-v5" style="left:${pos(ev.time)}%;top:${top}px;color:${escapeHTML(ev.color||'#f8fafc')}" title="${escapeHTML((ev.name||'')+' '+fmt5(ev.time,'hour'))}"><div class="ev-label">${escapeHTML(ev.name||'')} <span class="small">${escapeHTML(fmt5(ev.time,'hour'))}</span></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track v5"><div class="timeline-line v5"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${escapeHTML(fmt5(mod.start,unit))}</span><span>${escapeHTML(fmt5(mod.end,unit))}</span></div></div></div>`;
      };

      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour'; const open=mod.timelineOpenSection||'events';
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-p-name" value="${escapeHTML(p.name||'')}" placeholder="Periode"></div>
          <div class="grid-mini"><div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDateTimeLocal(p.start||mod.start)}"></div><div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDateTimeLocal(p.end||mod.end)}"></div></div>
          <div class="grid-color"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${escapeHTML(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div>
          <button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button>
        </div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-e-name" value="${escapeHTML(ev.name||'')}" placeholder="Hendelse"></div>
          <div class="grid-time-color"><div class="field"><label>Dato</label><input class="tl-e-date" type="date" value="${datePart(ev.time||mod.start)}"></div><div class="field"><label>Klokkeslett</label><input class="tl-e-clock" type="time" value="${safeTimeValue(ev.time||mod.start)}"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${escapeHTML(ev.color||'#f8fafc')}"></div></div>
          <button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button>
        </div>`).join('');
        return `<div class="timeline-admin-compact v4 v5">
          <div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div></div>
          <div class="timeline-small-grid"><div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div>
          <p class="small">Perioder vises under linjen. Hendelser vises over linjen med klokkeslett.</p>
          <details class="timeline-details" ${open==='periods'?'open':''}><summary>Perioder (${mod.periods?.length||0})</summary><div class="timeline-detail-body"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div></details>
          <details class="timeline-details" ${open==='events'?'open':''}><summary>Hendelser (${mod.events?.length||0})</summary><div class="timeline-detail-body"><button id="timelineAddEvent" class="tool-btn" type="button">+ Legg til hendelse</button><div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div></details>
        </div>`;
      };

      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDateTimeLocal(s.value); if(e)mod.end=fromDateTimeLocal(e.value); if(u)mod.timeUnit=u.value; if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDateTimeLocal(row.querySelector('.tl-p-start')?.value),end:fromDateTimeLocal(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>{const date=row.querySelector('.tl-e-date')?.value||datePart(mod.start); const clock=row.querySelector('.tl-e-clock')?.value||'00:00'; return {name:row.querySelector('.tl-e-name')?.value||'',time:new Date(`${date}T${clock}:00`).toISOString(),color:row.querySelector('.tl-e-color')?.value||'#f8fafc'};});
        save();
      };

      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        document.querySelectorAll('.timeline-details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)mod.timelineOpenSection=d.querySelector('summary')?.textContent?.toLowerCase().includes('periode')?'periods':'events';save();}));
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll()});el?.addEventListener('input',()=>{readTimelineControls(mod);});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll()});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.push({name:'Hendelse',time:mod.start,color:'#f8fafc'});renderAll()});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);});});
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll()});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll()});
      };

      const previousCellStyleCSS=cellStyleCSS;
      cellStyleCSS=function(mod,r,c){const style=getCellStyle(mod,r,c)||{};const base=previousCellStyleCSS(mod,r,c)||'';return base+`;font-size:${Number(style.fontSize||1)}em;`;};

      const prevRenderCellSettingsV5=renderCellSettings;
      renderCellSettings=function(){prevRenderCellSettingsV5();const targets=selectedCellTargets();if(!targets.length)return;const mod=getModule(targets[0].moduleId);if(!mod||mod.type!=='table')return;const primary=targets[0];const st=getCellStyle(mod,primary.row,primary.col)||{};if(document.getElementById('cellFontSize'))return;const block=`<div class="field"><label>Fontstørrelse for ${targets.length>1?'markerte celler':'cellen'}</label><div class="cell-font-size-row"><input id="cellFontSize" type="range" min="0.5" max="3" step="0.1" value="${Number(st.fontSize||1)}"><input id="cellFontSizeNumber" type="number" min="0.5" max="3" step="0.1" value="${Number(st.fontSize||1)}"></div></div>`;cellSettings.insertAdjacentHTML('afterbegin',block);const apply=val=>{const n=Math.max(.5,Math.min(3,Number(val)||1));targets.forEach(t=>{const m=getModule(t.moduleId);if(!m)return;const s=getCellStyle(m,t.row,t.col)||{};setCellStyle(m,t.row,t.col,{...s,fontSize:n});refreshTableCellDOM(m,t.row,t.col);});save();};const range=document.getElementById('cellFontSize'),num=document.getElementById('cellFontSizeNumber');range?.addEventListener('input',e=>{if(num)num.value=e.target.value;apply(e.target.value)});num?.addEventListener('input',e=>{if(range)range.value=e.target.value;apply(e.target.value)});};

      function normalizeLogFilters(mod){if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&f.term);}
      function activeFilters(mod){normalizeLogFilters(mod);return mod.filters.filter(f=>f.enabled).map(f=>String(f.term).toLowerCase());}
      function boldFilters(mod){normalizeLogFilters(mod);return mod.filters.filter(f=>f.bold).map(f=>String(f.term));}
      function entryMatches(entry,terms){if(!terms.length)return true;const tags=(entry.tags||[]).map(x=>String(x).toLowerCase());const text=String(entry.text||'').toLowerCase();return terms.some(t=>tags.includes(t)||text.includes(t));}
      function cleanPdfText(s){return String(s||'').replace(/\s+([,.;:!?])/g,'$1').replace(/([\(\[\{])\s+/g,'$1').replace(/\s+([\)\]\}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
      function stripFilterTerms(text,terms){let out=String(text||'');terms.sort((a,b)=>String(b).length-String(a).length).forEach(t=>{if(String(t).trim().length>1)out=out.replace(new RegExp('(^|\\s)'+escapeRegExp(String(t).trim())+'(?=\\s|$|[:;,.])','gi'),' ');});return cleanPdfText(out);}
      function logHTML(mod){normalizeLogFilters(mod);const terms=activeFilters(mod);const bolds=boldFilters(mod);const entries=(mod.entries||[]).filter(e=>entryMatches(e,terms));return `<div class="content log-content v5"><div class="log-list v5">${entries.length?entries.map(e=>`<div class="log-entry v5">${formatLogEntryV5(e,bolds)}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Filtre lages automatisk fra bold tekst i tekstloggen.</div>`}</div></div>`;}
      function formatLogEntryV5(entry,bolds){const tags=(entry.tags||[]).filter(Boolean);const tagHTML=tags.length?`<div class="log-entry-tags">${tags.map(t=>`<span class="log-tag ${bolds.includes(t)?'bold':''}">${escapeHTML(t)}</span>`).join('')}</div>`:'';let text=escapeHTML(entry.text||'');bolds.forEach(t=>{const re=new RegExp('\\b'+escapeRegExp(escapeHTML(t))+'\\b','g');text=text.replace(re,`<b>${escapeHTML(t)}</b>`);});return tagHTML+text;}
      async function ensurePdfJs5(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return});return window.pdfjsLib;}
      async function extractPdfLogsV5(file,mod){try{const pdfjs=await ensurePdfJs5();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;let lines=[];let boldCandidates=[];for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();const items=content.items.map(it=>({str:String(it.str||''),x:it.transform?.[4]||0,y:Math.round(it.transform?.[5]||0),font:String(it.fontName||'')})).filter(it=>it.str.trim());items.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);let currentY=null,line=[],lineBold=[];const flush=()=>{if(!line.length)return;const txt=cleanPdfText(line.join(' '));if(txt)lines.push(txt);lineBold.forEach(x=>{const t=cleanPdfText(x);if(t&&t.length>1&&t.length<80)boldCandidates.push(t)});line=[];lineBold=[];};for(const it of items){if(currentY!==null&&Math.abs(it.y-currentY)>4)flush();line.push(it.str);if(/bold|black|heavy/i.test(it.font))lineBold.push(it.str);currentY=it.y;}flush();lines.push('');}
          const boldUnique=[...new Set(boldCandidates.map(x=>x.replace(/[:：]\s*$/,'').trim()).filter(x=>x.length>1))].slice(0,80);
          const full=lines.join('\n');const chunks=full.split(/\n\s*(?:[-–—_]{8,}|={8,})\s*\n/g).map(cleanPdfText).filter(Boolean);
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term),f]));mod.filters=boldUnique.map(term=>({term,enabled:existing.get(term)?.enabled||false,bold:existing.get(term)?.bold||false}));
          mod.entries=chunks.map(chunk=>{const tags=boldUnique.filter(t=>new RegExp('(^|\\s)'+escapeRegExp(t)+'(?=\\s|$|[:;,.])','i').test(chunk));return {text:stripFilterTerms(chunk,boldUnique),tags};}).filter(e=>e.text||e.tags.length);
          mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}}

      const prevContentHTMLV5=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML(mod);return prevContentHTMLV5(mod);};
      const prevSettingsSpecificV5=settingsSpecific;settingsSpecific=function(mod){if(mod.type!=='log')return prevSettingsSpecificV5(mod);normalizeLogFilters(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row" data-index="${i}"><strong>${escapeHTML(f.term)}</strong><label><input class="log-filter-enabled" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');return `<div class="log-admin-grid"><input id="logPdfFileAdmin" class="log-admin-file" type="file" accept="application/pdf"><button id="logPickAdmin" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note">Filtre lages automatisk fra bold tekst i tekstloggen. Bold-teksten fjernes fra selve loggteksten og brukes som filtervalg.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClear" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
      const prevNormalizeV5=normalizeMod;normalizeMod=function(mod){prevNormalizeV5(mod);if(mod.type==='log')normalizeLogFilters(mod);if(mod.type==='timeline'&&!mod.timelineOpenSection)mod.timelineOpenSection='events';};

      const prevRenderSelectedSettingsV5=renderSelectedSettings;
      renderSelectedSettings=function(){prevRenderSelectedSettingsV5();const mod=selected();if(!mod)return;if(mod.type==='log'){const file=document.getElementById('logPdfFileAdmin');document.getElementById('logPickAdmin')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV5(file.files[0],mod)});document.querySelectorAll('.log-filter-row').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled')?.addEventListener('change',e=>{normalizeLogFilters(mod);mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold')?.addEventListener('change',e=>{normalizeLogFilters(mod);mod.filters[i].bold=e.target.checked;save();renderAll();});});document.getElementById('logClear')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});}if(mod.type==='timeline')bindTimelineControls(mod);};

      const prevWireModuleV5=wireModule;
      wireModule=function(el,mod){prevWireModuleV5(el,mod);if(mod.type==='log'){el.querySelector('.log-toolbar')?.remove();}};

      try{renderAll()}catch(e){console.error('Request patch v5 render failed',e)}
    })();
