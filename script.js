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

  


    /* Request patch v6: click-to-place timeline events + better log tekstlogg parsing */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-track.v6{height:220px;margin:0 24px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v6.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.85);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        @keyframes timelinePlacePulse{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,.20)}50%{box-shadow:0 0 0 12px rgba(96,165,250,.06)}}
        .timeline-line.v6{position:absolute;left:0;right:0;top:124px;height:5px;border-radius:999px;background:rgba(226,232,240,.88);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:3;}
        .timeline-tick.v6{position:absolute;top:108px;width:2px;height:36px;background:rgba(248,250,252,.92);transform:translateX(-1px);border-radius:999px;z-index:5;}
        .timeline-tick-label.v6{position:absolute;top:148px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:5;}
        .timeline-period-v6{position:absolute;top:137px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:2;overflow:visible;}
        .timeline-period-v6 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v6{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:3px;min-width:116px;text-align:center;z-index:7;pointer-events:none;}
        .timeline-event-v6 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.82);border:1px solid rgba(147,197,253,.24);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v6 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:150px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.52);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:3px 7px;}
        .timeline-event-v6 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:20px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-place-help{border:1px solid rgba(96,165,250,.35);border-radius:14px;background:rgba(59,130,246,.12);padding:9px 10px;color:#dbeafe;font-size:12px;line-height:1.35;display:flex;gap:8px;align-items:flex-start;}
        .timeline-event-admin.v6 .event-top{display:grid;grid-template-columns:1fr 54px;gap:8px;align-items:end;}
        .timeline-event-admin.v6 .event-time-row{display:grid;grid-template-columns:1fr;gap:7px;}
        .timeline-event-admin.v6 .time-chip{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(2,6,23,.35);padding:8px;color:#cbd5e1;font-size:12px;}
        .timeline-event-admin.v6 .time-chip strong{color:white;font-size:13px;}
        .timeline-place-active{border-color:rgba(96,165,250,.65)!important;background:rgba(59,130,246,.16)!important;}
        .log-content.v6{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v6{display:grid;gap:12px;overflow:auto;}
        .log-entry.v6{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:13px;line-height:1.45;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-entry-tags.v6{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
        .log-tag.v6{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.08);font-size:.78em;color:#cbd5e1;}
        .log-tag.v6.bold{font-weight:950;color:white;background:rgba(96,165,250,.24);border-color:rgba(147,197,253,.40);}
        .log-admin-grid.v6{display:grid;gap:10px;}
        .log-filter-row.v6{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px;background:rgba(2,6,23,.32);}
        .log-filter-row.v6 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v6 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v6 input{width:18px;height:18px;}
        .log-admin-file.v6{display:none;}
        .log-admin-note.v6{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function htmlEscape(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp6(n,a,b){return Math.max(a,Math.min(b,n));}
      function d6(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt6(value,unit){const d=d6(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function toDTLocal6(value){const d=d6(value);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
      function fromDTLocal6(v){if(!v)return new Date().toISOString();const d=new Date(v);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
      function pctToTime(mod,pct){const start=d6(mod.start),end=d6(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp6(pct,0,1)).toISOString();}
      function sameKey6(ev){return d6(ev.time).toISOString().slice(0,16);}
      function colorRgba6(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function escReg6(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

      timelineHTML=function(mod){
        const start=d6(mod.start), end=d6(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp6(((d6(v).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick v6" style="left:${pct}%"></div><div class="timeline-tick-label v6" style="left:${pct}%">${htmlEscape(fmt6(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v6" style="left:${left}%;width:${w}%;background:${colorRgba6(p.color||'#60a5fa',p.opacity??0.55)}"><span>${htmlEscape(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey6(ev); const level=used[key]||0; used[key]=level+1; const top=Math.max(4,86-(level*48));return `<div class="timeline-event-v6" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;color:${htmlEscape(ev.color||'#f8fafc')}" title="${htmlEscape((ev.name||'')+' '+fmt6(ev.time,'hour'))}"><div class="ev-time">${htmlEscape(fmt6(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${htmlEscape(ev.name||'Hendelse')}</div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track v6 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v6"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${htmlEscape(fmt6(mod.start,unit))}</span><span>${htmlEscape(fmt6(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres. Tidspunktet settes automatisk ut fra posisjonen.</span></div>':''}</div></div>`;
      };

      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour'; const open=mod.timelineOpenSection||'events'; const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}">
          <div class="field"><label>Navn</label><input class="tl-p-name" value="${htmlEscape(p.name||'')}" placeholder="Periode"></div>
          <div class="grid-mini"><div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDTLocal6(p.start||mod.start)}"></div><div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDTLocal6(p.end||mod.end)}"></div></div>
          <div class="grid-color"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${htmlEscape(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div>
          <button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button>
        </div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin v6 ${placing&&window.__timelinePlace.index===i?'timeline-place-active':''}" data-index="${i}" data-time="${htmlEscape(ev.time||mod.start)}">
          <div class="event-top"><div class="field"><label>Navn</label><input class="tl-e-name" value="${htmlEscape(ev.name||'')}" placeholder="Hendelse"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${htmlEscape(ev.color||'#f8fafc')}"></div></div>
          <div class="event-time-row"><div class="time-chip"><span title="Klikk plasser-knappen, deretter klikk på tidslinjen">⏱</span><div><span>Tid fra plassering</span><br><strong>${htmlEscape(fmt6(ev.time,unit==='date'?'date':'hour'))}</strong></div></div><button class="tool-btn tl-place-event" type="button">⏱ Plasser på tidslinje</button></div>
          <button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button>
        </div>`).join('');
        return `<div class="timeline-admin-compact v4 v5 v6">
          <div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDTLocal6(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDTLocal6(mod.end)}"></div></div>
          <div class="timeline-small-grid"><div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div>
          <p class="small">Hendelser får tid når du plasserer dem på tidslinjen. Bruk ⏱-knappen og klikk på linjen.</p>
          <details class="timeline-details" ${open==='periods'?'open':''}><summary>Perioder (${mod.periods?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button></div><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div></details>
          <details class="timeline-details" ${open==='events'?'open':''}><summary>Hendelser (${mod.events?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddEvent" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Tidslinjen lyser opp. Klikk på ønsket tidspunkt på boardet.</span></div>':''}<div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div></details>
        </div>`;
      };

      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDTLocal6(s.value); if(e)mod.end=fromDTLocal6(e.value); if(u)mod.timeUnit=u.value; if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDTLocal6(row.querySelector('.tl-p-start')?.value),end:fromDTLocal6(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>({name:row.querySelector('.tl-e-name')?.value||'',time:row.dataset.time||mod.start,color:row.querySelector('.tl-e-color')?.value||'#f8fafc'}));
        save();
      };

      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        document.querySelectorAll('.timeline-details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)mod.timelineOpenSection=d.querySelector('summary')?.textContent?.toLowerCase().includes('periode')?'periods':'events';save();}));
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('input',()=>{readTimelineControls(mod);});el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll();});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};renderAll();});
        document.querySelectorAll('.tl-place-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+btn.closest('.timeline-event-admin').dataset.index};renderAll();});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>{inp.addEventListener('input',()=>{readTimelineControls(mod);});inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll();});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll();});
      };

      function normalizeLog6(mod){if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));}
      function cleanText6(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function activeLogTerms6(mod){normalizeLog6(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldLogTerms6(mod){normalizeLog6(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term);}
      function logEntryMatches6(entry,terms){if(!terms.length)return true;const tags=(entry.tags||[]).map(x=>String(x).toLowerCase());const text=String(entry.text||'').toLowerCase();return terms.some(t=>tags.includes(t)||text.includes(t));}
      function logHTML6(mod){normalizeLog6(mod);const terms=activeLogTerms6(mod);const bolds=boldLogTerms6(mod);const entries=(mod.entries||[]).filter(e=>logEntryMatches6(e,terms));return `<div class="content log-content v6"><div class="log-list v6">${entries.length?entries.map(e=>`<div class="log-entry v6">${formatLogEntry6(e,bolds)}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn i tekstloggen blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}
      function formatLogEntry6(entry,bolds){const tags=(entry.tags||[]).filter(Boolean);const tagHTML=tags.length?`<div class="log-entry-tags v6">${tags.map(t=>`<span class="log-tag v6 ${bolds.includes(t)?'bold':''}">${htmlEscape(t)}</span>`).join('')}</div>`:'';let text=htmlEscape(entry.text||'');bolds.forEach(t=>{const re=new RegExp('\\b'+escReg6(htmlEscape(t))+'\\b','g');text=text.replace(re,`<b>${htmlEscape(t)}</b>`);});return tagHTML+text;}
      async function ensurePdfJs6(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      function itemIsBold6(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText6(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function lineFromItems6(items){
        items.sort((a,b)=>a.x-b.x);
        let visible='', all='', tags=[], lastEnd=null, lastSize=10;
        for(const it of items){const txt=itemText6(it); if(!txt)continue; const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10)); const gap=lastEnd==null?0:it.x-lastEnd; const needsSpace=gap>size*0.38 && !/^\s*[.,:;!?)]/.test(txt) && !/[([{]\s*$/.test(visible); const sep=needsSpace?'':'';
          all+=(all&&needsSpace?' ':'')+txt;
          if(itemIsBold6(it)){tags.push(txt.replace(/[:：]\s*$/,'').trim());}
          else{visible+=sep+txt;}
          lastEnd=(it.x||0)+(it.w||txt.length*size*.5); lastSize=size;
        }
        return {text:cleanText6(visible),all:cleanText6(all),tags:tags.filter(t=>t.length>1&&t.length<90)};
      }
      async function extractPdfLogsV6(file,mod){
        try{
          const pdfjs=await ensurePdfJs6();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const lines=[];const boldSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){
            const page=await pdf.getPage(p);const content=await page.getTextContent();
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText6(it));
            raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            let groups=[];
            for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}
            groups.sort((a,b)=>b.y-a.y);
            for(const g of groups){const line=lineFromItems6(g.items); if(/^(?:[-–—_]{8,}|={8,})$/.test(line.all.replace(/\s/g,''))){lines.push({separator:true});continue;} line.tags.forEach(t=>boldSet.add(t)); if(line.text||line.tags.length)lines.push(line);}
            lines.push({separator:true,soft:true});
          }
          const boldTerms=[...boldSet].map(x=>cleanText6(x).replace(/[:：]$/,'')).filter(x=>x.length>1).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i).slice(0,120);
          const entries=[];let cur={textLines:[],tags:new Set()};
          const flush=()=>{const text=cleanText6(cur.textLines.join('\n'));const tags=[...cur.tags].filter(Boolean);if(text||tags.length)entries.push({text,tags});cur={textLines:[],tags:new Set()};};
          for(const line of lines){if(line.separator&&!line.soft){flush();continue;} if(line.separator&&line.soft){continue;} (line.tags||[]).forEach(t=>cur.tags.add(cleanText6(t).replace(/[:：]$/,''))); if(line.text)cur.textLines.push(line.text);}
          flush();
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));
          mod.filters=boldTerms.map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.map(e=>({text:e.text,tags:[...new Set(e.tags.map(t=>cleanText6(t).replace(/[:：]$/,'')).filter(t=>boldTerms.some(b=>b.toLowerCase()===t.toLowerCase())))]})).filter(e=>e.text||e.tags.length);
          mod.fileName=file.name; save(); renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContentHTML6=contentHTML;
      contentHTML=function(mod){if(mod.type==='log')return logHTML6(mod);return prevContentHTML6(mod);};
      const prevSettingsSpecific6=settingsSpecific;
      settingsSpecific=function(mod){
        if(mod.type==='timeline')return timelineSettingsHTML(mod);
        if(mod.type!=='log')return prevSettingsSpecific6(mod);
        normalizeLog6(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v6" data-index="${i}"><strong>${htmlEscape(f.term)}</strong><label><input class="log-filter-enabled-v6" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v6" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');
        return `<div class="log-admin-grid v6"><input id="logPdfFileAdminV6" class="log-admin-file v6" type="file" accept="application/pdf"><button id="logPickAdminV6" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v6">Feltnavn i tekstloggen blir automatisk filtervalg. Vanlig tekst vises i loggen og forsøkes ryddet til hele linjer uten store tekstlogg-mellomrom.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV6" class="tool-btn danger" type="button">Tøm logg</button></div>`;
      };
      const prevNormalize6=normalizeMod;
      normalizeMod=function(mod){prevNormalize6(mod);if(mod.type==='log')normalizeLog6(mod);if(mod.type==='timeline'&&!mod.timelineOpenSection)mod.timelineOpenSection='events';};
      const prevRenderSelected6=renderSelectedSettings;
      renderSelectedSettings=function(){
        prevRenderSelected6();const mod=selected();if(!mod)return;
        if(mod.type==='timeline')bindTimelineControls(mod);
        if(mod.type==='log'){
          const file=document.getElementById('logPdfFileAdminV6');document.getElementById('logPickAdminV6')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV6(file.files[0],mod);});
          document.querySelectorAll('.log-filter-row.v6').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v6')?.addEventListener('change',e=>{normalizeLog6(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v6')?.addEventListener('change',e=>{normalizeLog6(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});
          document.getElementById('logClearV6')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});
        }
      };
      const prevWire6=wireModule;
      wireModule=function(el,mod){
        prevWire6(el,mod);
        if(mod.type==='timeline'){
          const track=el.querySelector('[data-timeline-track]');
          track?.addEventListener('click',e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();});
        }
      };
      try{renderAll();}catch(e){console.error('Request patch v6 render failed',e);}
    })();
  


    /* Request patch v7: reliable cell font size, timeline placement, and log field/filter parsing */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .cell-font-size-v7{border:1px solid rgba(147,197,253,.24);background:rgba(59,130,246,.08);border-radius:14px;padding:10px;margin-bottom:10px;}
        .cell-font-size-v7 .cell-font-size-row{display:grid;grid-template-columns:1fr 78px;gap:8px;align-items:center;}
        .cell-font-size-v7 input[type=number]{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(2,6,23,.64);color:white;}
        .timeline-track.v7{height:235px;margin:0 26px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v7.placing{cursor:crosshair;animation:timelinePlacePulseV7 1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.95);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.13);}
        @keyframes timelinePlacePulseV7{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,.22)}50%{box-shadow:0 0 0 13px rgba(96,165,250,.07)}}
        .timeline-line.v7{position:absolute;left:0;right:0;top:138px;height:5px;border-radius:999px;background:rgba(226,232,240,.9);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:3;}
        .timeline-tick.v7{position:absolute;top:121px;width:2px;height:40px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:5;}
        .timeline-tick-label.v7{position:absolute;top:164px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:5;}
        .timeline-period-v7{position:absolute;top:151px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:2;overflow:visible;}
        .timeline-period-v7 span{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v7{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:3px;min-width:116px;text-align:center;z-index:8;pointer-events:none;}
        .timeline-event-v7 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:950;background:rgba(15,23,42,.86);border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;white-space:nowrap;line-height:1.1;}
        .timeline-event-v7 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.1;max-width:150px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.58);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:3px 7px;}
        .timeline-event-v7 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:16px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));margin-top:1px;}
        .timeline-event-v7 .ev-stem{width:2px;height:var(--stem,22px);background:currentColor;border-radius:999px;opacity:.85;margin-top:-3px;}
        .timeline-place-help.v7{border:1px solid rgba(96,165,250,.42);border-radius:14px;background:rgba(59,130,246,.16);padding:9px 10px;color:#dbeafe;font-size:12px;line-height:1.35;display:flex;gap:8px;align-items:flex-start;}
        .timeline-admin-compact .tl-place-event.v7{font-weight:950;border-color:rgba(147,197,253,.38);background:rgba(59,130,246,.22);}
        .log-content.v7{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v7{display:grid;gap:12px;overflow:auto;}
        .log-entry.v7{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(2,6,23,.38);padding:13px;line-height:1.45;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-entry-tags.v7{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
        .log-tag.v7{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.08);font-size:.78em;color:#cbd5e1;}
        .log-tag.v7.bold{font-weight:950;color:white;background:rgba(96,165,250,.24);border-color:rgba(147,197,253,.40);}
        .log-admin-grid.v7{display:grid;gap:10px;}
        .log-filter-row.v7{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px;background:rgba(2,6,23,.32);}
        .log-filter-row.v7 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v7 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v7 input{width:18px;height:18px;}
        .log-admin-file.v7{display:none;}
        .log-admin-note.v7{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function esc7(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg7(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp7(n,a,b){return Math.max(a,Math.min(b,n));}
      function d7(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt7(value,unit){const d=d7(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d);}catch{return String(value||'');}}
      function toDT7(value){const d=d7(value);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
      function fromDT7(v){if(!v)return new Date().toISOString();const d=new Date(v);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
      function pctToTime7(mod,pct){const start=d7(mod.start),end=d7(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp7(pct,0,1)).toISOString();}
      function timeKey7(ev){return d7(ev.time).toISOString().slice(0,16);}
      function rgba7(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity);}catch{}return hex||'#60a5fa';}
      function clean7(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}

      const prevCellStyleCSS7=cellStyleCSS;
      cellStyleCSS=function(mod,r,c){const base=prevCellStyleCSS7(mod,r,c)||'';const st=getCellStyle(mod,r,c)||{};return base+`;font-size:${Number(st.fontSize||1)}em!important;`;};
      const prevReadFull7=typeof readFullCellStyleControls==='function'?readFullCellStyleControls:null;
      if(prevReadFull7){
        readFullCellStyleControls=function(){
          const targets=typeof selectedCellTargets==='function'?selectedCellTargets():[];
          const primary=targets[0];
          const existing=primary?(getCellStyle(getModule(primary.moduleId),primary.row,primary.col)||{}):{};
          const out={...existing,...prevReadFull7()};
          const val=document.getElementById('cellFontSizeV7')?.value || document.getElementById('cellFontSizeNumberV7')?.value;
          if(val)out.fontSize=Math.max(.5,Math.min(4,Number(val)||1));
          return out;
        };
      }
      function addCellFontSizeControl7(){
        const targets=typeof selectedCellTargets==='function'?selectedCellTargets():[]; if(!targets.length||document.getElementById('cellFontSizeV7'))return;
        const mod=getModule(targets[0].moduleId); if(!mod||mod.type!=='table')return;
        const st=getCellStyle(mod,targets[0].row,targets[0].col)||{}; const val=Number(st.fontSize||1);
        const html=`<div class="field cell-font-size-v7"><label>Tekststørrelse ${targets.length>1?'for markerte celler':'for cellen'}</label><div class="cell-font-size-row"><input id="cellFontSizeV7" type="range" min="0.5" max="4" step="0.1" value="${val}"><input id="cellFontSizeNumberV7" type="number" min="0.5" max="4" step="0.1" value="${val}"></div></div>`;
        cellSettings.insertAdjacentHTML('afterbegin',html);
        const apply=v=>{const n=Math.max(.5,Math.min(4,Number(v)||1));targets.forEach(t=>{const m=getModule(t.moduleId);if(!m)return;setCellStyle(m,t.row,t.col,{...(getCellStyle(m,t.row,t.col)||{}),fontSize:n});const td=document.querySelector(`.mod[data-id="${t.moduleId}"] td[data-row="${t.row}"][data-col="${t.col}"]`);if(td)td.style.fontSize=n+'em';});save();};
        const range=document.getElementById('cellFontSizeV7'),num=document.getElementById('cellFontSizeNumberV7');
        range?.addEventListener('input',e=>{if(num)num.value=e.target.value;apply(e.target.value);});
        num?.addEventListener('input',e=>{if(range)range.value=e.target.value;apply(e.target.value);});
      }
      const prevRenderCellSettings7=renderCellSettings;
      renderCellSettings=function(){prevRenderCellSettings7();addCellFontSizeControl7();};

      timelineHTML=function(mod){
        const start=d7(mod.start),end=d7(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp7(((d7(v).getTime()-min)/(max-min))*100,0,100);const unit=mod.timeUnit||'hour';const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100;const t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v7" style="left:${pct}%"></div><div class="timeline-tick-label v7" style="left:${pct}%">${esc7(fmt7(t,unit))}</div>`;}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v7" style="left:${left}%;width:${w}%;background:${rgba7(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc7(p.name||'')}</span></div>`;}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=timeKey7(ev);const level=used[key]||0;used[key]=level+1;const top=Math.max(-34,26-(level*56));const stem=Math.max(16,138-(top+90));return `<div class="timeline-event-v7" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;color:${esc7(ev.color||'#f8fafc')};--stem:${stem}px" title="${esc7((ev.name||'')+' '+fmt7(ev.time,'hour'))}"><div class="ev-time">${esc7(fmt7(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc7(ev.name||'Hendelse')}</div><div class="ev-arrow"></div><div class="ev-stem"></div></div>`;}).join('');
        return `<div class="content"><div class="timeline-wrap v2"><div class="timeline-track v7 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v7"></div>${periods}${ticks}${events}</div><div class="timeline-scale v2"><span>${esc7(fmt7(mod.start,unit))}</span><span>${esc7(fmt7(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v7"><strong>⏱</strong><span>Klikk direkte på tidslinjen der hendelsen skal plasseres. Tidspunktet settes fra plasseringen.</span></div>':''}</div></div>`;
      };
      timelineSettingsHTML=function(mod){
        const unit=mod.timeUnit||'hour';const open=mod.timelineOpenSection||'events';const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card timeline-period-admin" data-index="${i}"><div class="field"><label>Navn</label><input class="tl-p-name" value="${esc7(p.name||'')}" placeholder="Periode"></div><div class="grid-mini"><div class="field"><label>Fra</label><input class="tl-p-start" type="datetime-local" value="${toDT7(p.start||mod.start)}"></div><div class="field"><label>Til</label><input class="tl-p-end" type="datetime-local" value="${toDT7(p.end||mod.end)}"></div></div><div class="grid-color"><div class="field"><label>Farge</label><input class="tl-p-color" type="color" value="${esc7(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tl-p-opacity" type="range" min="0" max="1" step="0.05" value="${p.opacity??0.55}"></div></div><button class="tool-btn danger tl-remove-period" type="button">Fjern periode</button></div>`).join('');
        const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card timeline-event-admin v7 ${placing&&window.__timelinePlace.index===i?'timeline-place-active':''}" data-index="${i}" data-time="${esc7(ev.time||mod.start)}"><div class="event-top"><div class="field"><label>Navn</label><input class="tl-e-name" value="${esc7(ev.name||'')}" placeholder="Hendelse"></div><div class="field"><label>Farge</label><input class="tl-e-color" type="color" value="${esc7(ev.color||'#f8fafc')}"></div></div><div class="event-time-row"><div class="time-chip"><span title="Klikk plasser-knappen, deretter klikk på tidslinjen">⏱</span><div><span>Tid fra plassering</span><br><strong>${esc7(fmt7(ev.time,unit==='date'?'date':'hour'))}</strong></div></div><button class="tool-btn tl-place-event v7" type="button">⏱ Plasser på tidslinje</button></div><button class="tool-btn danger tl-remove-event" type="button">Fjern hendelse</button></div>`).join('');
        return `<div class="timeline-admin-compact v4 v7"><div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStart" type="datetime-local" value="${toDT7(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEnd" type="datetime-local" value="${toDT7(mod.end)}"></div></div><div class="timeline-small-grid"><div class="field"><label>Vis tidsformat</label><select id="timelineUnit"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker</label><input id="timelineTickCount" type="number" min="0" max="50" value="${Number(mod.tickCount??3)}"></div></div><p class="small">Bruk ⏱ og klikk på selve tidslinjen for å sette tidspunktet.</p><details class="timeline-details" ${open==='periods'?'open':''}><summary>Perioder (${mod.periods?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddPeriod" class="tool-btn" type="button">+ Legg til periode</button></div><div id="timelinePeriods">${periods||'<p class="small">Ingen perioder.</p>'}</div></div></details><details class="timeline-details" ${open==='events'?'open':''}><summary>Hendelser (${mod.events?.length||0})</summary><div class="timeline-detail-body"><div class="timeline-add-row"><button id="timelineAddEvent" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button></div>${placing?'<div class="timeline-place-help v7"><strong>⏱</strong><span>Tidslinjen lyser opp. Klikk på ønsket tidspunkt på boardet.</span></div>':''}<div id="timelineEvents">${events||'<p class="small">Ingen hendelser.</p>'}</div></div></details></div>`;
      };
      readTimelineControls=function(mod){
        const s=document.getElementById('timelineStart'),e=document.getElementById('timelineEnd'),u=document.getElementById('timelineUnit'),tc=document.getElementById('timelineTickCount');
        if(s)mod.start=fromDT7(s.value);if(e)mod.end=fromDT7(e.value);if(u)mod.timeUnit=u.value;if(tc)mod.tickCount=Math.max(0,Number(tc.value)||0);
        mod.periods=[...document.querySelectorAll('.timeline-period-admin')].map(row=>({name:row.querySelector('.tl-p-name')?.value||'',start:fromDT7(row.querySelector('.tl-p-start')?.value),end:fromDT7(row.querySelector('.tl-p-end')?.value),color:row.querySelector('.tl-p-color')?.value||'#60a5fa',opacity:Number(row.querySelector('.tl-p-opacity')?.value??0.55),textColor:'#ffffff'}));
        mod.events=[...document.querySelectorAll('.timeline-event-admin')].map(row=>({name:row.querySelector('.tl-e-name')?.value||'',time:row.dataset.time||mod.start,color:row.querySelector('.tl-e-color')?.value||'#f8fafc'}));save();
      };
      bindTimelineControls=function(mod){
        if(mod.type!=='timeline')return;
        document.querySelectorAll('.timeline-details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)mod.timelineOpenSection=d.querySelector('summary')?.textContent?.toLowerCase().includes('periode')?'periods':'events';save();}));
        ['timelineStart','timelineEnd','timelineUnit','timelineTickCount'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('input',()=>readTimelineControls(mod));el?.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        bind('timelineAddPeriod','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55,textColor:'#ffffff'});renderAll();});
        bind('timelineAddEvent','click',()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};renderAll();});
        document.querySelectorAll('.tl-place-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+btn.closest('.timeline-event-admin').dataset.index};renderAll();});
        document.querySelectorAll('.timeline-period-admin input').forEach(inp=>{inp.addEventListener('input',()=>readTimelineControls(mod));inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.timeline-event-admin input').forEach(inp=>{inp.addEventListener('input',()=>readTimelineControls(mod));inp.addEventListener('change',()=>{readTimelineControls(mod);renderAll();});});
        document.querySelectorAll('.tl-remove-period').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='periods';mod.periods.splice(+btn.closest('.timeline-period-admin').dataset.index,1);renderAll();});
        document.querySelectorAll('.tl-remove-event').forEach(btn=>btn.onclick=()=>{readTimelineControls(mod);mod.timelineOpenSection='events';mod.events.splice(+btn.closest('.timeline-event-admin').dataset.index,1);renderAll();});
      };

      const knownLogKeys7=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold7(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function txt7(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown7(s){const raw=clean7(s);for(const key of knownLogKeys7){const re=new RegExp('^('+reg7(key)+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean7(m[2])};}return null;}
      function splitCamelField7(s){const raw=clean7(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{2,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,'');const rest=clean7(m[2]);if(tag.length>1&&tag.length<35&&rest)return {tag,text:rest};return null;}
      function lineFromItems7(items){
        items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;
        for(const it of items){const t=txt7(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10));const gap=lastEnd==null?0:it.x-lastEnd;const needsSpace=gap>size*0.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(normal);all+=(all&&needsSpace?' ':'')+t;if(isBold7(it)){tags.push(t.replace(/[:：]\s*$/,'').trim());}else{normal+=(normal&&needsSpace?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}
        let text=clean7(normal);const allText=clean7(all);const fromKnown=detectKnown7(allText)||splitCamelField7(allText);
        if(!tags.length&&fromKnown){tags=[fromKnown.tag];text=fromKnown.text;}
        if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg7(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean7(stripped);}
        tags=tags.map(t=>clean7(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);
        return {text,all:allText,tags};
      }
      function normalizeLog7(mod){if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));}
      function activeLog7(mod){normalizeLog7(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldLog7(mod){normalizeLog7(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term);}
      function entryMatch7(e,terms){if(!terms.length)return true;const tags=(e.tags||[]).map(x=>String(x).toLowerCase());const text=String(e.text||'').toLowerCase();return terms.some(t=>tags.includes(t)||text.includes(t));}
      function logHTML7(mod){normalizeLog7(mod);const terms=activeLog7(mod);const bolds=boldLog7(mod);const entries=(mod.entries||[]).filter(e=>entryMatch7(e,terms));return `<div class="content log-content v7"><div class="log-list v7">${entries.length?entries.map(e=>`<div class="log-entry v7">${formatLog7(e,bolds)}</div>`).join(''):`<div class="log-empty">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}
      function formatLog7(entry,bolds){const tags=(entry.tags||[]).filter(Boolean);const tagHTML=tags.length?`<div class="log-entry-tags v7">${tags.map(t=>`<span class="log-tag v7 ${bolds.includes(t)?'bold':''}">${esc7(t)}</span>`).join('')}</div>`:'';let text=esc7(entry.text||'');bolds.forEach(t=>{text=text.replace(new RegExp('\\b'+reg7(esc7(t))+'\\b','g'),`<b>${esc7(t)}</b>`);});return tagHTML+text;}
      async function ensurePdf7(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      async function extractPdfLogsV7(file,mod){
        try{const pdfjs=await ensurePdf7();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const lines=[];const boldSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>txt7(it));raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);for(const g of groups){const line=lineFromItems7(g.items);if(/^(?:[-–—_]{8,}|={8,})$/.test(line.all.replace(/\s/g,''))){lines.push({separator:true});continue;}line.tags.forEach(t=>boldSet.add(t));if(line.text||line.tags.length)lines.push(line);}lines.push({separator:true,soft:true});}
          let boldTerms=[...boldSet].map(x=>clean7(x)).filter(x=>x.length>1).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
          const entries=[];let cur={textLines:[],tags:new Set()};const flush=()=>{const text=clean7(cur.textLines.join('\n'));const tags=[...cur.tags].filter(Boolean);if(text||tags.length)entries.push({text,tags});cur={textLines:[],tags:new Set()};};
          for(const line of lines){if(line.separator&&!line.soft){flush();continue;}if(line.separator&&line.soft)continue;(line.tags||[]).forEach(t=>cur.tags.add(clean7(t)));if(line.text)cur.textLines.push(line.text);}flush();
          if(!boldTerms.length){entries.forEach(e=>(e.tags||[]).forEach(t=>boldSet.add(t)));boldTerms=[...boldSet];}
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));mod.filters=boldTerms.slice(0,140).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.map(e=>({text:e.text,tags:[...new Set((e.tags||[]).map(t=>clean7(t)).filter(Boolean))]})).filter(e=>e.text||e.tags.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }
      const prevContent7=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML7(mod);return prevContent7(mod);};
      const prevSettings7=settingsSpecific;settingsSpecific=function(mod){if(mod.type==='timeline')return timelineSettingsHTML(mod);if(mod.type!=='log')return prevSettings7(mod);normalizeLog7(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v7" data-index="${i}"><strong>${esc7(f.term)}</strong><label><input class="log-filter-enabled-v7" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v7" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');return `<div class="log-admin-grid v7"><input id="logPdfFileAdminV7" class="log-admin-file v7" type="file" accept="application/pdf"><button id="logPickAdminV7" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v7">Feltnavn som Title, DTG, Summary og From blir filtre. Verdien/vanlig tekst blir stående i loggen.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV7" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
      const prevNormalize7=normalizeMod;normalizeMod=function(mod){prevNormalize7(mod);if(mod.type==='log')normalizeLog7(mod);if(mod.type==='timeline'&&!mod.timelineOpenSection)mod.timelineOpenSection='events';};
      const prevRenderSelected7=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected7();const mod=selected();if(!mod)return;if(mod.type==='timeline')bindTimelineControls(mod);if(mod.type==='log'){const file=document.getElementById('logPdfFileAdminV7');document.getElementById('logPickAdminV7')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV7(file.files[0],mod);});document.querySelectorAll('.log-filter-row.v7').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v7')?.addEventListener('change',e=>{normalizeLog7(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v7')?.addEventListener('change',e=>{normalizeLog7(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});document.getElementById('logClearV7')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});}};
      const prevWire7=wireModule;wireModule=function(el,mod){prevWire7(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime7(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v7 render failed',e);}
    })();
  


    /* Request patch v8: log line tags/filtering, better tekstlogg log separation, bottom-aligned timeline */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-wrap.v8{height:100%;min-height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;overflow:visible;}
        .timeline-track.v8{height:230px;margin:0 26px 10px;position:relative;overflow:visible;cursor:default;}
        .timeline-track.v8.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.85);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v8{position:absolute;left:0;right:0;top:158px;height:5px;border-radius:999px;background:rgba(226,232,240,.9);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v8{position:absolute;top:141px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v8{position:absolute;top:184px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v8{position:absolute;top:176px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.18);z-index:3;overflow:visible;}
        .timeline-period-v8 span{position:absolute;left:50%;top:34px;transform:translateX(-50%);white-space:nowrap;font-size:.78em;font-weight:900;color:#e2e8f0;text-shadow:0 2px 9px rgba(0,0,0,.75);}
        .timeline-event-v8{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:116px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v8 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.86);border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v8 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:155px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.56);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:3px 7px;}
        .timeline-event-v8 .ev-connector{width:2px;height:var(--connector-height,42px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v8 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v8{padding:0 26px 2px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;}
        .log-content.v8{height:100%;display:flex;flex-direction:column;gap:10px;}
        .log-list.v8{display:grid;gap:14px;overflow:auto;}
        .log-entry.v8{border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(2,6,23,.42);padding:13px;line-height:1.45;box-shadow:0 10px 28px rgba(0,0,0,.16);}
        .log-entry-title.v8{font-size:.76em;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;font-weight:900;}
        .log-line.v8{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding:3px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v8:first-of-type{border-top:none;}
        .log-line-text.v8{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;}
        .log-line-text.v8.bold{font-weight:950;color:#fff;}
        .log-tag-inline.v8{display:inline-flex;border:1px solid rgba(147,197,253,.28);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;}
        .log-tag-inline.v8.bold{font-weight:950;color:white;background:rgba(96,165,250,.30);border-color:rgba(191,219,254,.45);}
        .log-empty.v8{border:1px dashed rgba(255,255,255,.25);border-radius:16px;padding:18px;text-align:center;color:#cbd5e1;}
        .log-filter-row.v8{display:grid;grid-template-columns:1fr 62px 62px;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:8px;background:rgba(2,6,23,.34);}
        .log-filter-row.v8 strong{font-size:13px;word-break:break-word;}
        .log-filter-row.v8 label{font-size:11px;color:#cbd5e1;display:grid;justify-items:center;gap:3px;}
        .log-filter-row.v8 input{width:18px;height:18px;}
        .log-admin-grid.v8{display:grid;gap:10px;}
        .log-admin-file.v8{display:none;}
        .log-admin-note.v8{font-size:12px;color:var(--muted);line-height:1.35;}
      `;
      document.head.appendChild(style);

      function esc8(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg8(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp8(n,a,b){return Math.max(a,Math.min(b,n));}
      function d8(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt8(value,unit){const d=d8(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime8(mod,pct){const start=d8(mod.start),end=d8(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp8(pct,0,1)).toISOString();}
      function clean8(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function colorRgba8(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey8(ev){return d8(ev.time).toISOString().slice(0,16);}

      timelineHTML=function(mod){
        const start=d8(mod.start), end=d8(mod.end||Date.now()+3600000); const min=start.getTime(), max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp8(((d8(v).getTime()-min)/(max-min))*100,0,100); const unit=mod.timeUnit||'hour'; const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const lineTop=158;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100; const t=new Date(min+(max-min)*(i/(between+1))); return `<div class="timeline-tick v8" style="left:${pct}%"></div><div class="timeline-tick-label v8" style="left:${pct}%">${esc8(fmt8(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v8" style="left:${left}%;width:${w}%;background:${colorRgba8(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc8(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey8(ev); const level=used[key]||0; used[key]=level+1; const top=Math.max(4,78-(level*54)); const connector=Math.max(22,lineTop-top-60); return `<div class="timeline-event-v8" data-event-index="${i}" style="left:${pos(ev.time)}%;top:${top}px;--connector-height:${connector}px;color:${esc8(ev.color||'#f8fafc')}" title="${esc8((ev.name||'')+' '+fmt8(ev.time,'hour'))}"><div class="ev-time">${esc8(fmt8(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc8(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v8"><div class="timeline-track v8 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v8"></div>${periods}${ticks}${events}</div><div class="timeline-scale v8"><span>${esc8(fmt8(mod.start,unit))}</span><span>${esc8(fmt8(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres. Tidspunktet settes automatisk ut fra posisjonen.</span></div>':''}</div></div>`;
      };

      function normalizeLog8(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{
          if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:clean8(l.text||''),tags:(l.tags||[]).map(clean8).filter(Boolean)})).filter(l=>l.text||l.tags.length)};
          const tags=(e.tags||[]).map(clean8).filter(Boolean); const lines=String(e.text||'').split(/\n+/).map(x=>clean8(x)).filter(Boolean).map(text=>({text,tags}));
          return {lines,tags};
        }).filter(e=>e.lines&&e.lines.length);
      }
      function enabledTerms8(mod){normalizeLog8(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function boldTerms8(mod){normalizeLog8(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function lineMatch8(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function logHTML8(mod){
        normalizeLog8(mod);const terms=enabledTerms8(mod),bolds=boldTerms8(mod);
        const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>lineMatch8(l,terms))})).filter(e=>e.lines.length);
        return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine8(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;
      }
      function formatLogLine8(line,bolds){
        const tags=(line.tags||[]).filter(Boolean);const isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));
        const tagHTML=tags.map(t=>`<span class="log-tag-inline v8 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc8(t)}</span>`).join('');
        return `<div class="log-line v8"><span class="log-line-text v8 ${isBold?'bold':''}">${esc8(line.text||'')}</span>${tagHTML}</div>`;
      }

      const knownKeys8=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold8(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText8(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown8(s){const raw=clean8(s);for(const key of knownKeys8){const re=new RegExp('^('+reg8(key)+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean8(m[2])};}return null;}
      function splitCamel8(s){const raw=clean8(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{1,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,'');const rest=clean8(m[2]);if(tag.length>1&&tag.length<40&&rest)return {tag,text:rest};return null;}
      function lineFromItems8(items){
        items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;
        for(const it of items){const t=itemText8(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10));const gap=lastEnd==null?0:it.x-lastEnd;const addSpace=(base)=>base&&gap>size*0.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(base);all+=(addSpace(all)?' ':'')+t;if(isBold8(it)){tags.push(t.replace(/[:：-]\s*$/,'').trim());}else{normal+=(addSpace(normal)?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}
        let text=clean8(normal),allText=clean8(all);const known=detectKnown8(allText)||splitCamel8(allText);
        if(known){tags=[known.tag];text=known.text;}
        if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg8(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean8(stripped);}
        tags=tags.map(t=>clean8(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);
        return {text,all:allText,tags};
      }
      async function ensurePdf8(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      async function extractPdfLogsV8(file,mod){
        try{const pdfjs=await ensurePdf8();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const pieces=[];const tagSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){
            const page=await pdf.getPage(p);const content=await page.getTextContent();
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText8(it));
            raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);
            const gaps=[];for(let i=1;i<groups.length;i++)gaps.push(Math.abs(groups[i-1].y-groups[i].y));const sorted=gaps.slice().sort((a,b)=>a-b);const med=sorted.length?sorted[Math.floor(sorted.length/2)]:12;const gapLimit=Math.max(22,med*2.4);
            let prevY=null;
            for(const g of groups){if(prevY!==null&&Math.abs(prevY-g.y)>gapLimit)pieces.push({separator:true});prevY=g.y;const line=lineFromItems8(g.items);if(/^(?:[-–—_]{6,}|={6,})$/.test(line.all.replace(/\s/g,''))){pieces.push({separator:true});continue;}line.tags.forEach(t=>tagSet.add(t));if(line.text||line.tags.length)pieces.push({line});}
            pieces.push({separator:true,page:true});
          }
          const entries=[];let cur={lines:[]};const flush=()=>{if(cur.lines.length)entries.push(cur);cur={lines:[]};};
          for(const part of pieces){if(part.separator){flush();continue;}if(part.line){cur.lines.push({text:clean8(part.line.text),tags:[...new Set((part.line.tags||[]).map(clean8).filter(Boolean))]});}}
          flush();
          const terms=[...tagSet].map(clean8).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
          const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));
          mod.filters=terms.slice(0,160).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
          mod.entries=entries.filter(e=>e.lines.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContent8=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML8(mod);return prevContent8(mod);};
      const prevSettings8=settingsSpecific;settingsSpecific=function(mod){if(mod.type!=='log')return prevSettings8(mod);normalizeLog8(mod);const rows=mod.filters.map((f,i)=>`<div class="log-filter-row v8" data-index="${i}"><strong>${esc8(f.term)}</strong><label><input class="log-filter-enabled-v8" type="checkbox" ${f.enabled?'checked':''}>Vis</label><label><input class="log-filter-bold-v8" type="checkbox" ${f.bold?'checked':''}>Bold</label></div>`).join('');return `<div class="log-admin-grid v8"><input id="logPdfFileAdminV8" class="log-admin-file v8" type="file" accept="application/pdf"><button id="logPickAdminV8" class="tool-btn primary" type="button">Last opp tekstfil</button><p class="log-admin-note v8">Feltnavn blir filter-tags. Huk av «Vis» for å vise bare linjer med den taggen. Uten valgte «Vis»-filtre vises alt.</p><div>${rows||'<p class="small">Ingen filtre funnet ennå.</p>'}</div><button id="logClearV8" class="tool-btn danger" type="button">Tøm logg</button></div>`;};
      const prevNormalize8=normalizeMod;normalizeMod=function(mod){prevNormalize8(mod);if(mod.type==='log')normalizeLog8(mod);};
      const prevRenderSelected8=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected8();const mod=selected();if(!mod)return;if(mod.type==='log'){const file=document.getElementById('logPdfFileAdminV8');document.getElementById('logPickAdminV8')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV8(file.files[0],mod);});document.querySelectorAll('.log-filter-row.v8').forEach(row=>{const i=+row.dataset.index;row.querySelector('.log-filter-enabled-v8')?.addEventListener('change',e=>{normalizeLog8(mod);if(mod.filters[i])mod.filters[i].enabled=e.target.checked;save();renderAll();});row.querySelector('.log-filter-bold-v8')?.addEventListener('change',e=>{normalizeLog8(mod);if(mod.filters[i])mod.filters[i].bold=e.target.checked;save();renderAll();});});document.getElementById('logClearV8')?.addEventListener('click',()=>{mod.entries=[];mod.filters=[];mod.fileName='';save();renderAll();});}};
      const prevWire8=wireModule;wireModule=function(el,mod){prevWire8(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime8(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v8 render failed',e);}
    })();
  


    /* Request patch v9: left-side log tags, bottom-anchored timeline, period on line, hide upper duplicate arrows */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-wrap.v9{height:100%;min-height:100%;position:relative;overflow:visible;padding:0 0 4px;}
        .timeline-track.v9{position:absolute;left:26px;right:26px;bottom:26px;height:235px;margin:0;overflow:visible;cursor:default;}
        .timeline-track.v9.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:10px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v9{position:absolute;left:0;right:0;bottom:34px;height:5px;border-radius:999px;background:rgba(226,232,240,.92);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v9{position:absolute;bottom:17px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v9{position:absolute;bottom:-10px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v9{position:absolute;bottom:27px;height:18px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v9 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-v9{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:120px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v9 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.88);border:1px solid rgba(147,197,253,.32);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v9 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:165px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.58);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-v9 .ev-connector{width:2px;height:var(--connector-height,48px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v9 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-event-v9.hide-pointer .ev-connector,.timeline-event-v9.hide-pointer .ev-arrow{display:none;}
        .timeline-scale.v9{position:absolute;left:26px;right:26px;bottom:0;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v9{position:absolute;left:12px;right:12px;bottom:8px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.88);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
        .log-line.v9{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v9:first-of-type{border-top:none;}
        .log-tag-left.v9{display:inline-flex;border:1px solid rgba(147,197,253,.30);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;white-space:nowrap;justify-self:start;}
        .log-tag-left.v9.bold{font-weight:950;color:white;background:rgba(96,165,250,.31);border-color:rgba(191,219,254,.48);}
        .log-line-text.v9{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;min-width:0;}
        .log-line-text.v9.bold{font-weight:950;color:#fff;}
        .log-line-tags-stack.v9{display:flex;gap:5px;flex-wrap:wrap;}
      `;
      document.head.appendChild(style);

      function esc9(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp9(n,a,b){return Math.max(a,Math.min(b,n));}
      function d9(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt9(value,unit){const d=d9(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime9(mod,pct){const start=d9(mod.start),end=d9(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp9(pct,0,1)).toISOString();}
      function rgba9(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey9(ev){return d9(ev.time).toISOString().slice(0,16);}
      function normalizeLog9(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{
          if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:String(l.text||'').trim(),tags:(l.tags||[]).map(t=>String(t).trim()).filter(Boolean)})).filter(l=>l.text||l.tags.length)};
          const tags=(e.tags||[]).map(t=>String(t).trim()).filter(Boolean);const lines=String(e.text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(text=>({text,tags}));
          return {lines,tags};
        }).filter(e=>e.lines&&e.lines.length);
      }
      function enabled9(mod){normalizeLog9(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function bold9(mod){normalizeLog9(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function match9(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function formatLogLine9(line,bolds){
        const tags=(line.tags||[]).filter(Boolean);const isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));
        const tagHTML=tags.length?`<span class="log-line-tags-stack v9">${tags.map(t=>`<span class="log-tag-left v9 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc9(t)}</span>`).join('')}</span>`:`<span></span>`;
        return `<div class="log-line v9">${tagHTML}<span class="log-line-text v9 ${isBold?'bold':''}">${esc9(line.text||'')}</span></div>`;
      }
      function logHTML9(mod){
        normalizeLog9(mod);const terms=enabled9(mod),bolds=bold9(mod);
        const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>match9(l,terms))})).filter(e=>e.lines.length);
        return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine9(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;
      }

      timelineHTML=function(mod){
        const start=d9(mod.start),end=d9(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());
        const pos=v=>clamp9(((d9(v).getTime()-min)/(max-min))*100,0,100);const unit=mod.timeUnit||'hour';const between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const lineBottom=34;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100;const t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v9" style="left:${pct}%"></div><div class="timeline-tick-label v9" style="left:${pct}%">${esc9(fmt9(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end);const w=Math.max(1,right-left);return `<div class="timeline-period-v9" style="left:${left}%;width:${w}%;background:${rgba9(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc9(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey9(ev);const level=used[key]||0;used[key]=level+1;const bottom=74+(level*58);const connector=Math.max(28,bottom-lineBottom-58);const hide=level>0?' hide-pointer':'';return `<div class="timeline-event-v9${hide}" data-event-index="${i}" style="left:${pos(ev.time)}%;bottom:${bottom}px;--connector-height:${connector}px;color:${esc9(ev.color||'#f8fafc')}" title="${esc9((ev.name||'')+' '+fmt9(ev.time,'hour'))}"><div class="ev-time">${esc9(fmt9(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc9(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content"><div class="timeline-wrap v9"><div class="timeline-track v9 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v9"></div>${periods}${ticks}${events}</div><div class="timeline-scale v9"><span>${esc9(fmt9(mod.start,unit))}</span><span>${esc9(fmt9(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v9"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };

      const prevContent9=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML9(mod);return prevContent9(mod);};
      const prevNormalize9=normalizeMod;normalizeMod=function(mod){prevNormalize9(mod);if(mod.type==='log')normalizeLog9(mod);};
      const prevWire9=wireModule;wireModule=function(el,mod){prevWire9(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime9(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v9 render failed',e);}
    })();
  


    /* Request patch v10: restore visible bottom-anchored timeline and split logs on tekstlogg form separators */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v10{height:100%;min-height:100%;overflow:hidden;padding:10px 0 8px;}
        .timeline-wrap.v10{height:100%;min-height:150px;position:relative;display:flex;flex-direction:column;justify-content:flex-end;overflow:visible;}
        .timeline-track.v10{position:relative;margin:auto 26px 0 26px;height:clamp(150px, calc(100% - 24px), 260px);min-height:150px;overflow:visible;cursor:default;flex:0 1 auto;}
        .timeline-track.v10.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:8px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v10{position:absolute;left:0;right:0;bottom:36px;height:5px;border-radius:999px;background:rgba(226,232,240,.94);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v10{position:absolute;bottom:19px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v10{position:absolute;bottom:-8px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v10{position:absolute;bottom:28px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v10 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-v10{position:absolute;transform:translateX(-50%);display:grid;justify-items:center;gap:2px;min-width:120px;text-align:center;z-index:9;pointer-events:none;}
        .timeline-event-v10 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.88);border:1px solid rgba(147,197,253,.32);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-v10 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:165px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.60);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-v10 .ev-connector{width:2px;height:var(--connector-height,48px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-v10 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-event-v10.hide-pointer .ev-connector,.timeline-event-v10.hide-pointer .ev-arrow{display:none;}
        .timeline-scale.v10{height:18px;margin:2px 26px 0 26px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v10{position:absolute;left:12px;right:12px;bottom:28px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
        .log-line.v10{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(255,255,255,.055);}
        .log-line.v10:first-of-type{border-top:none;}
        .log-tag-left.v10{display:inline-flex;border:1px solid rgba(147,197,253,.30);border-radius:999px;padding:2px 7px;background:rgba(59,130,246,.16);font-size:.72em;color:#bfdbfe;font-weight:850;line-height:1.25;white-space:nowrap;justify-self:start;}
        .log-tag-left.v10.bold{font-weight:950;color:white;background:rgba(96,165,250,.31);border-color:rgba(191,219,254,.48);}
        .log-line-text.v10{white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;min-width:0;}
        .log-line-text.v10.bold{font-weight:950;color:#fff;}
        .log-line-tags-stack.v10{display:flex;gap:5px;flex-wrap:wrap;}
      `;
      document.head.appendChild(style);

      function esc10(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function reg10(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
      function clamp10(n,a,b){return Math.max(a,Math.min(b,n));}
      function d10(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt10(value,unit){const d=d10(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function pctToTime10(mod,pct){const start=d10(mod.start),end=d10(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp10(pct,0,1)).toISOString();}
      function clean10(s){return String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+([,.;:!?])/g,'$1').replace(/([([{])\s+/g,'$1').replace(/\s+([)\]}])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
      function rgba10(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function sameKey10(ev){return d10(ev.time).toISOString().slice(0,16);}

      timelineHTML=function(mod){
        const start=d10(mod.start),end=d10(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp10(((d10(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id,lineBottom=36;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v10" style="left:${pct}%"></div><div class="timeline-tick-label v10" style="left:${pct}%">${esc10(fmt10(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v10" style="left:${left}%;width:${w}%;background:${rgba10(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc10(p.name||'')}</span></div>`}).join('');
        const used={};
        const events=(mod.events||[]).map((ev,i)=>{const key=sameKey10(ev),level=used[key]||0;used[key]=level+1;const bottom=86+(level*58),connector=Math.max(26,bottom-lineBottom-56),hide=level>0?' hide-pointer':'';return `<div class="timeline-event-v10${hide}" data-event-index="${i}" style="left:${pos(ev.time)}%;bottom:${bottom}px;--connector-height:${connector}px;color:${esc10(ev.color||'#f8fafc')}" title="${esc10((ev.name||'')+' '+fmt10(ev.time,'hour'))}"><div class="ev-time">${esc10(fmt10(ev.time,unit==='date'?'date':'hour'))}</div><div class="ev-name">${esc10(ev.name||'Hendelse')}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`}).join('');
        return `<div class="content timeline-content-v10"><div class="timeline-wrap v10"><div class="timeline-track v10 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v10"></div>${periods}${ticks}${events}</div><div class="timeline-scale v10"><span>${esc10(fmt10(mod.start,unit))}</span><span>${esc10(fmt10(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v10"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };

      function normalizeLog10(mod){
        if(!Array.isArray(mod.filters))mod.filters=[];if(!Array.isArray(mod.entries))mod.entries=[];
        mod.filters=mod.filters.map(f=>typeof f==='string'?{term:f,enabled:false,bold:false}:f).filter(f=>f&&String(f.term||'').trim()).map(f=>({term:String(f.term).trim(),enabled:!!f.enabled,bold:!!f.bold}));
        mod.entries=mod.entries.map(e=>{if(Array.isArray(e.lines))return {...e,lines:e.lines.map(l=>({text:clean10(l.text||''),tags:(l.tags||[]).map(clean10).filter(Boolean)})).filter(l=>l.text||l.tags.length)};const tags=(e.tags||[]).map(clean10).filter(Boolean);return {lines:String(e.text||'').split(/\n+/).map(clean10).filter(Boolean).map(text=>({text,tags}))};}).filter(e=>e.lines&&e.lines.length);
      }
      function enabled10(mod){normalizeLog10(mod);return mod.filters.filter(f=>f.enabled).map(f=>f.term.toLowerCase());}
      function bold10(mod){normalizeLog10(mod);return mod.filters.filter(f=>f.bold).map(f=>f.term.toLowerCase());}
      function match10(line,terms){if(!terms.length)return true;const tags=(line.tags||[]).map(t=>String(t).toLowerCase());return terms.some(t=>tags.includes(t));}
      function formatLogLine10(line,bolds){const tags=(line.tags||[]).filter(Boolean),isBold=tags.some(t=>bolds.includes(String(t).toLowerCase()));const tagHTML=tags.length?`<span class="log-line-tags-stack v10">${tags.map(t=>`<span class="log-tag-left v10 ${bolds.includes(String(t).toLowerCase())?'bold':''}">${esc10(t)}</span>`).join('')}</span>`:'<span></span>';return `<div class="log-line v10">${tagHTML}<span class="log-line-text v10 ${isBold?'bold':''}">${esc10(line.text||'')}</span></div>`;}
      function logHTML10(mod){normalizeLog10(mod);const terms=enabled10(mod),bolds=bold10(mod);const entries=(mod.entries||[]).map((e,idx)=>({idx,lines:(e.lines||[]).filter(l=>match10(l,terms))})).filter(e=>e.lines.length);return `<div class="content log-content v8"><div class="log-list v8">${entries.length?entries.map(e=>`<div class="log-entry v8"><div class="log-entry-title v8">Logg ${e.idx+1}</div>${e.lines.map(l=>formatLogLine10(l,bolds)).join('')}</div>`).join(''):`<div class="log-empty v8">Velg loggmodulen og last opp/lim inn tekstlogg i adminmenyen. Feltnavn blir filtervalg, og vanlig tekst vises her.</div>`}</div></div>`;}

      const knownKeys10=['Title','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
      function isBold10(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
      function itemText10(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
      function detectKnown10(s){const raw=clean10(s);for(const key of knownKeys10){const re=new RegExp('^('+key+')\\s*[:：-]?\\s*(.*)$','i');const m=raw.match(re);if(m&&m[2])return {tag:key,text:clean10(m[2])};}return null;}
      function splitCamel10(s){const raw=clean10(s);const m=raw.match(/^([A-ZÆØÅ]{2,}|[A-ZÆØÅ][a-zæøå]{1,})(.+)$/);if(!m)return null;const tag=m[1].replace(/[:：-]$/,''),rest=clean10(m[2]);if(tag.length>1&&tag.length<40&&rest)return {tag,text:rest};return null;}
      function lineFromItems10(items){items.sort((a,b)=>a.x-b.x);let normal='',all='',tags=[],lastEnd=null,lastSize=10;for(const it of items){const t=itemText10(it);if(!t)continue;const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10)),gap=lastEnd==null?0:it.x-lastEnd;const addSpace=base=>base&&gap>size*.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(base);all+=(addSpace(all)?' ':'')+t;if(isBold10(it)){tags.push(t.replace(/[:：-]\s*$/,'').trim());}else{normal+=(addSpace(normal)?' ':'')+t;}lastEnd=(it.x||0)+(it.w||t.length*size*.52);lastSize=size;}let text=clean10(normal),allText=clean10(all);const known=detectKnown10(allText)||splitCamel10(allText);if(known){tags=[known.tag];text=known.text;}if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg10(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean10(stripped);}tags=tags.map(t=>clean10(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<80);return {text,all:allText,tags};}
      async function ensurePdf10(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');reject(new Error('tekstlogg-opplasting er fjernet. Bruk tekstlogg i stedet.'));return;});return window.pdfjsLib;}
      function collectSeparatorYs10(opList){const ys=[];const nums=a=>{const out=[];(function walk(x){if(Array.isArray(x))x.forEach(walk);else if(typeof x==='number'&&Number.isFinite(x))out.push(x);})(a);return out;};for(let i=0;i<(opList.fnArray||[]).length;i++){const arr=nums(opList.argsArray[i]);for(let j=0;j+3<arr.length;j+=2){const x1=arr[j],y1=arr[j+1],x2=arr[j+2],y2=arr[j+3];if(Math.abs(y1-y2)<2&&Math.abs(x2-x1)>120)ys.push((y1+y2)/2);}for(let j=0;j+3<arr.length;j+=4){const x=arr[j],y=arr[j+1],w=arr[j+2],h=arr[j+3];if(Math.abs(w)>120&&Math.abs(h)<18)ys.push(y+h/2);}}return ys.filter((y,i,a)=>a.findIndex(v=>Math.abs(v-y)<3)===i);}
      function hasSeparatorBetween10(seps,a,b){const top=Math.max(a,b),bottom=Math.min(a,b);return seps.some(y=>y<top-2&&y>bottom+2);}
      async function extractPdfLogsV10(file,mod){
        try{const pdfjs=await ensurePdf10();const buf=await file.arrayBuffer();const pdf=await pdfjs.getDocument({data:buf}).promise;const pieces=[],tagSet=new Set();
          for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();let seps=[];try{seps=collectSeparatorYs10(await page.getOperatorList());}catch{}
            const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText10(it));raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
            const groups=[];for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}groups.sort((a,b)=>b.y-a.y);
            const gaps=[];for(let i=1;i<groups.length;i++)gaps.push(Math.abs(groups[i-1].y-groups[i].y));const sorted=gaps.slice().sort((a,b)=>a-b),med=sorted.length?sorted[Math.floor(sorted.length/2)]:12,gapLimit=Math.max(24,med*2.6);
            let prevY=null,pendingTags=[];
            for(const g of groups){if(prevY!==null&&(Math.abs(prevY-g.y)>gapLimit||hasSeparatorBetween10(seps,prevY,g.y))){pieces.push({separator:true});pendingTags=[];}prevY=g.y;const line=lineFromItems10(g.items);if(/^(?:[-–—_]{6,}|={6,})$/.test(line.all.replace(/\s/g,''))){pieces.push({separator:true});pendingTags=[];continue;}line.tags.forEach(t=>tagSet.add(t));if(line.tags.length&&line.text){pieces.push({line:{text:clean10(line.text),tags:[...new Set(line.tags)]}});pendingTags=[];}else if(line.tags.length&&!line.text){pendingTags=[...new Set([...pendingTags,...line.tags])];}else if(line.text){pieces.push({line:{text:clean10(line.text),tags:[...new Set(pendingTags)]}});pendingTags=[];}}
            pieces.push({separator:true,page:true});}
          const entries=[];let cur={lines:[]};const flush=()=>{if(cur.lines.length)entries.push(cur);cur={lines:[]};};for(const part of pieces){if(part.separator){flush();continue;}if(part.line){cur.lines.push({text:clean10(part.line.text),tags:[...new Set((part.line.tags||[]).map(clean10).filter(Boolean))]});}}flush();
          const terms=[...tagSet].map(clean10).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i),existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));mod.filters=terms.slice(0,180).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));mod.entries=entries.filter(e=>e.lines.length);mod.fileName=file.name;save();renderAll();
        }catch(err){alert('Klarte ikke å lese tekstlogg. Nettleseren må kunne laste tekstlogg.js fra CDN. Feil: '+(err?.message||err));}
      }

      const prevContent10=contentHTML;contentHTML=function(mod){if(mod.type==='log')return logHTML10(mod);if(mod.type==='timeline')return timelineHTML(mod);return prevContent10(mod);};
      const prevNormalize10=normalizeMod;normalizeMod=function(mod){prevNormalize10(mod);if(mod.type==='log')normalizeLog10(mod);};
      const prevRenderSelected10=renderSelectedSettings;renderSelectedSettings=function(){prevRenderSelected10();const mod=selected();if(!mod)return;if(mod.type==='log'){const old=document.getElementById('logPickAdminV8')||document.getElementById('logPickAdminV6');const oldFile=document.getElementById('logPdfFileAdminV8')||document.getElementById('logPdfFileAdminV6');old?.replaceWith(old.cloneNode(true));const pick=document.getElementById('logPickAdminV8')||document.getElementById('logPickAdminV6');const file=document.getElementById('logPdfFileAdminV8')||document.getElementById('logPdfFileAdminV6');pick?.addEventListener('click',()=>file?.click());file?.addEventListener('change',()=>{if(file.files?.[0])extractPdfLogsV10(file.files[0],mod);});}};
      const prevWire10=wireModule;wireModule=function(el,mod){prevWire10(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime10(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v10 render failed',e);}
    })();


    /* Request patch v11: timeline bottom lock + grouped same-time events with one time label */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v11{height:100%;min-height:100%;position:relative;overflow:hidden;padding:0;}
        .timeline-wrap.v11{position:absolute;inset:0;overflow:visible;}
        .timeline-track.v11{position:absolute;left:26px;right:26px;bottom:32px;height:260px;max-height:calc(100% - 38px);min-height:150px;overflow:visible;cursor:default;}
        .timeline-track.v11.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:8px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v11{position:absolute;left:0;right:0;bottom:38px;height:5px;border-radius:999px;background:rgba(226,232,240,.96);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v11{position:absolute;bottom:21px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v11{position:absolute;bottom:-7px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v11{position:absolute;bottom:30px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v11 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-group-v11{position:absolute;transform:translateX(-50%);bottom:40px;display:grid;justify-items:center;gap:3px;min-width:128px;text-align:center;z-index:9;pointer-events:none;color:#f8fafc;}
        .timeline-event-group-v11 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.90);border:1px solid rgba(147,197,253,.36);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-group-v11 .ev-names{display:grid;gap:3px;justify-items:center;}
        .timeline-event-group-v11 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:175px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.64);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-group-v11 .ev-connector{width:2px;height:var(--connector-height,58px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-group-v11 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v11{position:absolute;left:26px;right:26px;bottom:6px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v11{position:absolute;left:12px;right:12px;bottom:68px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
      `;
      document.head.appendChild(style);
      function esc11(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp11(n,a,b){return Math.max(a,Math.min(b,n));}
      function d11(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt11(value,unit){const d=d11(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function rgba11(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function pctToTime11(mod,pct){const start=d11(mod.start),end=d11(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp11(pct,0,1)).toISOString();}
      function sameKey11(ev){return d11(ev.time).toISOString().slice(0,16);}
      timelineHTML=function(mod){
        const start=d11(mod.start),end=d11(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp11(((d11(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v11" style="left:${pct}%"></div><div class="timeline-tick-label v11" style="left:${pct}%">${esc11(fmt11(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v11" style="left:${left}%;width:${w}%;background:${rgba11(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc11(p.name||'')}</span></div>`}).join('');
        const groups=[];const byKey=new Map();
        (mod.events||[]).forEach((ev,i)=>{const key=sameKey11(ev);let g=byKey.get(key);if(!g){g={key,time:ev.time,color:ev.color||'#f8fafc',events:[]};byKey.set(key,g);groups.push(g);}g.events.push({...ev,index:i});if(!g.color&&ev.color)g.color=ev.color;});
        groups.sort((a,b)=>d11(a.time)-d11(b.time));
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc11(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=58+(extra*12);return `<div class="timeline-event-group-v11" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc11(g.color||'#f8fafc')}" title="${esc11(fmt11(g.time,'hour'))}"><div class="ev-time">${esc11(fmt11(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v11"><div class="timeline-wrap v11"><div class="timeline-track v11 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v11"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v11"><span>${esc11(fmt11(mod.start,unit))}</span><span>${esc11(fmt11(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v11"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      const prevContent11=contentHTML;contentHTML=function(mod){if(mod.type==='timeline')return timelineHTML(mod);return prevContent11(mod);};
      const prevWire11=wireModule;wireModule=function(el,mod){prevWire11(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime11(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v11 render failed',e);}
    })();

    /* Request patch v12: move timeline line down to align with period marking */
    (()=>{
      const style=document.createElement('style');
      style.textContent=`
        .timeline-content-v12{height:100%;min-height:100%;position:relative;overflow:hidden;padding:0;}
        .timeline-wrap.v12{position:absolute;inset:0;overflow:visible;}
        .timeline-track.v12{position:absolute;left:26px;right:26px;bottom:0;height:100%;min-height:150px;overflow:visible;cursor:default;}
        .timeline-track.v12.placing{cursor:crosshair;animation:timelinePlacePulse 1.1s ease-in-out infinite;outline:2px solid rgba(96,165,250,.9);outline-offset:-2px;border-radius:18px;background:rgba(59,130,246,.10);}
        .timeline-line.v12{position:absolute;left:0;right:0;bottom:56px;height:5px;border-radius:999px;background:rgba(226,232,240,.96);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.22);z-index:5;}
        .timeline-tick.v12{position:absolute;bottom:39px;width:2px;height:39px;background:rgba(248,250,252,.94);transform:translateX(-1px);border-radius:999px;z-index:7;}
        .timeline-tick-label.v12{position:absolute;bottom:11px;transform:translateX(-50%);font-size:.7em;color:#cbd5e1;white-space:nowrap;z-index:7;}
        .timeline-period-v12{position:absolute;bottom:48px;height:20px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.20);z-index:6;overflow:hidden;display:grid;place-items:center;padding:0 8px;}
        .timeline-period-v12 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.76em;font-weight:950;color:#f8fafc;text-shadow:0 2px 8px rgba(0,0,0,.85);}
        .timeline-event-group-v12{position:absolute;transform:translateX(-50%);bottom:62px;display:grid;justify-items:center;gap:3px;min-width:128px;text-align:center;z-index:9;pointer-events:none;color:#f8fafc;}
        .timeline-event-group-v12 .ev-time{font-size:.72em;color:#bfdbfe;font-weight:900;background:rgba(15,23,42,.90);border:1px solid rgba(147,197,253,.36);border-radius:999px;padding:2px 7px;white-space:nowrap;}
        .timeline-event-group-v12 .ev-names{display:grid;gap:3px;justify-items:center;}
        .timeline-event-group-v12 .ev-name{font-size:.82em;font-weight:950;color:#f8fafc;line-height:1.12;max-width:175px;white-space:normal;text-wrap:balance;text-shadow:0 2px 9px rgba(0,0,0,.85);background:rgba(2,6,23,.64);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:3px 7px;}
        .timeline-event-group-v12 .ev-connector{width:2px;height:var(--connector-height,42px);background:currentColor;border-radius:999px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));opacity:.95;}
        .timeline-event-group-v12 .ev-arrow{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:13px solid currentColor;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55));}
        .timeline-scale.v12{position:absolute;left:26px;right:26px;bottom:4px;display:flex;justify-content:space-between;color:var(--muted);font-size:.78em;pointer-events:none;}
        .timeline-place-help.v12{position:absolute;left:12px;right:12px;bottom:88px;display:flex;gap:8px;align-items:center;justify-content:center;border:1px solid rgba(147,197,253,.35);border-radius:14px;background:rgba(15,23,42,.90);padding:8px;color:#dbeafe;font-size:12px;z-index:20;}
      `;
      document.head.appendChild(style);
      function esc12(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
      function clamp12(n,a,b){return Math.max(a,Math.min(b,n));}
      function d12(v){const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date():d;}
      function fmt12(value,unit){const d=d12(value);try{if(unit==='date')return new Intl.DateTimeFormat('no-NO',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);if(unit==='minute')return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);return new Intl.DateTimeFormat('no-NO',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return String(value||'')}}
      function rgba12(hex,opacity){try{if(typeof hexToRgba==='function')return hexToRgba(hex,opacity)}catch{};return hex||'#60a5fa';}
      function pctToTime12(mod,pct){const start=d12(mod.start),end=d12(mod.end||Date.now()+3600000);const min=start.getTime(),max=Math.max(min+60000,end.getTime());return new Date(min+(max-min)*clamp12(pct,0,1)).toISOString();}
      function sameKey12(ev){return d12(ev.time).toISOString().slice(0,16);}
      timelineHTML=function(mod){
        const start=d12(mod.start),end=d12(mod.end||Date.now()+3600000),min=start.getTime(),max=Math.max(start.getTime()+60000,end.getTime());
        const pos=v=>clamp12(((d12(v).getTime()-min)/(max-min))*100,0,100),unit=mod.timeUnit||'hour',between=Math.max(0,Number(mod.tickCount??3));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v12" style="left:${pct}%"></div><div class="timeline-tick-label v12" style="left:${pct}%">${esc12(fmt12(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v12" style="left:${left}%;width:${w}%;background:${rgba12(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc12(p.name||'')}</span></div>`}).join('');
        const groups=[];const byKey=new Map();
        (mod.events||[]).forEach((ev,i)=>{const key=sameKey12(ev);let g=byKey.get(key);if(!g){g={key,time:ev.time,color:ev.color||'#f8fafc',events:[]};byKey.set(key,g);groups.push(g);}g.events.push({...ev,index:i});if(!g.color&&ev.color)g.color=ev.color;});
        groups.sort((a,b)=>d12(a.time)-d12(b.time));
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc12(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=42+(extra*12);return `<div class="timeline-event-group-v12" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc12(g.color||'#f8fafc')}" title="${esc12(fmt12(g.time,'hour'))}"><div class="ev-time">${esc12(fmt12(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v12"><div class="timeline-wrap v12"><div class="timeline-track v12 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v12"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v12"><span>${esc12(fmt12(mod.start,unit))}</span><span>${esc12(fmt12(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v12"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      const prevContent12=contentHTML;contentHTML=function(mod){if(mod.type==='timeline')return timelineHTML(mod);return prevContent12(mod);};
      const prevWire12=wireModule;wireModule=function(el,mod){prevWire12(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime12(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
      try{renderAll();}catch(e){console.error('Request patch v12 render failed',e);}
    })();

  


    (function(){
      function esc13(s){return escapeHTML(String(s??''));}
      function fmt13(v,unit){const d=new Date(v||Date.now());if(Number.isNaN(d.getTime()))return '';if(unit==='minute')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});if(unit==='hour')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});}
      function rgba13(hex,a){hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);if(Number.isNaN(n))return 'rgba(96,165,250,'+(a??.55)+')';return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a??.55})`;}
      function pctToTime13(mod,pct){const min=new Date(mod.start||Date.now()).getTime();const max=new Date(mod.end||Date.now()+3600000).getTime();const p=Math.max(0,Math.min(1,pct));return new Date(min+(max-min)*p).toISOString().slice(0,16);}
      window.pctToTime13=pctToTime13;
      timelineHTML=function(mod){
        normalizeMod(mod); if(!mod.start)mod.start=new Date().toISOString().slice(0,16); if(!mod.end)mod.end=new Date(Date.now()+4*3600000).toISOString().slice(0,16);
        const min=new Date(mod.start).getTime(),max=new Date(mod.end).getTime()||min+1,unit=mod.timeDisplay||'hour',between=Math.max(0,Number(mod.tickCount??6));
        const pos=t=>Math.max(0,Math.min(100,((new Date(t).getTime()-min)/(max-min))*100));
        const placing=window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id;
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v13" style="left:${pct}%"></div><div class="timeline-tick-label v13" style="left:${pct}%">${esc13(fmt13(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v13" style="left:${left}%;width:${w}%;background:${rgba13(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc13(p.name||'')}</span></div>`}).join('');
        const grouped={};(mod.events||[]).forEach(ev=>{const k=new Date(ev.time||Date.now()).getTime();(grouped[k]||(grouped[k]=[])).push(ev);});
        const groups=Object.entries(grouped).map(([k,events])=>({time:new Date(Number(k)),events,color:events[0]?.color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc13(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=42+(extra*12);return `<div class="timeline-event-group-v13" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc13(g.color||'#f8fafc')}" title="${esc13(fmt13(g.time,'hour'))}"><div class="ev-time">${esc13(fmt13(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v13"><div class="timeline-wrap v13"><div class="timeline-track v13 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v13"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v13"><span>${esc13(fmt13(mod.start,unit))}</span><span>${esc13(fmt13(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v13"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      const prevContent13=contentHTML;contentHTML=function(mod){if(mod.type==='timeline')return timelineHTML(mod);return prevContent13(mod);};
      const prevWire13=wireModule;wireModule=function(el,mod){prevWire13(el,mod);if(mod.type==='timeline'){const track=el.querySelector('[data-timeline-track]');const place=e=>{const placing=window.__timelinePlace;if(!placing||placing.moduleId!==mod.id||!track)return;e.preventDefault();e.stopPropagation();const rect=track.getBoundingClientRect();const pct=(e.clientX-rect.left)/Math.max(1,rect.width);const time=pctToTime13(mod,pct);if(!Array.isArray(mod.events))mod.events=[];if(placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});mod.timelineOpenSection='events';window.__timelinePlace=null;save();renderAll();};track?.addEventListener('pointerdown',place,true);track?.addEventListener('click',place,true);}};
    })();
  


    (function(){
      const esc14=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
      const ms14=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:Date.now();};
      const rgba14=(hex,opacity)=>{try{hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;}catch(e){return `rgba(96,165,250,${opacity})`;}};
      const fmt14=(value,unit)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';if(unit==='date')return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'});if(unit==='minute')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});};
      function normalize14(mod){
        if(!mod.start)mod.start=new Date(Date.now()-60*60*1000).toISOString();
        if(!mod.end)mod.end=new Date(Date.now()+3*60*60*1000).toISOString();
        if(!Array.isArray(mod.periods))mod.periods=[];
        if(!Array.isArray(mod.events))mod.events=[];
        if(!mod.timelineUnit)mod.timelineUnit='hour';
        if(mod.timelineTicks==null)mod.timelineTicks=6;
      }
      window.timelineHTML=function(mod){
        normalize14(mod);
        const min=ms14(mod.start),max=Math.max(ms14(mod.end),min+60000),unit=mod.timelineUnit||'hour';
        const pos=v=>Math.max(0,Math.min(100,((ms14(v)-min)/(max-min))*100));
        const placing=window.__timelinePlaceTarget&&window.__timelinePlaceTarget.modId===mod.id;
        const between=Math.max(0,Math.min(24,Number(mod.timelineTicks??6)));
        const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v14" style="left:${pct}%"></div><div class="timeline-tick-label v14" style="left:${pct}%">${esc14(fmt14(t,unit))}</div>`}).join('');
        const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v14" style="left:${left}%;width:${w}%;background:${rgba14(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc14(p.name||'')}</span></div>`}).join('');
        const buckets=new Map();
        (mod.events||[]).forEach(ev=>{const key=String(Math.round(ms14(ev.time||ev.start||mod.start)/60000));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ev);});
        const groups=[...buckets.values()].map(events=>({events,time:new Date(ms14(events[0].time||events[0].start||mod.start)),color:events[0].color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
        const rendered=groups.map(g=>{const names=g.events.map(ev=>`<div class="ev-name">${esc14(ev.name||'Hendelse')}</div>`).join('');const extra=Math.max(0,g.events.length-1);const connector=46+(extra*13);return `<div class="timeline-event-group-v14" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc14(g.color||'#f8fafc')}" title="${esc14(fmt14(g.time,'hour'))}"><div class="ev-time">${esc14(fmt14(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;}).join('');
        return `<div class="content timeline-content-v14"><div class="timeline-wrap v14"><div class="timeline-stage v14 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v14"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v14"><span>${esc14(fmt14(mod.start,unit))}</span><span>${esc14(fmt14(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v14"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
      };
      try{renderAll();}catch(e){console.error('v14 timeline render failed',e);}
    })();
  


(function(){
  const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const ms=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:Date.now();};
  const rgba=(hex,opacity)=>{try{hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;}catch(e){return `rgba(96,165,250,${opacity})`;}};
  const fmt=(value,unit)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';if(unit==='date')return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'});return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});};
  function norm(mod){
    if(!mod.start)mod.start=new Date(Date.now()-60*60*1000).toISOString();
    if(!mod.end)mod.end=new Date(Date.now()+3*60*60*1000).toISOString();
    if(!Array.isArray(mod.periods))mod.periods=[];
    if(!Array.isArray(mod.events))mod.events=[];
    if(!mod.timelineUnit)mod.timelineUnit='hour';
    if(mod.timelineTicks==null)mod.timelineTicks=6;
  }
  window.timelineHTML=function(mod){
    norm(mod);
    const min=ms(mod.start),max=Math.max(ms(mod.end),min+60000),unit=mod.timelineUnit||'hour';
    const pos=v=>Math.max(0,Math.min(100,((ms(v)-min)/(max-min))*100));
    const placing=window.__timelinePlaceTarget&&window.__timelinePlaceTarget.modId===mod.id;
    const between=Math.max(0,Math.min(24,Number(mod.timelineTicks??6)));
    const ticks=Array.from({length:between+2},(_,i)=>{const pct=(i/(between+1))*100,t=new Date(min+(max-min)*(i/(between+1)));return `<div class="timeline-tick v14" style="left:${pct}%"></div><div class="timeline-tick-label v14" style="left:${pct}%">${esc(fmt(t,unit))}</div>`}).join('');
    const periods=(mod.periods||[]).map(p=>{const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);return `<div class="timeline-period-v14" style="left:${left}%;width:${w}%;background:${rgba(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc(p.name||'')}</span></div>`}).join('');
    const buckets=new Map();
    (mod.events||[]).forEach(ev=>{const key=String(Math.round(ms(ev.time||ev.start||mod.start)/60000));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ev);});
    const groups=[...buckets.values()].map(events=>({events,time:new Date(ms(events[0].time||events[0].start||mod.start)),color:events[0].color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
    const rendered=groups.map(g=>{
      const names=g.events.map(ev=>`<div class="ev-name">${esc(ev.name||'Hendelse')}</div>`).join('');
      const extra=Math.max(0,g.events.length-1);
      const connector=46+(extra*13);
      return `<div class="timeline-event-group-v19" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc(g.color||'#f8fafc')}" title="${esc(fmt(g.time,'hour'))}"><div class="ev-card"><div class="ev-time">${esc(fmt(g.time,unit==='date'?'date':'hour'))}</div><div class="ev-names">${names}</div></div><div class="ev-connector"></div><div class="ev-arrow"></div></div>`;
    }).join('');
    return `<div class="content timeline-content-v14"><div class="timeline-wrap v14"><div class="timeline-stage v14 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v14"></div>${periods}${ticks}${rendered}</div><div class="timeline-scale v14"><span>${esc(fmt(mod.start,unit))}</span><span>${esc(fmt(mod.end,unit))}</span></div>${placing?'<div class="timeline-place-help v14"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
  };
  try{renderAll();}catch(e){console.error('v19 timeline render failed',e);}
})();



(()=>{
  function clean26(s){return String(s||'').replace(/\u00a0/g,' ').replace(/\s+([,.;:!?])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
  function itemText26(it){return String(it.str||'').replace(/\s+/g,' ').trim();}
  function isBold26(it){return /bold|black|heavy|semibold|demi/i.test(String(it.fontName||it.font||''));}
  function reg26(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  const knownKeys26=['Title','Received DTG','Recieved DTG','Receiced DTG','DTG','Summary','From','To','Status','Type','Category','Event','Time','Date','Message','Remarks','Notes','Location','Name','Subject'];
  function detectKnown26(s){
    const raw=clean26(s);
    for(const key of knownKeys26){
      const re=new RegExp('^('+reg26(key)+')\\s*[:：-]?\\s*(.*)$','i');
      const m=raw.match(re);
      if(m&&m[2])return {tag:key.replace(/^Recieved$/i,'Received').replace(/^Receiced$/i,'Received'),text:clean26(m[2])};
    }
    const compact=raw.match(/^(Title|DTG|Summary|From|To|Status|Type|Category|Event|Message|Remarks|Notes|Location|Subject)(.+)$/i);
    if(compact&&compact[2])return {tag:compact[1],text:clean26(compact[2])};
    return null;
  }
  function lineFromItems26(items){
    items.sort((a,b)=>a.x-b.x);
    let all='',normal='',tags=[],lastEnd=null,lastSize=10;
    for(const it of items){
      const t=itemText26(it); if(!t)continue;
      const size=Math.max(6,Math.abs(it.h||it.size||lastSize||10));
      const gap=lastEnd==null?0:it.x-lastEnd;
      const addSpace=base=>base&&gap>size*.18&&!/^\s*[.,:;!?)]/.test(t)&&!/[([{]\s*$/.test(base);
      all+=(addSpace(all)?' ':'')+t;
      if(isBold26(it))tags.push(t.replace(/[:：-]\s*$/,'').trim()); else normal+=(addSpace(normal)?' ':'')+t;
      lastEnd=(it.x||0)+(it.w||t.length*size*.52); lastSize=size;
    }
    let text=clean26(normal),allText=clean26(all);
    const known=detectKnown26(allText);
    if(known){tags=[known.tag];text=known.text;}
    if(tags.length&&!text){let stripped=allText;tags.forEach(t=>{stripped=stripped.replace(new RegExp('^\\s*'+reg26(t)+'\\s*[:：-]?\\s*','i'),'');});text=clean26(stripped);}
    tags=tags.map(t=>clean26(t).replace(/[:：-]$/,'')).filter(t=>t.length>1&&t.length<90);
    return {text,all:allText,tags:[...new Set(tags)]};
  }
  async function ensurePdfJs26(){
    if(window.pdfjsLib){
      try{window.pdfjsLib.GlobalWorkerOptions.workerSrc=window.pdfjsLib.GlobalWorkerOptions.workerSrc||'';}catch{}
      return window.pdfjsLib;
    }
    await new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>/pdf\.min\.js(?:$|\?)/.test(s.getAttribute('src')||''));
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Kunne ikke laste lokal . Legg  og  i samme mappe som HTML-filen.')), {once:true});return;}
      const s=document.createElement('script');
      s.src='';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Kunne ikke laste lokal . Siden bruker ikke CDN. Legg  og  i samme mappe som HTML-filen, eller åpne siden via en lokal webserver.'));
      document.head.appendChild(s);
    });
    if(!window.pdfjsLib)throw new Error(' ble lastet, men window.pdfjsLib finnes ikke. Sjekk at filen er riktig tekstlogg.js build.');
    
    return window.pdfjsLib;
  }
  function nums26(a){const out=[];(function walk(x){if(Array.isArray(x))x.forEach(walk);else if(typeof x==='number'&&Number.isFinite(x))out.push(x);})(a);return out;}
  function collectSeparatorYs26(opList){
    const ys=[];
    for(let i=0;i<(opList.fnArray||[]).length;i++){
      const arr=nums26(opList.argsArray[i]);
      for(let j=0;j+3<arr.length;j+=2){const x1=arr[j],y1=arr[j+1],x2=arr[j+2],y2=arr[j+3];if(Math.abs(y1-y2)<2&&Math.abs(x2-x1)>120)ys.push((y1+y2)/2);}
      for(let j=0;j+3<arr.length;j+=4){const x=arr[j],y=arr[j+1],w=arr[j+2],h=arr[j+3];if(Math.abs(w)>120&&Math.abs(h)<18)ys.push(y+h/2);}
    }
    return ys.filter((y,i,a)=>a.findIndex(v=>Math.abs(v-y)<3)===i);
  }
  function hasSeparatorBetween26(seps,a,b){const top=Math.max(a,b),bottom=Math.min(a,b);return seps.some(y=>y<top-2&&y>bottom+2);}
  async function extractPdfLogsV26(file,mod){
    if(!file||typeof file.arrayBuffer!=='function'){
      alert('tekstlogg-opplasting fikk ikke en fil. Prøv å velge tekstloggen på nytt.');
      return;
    }
    try{
      const pdfjs=await ensurePdfJs26();
      const buf=await file.arrayBuffer();
      const pdf=await pdfjs.getDocument({data:buf}).promise;
      const pieces=[],tagSet=new Set();
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p);
        const content=await page.getTextContent();
        let seps=[];try{seps=collectSeparatorYs26(await page.getOperatorList());}catch{}
        const raw=content.items.map(it=>({str:it.str,fontName:it.fontName,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[0]||it.height||10)})).filter(it=>itemText26(it));
        raw.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
        const groups=[];
        for(const it of raw){let g=groups.find(gr=>Math.abs(gr.y-it.y)<4);if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);}
        groups.sort((a,b)=>b.y-a.y);
        const gaps=[];for(let i=1;i<groups.length;i++)gaps.push(Math.abs(groups[i-1].y-groups[i].y));
        const sorted=gaps.slice().sort((a,b)=>a-b),med=sorted.length?sorted[Math.floor(sorted.length/2)]:12,gapLimit=Math.max(24,med*2.6);
        let prevY=null,pendingTags=[];
        for(const g of groups){
          if(prevY!==null&&(Math.abs(prevY-g.y)>gapLimit||hasSeparatorBetween26(seps,prevY,g.y))){pieces.push({separator:true});pendingTags=[];}
          prevY=g.y;
          const line=lineFromItems26(g.items);
          if(/^(?:[-–—_]{6,}|={6,})$/.test(line.all.replace(/\s/g,''))){pieces.push({separator:true});pendingTags=[];continue;}
          line.tags.forEach(t=>tagSet.add(t));
          if(line.tags.length&&line.text){pieces.push({line:{text:clean26(line.text),tags:line.tags}});pendingTags=[];}
          else if(line.tags.length&&!line.text){pendingTags=[...new Set([...pendingTags,...line.tags])];}
          else if(line.text){pieces.push({line:{text:clean26(line.text),tags:[...new Set(pendingTags)]}});pendingTags=[];}
        }
        pieces.push({separator:true,page:true});
      }
      const entries=[];let cur={lines:[]};
      const flush=()=>{if(cur.lines.length)entries.push(cur);cur={lines:[]};};
      for(const part of pieces){if(part.separator){flush();continue;}if(part.line)cur.lines.push({text:clean26(part.line.text),tags:[...new Set((part.line.tags||[]).map(clean26).filter(Boolean))]});}
      flush();
      const terms=[...tagSet].map(clean26).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
      const existing=new Map((mod.filters||[]).map(f=>[String(f.term).toLowerCase(),f]));
      mod.filters=terms.slice(0,180).map(term=>({term,enabled:existing.get(term.toLowerCase())?.enabled||false,bold:existing.get(term.toLowerCase())?.bold||false}));
      mod.entries=entries.filter(e=>e.lines.length);
      mod.fileName=file.name;
      save();renderAll();
    }catch(err){
      const msg=err&&err.message?err.message:String(err);
      alert('Klarte ikke å lese tekstlogg. '+msg);
    }
  }
  window.extractPdfLogsV26=extractPdfLogsV26;

  const prevRenderSelected26=renderSelectedSettings;
  renderSelectedSettings=function(){
    prevRenderSelected26();
    const mod=selected&&selected();
    if(!mod||mod.type!=='log')return;
    const panel=document.getElementById('selectedSettings');
    if(!panel)return;
    const oldFile=panel.querySelector('input[type="file"][accept*="pdf"], input[type="file"][accept*="tekstlogg"], input[type="file"]');
    const oldPick=panel.querySelector('#logPickAdminV8,#logPickAdminV7,#logPickAdminV6,#logPickAdmin,button[id*="logPick"],button[id*="LogPick"]');
    if(oldFile){
      const nf=oldFile.cloneNode(true);oldFile.replaceWith(nf);
      if(oldPick){const nb=oldPick.cloneNode(true);oldPick.replaceWith(nb);nb.addEventListener('click',()=>nf.click());}
      nf.addEventListener('change',()=>{if(nf.files&&nf.files[0])extractPdfLogsV26(nf.files[0],mod);});
    }
    if(!panel.querySelector('.log-pdf-warning-v26')){
      const info=document.createElement('div');
      info.className='log-pdf-warning-v26';
      info.innerHTML='tekstlogg-lesing bruker bare lokale filer nå: <strong></strong> og <strong></strong> må ligge i samme mappe som HTML-filen. Ingen CDN brukes.';
      const host=panel.querySelector('.log-admin-grid')||panel;
      host.appendChild(info);
    }
  };
  try{renderAll();}catch(e){console.error('v26 pdf upload patch failed',e);}
})();



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



(function(){
  const MAX_HISTORY=60;
  let undoStack=[], redoStack=[], restoring=false, clipboardModule=null;
  const cloneObj=o=>JSON.parse(JSON.stringify(o));
  const stateJSON=()=>JSON.stringify(state);
  let lastSnapshot='';
  try{lastSnapshot=stateJSON();}catch(e){lastSnapshot='';}
  function replaceStateFromJSON(json){
    const obj=JSON.parse(json);
    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state,obj);
  }
  function pushCurrentChange(){
    if(restoring)return;
    let current; try{current=stateJSON();}catch(e){return;}
    if(!lastSnapshot){lastSnapshot=current;return;}
    if(current!==lastSnapshot){
      undoStack.push(lastSnapshot);
      if(undoStack.length>MAX_HISTORY)undoStack.shift();
      redoStack.length=0;
      lastSnapshot=current;
      updateWorkflowButtons();
    }
  }
  const baseSave=save;
  save=function(){pushCurrentChange(); return baseSave.apply(this,arguments);};
  function undo(){
    if(!undoStack.length)return;
    const current=stateJSON();
    const prev=undoStack.pop();
    redoStack.push(current);
    restoring=true;
    replaceStateFromJSON(prev);
    lastSnapshot=prev;
    try{baseSave();renderAll();}finally{restoring=false;updateWorkflowButtons();}
  }
  function redo(){
    if(!redoStack.length)return;
    const current=stateJSON();
    const next=redoStack.pop();
    undoStack.push(current);
    restoring=true;
    replaceStateFromJSON(next);
    lastSnapshot=next;
    try{baseSave();renderAll();}finally{restoring=false;updateWorkflowButtons();}
  }
  function updateWorkflowButtons(){
    const u=document.getElementById('undoBtnV35'),r=document.getElementById('redoBtnV35');
    if(u)u.disabled=!undoStack.length;
    if(r)r.disabled=!redoStack.length;
  }
  window.__statusboardUndoV35=undo; window.__statusboardRedoV35=redo;

  function ensureWorkflowState(){
    if(typeof state.snapEnabled!=='boolean')state.snapEnabled=false;
    if(!state.gridSize)state.gridSize=20;
    if(typeof state.showGridV35!=='boolean')state.showGridV35=false;
  }
  function ensureWorkflowPanel(){
    ensureWorkflowState();
    if(document.getElementById('workflowPanelV35')){updateWorkflowButtons();return;}
    const boardSection=[...document.querySelectorAll('.section')].find(s=>s.textContent.includes('Board'));
    if(!boardSection)return;
    const panel=document.createElement('div');
    panel.id='workflowPanelV35'; panel.className='workflow-panel-v35';
    panel.innerHTML=`<h3>Arbeidsflyt</h3>
      <div class="workflow-grid-v35"><button id="undoBtnV35" class="tool-btn" type="button">↶ Angre</button><button id="redoBtnV35" class="tool-btn" type="button">↷ Redo</button></div>
      <div class="workflow-grid-v35"><label><input id="snapEnabledV35" type="checkbox" ${state.snapEnabled?'checked':''}> Snap to grid</label><label><input id="showGridV35" type="checkbox" ${state.showGridV35?'checked':''}> Vis grid</label></div>
      <div class="field" style="margin-bottom:0"><label>Grid-størrelse px</label><input id="gridSizeV35" type="number" min="2" max="100" step="1" value="${Number(state.gridSize||20)}"></div>
      <p class="small">Hold Alt mens du flytter eller endrer størrelse for å ignorere snap.</p>`;
    boardSection.appendChild(panel);
    document.getElementById('undoBtnV35')?.addEventListener('click',undo);
    document.getElementById('redoBtnV35')?.addEventListener('click',redo);
    document.getElementById('snapEnabledV35')?.addEventListener('change',e=>{state.snapEnabled=e.target.checked;save();applyGridVisual();});
    document.getElementById('showGridV35')?.addEventListener('change',e=>{state.showGridV35=e.target.checked;save();applyGridVisual();});
    document.getElementById('gridSizeV35')?.addEventListener('change',e=>{state.gridSize=Math.max(2,Number(e.target.value)||20);save();applyGridVisual();});
    updateWorkflowButtons(); applyGridVisual();
  }
  function applyGridVisual(){
    ensureWorkflowState();
    board?.style.setProperty('--grid-size-v35',(Number(state.gridSize)||20)+'px');
    board?.classList.toggle('grid-visible-v35',!!state.showGridV35&&!!state.editMode);
  }
  const baseRenderAll=renderAll;
  renderAll=function(){const res=baseRenderAll.apply(this,arguments); try{ensureWorkflowPanel();applyGridVisual();}catch(e){console.warn('workflow panel failed',e);} return res;};

  function snap(n){const g=Math.max(2,Number(state.gridSize)||20); return Math.round(Number(n||0)/g)*g;}
  document.addEventListener('pointermove',e=>{
    if(!state.snapEnabled||e.altKey)return;
    try{
      if(typeof dragState!=='undefined'&&dragState){const m=getModule(dragState.id); if(m){m.x=snap(m.x);m.y=snap(m.y);dragState.el.style.left=px(m.x);dragState.el.style.top=px(m.y);}}
      if(typeof resizeState!=='undefined'&&resizeState){const m=getModule(resizeState.id); if(m){m.w=Math.max(moduleMinWidth(m),snap(m.w));m.h=Math.max(moduleMinHeight(m),snap(m.h));resizeState.el.style.width=px(m.w);resizeState.el.style.height=px(m.h);}}
    }catch(err){}
  });

  function copySelectedModule(){const m=selected&&selected(); if(!m)return false; clipboardModule=cloneObj(m); return true;}
  function pasteModule(){if(!clipboardModule)return false; const c=cloneObj(clipboardModule); c.id=uid(); c.x=(Number(c.x)||0)+24; c.y=(Number(c.y)||0)+24; activeView().modules.push(c); state.selectedId=c.id; save(); renderAll(); return true;}
  function duplicateSelectedModule(){const m=selected&&selected(); if(!m)return false; const c=cloneObj(m); c.id=uid(); c.x=(Number(c.x)||0)+24; c.y=(Number(c.y)||0)+24; activeView().modules.push(c); state.selectedId=c.id; save(); renderAll(); return true;}
  function deleteSelectedModule(){const m=selected&&selected(); if(!m)return false; activeView().modules=activeView().modules.filter(x=>x.id!==m.id); state.selectedId=null; save(); renderAll(); return true;}
  function bringSelectedFront(){const m=selected&&selected(); if(!m)return; const v=activeView(); v.modules=v.modules.filter(x=>x.id!==m.id); v.modules.push(m); save(); renderAll();}
  function sendSelectedBack(){const m=selected&&selected(); if(!m)return; const v=activeView(); v.modules=v.modules.filter(x=>x.id!==m.id); v.modules.unshift(m); save(); renderAll();}
  document.addEventListener('keydown',e=>{
    const tag=(document.activeElement?.tagName||'').toLowerCase();
    const typing=tag==='input'||tag==='textarea'||document.activeElement?.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if((e.ctrlKey||e.metaKey)&&((e.key.toLowerCase()==='y')||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();redo();return;}
    if(typing)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){if(copySelectedModule())e.preventDefault();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(pasteModule())e.preventDefault();}
  });

  const menu=document.createElement('div'); menu.id='ctxMenuV35'; menu.className='ctx-menu-v35'; document.body.appendChild(menu);
  function hideMenu(){menu.classList.remove('show');}
  function showMenu(x,y,items){menu.innerHTML=items.map(it=>it==='sep'?'<div class="sep"></div>':`<button type="button" data-act="${it.id}">${it.label}</button>`).join(''); menu._actions=items.filter(i=>i!=='sep'); menu.style.left=Math.min(x,window.innerWidth-230)+'px'; menu.style.top=Math.min(y,window.innerHeight-260)+'px'; menu.classList.add('show');}
  menu.addEventListener('click',e=>{const b=e.target.closest('button[data-act]'); if(!b)return; const item=(menu._actions||[]).find(i=>i.id===b.dataset.act); hideMenu(); item?.run?.();});
  document.addEventListener('click',e=>{if(!e.target.closest('#ctxMenuV35'))hideMenu();});
  document.addEventListener('contextmenu',e=>{
    if(!state.editMode)return;
    const modEl=e.target.closest('.mod');
    if(!modEl)return;
    e.preventDefault();
    const id=modEl.dataset.id; if(id)state.selectedId=id;
    const cell=e.target.closest('td[data-row][data-col]');
    if(cell){
      const m=getModule(id); const r=+cell.dataset.row,c=+cell.dataset.col; if(m&&m.type==='table'){try{selectTableCell(id,r,c,false);}catch(_){state.selectedCell={moduleId:id,row:r,col:c};state.selectedCells=[{moduleId:id,row:r,col:c}];}
      showMenu(e.clientX,e.clientY,[
        {id:'bold',label:'Bold',run:()=>{try{document.getElementById('cellBold')?.click();}catch(_){}}},
        {id:'center',label:'Midtstill',run:()=>{try{centerSelectedCells();renderAll();}catch(_){}}},
        {id:'merge',label:'Merge',run:()=>{try{mergeCenterSelectedCells();}catch(_){}}},
        {id:'unmerge',label:'Unmerge',run:()=>{try{unmergeSelectedCells();}catch(_){}}},'sep',
        {id:'row',label:'Legg til rad under',run:()=>{try{const row=Array(colCount(m)).fill('');m.rows.splice(r+1,0,row);save();renderAll();}catch(_){}}},
        {id:'col',label:'Legg til kolonne til høyre',run:()=>{try{m.rows.forEach(row=>row.splice(c+1,0,''));save();renderAll();}catch(_){}}},
        {id:'delrow',label:'Slett rad',run:()=>{try{m.rows.splice(r,1);save();renderAll();}catch(_){}}},
        {id:'delcol',label:'Slett kolonne',run:()=>{try{m.rows.forEach(row=>row.splice(c,1));save();renderAll();}catch(_){}}}
      ]); return;}
    }
    showMenu(e.clientX,e.clientY,[
      {id:'copy',label:'Kopier modul',run:copySelectedModule},
      {id:'paste',label:'Lim inn modul',run:pasteModule},
      {id:'dup',label:'Dupliser modul',run:duplicateSelectedModule},
      {id:'del',label:'Slett modul',run:deleteSelectedModule},'sep',
      {id:'front',label:'Flytt fremst',run:bringSelectedFront},
      {id:'back',label:'Flytt bakerst',run:sendSelectedBack}
    ]);
  });

  // Timeline now marker + autofit
  const prevTimelineHTML=window.timelineHTML||timelineHTML;
  function dt(v){const d=new Date(v); return Number.isFinite(d.getTime())?d:null;}
  function toIsoLocal(d){const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;}
  function autoFitTimeline(mod){
    const times=[];
    (mod.events||[]).forEach(e=>{const d=dt(e.time||e.start); if(d)times.push(d);});
    (mod.periods||[]).forEach(p=>{const a=dt(p.start),b=dt(p.end); if(a)times.push(a); if(b)times.push(b);});
    if(!times.length)return false;
    times.sort((a,b)=>a-b); const first=new Date(times[0]), last=new Date(times[times.length-1]);
    const pad=Math.max(15*60000,Math.round((last-first)*0.05));
    mod.start=toIsoLocal(new Date(first.getTime()-pad)); mod.end=toIsoLocal(new Date(last.getTime()+pad)); return true;
  }
  window.timelineHTML=function(mod){
    let html=prevTimelineHTML(mod);
    try{
      const s=dt(mod.start),e=dt(mod.end),now=new Date();
      if(s&&e&&e>s&&now>=s&&now<=e){const pct=((now-s)/(e-s))*100; html=html.replace('</div><div class="timeline-scale v14 v27">',`<div class="timeline-now-v35" style="left:${pct}%"><span>Nå</span></div></div><div class="timeline-scale v14 v27">`);}
    }catch(err){}
    return html;
  };
  const prevTimelineSettings=timelineSettingsHTML;
  timelineSettingsHTML=function(mod){
    let html=prevTimelineSettings(mod);
    if(mod&&mod.type==='timeline') html=html.replace('</div>',`<div class="timeline-autofit-row-v35"><button id="timelineAutoFitV35" class="tool-btn primary" type="button">Tilpass tidslinje til hendelser</button></div></div>`);
    return html;
  };
  const prevBindTimeline=bindTimelineSettings;
  bindTimelineSettings=function(mod){prevBindTimeline(mod); if(!mod||mod.type!=='timeline')return; document.getElementById('timelineAutoFitV35')?.addEventListener('click',()=>{if(autoFitTimeline(mod)){save();renderAll();}else alert('Fant ingen hendelser eller perioder å tilpasse tidslinjen til.');});};

  // Better log controls: search, show/hide all, filtered timeline export.
  function logVisibleFilterTerms(mod){if(!Array.isArray(mod.filters))return [];return mod.filters.filter(f=>f.enabled).map(f=>String(f.term||'').toLowerCase());}
  function logField(entry,tag){const l=(entry.lines||[]).find(x=>String(x.tag||'').toLowerCase()===tag.toLowerCase()); return l?String(l.text||''):'';}
  function parseReceivedDateV35(v){const m=String(v||'').trim().match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if(!m)return null; let y=+m[3]; if(y<100)y+=2000; const d=new Date(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0)); return Number.isFinite(d.getTime())?d:null;}
  function filteredLogEvents(mod){
    const active=logVisibleFilterTerms(mod);
    const search=String(mod.logSearchV35||'').trim().toLowerCase();
    const out=[];
    (mod.entries||[]).forEach((e,i)=>{
      const lines=e.lines||[];
      if(active.length&&!lines.some(l=>active.includes(String(l.tag||'').toLowerCase())))return;
      const hay=lines.map(l=>`${l.tag} ${l.text}`).join(' ').toLowerCase();
      if(search&&!hay.includes(search))return;
      const title=logField(e,'Title')||('Logg '+(i+1));
      const d=parseReceivedDateV35(logField(e,'Received DTG'));
      if(d)out.push({name:title,time:d.toISOString(),color:'#f8fafc',source:'log-filtered-v35',logIndex:i,dtg:logField(e,'Received DTG')});
    });
    return out;
  }
  function addFilteredToTimeline(mod,tl){if(!tl)return 0;if(!Array.isArray(tl.events))tl.events=[];const evs=filteredLogEvents(mod);const ex=new Set(tl.events.map(e=>[e.source,e.logIndex,e.time,e.name].join('|')));let n=0;evs.forEach(ev=>{const k=[ev.source,ev.logIndex,ev.time,ev.name].join('|');if(ex.has(k))return;tl.events.push(ev);ex.add(k);n++;});return n;}
  const baseSettings=settingsSpecific;
  settingsSpecific=function(mod){
    let html=baseSettings(mod);
    if(!mod||mod.type!=='log')return html;
    const add=`<div class="log-filter-tools-v35"><button id="logShowAllV35" class="tool-btn" type="button">Vis alle tags</button><button id="logHideAllV35" class="tool-btn" type="button">Skjul alle tags</button><div class="field wide" style="margin-bottom:0"><label>Søk i logg</label><input id="logSearchV35" value="${String(mod.logSearchV35||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}" placeholder="Søk etter tekst"></div><button id="logFilteredTimelineV35" class="tool-btn primary wide" type="button">Plasser filtrerte logger på tidslinjen</button></div>`;
    return html.replace('<div class="log-to-timeline-v29">',add+'<div class="log-to-timeline-v29">');
  };
  const baseRenderSelected=renderSelectedSettings;
  renderSelectedSettings=function(){
    baseRenderSelected(); let mod=null;try{mod=selected&&selected();}catch(e){} if(!mod||mod.type!=='log')return;
    document.getElementById('logShowAllV35')?.addEventListener('click',()=>{(mod.filters||[]).forEach(f=>f.enabled=true);save();renderAll();});
    document.getElementById('logHideAllV35')?.addEventListener('click',()=>{(mod.filters||[]).forEach(f=>f.enabled=false);save();renderAll();});
    document.getElementById('logSearchV35')?.addEventListener('input',e=>{mod.logSearchV35=e.target.value;save();renderAll();});
    document.getElementById('logFilteredTimelineV35')?.addEventListener('click',()=>{const tls=(activeView().modules||[]).filter(m=>m.type==='timeline');const target=tls.find(t=>t.id===(mod.logTimelineTargetId||document.querySelector('[id^="logTimelineTarget"]')?.value))||tls[0];const n=addFilteredToTimeline(mod,target); if(target&&n){autoFitTimeline(target);save();renderAll();} setTimeout(()=>alert(n?`La til ${n} filtrerte logghendelse${n===1?'':'r'} på tidslinjen.`:'Fant ingen nye filtrerte logghendelser med Received DTG.'),0);});
  };
  try{renderAll();}catch(e){console.error('workflow v35 failed',e);}
})();



(function(){
  "use strict";
  const PATCH_VERSION="statusboard-final-request-2026-06-05";
  const $=id=>document.getElementById(id);
  const esc=v=>(typeof escapeHTML==='function'?escapeHTML(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])));
  const cloneSafe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}};
  function ensureRepository(){
    if(!state.repository)state.repository={};
    if(!Array.isArray(state.repository.personell)){
      let base=[];try{base=(Array.isArray(PERSONELL_DATA)?PERSONELL_DATA:[]).map(p=>({function:p.function||'',functionNo:p.functionNo||'',name:p.name||'',personalNo:p.personalNo||'',phone:p.phone||''}));}catch(e){}
      state.repository.personell=base.length?base:[{function:'Leder',functionNo:'10',name:'Ola Nordmann',personalNo:'01',phone:''}];
    }
    if(!Array.isArray(state.repository.personellLocations)){
      let loc=[];try{loc=Array.isArray(PERSONELL_LOCATIONS)?PERSONELL_LOCATIONS:[];}catch(e){}
      state.repository.personellLocations=loc.length?loc:['UTE','Trening','Hvilerom','Kantinen'];
    }
    if(!Array.isArray(state.repository.logTags))state.repository.logTags=['Title','Received DTG','Recieved DTG','Receiced DTG','Summary','From'];
    if(!Array.isArray(state.repository.timelineLogTags))state.repository.timelineLogTags=['Title','Received DTG','Recieved DTG','Receiced DTG'];
    if(!Array.isArray(state.repository.alertLevels))state.repository.alertLevels=[
      {key:'normal',label:'NORMAL',text:'#34d399',bg:'#052e1e'},
      {key:'warning',label:'WARNING',text:'#fbbf24',bg:'#422006'},
      {key:'danger',label:'DANGER',text:'#fb7185',bg:'#450a0a'}
    ];
    if(!state.design)state.design={};
    state.design.fontFamily=state.design.fontFamily||'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    state.design.background1=state.design.background1||'#334155';state.design.background2=state.design.background2||'#0f172a';state.design.background3=state.design.background3||'#020617';
    state.design.boardInset=Number.isFinite(+state.design.boardInset)?+state.design.boardInset:0;
    state.design.madeByText=state.design.madeByText||'laget av';
    if(!state.design.moduleColors)state.design.moduleColors={};
    state.currentAdminMenu=state.currentAdminMenu||'admin';
  }
  function applyDesign(){
    ensureRepository();
    const root=document.documentElement;
    root.style.setProperty('--statusboard-font',state.design.fontFamily);
    root.style.setProperty('--bg1',state.design.background1);root.style.setProperty('--bg2',state.design.background2);root.style.setProperty('--bg3',state.design.background3);
    root.style.setProperty('--statusboard-madeby',JSON.stringify(state.design.madeByText||'laget av'));
    const shell=document.querySelector('.status-shell');if(shell)shell.style.inset=(Number(state.design.boardInset)||0)+'px';
  }
  function moduleColorFor(mod){ensureRepository();return (state.design.moduleColors&&state.design.moduleColors[mod.type])||{};}
  function moduleInlineStyle(mod){const c=moduleColorFor(mod);let s=''; if(c.bg)s+='--module-bg:'+c.bg+';'; if(c.contentBg)s+='--module-content-bg:'+c.contentBg+';'; if(c.border)s+='--module-border:'+c.border+';'; if(c.title)s+='--module-title-color:'+c.title+';'; return s;}

  ensureRepository();
  try{if(moduleDefs&&moduleDefs.json)delete moduleDefs.json;}catch(e){}

  const oldRenderPalette=renderPalette;
  renderPalette=function(){oldRenderPalette();document.querySelectorAll('.module-card[data-type="json"]').forEach(x=>x.remove());};

  const oldBuildModule=buildModule;
  buildModule=function(mod){const el=oldBuildModule(mod);try{el.setAttribute('style',(el.getAttribute('style')||'')+';'+moduleInlineStyle(mod));}catch(e){}return el;};

  const oldAddModule=addModule;
  addModule=function(type,clientX,clientY){
    if(type==='json')type='table';
    oldAddModule(type,clientX,clientY);
    const mod=selected&&selected();
    if(mod&&mod.type==='timeline'){mod.periods=[];mod.events=[];if(!mod.timelineDensity)mod.timelineDensity='hour';save();renderAll();}
  };

  const oldNormalizeMod=normalizeMod;
  normalizeMod=function(mod){oldNormalizeMod(mod);if(mod&&mod.type==='timeline'){if(!Array.isArray(mod.periods))mod.periods=[];if(!Array.isArray(mod.events))mod.events=[];mod.timelineDensity=mod.timelineDensity||'hour';}if(mod&&mod.type==='alert'){mod.level=mod.level||'normal';}if(mod&&mod.type==='table'){if(!mod.colWidths)mod.colWidths={};if(!mod.rowHeights)mod.rowHeights={};}};

  function renderMenuSwitch(){return `<div class="admin-menu-switch"><button id="menuAdminFinal" class="tool-btn ${state.currentAdminMenu==='admin'?'active':''}" type="button">Admin</button><button id="menuDesignFinal" class="tool-btn ${state.currentAdminMenu==='design'?'active':''}" type="button">Design</button><button id="menuRepoFinal" class="tool-btn ${state.currentAdminMenu==='repository'?'active':''}" type="button">Repository</button></div>`;}
  function bindMenuSwitch(){[['menuAdminFinal','admin'],['menuDesignFinal','design'],['menuRepoFinal','repository']].forEach(([id,v])=>$(id)?.addEventListener('click',()=>{state.currentAdminMenu=v;renderAll();}));}
  function renderDesignMenu(){
    ensureRepository();
    const types=Object.keys(moduleDefs||{}).filter(t=>t!=='json');
    const cards=types.map(t=>{const c=state.design.moduleColors[t]||{};return `<div class="design-card" data-design-type="${esc(t)}"><strong>${esc(moduleDefs[t]?.label||t)}</strong><div class="grid2" style="margin-top:8px"><div class="field"><label>Modul</label><input class="design-mod-bg" type="color" value="${esc(c.bg||'#020617')}"></div><div class="field"><label>Innhold</label><input class="design-mod-content" type="color" value="${esc(c.contentBg||'#111827')}"></div><div class="field"><label>Kant</label><input class="design-mod-border" type="color" value="${esc(c.border||'#334155')}"></div><div class="field"><label>Tittel</label><input class="design-mod-title" type="color" value="${esc(c.title||'#f8fafc')}"></div></div><button class="tool-btn danger design-clear-type" type="button">Nullstill denne typen</button></div>`;}).join('');
    return `${renderMenuSwitch()}<section class="section"><div class="section-title"><h2>Design</h2></div><div class="field"><label>Bakgrunn 1</label><input id="designBg1" type="color" value="${esc(state.design.background1)}"></div><div class="field"><label>Bakgrunn 2</label><input id="designBg2" type="color" value="${esc(state.design.background2)}"></div><div class="field"><label>Bakgrunn 3</label><input id="designBg3" type="color" value="${esc(state.design.background3)}"></div><div class="field"><label>Font fra PC-en</label><input id="designFont" value="${esc(state.design.fontFamily)}" placeholder="Arial, Aptos, Calibri, Inter..."></div><div class="field"><label>Board kantmarg</label><input id="designInset" type="range" min="0" max="30" step="1" value="${Number(state.design.boardInset)||0}"></div><div class="field"><label>Bakgrunnstekst venstre hjørne</label><input id="designMadeBy" value="${esc(state.design.madeByText||'laget av')}"></div><button id="designResetFinal" class="tool-btn danger" type="button">Nullstill design</button></section><section class="section"><div class="section-title"><h2>Modulfarger</h2></div><p class="small">Endrer farger for hele modultyper. Gjelder alle moduler av samme type.</p>${cards}</section>`;
  }
  function bindDesignMenu(){
    const map=[['designBg1','background1'],['designBg2','background2'],['designBg3','background3'],['designFont','fontFamily'],['designInset','boardInset'],['designMadeBy','madeByText']];
    map.forEach(([id,key])=>$(id)?.addEventListener('input',e=>{state.design[key]=key==='boardInset'?Number(e.target.value):e.target.value;applyDesign();save();if(key!=='fontFamily')renderBoard();}));
    document.querySelectorAll('[data-design-type]').forEach(card=>{const t=card.dataset.designType;const update=()=>{state.design.moduleColors[t]={bg:card.querySelector('.design-mod-bg').value,contentBg:card.querySelector('.design-mod-content').value,border:card.querySelector('.design-mod-border').value,title:card.querySelector('.design-mod-title').value};save();renderBoard();};card.querySelectorAll('input').forEach(i=>i.addEventListener('input',update));card.querySelector('.design-clear-type')?.addEventListener('click',()=>{delete state.design.moduleColors[t];save();renderAll();});});
    $('designResetFinal')?.addEventListener('click',()=>{if(!confirm('Nullstille designfarger og font?'))return;delete state.design;ensureRepository();save();renderAll();});
  }
  function renderRepositoryMenu(){
    ensureRepository();
    const pRows=state.repository.personell.map((p,i)=>`<div class="repo-row" data-person-row="${i}"><input class="repo-func" placeholder="Funksjon" value="${esc(p.function)}"><input class="repo-name" placeholder="Navn" value="${esc(p.name)}"><input class="repo-phone" placeholder="Tlf eller funksjon+person" value="${esc(p.phone||((p.functionNo||'')+(p.personalNo||'')))}"><button class="mini-btn danger repo-del-person" type="button">×</button></div>`).join('');
    const aRows=state.repository.alertLevels.map((a,i)=>`<div class="repo-row alert" data-alert-row="${i}"><input class="repo-alert-key" placeholder="key" value="${esc(a.key)}"><input class="repo-alert-label" placeholder="Tekst" value="${esc(a.label)}"><input class="repo-alert-text" type="color" value="${esc(a.text||'#ffffff')}"><input class="repo-alert-bg" type="color" value="${esc(a.bg||'#000000')}"><button class="mini-btn danger repo-del-alert" type="button">×</button></div>`).join('');
    return `${renderMenuSwitch()}<section class="section"><div class="section-title"><h2>Repository: personell</h2><button id="repoAddPerson" class="mini-btn" type="button">+</button></div><p class="small">Telefon kan skrives direkte, eller bygges fra funksjonsnummer + personnummer i gammel struktur.</p>${pRows||'<p class="small">Ingen personell.</p>'}<div class="field"><label>Lokasjoner / dropdown</label><textarea id="repoLocations">${esc((state.repository.personellLocations||[]).join('\n'))}</textarea></div></section><section class="section"><div class="section-title"><h2>Repository: log</h2></div><div class="field"><label>Log line tags som skal kunne vises/filtreres</label><textarea id="repoLogTags">${esc((state.repository.logTags||[]).join('\n'))}</textarea></div><div class="field"><label>Tags som skal kunne sendes til tidslinje</label><textarea id="repoTimelineTags">${esc((state.repository.timelineLogTags||[]).join('\n'))}</textarea></div></section><section class="section"><div class="section-title"><h2>Repository: alert nivåer</h2><button id="repoAddAlert" class="mini-btn" type="button">+</button></div>${aRows}</section>`;
  }
  function bindRepositoryMenu(){
    function saveRepoFromDOM(){state.repository.personell=[...document.querySelectorAll('[data-person-row]')].map(row=>({function:row.querySelector('.repo-func').value.trim(),name:row.querySelector('.repo-name').value.trim(),phone:row.querySelector('.repo-phone').value.trim(),functionNo:'',personalNo:''})).filter(p=>p.function||p.name||p.phone);state.repository.personellLocations=($('repoLocations')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.logTags=($('repoLogTags')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.timelineLogTags=($('repoTimelineTags')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);state.repository.alertLevels=[...document.querySelectorAll('[data-alert-row]')].map(row=>({key:row.querySelector('.repo-alert-key').value.trim()||'level',label:row.querySelector('.repo-alert-label').value.trim()||'ALERT',text:row.querySelector('.repo-alert-text').value,bg:row.querySelector('.repo-alert-bg').value}));save();renderBoard();}
    document.querySelectorAll('.admin-body input,.admin-body textarea').forEach(el=>el.addEventListener('input',saveRepoFromDOM));
    document.querySelectorAll('.repo-del-person').forEach(btn=>btn.addEventListener('click',()=>{btn.closest('[data-person-row]')?.remove();saveRepoFromDOM();}));
    document.querySelectorAll('.repo-del-alert').forEach(btn=>btn.addEventListener('click',()=>{btn.closest('[data-alert-row]')?.remove();saveRepoFromDOM();}));
    $('repoAddPerson')?.addEventListener('click',()=>{saveRepoFromDOM();state.repository.personell.push({function:'',name:'',phone:''});save();renderAll();});
    $('repoAddAlert')?.addEventListener('click',()=>{saveRepoFromDOM();state.repository.alertLevels.push({key:'info',label:'INFO',text:'#7dd3fc',bg:'#082f49'});save();renderAll();});
  }
  function updateAdminMenu(){
    ensureRepository();applyDesign();
    const title=document.querySelector('.admin-head h1'),sub=document.querySelector('.admin-head p'),body=document.querySelector('.admin-body');
    if(title)title.textContent=state.currentAdminMenu==='design'?'Design':state.currentAdminMenu==='repository'?'Repository':'Admin';
    if(sub)sub.textContent=state.currentAdminMenu==='design'?'Farger, bakgrunn og font.':state.currentAdminMenu==='repository'?'Data som brukes av moduler.':'Alle kontroller er samlet her.';
    if(!body)return;
    if(state.currentAdminMenu==='design'){body.innerHTML=renderDesignMenu();bindMenuSwitch();bindDesignMenu();}
    else if(state.currentAdminMenu==='repository'){body.innerHTML=renderRepositoryMenu();bindMenuSwitch();bindRepositoryMenu();}
    else { if(!body.querySelector('.admin-menu-switch')){body.insertAdjacentHTML('afterbegin',renderMenuSwitch());bindMenuSwitch();} }
  }
  const oldRenderAll=renderAll;
  renderAll=function(){ensureRepository();oldRenderAll();updateAdminMenu();};

  els.displayMode.onclick=()=>{state.editMode=!state.editMode;if(state.editMode){state.adminHidden=true;}else{state.adminHidden=true;state.selectedId=null;state.selectedCell=null;state.selectedCells=[];}renderAll();};
  els.adminButton.onclick=()=>{if(!state.adminUnlocked){openAdminLogin();return;} if(!state.editMode){state.editMode=true;state.adminHidden=false;state.currentAdminMenu='admin';renderAll();return;} if(state.adminHidden){state.adminHidden=false;renderAll();return;} state.currentAdminMenu=state.currentAdminMenu==='admin'?'design':state.currentAdminMenu==='design'?'repository':'admin';renderAll();};

  const oldCreateExportState=createExportState;
  createExportState=function(){ensureRepository();const exported=(typeof oldCreateExportState==='function'?oldCreateExportState():cloneSafe(state));exported.repository=cloneSafe(state.repository);exported.design=cloneSafe(state.design);exported.exportVersion=PATCH_VERSION;exported.exportedAt=new Date().toISOString();return exported;};

  function repoPersonell(){ensureRepository();return state.repository.personell||[];}
  function repoPhone(func,name){const p=repoPersonell().find(x=>x.function===func&&x.name===name);return p?(p.phone||((p.functionNo||'')+(p.personalNo||''))):'';}
  personellPhone=function(func,name){return repoPhone(func,name);};
  personellHTML=function(mod){ensureRepository();if(!Array.isArray(mod.rows))mod.rows=[];const data=repoPersonell();const funcs=[...new Set(data.map(p=>p.function).filter(Boolean))];const listId='personell-location-list-'+mod.id;const locOpts=(state.repository.personellLocations||[]).map(loc=>`<option value="${esc(loc)}"></option>`).join('');const rows=mod.rows.map((row,i)=>{row.function=row.function||'';row.name=row.name||'';row.location=row.location||'';const names=data.filter(p=>!row.function||p.function===row.function).map(p=>p.name).filter(Boolean);const sizes=personellTextSizes(mod);return `<tr><td style="font-size:${Number(sizes.function)||1}em"><select class="person-function" data-row="${i}"><option value="">Blank / alle</option>${funcs.map(f=>`<option value="${esc(f)}" ${f===row.function?'selected':''}>${esc(f)}</option>`).join('')}</select></td><td style="font-size:${Number(sizes.name)||1}em"><select class="person-name" data-row="${i}"><option value="">Blank / alle navn</option>${names.map(n=>`<option value="${esc(n)}" ${n===row.name?'selected':''}>${esc(n)}</option>`).join('')}</select></td><td style="font-size:${Number(sizes.location)||1}em"><input class="person-location" list="${esc(listId)}" data-row="${i}" value="${esc(row.location)}" placeholder="Blank / lokasjon"></td><td style="font-size:${Number(sizes.phone)||1}em">${esc(repoPhone(row.function,row.name))}</td></tr>`;}).join('');return `<div class="content"><table class="personell-table"><tbody>${rows}</tbody></table><datalist id="${esc(listId)}">${locOpts}</datalist>${state.editMode?`<button class="tool-btn person-add" style="margin-top:10px">+ Personellrad</button>`:''}</div>`;};

  const oldSettingsSpecific=settingsSpecific;
  settingsSpecific=function(mod){
    if(mod&&mod.type==='alert'){ensureRepository();const opts=state.repository.alertLevels.map(a=>`<option value="${esc(a.key)}" ${mod.level===a.key?'selected':''}>${esc(a.label||a.key)}</option>`).join('');return `<div class="field"><label>Nivå fra repository</label><select id="alertLevel">${opts}</select></div>`;}
    if(mod&&mod.type==='timeline'){let html=oldSettingsSpecific(mod);html=html.replace(/<label>Tidsformat<\/label>[\s\S]*?<\/select>/,'<label>Visning</label><select id="timelineDensityFinal"><option value="hour" '+((mod.timelineDensity||'hour')==='hour'?'selected':'')+'>Hele timer</option><option value="half" '+(mod.timelineDensity==='half'?'selected':'')+'>Timer og halvtimer</option><option value="quarter" '+(mod.timelineDensity==='quarter'?'selected':'')+'>Timer, halvtimer og kvarter</option></select>');html=html.replace(/<p class="small">Neste dag[\s\S]*?<\/p>/,'<p class="small">Tidslinjen viser dato og klokkeslett. Perioder ligger under den hvite linjen, og NÅ markeres tydelig.</p>');return html;}
    if(mod&&mod.type==='log'){let html=oldSettingsSpecific(mod);ensureRepository();html+=`<div class="design-card"><strong>Repository-filter</strong><p class="small">Disse ordene kommer fra Repository → Log.</p><div class="field"><label>Vis bare tags</label><select id="logRepoVisibleTags" multiple size="${Math.min(8,Math.max(3,state.repository.logTags.length))}">${state.repository.logTags.map(t=>`<option value="${esc(t)}" ${(mod.repoVisibleTags||[]).includes(t)?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div class="field"><label>Send disse til tidslinje</label><select id="logRepoTimelineTags" multiple size="${Math.min(8,Math.max(3,state.repository.timelineLogTags.length))}">${state.repository.timelineLogTags.map(t=>`<option value="${esc(t)}" ${(mod.repoTimelineTags||[]).includes(t)?'selected':''}>${esc(t)}</option>`).join('')}</select></div></div>`;return html;}
    return oldSettingsSpecific(mod);
  };

  const oldAlertHTML=alertHTML;
  alertHTML=function(mod){ensureRepository();const lvl=state.repository.alertLevels.find(a=>a.key===mod.level)||state.repository.alertLevels[0];const text=mod.message||lvl?.label||'';return `<div class="alert-box" style="background:${esc(lvl?.bg||'#052e1e')};color:${esc(lvl?.text||'#34d399')}" contenteditable="true" data-key-direct="message">${esc(text)}</div>`;};

  const oldRenderSelectedSettings=renderSelectedSettings;
  renderSelectedSettings=function(){oldRenderSelectedSettings();const mod=selected&&selected();if(!mod)return;if(mod.type==='timeline'){$('timelineDensityFinal')?.addEventListener('change',e=>{mod.timelineDensity=e.target.value;mod.timelineUnit='hour';mod.timelineTicks=e.target.value==='hour'?0:e.target.value==='half'?1:3;save();renderAll();});}if(mod.type==='log'){$('logRepoVisibleTags')?.addEventListener('change',e=>{mod.repoVisibleTags=[...e.target.selectedOptions].map(o=>o.value);save();renderAll();});$('logRepoTimelineTags')?.addEventListener('change',e=>{mod.repoTimelineTags=[...e.target.selectedOptions].map(o=>o.value);save();renderSelectedSettings();});}};

  const oldTableHTML=tableHTML;
  tableHTML=function(mod){normalizeMerges(mod);if(!mod.colWidths)mod.colWidths={};if(!mod.rowHeights)mod.rowHeights={};const rows=mod.rows||[];return `<div class="content table-modern-wrap" style="${typeof tableDensityVars==='function'?tableDensityVars(mod):''}"><table class="status-table-modern"><tbody>${rows.map((row,r)=>`<tr style="${mod.rowHeights[r]!=null?'height:'+Number(mod.rowHeights[r])+'px':''}">${row.map((cell,c)=>{if(isHiddenMergedCell(mod,r,c))return '';const raw=String(cell??'');const merge=getMergeAt(mod,r,c);const classes=[isSelectedCell(mod.id,r,c)?'cell-selected':'',isMultiSelectedCell(mod.id,r,c)?'cell-multi-selected':'',merge?'cell-merged':''].filter(Boolean).join(' ');const span=merge?`${merge.rowspan>1?` rowspan="${merge.rowspan}"`:''}${merge.colspan>1?` colspan="${merge.colspan}"`:''}`:'';const width=mod.colWidths[c]!=null?`width:${Number(mod.colWidths[c])}px;min-width:${Number(mod.colWidths[c])}px;`:'';return `<td data-row="${r}" data-col="${c}"${span} class="${classes}" style="${width}${cellStyleCSS(mod,r,c)}"><div class="cell-display">${formatTextHTML(raw)}</div><textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${esc(raw)}</textarea><span class="cell-col-resizer" data-col-resize="${c}"></span><span class="cell-row-resizer" data-row-resize="${r}"></span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;};

  function parseExcelHTML(html){const doc=new DOMParser().parseFromString(html,'text/html');const trs=[...doc.querySelectorAll('tr')];if(!trs.length)return null;return trs.map(tr=>[...tr.children].filter(td=>/^(TD|TH)$/.test(td.tagName)).map(td=>({text:td.innerText.replace(/\r/g,''),align:(td.style.textAlign||td.getAttribute('align')||'').toLowerCase(),bold:(td.style.fontWeight&&Number(td.style.fontWeight)>=600)||/bold/i.test(td.style.fontWeight||'')||!!td.querySelector('b,strong'),fontSize:parseFloat(td.style.fontSize)||null})));}
  function pasteExcelAt(mod,r,c,e){const html=e.clipboardData?.getData('text/html')||'';const parsed=html&&parseExcelHTML(html);const plain=e.clipboardData?.getData('text/plain')||'';let grid=parsed;if(!grid){grid=plain.split(/\r?\n/).filter((line,i,arr)=>line!==''||i<arr.length-1).map(line=>line.split('\t').map(text=>({text,align:'',bold:false,fontSize:null})));}if(!grid||!grid.length)return false;e.preventDefault();const needRows=r+grid.length;const needCols=c+Math.max(...grid.map(x=>x.length));while(mod.rows.length<needRows)mod.rows.push(Array(colCount(mod)).fill(''));mod.rows.forEach(row=>{while(row.length<needCols)row.push('');});grid.forEach((row,rr)=>row.forEach((cell,cc)=>{const tr=r+rr,tc=c+cc;mod.rows[tr][tc]=cell.text;if(cell.align||cell.bold||cell.fontSize){const st={...getCellStyle(mod,tr,tc)};if(cell.align)st.align=cell.align;if(cell.bold)st.bold=true;if(cell.fontSize)st.fontSize=cell.fontSize;setCellStyle(mod,tr,tc,st);}}));selectCellRange(mod.id,r,c,r+grid.length-1,c+Math.max(...grid.map(x=>x.length))-1);save();renderAll();return true;}
  const oldCellStyleCSS=cellStyleCSS;
  cellStyleCSS=function(mod,r,c){const st=getCellStyle(mod,r,c);let css=oldCellStyleCSS(mod,r,c)||'';if(st.bold)css+=';font-weight:700;--cell-weight:700';if(st.fontSize)css+=';font-size:'+Number(st.fontSize)+'px';return css;};

  function installTableContext(){let menu=$('tableContextMenuFinal');if(!menu){menu=document.createElement('div');menu.id='tableContextMenuFinal';menu.className='table-context-menu';document.body.appendChild(menu);}return menu;}
  function showTableMenu(e,mod,r,c){e.preventDefault();e.stopPropagation();if(!isMultiSelectedCell(mod.id,r,c))selectTableCell(mod.id,r,c,false);const menu=installTableContext();menu.innerHTML=`<button data-act="bold">Bold valgte celler</button><button data-act="insert-row">Sett inn rad under</button><button data-act="insert-col">Sett inn kolonne til høyre</button><button data-act="del-row" class="danger">Slett valgte rader</button><button data-act="del-col" class="danger">Slett valgte kolonner</button><button data-act="merge">Merge & center</button><button data-act="unmerge">Unmerge</button>`;menu.style.left=Math.min(e.clientX,innerWidth-240)+'px';menu.style.top=Math.min(e.clientY,innerHeight-260)+'px';menu.classList.add('show');menu.onclick=ev=>{const act=ev.target?.dataset?.act;if(!act)return;ev.stopPropagation();if(act==='bold'){selectedCellTargets().forEach(t=>{const m=getModule(t.moduleId);setCellStyle(m,t.row,t.col,{...getCellStyle(m,t.row,t.col),bold:true});});save();renderAll();}if(act==='insert-row'){insertRowAfterSelection(mod);}if(act==='insert-col'){insertColAfterSelection(mod);}if(act==='del-row'){deleteSelectedRows(mod);}if(act==='del-col'){deleteSelectedCols(mod);}if(act==='merge'){mergeCenterSelectedCells();}if(act==='unmerge'){unmergeSelectedCells();}};}
  function deleteSelectedRows(mod){const rows=[...new Set(selectedCellTargets().filter(t=>t.moduleId===mod.id).map(t=>t.row))].sort((a,b)=>b-a);rows.forEach(r=>{if(mod.rows.length>1)mod.rows.splice(r,1);});save();state.selectedCells=[];state.selectedCell=null;renderAll();}
  function deleteSelectedCols(mod){const cols=[...new Set(selectedCellTargets().filter(t=>t.moduleId===mod.id).map(t=>t.col))].sort((a,b)=>b-a);cols.forEach(c=>mod.rows.forEach(row=>{if(row.length>1)row.splice(c,1);}));save();state.selectedCells=[];state.selectedCell=null;renderAll();}
  document.addEventListener('click',e=>{if(!e.target.closest('#tableContextMenuFinal'))$('tableContextMenuFinal')?.classList.remove('show');});

  const oldWireEditable=wireEditable;
  wireEditable=function(el,mod){oldWireEditable(el,mod);if(mod.type!=='table')return;el.querySelectorAll('.cell-editor').forEach(input=>{input.addEventListener('paste',e=>{pasteExcelAt(mod,+input.dataset.row,+input.dataset.col,e);},{capture:true});input.addEventListener('keydown',e=>{const keys={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};if(!keys[e.key]||e.shiftKey||e.altKey||e.ctrlKey||e.metaKey)return;const pos=input.selectionStart,atStart=pos===0,atEnd=pos===input.value.length;if((e.key==='ArrowLeft'&&!atStart)||(e.key==='ArrowRight'&&!atEnd))return;e.preventDefault();const [dr,dc]=keys[e.key];const nr=Math.max(0,Math.min((mod.rows||[]).length-1,+input.dataset.row+dr));const nc=Math.max(0,Math.min(colCount(mod)-1,+input.dataset.col+dc));selectTableCell(mod.id,nr,nc,false);renderAll();setTimeout(()=>{const ni=document.querySelector(`.mod[data-id="${CSS.escape(mod.id)}"] .cell-editor[data-row="${nr}"][data-col="${nc}"]`);ni?.focus();},0);});});el.querySelectorAll('td').forEach(td=>{td.addEventListener('contextmenu',e=>showTableMenu(e,mod,+td.dataset.row,+td.dataset.col));});el.querySelectorAll('[data-col-resize]').forEach(h=>h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const c=+h.dataset.colResize,start=e.clientX,startW=Number(mod.colWidths[c]||h.closest('td').getBoundingClientRect().width||90);const move=ev=>{mod.colWidths[c]=Math.max(38,startW+ev.clientX-start);renderBoard();};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);save();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}));el.querySelectorAll('[data-row-resize]').forEach(h=>h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=+h.dataset.row,start=e.clientY,startH=Number(mod.rowHeights[r]||h.closest('tr').getBoundingClientRect().height||42);const move=ev=>{mod.rowHeights[r]=Math.max(24,startH+ev.clientY-start);renderBoard();};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);save();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}));};

  const oldShowWordDropdown=typeof showWordDropdown==='function'?showWordDropdown:null;
  if(oldShowWordDropdown){showWordDropdown=function(input,mod,r,c){oldShowWordDropdown(input,mod,r,c);setTimeout(()=>{document.querySelectorAll('#wordDropdown button,.word-dropdown button').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{try{hideWordDropdown();}catch(e){}},0),{once:true}));},0);};}

  function fmtTickFinal(d,density){const dt=new Date(d);return dt.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});}
  const oldTimelineHTML=timelineHTML;
  timelineHTML=function(mod){let html=oldTimelineHTML(mod);try{const min=new Date(mod.start).getTime(),max=Math.max(new Date(mod.end).getTime(),min+60000),now=Date.now();let nowLine='';if(now>=min&&now<=max){nowLine=`<div class="timeline-now-line-final" style="left:${((now-min)/(max-min))*100}%"></div>`;}html=html.replace('</div><div class="timeline-scale',nowLine+'</div><div class="timeline-scale');}catch(e){}return html;};

  function refreshNowLines(){document.querySelectorAll('.mod[data-type="timeline"]').forEach(el=>{const mod=getModule(el.dataset.id);if(!mod)return;const stage=el.querySelector('.timeline-stage,[data-timeline-track],.timeline-lane');if(!stage)return;stage.querySelectorAll('.timeline-now-line-final').forEach(x=>x.remove());const min=new Date(mod.start).getTime(),max=Math.max(new Date(mod.end).getTime(),min+60000),now=Date.now();if(now>=min&&now<=max){const line=document.createElement('div');line.className='timeline-now-line-final';line.style.left=((now-min)/(max-min))*100+'%';stage.appendChild(line);}});}setInterval(refreshNowLines,30000);

  const oldLogHTML=typeof logHTML33==='function'?logHTML33:(typeof logHTML31==='function'?logHTML31:null);
  function filterLogHTMLByRepo(html,mod){if(!mod.repoVisibleTags||!mod.repoVisibleTags.length)return html;const allowed=new Set(mod.repoVisibleTags.map(x=>String(x).toLowerCase()));const wrap=document.createElement('div');wrap.innerHTML=html;wrap.querySelectorAll('.log-line').forEach(line=>{const tag=(line.querySelector('.log-line-tag')?.textContent||'').trim().toLowerCase();if(tag&&!allowed.has(tag))line.remove();});return wrap.innerHTML;}
  if(oldLogHTML){window.logHTML33=function(mod){return filterLogHTMLByRepo(oldLogHTML(mod),mod);};}

  els.exportBtn.onclick=async()=>{persistSelectedCellSettings(false);ensureRepository();const text=JSON.stringify(createExportState(),null,2);downloadText('statusboard-dashboard-complete.json',text);try{await navigator.clipboard.writeText(text);}catch(e){}alert('Komplett JSON eksportert: views, moduler, design, repository, celleformat, ordlister, logg og bilder.');};
  els.loadImport.onclick=()=>{try{const imported=JSON.parse(els.importText.value);if(!imported.views||!Array.isArray(imported.views))throw new Error('Mangler views');state={...state,...imported,adminUnlocked:true,editMode:true,adminHidden:false};ensureRepository();els.importModal.classList.remove('show');renderAll();}catch(err){alert('Ugyldig JSON: '+(err.message||err));}};

  try{renderAll();}catch(e){console.error('Final requested Statusboard patch failed',e);} 
})();



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



(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dms=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:Date.now();};
  function norm(mod){
    if(!mod.start)mod.start=new Date(Date.now()-60*60*1000).toISOString();
    if(!mod.end)mod.end=new Date(Date.now()+3*60*60*1000).toISOString();
    if(!Array.isArray(mod.periods))mod.periods=[];
    if(!Array.isArray(mod.events))mod.events=[];
    // Support old and new property names, but use timelineUnit/timelineTicks as source of truth from now on.
    if(!mod.timelineUnit)mod.timelineUnit=mod.timeUnit||'hour';
    if(mod.timelineTicks==null)mod.timelineTicks=(mod.tickCount!=null?Number(mod.tickCount):6);
    mod.timeUnit=mod.timelineUnit;
    mod.tickCount=mod.timelineTicks;
  }
  function fmt(value,unit,withDate){
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
    if(unit==='date')return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'});
    if(unit==='minute')return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
    if(withDate)return d.toLocaleString('no-NO',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }
  function rgba(hex,opacity){
    try{hex=String(hex||'#60a5fa').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;}catch(e){return `rgba(96,165,250,${opacity})`;}
  }
  function midnightMarkers(min,max,pos){
    const markers=[];
    const first=new Date(min);first.setHours(24,0,0,0);
    for(let t=first.getTime();t<max;t+=24*60*60*1000){
      const d=new Date(t);
      markers.push(`<div class="timeline-nextday-v27" style="left:${pos(t)}%"><span>Neste dag ${esc(d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'}))}</span></div>`);
    }
    return markers.join('');
  }
  window.timelineHTML=function(mod){
    norm(mod);
    const min=dms(mod.start),max=Math.max(dms(mod.end),min+60000),unit=mod.timelineUnit||'hour';
    const pos=v=>clamp(((dms(v)-min)/(max-min))*100,0,100);
    const placing=(window.__timelinePlace&&window.__timelinePlace.moduleId===mod.id)||(window.__timelinePlaceTarget&&window.__timelinePlaceTarget.modId===mod.id);
    const between=clamp(Number(mod.timelineTicks??6)||0,0,50);
    const ticks=Array.from({length:between+2},(_,i)=>{
      const pct=(i/(between+1))*100;
      const t=new Date(min+(max-min)*(i/(between+1)));
      const showDate=(i>0&&i<between+1&&new Date(min).getDate()!==t.getDate());
      return `<div class="timeline-tick v14 v27" style="left:${pct}%"></div><div class="timeline-tick-label v14 v27" style="left:${pct}%">${esc(fmt(t,unit,showDate))}</div>`;
    }).join('');
    const nextDays=midnightMarkers(min,max,pos);
    const periods=(mod.periods||[]).map(p=>{
      const left=pos(p.start),right=pos(p.end),w=Math.max(1,right-left);
      return `<div class="timeline-period-v14 v27" style="left:${left}%;width:${w}%;background:${rgba(p.color||'#60a5fa',p.opacity??0.55)}"><span>${esc(p.name||'')}</span></div>`;
    }).join('');
    const buckets=new Map();
    (mod.events||[]).forEach(ev=>{const key=String(Math.round(dms(ev.time||ev.start||mod.start)/60000));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ev);});
    const groups=[...buckets.values()].map(events=>({events,time:new Date(dms(events[0].time||events[0].start||mod.start)),color:events[0].color||'#f8fafc'})).sort((a,b)=>a.time-b.time);
    const rendered=groups.map(g=>{
      const names=g.events.map(ev=>`<div class="ev-name">${esc(ev.name||'Hendelse')}</div>`).join('');
      const extra=Math.max(0,g.events.length-1);
      const connector=46+(extra*13);
      return `<div class="timeline-event-group-v19 v27" style="left:${pos(g.time)}%;--connector-height:${connector}px;color:${esc(g.color||'#f8fafc')}" title="${esc(fmt(g.time,'hour',true))}"><div class="ev-card"><div class="ev-time">${esc(fmt(g.time,unit==='date'?'date':'hour',unit!=='date'))}</div><div class="ev-names">${names}</div></div><div class="ev-connector"></div></div>`;
    }).join('');
    return `<div class="content timeline-content-v14 timeline-content-v27"><div class="timeline-wrap v14 v27"><div class="timeline-stage v14 v27 ${placing?'placing':''}" data-timeline-track="1"><div class="timeline-line v14 v27"></div>${periods}${nextDays}${ticks}${rendered}</div><div class="timeline-scale v14 v27"><span>${esc(fmt(mod.start,unit,true))}</span><span>${esc(fmt(mod.end,unit,true))}</span></div>${placing?'<div class="timeline-place-help v14 v27"><strong>⏱</strong><span>Klikk på tidslinjen der hendelsen skal plasseres.</span></div>':''}</div></div>`;
  };
  function pctToTime(mod,pct){const min=dms(mod.start),max=Math.max(dms(mod.end),min+60000);return new Date(min+(max-min)*clamp(pct,0,1)).toISOString();}
  const prevWire=wireModule;
  wireModule=function(el,mod){
    prevWire(el,mod);
    if(!mod||mod.type!=='timeline')return;
    const stage=el.querySelector('.timeline-stage.v27,[data-timeline-track]');
    if(!stage)return;
    const place=e=>{
      const placing=window.__timelinePlace;
      const placing2=window.__timelinePlaceTarget;
      const active=(placing&&placing.moduleId===mod.id)||(placing2&&placing2.modId===mod.id);
      if(!active)return;
      e.preventDefault();e.stopPropagation();
      const rect=stage.getBoundingClientRect();
      const pct=(e.clientX-rect.left)/Math.max(1,rect.width);
      const time=pctToTime(mod,pct);
      if(!Array.isArray(mod.events))mod.events=[];
      if(placing&&placing.index>=0&&mod.events[placing.index])mod.events[placing.index].time=time;
      else mod.events.push({name:'Hendelse',time,color:'#f8fafc'});
      mod.timelineOpenSection='events';
      window.__timelinePlace=null;window.__timelinePlaceTarget=null;
      save();renderAll();
    };
    stage.addEventListener('pointerdown',place,true);
    stage.addEventListener('click',place,true);
  };
  function timelineAdminV27(mod){
    norm(mod);
    const unit=mod.timelineUnit||'hour';
    const periods=(mod.periods||[]).map((p,i)=>`<div class="timeline-admin-card v27" data-tl-period="${i}"><div class="grid-mini"><div class="field"><label>Start</label><input class="tlp-start-v27" type="datetime-local" value="${toDateTimeLocal(p.start)}"></div><div class="field"><label>Slutt</label><input class="tlp-end-v27" type="datetime-local" value="${toDateTimeLocal(p.end)}"></div></div><div class="field"><label>Navn</label><input class="tlp-name-v27" value="${esc(p.name||'Periode')}"></div><div class="grid-mini"><div class="field"><label>Farge</label><input class="tlp-color-v27" type="color" value="${esc(p.color||'#60a5fa')}"></div><div class="field"><label>Opacity</label><input class="tlp-opacity-v27" type="range" min="0.1" max="1" step="0.05" value="${p.opacity??0.55}"></div></div><button class="tool-btn danger tlp-remove-v27" type="button">Slett periode</button></div>`).join('');
    const events=(mod.events||[]).map((ev,i)=>`<div class="timeline-admin-card v27" data-tl-event="${i}"><div class="field"><label>Tekst</label><input class="tle-name-v27" value="${esc(ev.name||'Hendelse')}"></div><div class="grid-mini"><div class="field"><label>Tid</label><input class="tle-time-v27" type="datetime-local" value="${toDateTimeLocal(ev.time||ev.start||mod.start)}"></div><div class="field"><label>Farge</label><input class="tle-color-v27" type="color" value="${esc(ev.color||'#f8fafc')}"></div></div><div class="row"><button class="tool-btn primary tle-place-v27" type="button">⏱ Plasser på linjen</button><button class="tool-btn danger tle-remove-v27" type="button">Slett</button></div></div>`).join('');
    return `<div class="timeline-admin-compact v27"><div class="timeline-main-grid"><div class="field"><label>Start</label><input id="timelineStartV27" type="datetime-local" value="${toDateTimeLocal(mod.start)}"></div><div class="field"><label>Slutt</label><input id="timelineEndV27" type="datetime-local" value="${toDateTimeLocal(mod.end)}"></div></div><div class="timeline-small-grid"><div class="field"><label>Tidsformat</label><select id="timelineUnitV27"><option value="date" ${unit==='date'?'selected':''}>Dato</option><option value="hour" ${unit==='hour'?'selected':''}>Timer</option><option value="minute" ${unit==='minute'?'selected':''}>Minutter</option></select></div><div class="field"><label>Streker mellom start/slutt</label><input id="timelineTicksV27" type="number" min="0" max="50" value="${Number(mod.timelineTicks??6)}"></div></div><p class="small">Neste dag vises automatisk på linjen når perioden går over midnatt.</p><details class="timeline-details" ${mod.timelineOpenSection==='periods'?'open':''}><summary>Perioder (${mod.periods.length})</summary><div class="timeline-detail-body"><button id="timelineAddPeriodV27" class="tool-btn" type="button">+ Legg til periode</button>${periods||'<p class="small">Ingen perioder.</p>'}</div></details><details class="timeline-details" ${mod.timelineOpenSection==='events'?'open':''}><summary>Hendelser (${mod.events.length})</summary><div class="timeline-detail-body"><button id="timelineAddEventV27" class="tool-btn primary" type="button">⏱ Ny hendelse på tidslinjen</button>${events||'<p class="small">Ingen hendelser.</p>'}</div></details></div>`;
  }
  const prevSettings=settingsSpecific;
  settingsSpecific=function(mod){if(mod&&mod.type==='timeline')return timelineAdminV27(mod);return prevSettings(mod);};
  function readAdmin(mod){
    const s=document.getElementById('timelineStartV27'),e=document.getElementById('timelineEndV27'),u=document.getElementById('timelineUnitV27'),t=document.getElementById('timelineTicksV27');
    if(s)mod.start=fromDateTimeLocal(s.value);if(e)mod.end=fromDateTimeLocal(e.value);if(u){mod.timelineUnit=u.value;mod.timeUnit=u.value;}if(t){mod.timelineTicks=clamp(Number(t.value)||0,0,50);mod.tickCount=mod.timelineTicks;}
    document.querySelectorAll('[data-tl-period]').forEach(row=>{const i=+row.dataset.tlPeriod,p=mod.periods[i];if(!p)return;p.start=fromDateTimeLocal(row.querySelector('.tlp-start-v27')?.value);p.end=fromDateTimeLocal(row.querySelector('.tlp-end-v27')?.value);p.name=row.querySelector('.tlp-name-v27')?.value||'';p.color=row.querySelector('.tlp-color-v27')?.value||'#60a5fa';p.opacity=Number(row.querySelector('.tlp-opacity-v27')?.value||0.55);});
    document.querySelectorAll('[data-tl-event]').forEach(row=>{const i=+row.dataset.tlEvent,ev=mod.events[i];if(!ev)return;ev.name=row.querySelector('.tle-name-v27')?.value||'Hendelse';ev.time=fromDateTimeLocal(row.querySelector('.tle-time-v27')?.value);ev.color=row.querySelector('.tle-color-v27')?.value||'#f8fafc';});
  }
  const prevRender=renderSelectedSettings;
  renderSelectedSettings=function(){
    prevRender();
    const mod=selected&&selected();if(!mod||mod.type!=='timeline')return;
    const commit=()=>{readAdmin(mod);save();renderBoard();renderSelectedSettings();};
    ['timelineStartV27','timelineEndV27','timelineUnitV27','timelineTicksV27'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',commit);});
    document.querySelectorAll('[data-tl-period] input,[data-tl-event] input').forEach(el=>el.addEventListener('change',commit));
    document.getElementById('timelineAddPeriodV27')?.addEventListener('click',()=>{readAdmin(mod);mod.timelineOpenSection='periods';mod.periods.push({name:'Periode',start:mod.start,end:mod.end,color:'#60a5fa',opacity:.55});save();renderAll();});
    document.getElementById('timelineAddEventV27')?.addEventListener('click',()=>{readAdmin(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:-1};save();renderAll();});
    document.querySelectorAll('.tlp-remove-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-period]');readAdmin(mod);mod.periods.splice(+row.dataset.tlPeriod,1);save();renderAll();}));
    document.querySelectorAll('.tle-remove-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-event]');readAdmin(mod);mod.events.splice(+row.dataset.tlEvent,1);save();renderAll();}));
    document.querySelectorAll('.tle-place-v27').forEach(btn=>btn.addEventListener('click',e=>{const row=e.target.closest('[data-tl-event]');readAdmin(mod);mod.timelineOpenSection='events';window.__timelinePlace={moduleId:mod.id,index:+row.dataset.tlEvent};save();renderAll();}));
  };
  const prevNorm=normalizeMod;
  normalizeMod=function(mod){prevNorm(mod);if(mod&&mod.type==='timeline')norm(mod);};
  try{renderAll();}catch(e){console.error('timeline v27 patch failed',e);}
})();



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



(function(){
  function tableDensityVars(mod){
    const density = mod.tableDensity || "normal";

    const sizes = {
      compact: {
        gap: 2,
        padY: 3,
        padX: 5,
        minW: 34,
        h: 22,
        radius: 6,
        font: ".74rem"
      },
      normal: {
        gap: 4,
        padY: 7,
        padX: 9,
        minW: 56,
        h: 30,
        radius: 9,
        font: ".92rem"
      },
      large: {
        gap: 6,
        padY: 10,
        padX: 13,
        minW: 76,
        h: 42,
        radius: 13,
        font: "1.05rem"
      }
    };

    const s = sizes[density] || sizes.normal;

    return [
      "--table-gap:" + s.gap + "px",
      "--cell-pad-y:" + s.padY + "px",
      "--cell-pad-x:" + s.padX + "px",
      "--cell-min-w:" + s.minW + "px",
      "--cell-h:" + s.h + "px",
      "--cell-radius:" + s.radius + "px",
      "--table-font:" + s.font
    ].join(";");
  }

  if(typeof tableHTML === "function"){
    const oldTableHTMLModernPatch = tableHTML;

    tableHTML = function(mod){
      normalizeMerges(mod);
      const rows = mod.rows || [];

      return `
        <div class="content table-modern-wrap" style="${tableDensityVars(mod)}">
          <table class="status-table-modern">
            <tbody>
              ${rows.map((row,r)=>`
                <tr>
                  ${row.map((cell,c)=>{
                    if(isHiddenMergedCell(mod,r,c)) return "";

                    const raw = String(cell ?? "");
                    const merge = getMergeAt(mod,r,c);

                    const classes = [
                      isSelectedCell(mod.id,r,c) ? "cell-selected" : "",
                      isMultiSelectedCell(mod.id,r,c) ? "cell-multi-selected" : "",
                      merge ? "cell-merged" : ""
                    ].filter(Boolean).join(" ");

                    const spanAttrs = merge
                      ? `${merge.rowspan > 1 ? ` rowspan="${merge.rowspan}"` : ""}${merge.colspan > 1 ? ` colspan="${merge.colspan}"` : ""}`
                      : "";

                    return `
                      <td data-row="${r}" data-col="${c}"${spanAttrs} class="${classes}" style="${cellStyleCSS(mod,r,c)}">
                        <div class="cell-display">${formatTextHTML(raw)}</div>
                        <textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${escapeHTML(raw)}</textarea>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    };
  }

  if(typeof settingsSpecific === "function"){
    const oldSettingsSpecificTableModernPatch = settingsSpecific;

    settingsSpecific = function(mod){
      let html = oldSettingsSpecificTableModernPatch(mod);

      if(!mod || mod.type !== "table") return html;

      const density = mod.tableDensity || "normal";

      const densityHTML = `
        <div class="field">
          <label>Cellestørrelse</label>
          <div class="table-density-buttons">
            <button id="tableDensityCompact" class="tool-btn ${density === "compact" ? "active" : ""}" type="button">Kompakt</button>
            <button id="tableDensityNormal" class="tool-btn ${density === "normal" ? "active" : ""}" type="button">Normal</button>
            <button id="tableDensityLarge" class="tool-btn ${density === "large" ? "active" : ""}" type="button">Stor</button>
          </div>
        </div>
      `;

      return densityHTML + html;
    };
  }

  if(typeof renderSelectedSettings === "function"){
    const oldRenderSelectedSettingsTableModernPatch = renderSelectedSettings;

    renderSelectedSettings = function(){
      oldRenderSelectedSettingsTableModernPatch();

      let mod = null;
      try{ mod = selected && selected(); }catch(e){}

      if(!mod || mod.type !== "table") return;

      const setDensity = value => {
        mod.tableDensity = value;
        save();
        renderAll();
      };

      document.getElementById("tableDensityCompact")?.addEventListener("click", () => setDensity("compact"));
      document.getElementById("tableDensityNormal")?.addEventListener("click", () => setDensity("normal"));
      document.getElementById("tableDensityLarge")?.addEventListener("click", () => setDensity("large"));
    };
  }

  if(typeof renderAll === "function"){
    try{ renderAll(); }catch(e){ console.error("table modern compact patch failed", e); }
  }
})();
