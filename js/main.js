/* ================================================================
   MAIN PORTFOLIO BEHAVIOUR
   ================================================================
   This file contains the interactive behaviour of the website.

   SEARCH MAP
   - THEME TOGGLE       → Light / Dark Mode
   - COUNT-UP           → Quick overview numbers
   - TREND CHART        → Performance chart
   - TABS               → SLB story tabs
   - ASSISTANT          → Client-side portfolio chat
   - DOCUMENT VIEWER    → Resume / letters / transcript
   - DASHBOARD VIEWER   → Embedded dashboard windows
   - SALES VIDEO        → Project demo video
   - SLB VIDEO          → Floating internship video + controls
   - PROTECTION         → Basic browser deterrents

   Heavy files are NOT stored in this JavaScript. They live in assets/.
================================================================ */


/* ---------- Theme toggle (default light) ---------- */
const root = document.documentElement;
const tbtn = document.getElementById('themeToggle');
let saved=null; try{ saved = localStorage.getItem('hk-theme'); }catch(e){}
if(saved === 'dark'){ root.dataset.theme='dark'; tbtn.textContent='☀️ Light Mode'; }
tbtn.addEventListener('click', ()=>{
  const dark = root.dataset.theme === 'dark';
  root.dataset.theme = dark ? 'light' : 'dark';
  tbtn.textContent = dark ? '🌙 Dark Mode' : '☀️ Light Mode';
  try{ localStorage.setItem('hk-theme', root.dataset.theme); }catch(e){}
  if(window.trackEvent) trackEvent('theme_changed',{theme:root.dataset.theme});
});

/* ---------- Count-up ---------- */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el, target, dur, fmt){
  const t0 = performance.now();
  function tick(t){
    const p = Math.min((t - t0)/dur, 1);
    const e = 1 - Math.pow(1-p, 3);
    el.textContent = fmt(Math.round(target*e));
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function initKpis(){
  const k1=document.getElementById('k1'),k2=document.getElementById('k2'),k3=document.getElementById('k3');
  if(!k1||!k2||!k3||k1.dataset.animated) return;
  k1.dataset.animated='1';
  if(reduced){k1.textContent='40,453';k2.textContent='1,249';k3.textContent='36%';}
  else{
    countUp(k1,40453,1100,n=>n.toLocaleString());
    countUp(k2,1249,1100,n=>n.toLocaleString());
    countUp(k3,36,1200,n=>n+'%');
  }
}
// main.js is loaded after window.load by the startup loader.
// Running only from window.load therefore left the KPI cards at 0.
window.addEventListener('portfolio:ready', initKpis);
if(document.readyState === 'complete') setTimeout(initKpis, 0);

/* ---------- Trend chart (waits for deferred Chart.js) ---------- */
function initTrend(){ if(typeof Chart==='undefined'){ setTimeout(initTrend,60); return; }
try{
new Chart(document.getElementById('trend'), {
  type:'line',
  data:{labels:['Q1 25','Q2 25','Q3 25','Q4 25','Q1 26','Q2 26'],
    datasets:[{data:[16,15,18,28,35,34],borderColor:'#F5A623',
      backgroundColor:'rgba(245,166,35,.14)',fill:true,tension:.38,
      pointRadius:4,pointBackgroundColor:'#F5A623',borderWidth:2.5}]},
  options:{responsive:true,maintainAspectRatio:false,
    animation: reduced?false:{duration:1400},
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y+'% automated'}}},
    scales:{y:{min:0,max:45,ticks:{color:'#8FA1B8',callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.07)'}},
            x:{ticks:{color:'#8FA1B8'},grid:{display:false}}}}
});
if(window.setAssetStatus) setAssetStatus('chart','ready',100,'Ready');
}catch(err){if(window.setAssetStatus) setAssetStatus('chart','error',0,'Chart unavailable; page remains usable');} 
}
initTrend();

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
    b.classList.add('on');
    document.getElementById(b.dataset.p).classList.add('on');
  });
});

/* ---------- Scroll reveal + band counters ---------- */
const io = new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count],[data-static]').forEach(el=>{
        if(el.dataset.done) return; el.dataset.done=1;
        if(el.dataset.static){ el.textContent = el.dataset.static; return; }
        const t=+el.dataset.count, pre=el.dataset.prefix||'', suf=el.dataset.suffix||'';
        if(reduced){ el.textContent=pre+t.toLocaleString()+suf; return; }
        countUp(el,t,1500,n=>pre+n.toLocaleString()+suf);
      });
      io.unobserve(e.target);
    }
  });
},{threshold:.15});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));

/* =========================================================
   ASSISTANT - fully client-side, no data leaves this page
========================================================= */
const fab=document.getElementById('chatFab'), box=document.getElementById('chatBox'),
      log=document.getElementById('chatLog'), inp=document.getElementById('chatInput'),
      send=document.getElementById('chatSend'), closeB=document.getElementById('chatClose');

const visitor = {first:''};
let stage = -1; // -1: ask persona, 0: ask name, 4: free chat
let persona='';
let opened = false;

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function bot(html){const m=document.createElement('div');m.className='msg bot';m.innerHTML=html;log.appendChild(m);log.scrollTop=log.scrollHeight;}
function me(t){const m=document.createElement('div');m.className='msg me';m.textContent=t;log.appendChild(m);log.scrollTop=log.scrollHeight;}
function chips(items){
  const c=document.createElement('div');c.className='chips';
  items.forEach(q=>{const b=document.createElement('button');b.className='qchip';b.textContent=q;
    b.onclick=()=>{me(q);handle(q);};c.appendChild(b);});
  log.appendChild(c);log.scrollTop=log.scrollHeight;
}

const CONTACT = window.SITE_CONFIG?.contact || {};
const CONTACT_HTML = 'You can also reach me directly, I reply fast:<br>' +
 '💬 <a href="'+(CONTACT.whatsapp||'#')+'" target="_blank" rel="noopener">WhatsApp: +60 11-1106 3798</a><br>' +
 '💼 <a href="'+(CONTACT.linkedin||'#')+'" target="_blank" rel="noopener">Message on LinkedIn</a><br>' +
 '✉️ <a href="javascript:void(0)" onclick="openContact(\'email\')">Email: '+(CONTACT.email||'')+'</a><br>' +
 '📞 <a href="javascript:void(0)" onclick="openContact(\'call\')">Call: '+(CONTACT.phone||'')+'</a>';
const SUGGESTED = ['What did you do at SLB?','What are your skills?','Your education?','Show me your projects','Are you available?','Work eligibility?','Your contact details?','Others...'];

function greet(){
  bot("Hi! 👋 Thanks for dropping by. Before we chat, who are you?");
  chips(["Recruiter","Hiring Manager","HR","Business User","Friend"]);
}
const PERSONA_QS={
 "Recruiter":["Are you available?","Work eligibility?","Your resume?","What did you do at SLB?","Your contact details?","Others..."],
 "Hiring Manager":["What did you do at SLB?","Show me your projects","What are your skills?","Are you available?","Your contact details?","Others..."],
 "HR":["Work eligibility?","Your education?","Your resume?","Are you available?","Your contact details?","Others..."],
 "Business User":["Show me your projects","What did you do at SLB?","What are your skills?","Your contact details?","Others..."],
 "Friend":["Show me your projects","What did you do at SLB?","Your contact details?","Others..."]
};

function knowledge(q){
  const s=q.toLowerCase();
  const has=(...ws)=>ws.some(w=>s.includes(w));

  if(has('eligib','citizen','visa','licence','license','transport','language','malay','tamil','medical','gender'))
    return "Quick summary: I'm a Malaysian citizen, born in Malaysia and based in Kuala Lumpur, with full legal right to work and available to start immediately. I speak English, Malay and Tamil, have my own transport with a valid driving licence, and I'm medically fit. I'm also open to professional certifications. Reliability is one of my strengths: I take ownership, follow through, collaborate closely and deliver careful, high-quality work. <a href='javascript:void(0)' onclick='goSec(\"goodtoknow\")'>See Work Eligibility & Quick Facts</a>.";


  if(has('slb','intern','experience','work','supply chain','invoice','automation','dashboard','power bi'))
    return "I spent Jan–Jul 2026 as a <b>Business Analyst Intern at SLB</b> in Petaling Jaya, with the <b>Supply Chain Data Performance Team</b>. I connected data from SAP, Ariba, SharePoint and Excel, validated <b>1,200+ supplier records</b>, and built the <b>Power BI dashboard across 40,000+ invoices</b> that tracked automation rising from <b>15% to 36%</b>. I also ran root cause analysis and documented everything for handover. You can open working copies of my dashboards in <a href='javascript:void(0)' onclick='goSec(\"projects\")'>My Work - Overview</a>.";

  if(has('skill','tool','tech','sql','python','excel','sap','dax'))
    return "My core toolkit: <b>Power BI, SQL, Excel, Python, SAP, Ariba, SharePoint, Power Query and DAX</b>. On the business side: requirements gathering, stakeholder management, root cause analysis, data storytelling and documentation. <a href='javascript:void(0)' onclick='goSec(\"skills\")'>Jump to my Skills section</a>.";

  if(has('education','degree','university','cgpa','study','grade','transcript'))
    return "I hold a <b>Bachelor of IT (Hons), Data Analytics</b> from UNITAR, completed 2026 with <b>First Class Honours (CGPA 3.67)</b>, a Diploma in IT from TARUMT, and SPM from SMK Hillcrest. My full transcript is in <a href='javascript:void(0)' onclick='goSec(\"documents\")'>My Documents</a>.";

  if(has('project','portfolio','forecast','fyp','streamlit','video','youtube'))
    return "Two things worth a click: my <b>Invoice Automation Performance Dashboard</b> (two views, both open right on this page) and my <b>Sales Forecasting Tool</b> with a video demo you can watch here. <a href='javascript:void(0)' onclick='goSec(\"projects\")'>Jump to My Work - Overview</a>.";

  if(has('hire','available','job','programme','program','graduate','trainee','associate','when','start','open'))
    return "Yes, I'm <b>available immediately</b> and based in Kuala Lumpur. I'm a Malaysian citizen with full legal right to work, my own transport and a valid driving licence, and I speak English, Malay and Tamil. I'm open to analyst roles, graduate and trainee programmes, and early-career opportunities across any function or industry. " + CONTACT_HTML;

  if(has('contact','email','phone','whatsapp','linkedin','call','reach','talk','connect'))
    return CONTACT_HTML;

  if(has('resume','cv','cover letter','document','letter','download'))
    return "All my documents are one click away in <a href='javascript:void(0)' onclick='goSec(\"documents\")'>My Documents</a>: my <a href='javascript:void(0)' onclick='openDoc(\"resume\")'>Resume</a>, <a href='javascript:void(0)' onclick='openDoc(\"cover\")'>Cover Letter</a>, <a href='javascript:void(0)' onclick='openDoc(\"slb\")'>SLB Completion Letter</a> and <a href='javascript:void(0)' onclick='openDoc(\"transcript\")'>Bachelor Transcript</a>.";

  if(has('strength','different','special','why','stand out','unique'))
    return "Honestly? My internship work wasn't a practice exercise, it was <b>adopted into a global company's enterprise reporting</b>. I document everything so my work survives after I move on, and I explain data in language anyone can follow, you're seeing that style on this site.";

  if(has('salary','pay','expect'))
    return "I'm open to discussing this and finding an arrangement that works well for both of us. " + CONTACT_HTML;


  if(has('thank','bye','great','ok','nice'))
    return "You're welcome! If anything else comes to mind, I'm right here. " + CONTACT_HTML;

  return "Good question, that one deserves a proper conversation rather than a canned reply. " + CONTACT_HTML + "<br><br>Or tap one of the questions below.";
}

function handle(text){
  if(stage===-1){
    persona = PERSONA_QS[text] ? text : "Recruiter";
    bot("Great to meet you! 🙌 And what's your name? Type it below and we can continue our chat.");
    stage=0; return;
  }
  if(stage===0){
    visitor.first=text.trim().split(/\s+/)[0]||'there';
    bot("Thanks, "+esc(visitor.first)+"! 🙏 Here's what people usually ask, tap any of these, or type your own question:");
    chips(PERSONA_QS[persona]||SUGGESTED);
    stage=4; return;
  }
  if(text==='Others...'){ bot("Of course! Type any question below and I'll do my best. If I can't answer it, you can always reach me directly:"); bot(CONTACT_HTML); return; }
  setTimeout(()=>{ bot(knowledge(text)); chips(PERSONA_QS[persona]||SUGGESTED); }, 250);
}

fab.addEventListener('click', ()=>{
  box.classList.add('open'); inp.focus();
  if(!opened){ opened=true; greet(); }
});
closeB.addEventListener('click', ()=>box.classList.remove('open'));
function submit(){
  const t=inp.value.trim(); if(!t) return;
  me(t); inp.value=''; handle(t);
}
send.addEventListener('click', submit);
inp.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });

const viewer=document.getElementById('viewer'),vBody=document.getElementById('viewerBody'),vTitle=document.getElementById('viewerTitle');
let blobUrls={};
let lastFocus=null;
function openViewer(title){lastFocus=document.activeElement;vTitle.textContent=title;viewer.classList.add('open');document.body.style.overflow='hidden';}
function closeViewer(){viewer.classList.remove('open');vBody.innerHTML='';document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus();}
viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeViewer();});
let currentDocKey=null;
function openDoc(key){
  currentDocKey=key;
  if(window.trackEvent) trackEvent('document_opened',{document:key});
  const d=PAYLOAD.docs[key];
  if(!d){return;}
  let html='<div class="asset-load-note" data-doc-load="'+key+'">Loading document…</div>';
  html+=d.pages.map((p,i)=>'<img loading="lazy" data-doc-page="'+key+'-'+i+'" src="'+p+'" alt="'+d.title+' page">').join('');
  if(d.links&&d.links.length){
    html+='<div style="max-width:880px;margin:6px auto 14px;padding:0 14px"><div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px"><b style="font-size:.85rem">Links in this document</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+d.links.map(l=>'<a class="plink" href="'+l.url+'" target="_blank" rel="noopener">'+l.label+' \u2197</a>').join('')+'</div></div></div>';
  }
  html+='<div style="max-width:880px;margin:6px auto 20px;padding:0 14px"><details style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px"><summary style="cursor:pointer;font-weight:600;font-size:.9rem">Selectable text version (highlight &amp; copy any line)</summary><pre style="white-space:pre-wrap;font-family:Inter,sans-serif;font-size:.85rem;color:var(--body2);margin-top:10px;user-select:text">'+escHtml(d.text||'')+'</pre></details></div>';
  vBody.innerHTML=html;
  document.getElementById('copyDocBtn').style.display='inline-block';
  openViewer(d.title);
  requestAnimationFrame(()=>initDocumentLoading(key,d));
}
function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function copyDocText(btn){
  const d=PAYLOAD.docs[currentDocKey]; if(!d) return;
  const done=()=>{btn.textContent='\u2713 Copied'; setTimeout(()=>btn.textContent='\ud83d\udccb Copy text',1800);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(d.text||'').then(done,()=>fallbackCopy(d.text||'',done));}
  else fallbackCopy(d.text||'',done);
}
function openDash(key,title){
  currentDocKey=null;
  if(window.trackEvent) trackEvent('dashboard_opened',{dashboard:key,title:title}); document.getElementById('copyDocBtn').style.display='none';
  const fr=document.createElement('iframe');
  fr.title=title; fr.setAttribute('loading','eager');
  fr.style.width='100%'; fr.style.minHeight='78vh'; fr.style.border='0'; fr.style.background='#fff';
  fr.addEventListener('load',()=>setAssetStatus('dash','ready',100,'Ready · '+title),{once:true});
  setAssetStatus('dash','loading',10,'Loading '+title+'…');
  vBody.innerHTML=''; vBody.appendChild(fr);
  fr.src=PAYLOAD.dash[key];
  openViewer(title);
}
function openVideo(){
  currentDocKey=null;
  if(window.trackEvent) trackEvent('sales_demo_opened'); document.getElementById('copyDocBtn').style.display='none';
  vBody.innerHTML='<div style="max-width:860px;margin:16px auto;padding:0 14px">'+
   '<div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden">'+
     '<video id="demoVid" controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>'+
   '</div>'+
   '<div style="text-align:center;padding:12px;font-size:.84rem;color:var(--mut)">Plays right here, nothing to open. Prefer YouTube instead? '+
   '<a href="https://youtu.be/UgGiQASuEnY" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600">Watch it on YouTube in a new tab</a>.</div></div>';
  const v=document.getElementById('demoVid');
  v.src=PAYLOAD.video;
  v.addEventListener('loadedmetadata',()=>window.setAssetStatus&&setAssetStatus('sales','ready',100,'Ready')); 
  v.addEventListener('progress',()=>window.updateMediaProgress&&updateMediaProgress(v,'sales','Sales demo video')); 
  v.addEventListener('canplay',()=>window.setAssetStatus&&setAssetStatus('sales','ready',100,'Ready to play')); 
  v.onerror=function(){ if(window.setAssetStatus) setAssetStatus('sales','error',0,'Playback unavailable; YouTube fallback available'); v.outerHTML='<div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:.9rem;padding:20px;text-align:center">Video playback is restricted in this environment. Please use the YouTube link below.</div>'; };
  openViewer('Sales Forecasting Tool \u00b7 demo video');
}
function initPayload(){ if(typeof PAYLOAD==='undefined'){ setTimeout(initPayload,60); return; }
  const heroPhoto=document.getElementById('heroPhoto');
  heroPhoto.src=PAYLOAD.photo;
  heroPhoto.addEventListener('load',()=>window.setAssetStatus&&setAssetStatus('photo','ready',100,'Ready'));
  heroPhoto.addEventListener('error',()=>window.setAssetStatus&&setAssetStatus('photo','error',0,'Could not load'));
  if(window.setAssetStatus) setAssetStatus('photo','loading',15,'Loading profile photo…');

/* ---- SLB floating figure: background removal + fully synchronized controls ---- */
(function(){
  const canvas = document.getElementById('slbCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  const slbFigure = document.querySelector('.slb-figure');

  // Reuse the video preloaded by loading.js when available.  The loader only
  // downloads/buffers it; this module owns playback and all controls.
  const video = window.__slbWarmVideo || document.createElement('video');
  video.playsInline = true;
  video.setAttribute('playsinline','');
  video.muted = true;
  video.preload = 'auto';
  video.autoplay = false;
  video.controls = false;
  video.volume = 0;
  video.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;opacity:0;pointer-events:none;';
  if(!video.parentNode) document.body.appendChild(video);

  const LOW = 20, HIGH = 60;
  let slbStarted = false;
  let slbInitialized = false;
  let rafId = null;

  const playBtn = document.getElementById('slbPlayBtn');
  const backBtn = document.getElementById('slbBackBtn');
  const forwardBtn = document.getElementById('slbForwardBtn');
  const muteBtn = document.getElementById('slbMuteBtn');
  const volSlider = document.getElementById('slbVolSlider');
  const fsBtn = document.getElementById('slbFsBtn');
  const seek = document.getElementById('slbSeek');
  const currentTimeEl = document.getElementById('slbCurrentTime');
  const durationEl = document.getElementById('slbDuration');
  const seekTip = document.getElementById('slbSeekTip');
  const darkModeBtn = document.getElementById('slbDarkModeBtn');

  function fmtTime(sec){
    if(!Number.isFinite(sec) || sec < 0) sec=0;
    const total=Math.floor(sec);
    const m=Math.floor(total/60);
    const ss=String(total%60).padStart(2,'0');
    return m+':'+ss;
  }

  function sizeCanvas(){
    if(video.videoWidth && video.videoHeight &&
       (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)){
      canvas.width=video.videoWidth;
      canvas.height=video.videoHeight;
    }
  }

  function updateTimeline(){
    const duration=Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const current=Number.isFinite(video.currentTime) ? Math.max(0,video.currentTime) : 0;
    if(seek){
      seek.min='0';
      seek.max=String(duration);
      seek.step='0.01';
      seek.value=String(Math.min(current,duration));
    }
    if(currentTimeEl) currentTimeEl.textContent=fmtTime(current);
    if(durationEl) durationEl.textContent=fmtTime(duration);
  }

  function updatePlayButton(){
    if(playBtn) playBtn.textContent = video.paused ? '▶' : '⏸';
  }

  function updateMuteButton(){
    if(muteBtn) muteBtn.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  }

  /* ---------------- Light-mode foreground matte ---------------- */
  const LW=220, LH=359, LN=LW*LH;
  const BG_LUMA=5;
  const smallCanvas=document.createElement('canvas');
  smallCanvas.width=LW; smallCanvas.height=LH;
  const smallCtx=smallCanvas.getContext('2d',{willReadFrequently:true});
  const maskCanvas=document.createElement('canvas');
  maskCanvas.width=LW; maskCanvas.height=LH;
  const maskCtx=maskCanvas.getContext('2d');
  const maskImage=maskCtx.createImageData(LW,LH);
  const candidate=new Uint8Array(LN);
  const labels=new Int32Array(LN);
  const queue=new Int32Array(LN);
  const bgSeen=new Uint8Array(LN);

  function buildLightMask(){
    smallCtx.drawImage(video,0,0,LW,LH);
    const px=smallCtx.getImageData(0,0,LW,LH).data;
    for(let p=0,i=0;p<LN;p++,i+=4){
      candidate[p]=(((px[i]+px[i+1]+px[i+2])/3)>BG_LUMA)?1:0;
    }

    labels.fill(0);
    let label=0,bestLabel=0,bestSize=0;
    for(let p=0;p<LN;p++){
      if(!candidate[p] || labels[p]) continue;
      label++;
      let head=0,tail=0,size=0;
      queue[tail++]=p; labels[p]=label;
      while(head<tail){
        const q=queue[head++]; size++;
        const x=q%LW;
        let n;
        if(x>0){n=q-1;if(candidate[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
        if(x<LW-1){n=q+1;if(candidate[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
        if(q>=LW){n=q-LW;if(candidate[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
        if(q<LN-LW){n=q+LW;if(candidate[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
      }
      if(size>bestSize){bestSize=size;bestLabel=label;}
    }

    bgSeen.fill(0);
    let head=0,tail=0;
    const pushBg=(p)=>{
      if(labels[p]!==bestLabel && !bgSeen[p]){bgSeen[p]=1;queue[tail++]=p;}
    };
    for(let x=0;x<LW;x++){pushBg(x);pushBg((LH-1)*LW+x);}
    for(let y=1;y<LH-1;y++){pushBg(y*LW);pushBg(y*LW+LW-1);}
    while(head<tail){
      const q=queue[head++],x=q%LW;
      if(x>0) pushBg(q-1);
      if(x<LW-1) pushBg(q+1);
      if(q>=LW) pushBg(q-LW);
      if(q<LN-LW) pushBg(q+LW);
    }

    for(let p=0;p<LN;p++){
      const keep=(labels[p]===bestLabel)||!bgSeen[p];
      const i=p*4;
      maskImage.data[i]=255; maskImage.data[i+1]=255; maskImage.data[i+2]=255;
      maskImage.data[i+3]=keep?255:0;
    }
    maskCtx.putImageData(maskImage,0,0);
  }

  function drawLightFrame(){
    buildLightMask();
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.globalCompositeOperation='destination-in';
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(maskCanvas,0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  function drawDarkFrame(){
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
    const d=frame.data;
    for(let i=0;i<d.length;i+=4){
      const lum=(d[i]+d[i+1]+d[i+2])/3;
      let a;
      if(lum<LOW) a=0;
      else if(lum>HIGH) a=255;
      else a=Math.round((lum-LOW)/(HIGH-LOW)*255);
      d[i+3]=a;
    }
    ctx.putImageData(frame,0,0);
  }

  function renderCurrentFrame(){
    if(video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
    sizeCanvas();
    if(root.dataset.theme === 'light') drawLightFrame();
    else drawDarkFrame();
    return true;
  }

  function startRenderLoop(){
    if(rafId !== null) return;
    const loop=()=>{
      rafId=null;
      if(video.readyState>=2) renderCurrentFrame();
      if(!video.paused && !video.ended) rafId=requestAnimationFrame(loop);
    };
    rafId=requestAnimationFrame(loop);
  }

  function stopRenderLoop(){
    if(rafId!==null){cancelAnimationFrame(rafId);rafId=null;}
  }

  function initializeSLBVideo(){
    if(video.readyState < 1 || !video.videoWidth || !video.videoHeight) return false;
    sizeCanvas();
    slbInitialized=true;
    updateTimeline();
    renderCurrentFrame();
    return true;
  }

  async function ensurePlaying(){
    try{
      await video.play();
      updatePlayButton();
      startRenderLoop();
    }catch(err){
      // A browser may block autoplay. A user clicking Play will still be able
      // to start it; keep the first frame visible in the meantime.
      updatePlayButton();
      renderCurrentFrame();
    }
  }

  function startSLBVideo(){
    if(slbStarted) return;
    slbStarted=true;
    if(window.setAssetStatus) setAssetStatus('slb','loading',3,'Starting video…');

    if(!video.src || !video.src.endsWith(PAYLOAD.introVideo)){
      video.src=PAYLOAD.introVideo;
      video.load();
    }

    // If the preload already completed, initialize immediately. Otherwise the
    // event listeners below will do it as soon as metadata/data arrive.
    if(video.readyState>=1) initializeSLBVideo();
    if(video.readyState>=2){
      renderCurrentFrame();
      updateTimeline();
      ensurePlaying();
    }
  }

  video.addEventListener('loadedmetadata',()=>{
    initializeSLBVideo();
    updateTimeline();
    if(window.setAssetStatus) setAssetStatus('slb','loading',10,'Video metadata loaded');
    ensurePlaying();
  });
  video.addEventListener('loadeddata',()=>{
    initializeSLBVideo();
    updateTimeline();
    if(video.paused) ensurePlaying(); else startRenderLoop();
  });
  video.addEventListener('canplay',()=>{
    initializeSLBVideo();
    updateTimeline();
    if(window.setAssetStatus) setAssetStatus('slb','loading',Math.max(getMediaPercent(video),35),'Playable; buffering in background');
    if(video.paused) ensurePlaying(); else startRenderLoop();
  });
  video.addEventListener('canplaythrough',()=>{
    initializeSLBVideo();
    if(window.setAssetStatus) setAssetStatus('slb','ready',100,'Ready');
    if(!video.paused) startRenderLoop();
  });
  video.addEventListener('play',()=>{
    updatePlayButton();
    startRenderLoop();
    if(window.trackEvent) trackEvent('slb_video_played');
  });
  video.addEventListener('pause',()=>{
    updatePlayButton();
    stopRenderLoop();
    renderCurrentFrame();
  });
  video.addEventListener('timeupdate',updateTimeline);
  video.addEventListener('durationchange',updateTimeline);
  video.addEventListener('progress',()=>updateMediaProgress(video,'slb','SLB video'));
  video.addEventListener('seeked',()=>{updateTimeline();renderCurrentFrame();});
  video.addEventListener('ended',()=>{
    updatePlayButton();
    updateTimeline();
    stopRenderLoop();
    renderCurrentFrame();
    if(window.trackEvent) trackEvent('slb_video_completed');
  });
  video.addEventListener('error',()=>{
    if(window.setAssetStatus) setAssetStatus('slb','error',0,'Could not load; please check connection');
  });

  // Race-condition guard: the startup loader may have completed one or more
  // media events before main.js was attached. Synchronize from current state.
  if(video.readyState>=1) initializeSLBVideo();
  if(video.readyState>=2){
    renderCurrentFrame();
    updateTimeline();
    if(!video.paused) startRenderLoop();
  }

  if('IntersectionObserver' in window && slbFigure){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        startSLBVideo();
        observer.disconnect();
      }
    },{rootMargin:'320px 0px'});
    observer.observe(slbFigure);
  }else{
    startSLBVideo();
  }
  window.addEventListener('portfolio:slb-start',startSLBVideo);

  /* ---------------- Recruiter-facing controls ---------------- */
  playBtn?.addEventListener('click',async()=>{
    startSLBVideo();
    if(video.paused) await ensurePlaying();
    else video.pause();
  });

  function seekBy(seconds){
    const duration=Number.isFinite(video.duration)?video.duration:0;
    if(!duration) return;
    video.currentTime=Math.max(0,Math.min(duration,(video.currentTime||0)+seconds));
    updateTimeline();
    renderCurrentFrame();
  }
  backBtn?.addEventListener('click',()=>seekBy(-10));
  forwardBtn?.addEventListener('click',()=>seekBy(10));

  seek?.addEventListener('input',()=>{
    const value=Number(seek.value);
    if(Number.isFinite(value) && Number.isFinite(video.duration) && video.duration>0){
      video.currentTime=Math.max(0,Math.min(video.duration,value));
      updateTimeline();
      renderCurrentFrame();
    }
  });
  seek?.addEventListener('mousemove',e=>{
    const r=seek.getBoundingClientRect();
    const pct=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const t=pct*(video.duration||0);
    if(seekTip){
      seekTip.textContent=fmtTime(t);
      seekTip.style.left=(pct*100)+'%';
    }
  });
  seek?.addEventListener('focus',()=>{
    if(seekTip){
      seekTip.style.left=((Number(seek.value)/(video.duration||1))*100)+'%';
      seekTip.textContent=fmtTime(Number(seek.value));
    }
  });

  muteBtn?.addEventListener('click',()=>{
    video.muted=!video.muted;
    if(!video.muted && video.volume===0){video.volume=.7;if(volSlider) volSlider.value='70';}
    updateMuteButton();
  });
  volSlider?.addEventListener('input',()=>{
    const value=Math.max(0,Math.min(100,Number(volSlider.value)||0));
    video.volume=value/100;
    video.muted=value===0;
    updateMuteButton();
  });

  fsBtn?.addEventListener('click',async()=>{
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(slbFigure?.requestFullscreen) await slbFigure.requestFullscreen();
      else if(canvas.requestFullscreen) await canvas.requestFullscreen();
      else if(canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
    }catch(_){ /* fullscreen can be denied by the browser */ }
  });

  darkModeBtn?.addEventListener('click',()=>{
    root.dataset.theme='dark';
    if(tbtn) tbtn.textContent='☀️ Light Mode';
    if(tbtn) tbtn.setAttribute('aria-pressed','true');
    try{localStorage.setItem('hk-theme','dark');}catch(e){}
    renderCurrentFrame();
    if(window.trackEvent) trackEvent('theme_changed',{theme:'dark',source:'slb_video_button'});
  });

  updatePlayButton();
  updateMuteButton();
  updateTimeline();
})();
 }
initPayload();

/* smooth in-page navigation, works everywhere */
function goSec(id){const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}
document.addEventListener('click',function(e){
  const a=e.target.closest('a[href^="#"]');
  if(a){e.preventDefault(); goSec(a.getAttribute('href').slice(1));}
});

/* contact popup: email / call, with copy + app choices */
function copyTxt(t,btn){
  const done=()=>{btn.textContent='Copied \u2713'; setTimeout(()=>btn.textContent='Copy',1800);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fallbackCopy(t,done));}
  else fallbackCopy(t,done);
}
function fallbackCopy(t,done){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();done();}
function openContact(kind){
  currentDocKey=null; document.getElementById('copyDocBtn').style.display='none';
  const email='haresh.analyst@gmail.com', phone='+601111063798', phoneNice='+60 11-1106 3798';
  if(kind==='email'){
    vBody.innerHTML='<div style="max-width:480px;margin:26px auto;padding:0 16px;text-align:center">'+
    '<h3 style="margin-bottom:10px">Email me</h3>'+
    '<div style="display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:16px">'+
    '<code style="background:var(--chip);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font-size:.9rem">'+email+'</code>'+
    '<button class="plink" onclick="copyTxt(\''+email+'\',this)">Copy</button></div>'+
    '<p style="color:var(--mut);font-size:.85rem;margin-bottom:12px">Open in your preferred email app:</p>'+
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'+
    '<a class="plink" href="https://mail.google.com/mail/?view=cm&fs=1&to='+email+'" target="_blank" rel="noopener">Gmail</a>'+
    '<a class="plink" href="https://outlook.office.com/mail/deeplink/compose?to='+email+'" target="_blank" rel="noopener">Outlook</a>'+
    '<a class="plink" href="mailto:'+email+'">Default mail app</a></div></div>';
    openViewer('Contact \u00b7 Email');
  }else{
    vBody.innerHTML='<div style="max-width:480px;margin:26px auto;padding:0 16px;text-align:center">'+
    '<h3 style="margin-bottom:10px">Call or message me</h3>'+
    '<div style="display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:16px">'+
    '<code style="background:var(--chip);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font-size:.9rem">'+phoneNice+'</code>'+
    '<button class="plink" onclick="copyTxt(\''+phone+'\',this)">Copy</button></div>'+
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'+
    '<a class="plink" href="tel:'+phone+'">\ud83d\udcde Phone call</a>'+
    '<a class="plink" href="https://wa.me/601111063798" target="_blank" rel="noopener">\ud83d\udcac WhatsApp</a></div></div>';
    openViewer('Contact \u00b7 Call');
  }
}

/* footer "let's connect" opens the chat warmly */
function openConnect(){
  box.classList.add('open');
  if(!opened){opened=true;}
  bot("I'm really glad you'd like to connect, and I'm happy to connect with you too! \ud83d\ude4c Here are my contact details, pick whichever is easiest for you:");
  bot(CONTACT_HTML);
  chips(PERSONA_QS[persona]||SUGGESTED);
  stage=4;
  inp.focus();
}

/* draggable chat button: drag to move, tap to open */
(function(){
  let sx,sy,ox,oy,moved=false,down=false;
  function start(e){
    down=true;moved=false;
    const p=e.touches?e.touches[0]:e; sx=p.clientX; sy=p.clientY;
    const r=fab.getBoundingClientRect(); ox=r.left; oy=r.top;
  }
  function move(e){
    if(!down) return;
    const p=e.touches?e.touches[0]:e;
    const dx=p.clientX-sx, dy=p.clientY-sy;
    if(Math.abs(dx)>6||Math.abs(dy)>6) moved=true;
    if(moved){
      if(e.cancelable) e.preventDefault();
      const x=Math.min(Math.max(4,ox+dx),window.innerWidth-fab.offsetWidth-4);
      const y=Math.min(Math.max(4,oy+dy),window.innerHeight-fab.offsetHeight-4);
      fab.style.left=x+'px'; fab.style.top=y+'px';
      fab.style.right='auto'; fab.style.bottom='auto';
    }
  }
  function end(){ down=false; }
  fab.addEventListener('mousedown',start); fab.addEventListener('touchstart',start,{passive:true});
  window.addEventListener('mousemove',move); window.addEventListener('touchmove',move,{passive:false});
  window.addEventListener('mouseup',end); window.addEventListener('touchend',end);
  fab.addEventListener('click',function(e){ if(moved){e.stopImmediatePropagation();e.preventDefault();} },true);
})();

/* Best-effort deterrents. Note: client-side code can never be fully protected. */
(function(){
  // block right-click except where selection/copy is a feature (doc text, chat input)
  document.addEventListener('contextmenu',function(e){
    if(e.target.closest('pre, input, textarea, .chat-in')) return;
    e.preventDefault();
  });
  // block common devtools/save/print/view-source shortcuts
  document.addEventListener('keydown',function(e){
    const k=e.key.toLowerCase();
    if(e.key==='F12'
      || (e.ctrlKey&&e.shiftKey&&(k==='i'||k==='c'||k==='j'))
      || (e.ctrlKey&&(k==='u'||k==='s'||k==='p'))){
      e.preventDefault(); e.stopPropagation();
    }
  });
  // block image drag + page drag-and-drop
  document.addEventListener('dragstart',function(e){ if(e.target.tagName==='IMG') e.preventDefault(); });
  window.addEventListener('dragover',function(e){e.preventDefault();},false);
  window.addEventListener('drop',function(e){e.preventDefault();},false);
  // block printing via window.print
  window.print=function(){ alert("This portfolio is intended to be viewed online. Printing has been disabled."); };
})();
