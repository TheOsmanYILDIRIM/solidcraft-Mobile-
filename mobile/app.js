/* SolidCraft Mobile shell — requires the real same-origin window.solidcraft API. */
const $=id=>document.getElementById(id);
const root=$("app"),cad=$("cad");
const opts=new URLSearchParams(location.search);
const preview=opts.get("preview")==="1";
const key="solidcraft-mobile-ui";
const defaults={lang:"tr",scale:1,theme:"dark",favorites:[]};
let prefs;try{prefs={...defaults,...JSON.parse(localStorage.getItem(key)||"{}")};}catch{prefs={...defaults};}
prefs.lang=["tr","en"].includes(prefs.lang)?prefs.lang:"tr";
prefs.theme=["dark","light"].includes(prefs.theme)?prefs.theme:"dark";
prefs.scale=Math.min(2.5,Math.max(.5,Number(prefs.scale)||1));
prefs.favorites=Array.isArray(prefs.favorites)?prefs.favorites:[];
const i18n={
tr:{settings:"Ayarlar",files:"Dosyalar",commands:"Komutlar",history:"Geçmiş",objects:"Nesneler",error:"Hata",noEngine:"CAD motoru bağlı değil",connecting:"Bağlanıyor",connected:"Motor bağlı",preview:"Görsel önizleme",scale:"Arayüz boyutu",language:"Dil",theme:"Tema",dark:"Koyu",light:"Açık",native:"Özgün SolidCraft arayüzü",back:"Mobil arayüze dön",export:"JSON dışa aktar",import:"JSON içe aktar",fileNote:"Bu kabuk JSON taşır. .sc, STEP ve STL işlemleri için özgün SolidCraft arayüzünü kullanın.",search:"Komut ara",start:"Aracı aç",execute:"Parametrelerle çalıştır",empty:"Kayıt yok",info:"Geçmiş/nesneler mobil panelde henüz yalnızca okunabilir.",failed:"Motor hazır değil. Önce Rust/WASM web derlemesini aynı kök altında app/ dizinine koyun."},
en:{settings:"Settings",files:"Files",commands:"Commands",history:"History",objects:"Objects",error:"Error",noEngine:"CAD engine not connected",connecting:"Connecting",connected:"Engine connected",preview:"Visual preview",scale:"Interface size",language:"Language",theme:"Theme",dark:"Dark",light:"Light",native:"Original SolidCraft interface",back:"Return to mobile",export:"Export JSON",import:"Import JSON",fileNote:"This shell transfers JSON only. Use original SolidCraft UI for .sc, STEP and STL.",search:"Search commands",start:"Start interactive tool",execute:"Run with parameters",empty:"No records",info:"History and objects are currently read-only in this mobile panel.",failed:"Build the real Rust/WASM web app and serve it under app/ on the same origin."}
};
const t=k=>i18n[prefs.lang][k]||k;
const h=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={api:null,cmd:[],doc:null,mode:"model",panel:null,tab:"history",search:"",limit:80,chosen:null,native:false};
const groups={model:["sketch.create","solid.extrude","solid.revolve","solid.fillet","solid.chamfer","solid.hole","solid.combine"],sketch:["sketch.line","sketch.rectangle.two_point","sketch.circle.center_radius","sketch.arc.three_point","sketch.dimension"],inspect:["view.isometric","view.home","select.clear"]};
function persist(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}}
function theme(){root.classList.toggle("light",prefs.theme==="light");root.style.setProperty("--scale",prefs.scale);document.documentElement.lang=prefs.lang;}
function toast(m){const el=$("toast");el.textContent=m;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,5000);}
function registry(raw){const data=Array.isArray(raw)?raw:Array.isArray(raw?.commands)?raw.commands:Array.isArray(raw?.items)?raw.items:raw?.commands&&typeof raw.commands==="object"?Object.entries(raw.commands).map(([id,v])=>({id,...v})):[];return data.map(c=>typeof c==="string"?{id:c,label:c,enabled:true}:{id:String(c.id||c.command||""),label:String(c.label||c.title||c.id||""),enabled:c.enabled!==false&&c.available!==false,description:String(c.description||"")}).filter(c=>c.id).sort((a,b)=>a.label.localeCompare(b.label));}
function getCommand(id){return state.cmd.find(c=>c.id===id);}
function renderTools(){const list=[];for(const id of [...prefs.favorites,...groups[state.mode]]){const c=getCommand(id);if(c&&!list.some(x=>x.id===c.id))list.push(c);}const out=list.slice(0,12).map(c=>'<button data-cmd="'+h(c.id)+'" '+(!c.enabled?"disabled":"")+'>'+h(c.label)+'</button>').join("");$("tools").innerHTML=out+'<button data-act="commands">•••</button>';}
function mode(v){if(!(v in groups))return;state.mode=v;document.querySelectorAll("[data-mode]").forEach(el=>el.classList.toggle("active",el.dataset.mode===v));renderTools();}
async function call(fn){if(!state.api){toast(t("noEngine"));return;}try{return await fn(state.api);}catch(e){toast(t("error")+": "+String(e.message||e));}}
async function refresh(){if(!state.api)return;try{state.doc=await state.api.inspect();if(state.panel==="history")showPanel();}catch(e){console.warn(e);}}
function rows(arr){if(!Array.isArray(arr))arr=arr&&typeof arr==="object"?Object.entries(arr).map(([name,v])=>typeof v==="object"?{name,...v}:{name,value:v}):[];return arr.length?arr.map((x,i)=>'<div class="record"><span class="desc"><b>'+h(typeof x==="string"?x:(x.name||x.label||x.id||i+1))+'</b><small>'+h(typeof x==="object"?(x.kind||x.type||""):"")+'</small></span></div>').join(""):'<div class="section">'+t("empty")+'</div>';}
function cmdRows(){const q=state.search.toLowerCase();const filtered=state.cmd.filter(c=>(c.id+" "+c.label).toLowerCase().includes(q));return filtered.slice(0,state.limit).map(c=>'<div class="record"><span class="desc"><b>'+h(c.label)+'</b><small>'+h(c.id)+'</small></span><button data-fav="'+h(c.id)+'">'+(prefs.favorites.includes(c.id)?"★":"☆")+'</button><button data-cmd="'+h(c.id)+'" '+(!c.enabled?"disabled":"")+'>▶</button><button data-detail="'+h(c.id)+'">⋯</button></div>').join("")+(filtered.length>state.limit?'<button data-act="more">+'+(filtered.length-state.limit)+'</button>':"");}
function showPanel(){const p=state.panel;if(!p)return;$("sheet").hidden=false;$("veil").hidden=false;$("sheetTitle").textContent=t(p==="command"?"commands":p);
let s="";
if(p==="settings"){s='<div class="row"><label>'+t("language")+'</label><select id="lang"><option value="tr">Türkçe</option><option value="en">English</option></select></div><div class="row"><label>'+t("scale")+'</label><strong id="scaleText">'+Math.round(prefs.scale*100)+'%</strong></div><input id="scale" type="range" min="50" max="250" step="5" value="'+Math.round(prefs.scale*100)+'"><div class="actions">'+[50,75,100,125,150,200,250].map(n=>'<button data-scale="'+n+'">'+n+'%</button>').join("")+'</div><div class="row"><label>'+t("theme")+'</label><select id="theme"><option value="dark">'+t("dark")+'</option><option value="light">'+t("light")+'</option></select></div><div class="section"><button data-act="native">'+t("native")+'</button></div>';}
if(p==="files"){s='<div class="section sub">'+t("fileNote")+'</div><div class="actions"><button data-act="import">'+t("import")+'</button><button data-act="export">'+t("export")+'</button><button data-act="native">'+t("native")+'</button></div>';}
if(p==="history"){const d=state.doc||{};const source=state.tab==="history"?(d.timeline||d.features||d.history):(d.bodies||d.objects||d.components);s='<div class="actions"><button data-tab="history" '+(state.tab==="history"?'class="active"':"")+'>'+t("history")+'</button><button data-tab="objects" '+(state.tab==="objects"?'class="active"':"")+'>'+t("objects")+'</button></div><div id="records">'+rows(source)+'</div><div class="section sub">'+t("info")+'</div>';}
if(p==="commands"){s='<input id="search" type="search" placeholder="'+t("search")+'" value="'+h(state.search)+'"><div id="results">'+cmdRows()+'</div>';}
if(p==="command"){const c=getCommand(state.chosen);s=c?'<div class="section"><b>'+h(c.label)+'</b><small class="sub">'+h(c.id)+'</small><p>'+h(c.description)+'</p></div><textarea id="args" spellcheck="false">{}</textarea><div class="actions"><button data-act="start">'+t("start")+'</button><button class="active" data-act="execute">'+t("execute")+'</button></div>':'<div class="section">'+t("empty")+'</div>';}
$("sheetBody").innerHTML=s;
if(p==="settings"){$("lang").value=prefs.lang;$("theme").value=prefs.theme;}
}
function openPanel(p){state.panel=p;showPanel();if(p==="history")refresh();}
function closePanel(){state.panel=null;$("sheet").hidden=true;$("veil").hidden=true;}
async function start(id){const c=getCommand(id);if(!c?.enabled){toast(t("failed"));return;}const out=await call(api=>api.request("ui.start",{command:id}));if(out!==undefined){closePanel();setTimeout(refresh,250);}}
async function executeChosen(){const c=getCommand(state.chosen);if(!c?.enabled)return;let args;try{args=JSON.parse($("args").value||"{}");if(!args||typeof args!=="object"||Array.isArray(args))throw Error("JSON object required");}catch(e){toast(e.message);return;}const out=await call(api=>api.execute(c.id,args));if(out!==undefined){closePanel();refresh();}}
function native(){state.native=!state.native;root.classList.toggle("native",state.native);closePanel();$("goMobile")?.remove();if(state.native){const b=document.createElement("button");b.id="goMobile";b.textContent=t("back");b.onclick=native;$("stage").appendChild(b);b.style.position="absolute";b.style.left="12px";b.style.top="10px";}}
async function exportDesign(){const out=await call(api=>api.request("document.export"));if(typeof out?.text!=="string")return;const u=URL.createObjectURL(new Blob([out.text],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download=String(out.name||"design").replace(/[^a-zA-Z0-9_.-]/g,"_")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);closePanel();}
$("upload").onchange=async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(f.size>16*1024*1024){toast("File too large");return;}const s=await f.text();try{JSON.parse(s);}catch{toast("Invalid JSON");return;}const out=await call(api=>api.request("document.import",{text:s,name:f.name.replace(/\.json$/i,"")}));if(out!==undefined){closePanel();refresh();}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-act],[data-mode],[data-cmd],[data-detail],[data-fav],[data-tab],[data-scale]");if(!b)return;
if(b.dataset.mode){mode(b.dataset.mode);return;}if(b.dataset.cmd){start(b.dataset.cmd);return;}
if(b.dataset.detail){state.chosen=b.dataset.detail;openPanel("command");return;}
if(b.dataset.fav){const v=b.dataset.fav;prefs.favorites=prefs.favorites.includes(v)?prefs.favorites.filter(x=>x!==v):[...prefs.favorites,v];persist();renderTools();showPanel();return;}
if(b.dataset.tab){state.tab=b.dataset.tab;showPanel();return;}if(b.dataset.scale){prefs.scale=Number(b.dataset.scale)/100;theme();persist();showPanel();return;}
const a=b.dataset.act;if(["settings","files","history","commands"].includes(a)){openPanel(a);return;}
if(a==="close"){closePanel();return;}if(a==="native"){native();return;}
if(a==="undo"||a==="redo"){call(api=>api.execute("edit."+a)).then(refresh);return;}
if(a==="home"){call(api=>api.execute("view.home"));return;}
if(a==="import"){$("upload").click();return;}if(a==="export"){exportDesign();return;}
if(a==="start"){start(state.chosen);return;}if(a==="execute"){executeChosen();return;}
if(a==="more"){state.limit+=80;showPanel();}});
$("veil").onclick=closePanel;
$("sheetBody").addEventListener("input",e=>{
if(e.target.id==="scale"){prefs.scale=Number(e.target.value)/100;theme();persist();$("scaleText").textContent=Math.round(prefs.scale*100)+"%";}
if(e.target.id==="search"){state.search=e.target.value;state.limit=80;$("results").innerHTML=cmdRows();}
});
$("sheetBody").addEventListener("change",e=>{if(e.target.id==="lang"){prefs.lang=e.target.value;theme();persist();showPanel();call(api=>api.request("ui.prefs",{language:prefs.lang}));}if(e.target.id==="theme"){prefs.theme=e.target.value;theme();persist();call(api=>api.request("ui.prefs",{theme:prefs.theme}));}});
async function connect(){
if(preview){cad.hidden=true;$("emptyTitle").textContent=t("preview");$("emptyText").textContent=t("failed");return;}
try{const u=new URL(opts.get("app")||"../app-edge/",location.href);if(u.origin!==location.origin)throw Error("Same-origin app URL required");cad.src=u.href;}catch(e){toast(e.message);return;}
const startTime=Date.now();while(Date.now()-startTime<60000){try{const api=cad.contentWindow?.solidcraft;if(api&&["request","execute","commands","inspect"].every(x=>typeof api[x]==="function")){state.api=api;state.cmd=registry(await api.commands());$("empty").hidden=true;renderTools();refresh();return;}}catch(e){toast(e.message);break;}await new Promise(r=>setTimeout(r,200));}
$("emptyTitle").textContent=t("noEngine");$("emptyText").textContent=t("failed");
}
theme();mode("model");connect();setInterval(()=>{if(document.visibilityState==="visible"&&state.api&&state.panel==="history")refresh();},7000);
