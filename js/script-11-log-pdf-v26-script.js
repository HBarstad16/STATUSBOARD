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
