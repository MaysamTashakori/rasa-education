'use strict';
/* ===== utils ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PD='۰۱۲۳۴۵۶۷۸۹';
const faD=s=>String(s).replace(/\d/g,d=>PD[d]).replace(/\./g,'٫');
const fa=(n,dec=1)=>{if(n==null||!isFinite(n))return '—';const r=Math.round(n*10**dec)/10**dec;return faD(Object.is(r,-0)?0:r)};
const toEn=s=>String(s??'').replace(/[۰-۹]/g,d=>PD.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫،,]/g,'.').trim();
const num=s=>{const t=toEn(s);if(t==='')return null;const v=parseFloat(t);return isNaN(v)?null:v};
const p2=n=>String(n).padStart(2,'0');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=a=>a.reduce((x,y)=>x+y,0);
const hm=min=>{min=Math.round(min||0);const h=Math.floor(min/60),m=min%60;return h?(m?`${faD(h)} ساعت و ${faD(m)} دقیقه`:`${faD(h)} ساعت`):`${faD(m)} دقیقه`};
const hmS=min=>{min=Math.round(min||0);return faD(Math.floor(min/60))+':'+faD(p2(min%60))};
const hrs=min=>fa((min||0)/60,1);
/* ===== Jalali (jalaali-js algorithm) ===== */
const dv=(a,b)=>~~(a/b), md=(a,b)=>a-~~(a/b)*b;
function jalCal(jy){const br=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
 let bl=br.length,gy=jy+621,leapJ=-14,jp=br[0],jm,jump,leap,n,i;
 for(i=1;i<bl;i++){jm=br[i];jump=jm-jp;if(jy<jm)break;leapJ+=dv(jump,33)*8+dv(md(jump,33),4);jp=jm}
 n=jy-jp;leapJ+=dv(n,33)*8+dv(md(n,33)+3,4);if(md(jump,33)===4&&jump-n===4)leapJ++;
 const leapG=dv(gy,4)-dv((dv(gy,100)+1)*3,4)-150,march=20+leapJ-leapG;
 if(jump-n<6)n=n-jump+dv(jump+4,33)*33;leap=md(md(n+1,33)-1,4);if(leap===-1)leap=4;return{leap,gy,march}}
function g2d(gy,gm,gd){let d=dv((gy+dv(gm-8,6)+100100)*1461,4)+dv(153*md(gm+9,12)+2,5)+gd-34840408;return d-dv(dv(gy+100100+dv(gm-8,6),100)*3,4)+752}
function d2g(jdn){let j=4*jdn+139361631;j=j+dv(dv(4*jdn+183187720,146097)*3,4)*4-3908;const i=dv(md(j,1461),4)*5+308;const gd=dv(md(i,153),5)+1,gm=md(dv(i,153),12)+1,gy=dv(j,1461)-100100+dv(8-gm,6);return{gy,gm,gd}}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-dv(jm,7)*(jm-7)+jd-1}
function d2j(jdn){const gy=d2g(jdn).gy;let jy=gy-621;const r=jalCal(jy);const f=g2d(gy,3,r.march);let k=jdn-f,jm,jd;
 if(k>=0){if(k<=185){jm=1+dv(k,31);jd=md(k,31)+1;return{jy,jm,jd}}k-=186}else{jy--;k+=179;if(r.leap===1)k++}
 jm=7+dv(k,30);jd=md(k,30)+1;return{jy,jm,jd}}
const MON=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const WD=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const WDS=['ش','ی','د','س','چ','پ','ج'];
const isoJdn=iso=>{const[y,m,d]=iso.split('-').map(Number);return g2d(y,m,d)};
const jdnIso=j=>{const g=d2g(j);return `${g.gy}-${p2(g.gm)}-${p2(g.gd)}`};
const addD=(iso,n)=>jdnIso(isoJdn(iso)+n);
const diffD=(a,b)=>isoJdn(a)-isoJdn(b);
const J=iso=>d2j(isoJdn(iso));
const wdi=iso=>(isoJdn(iso)+2)%7; // 0 = Saturday
const isoOf=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const today=()=>isoOf(new Date());
const jIso=(jy,jm,jd)=>jdnIso(j2d(jy,jm,jd));
const jLen=(jy,jm)=>jm<=6?31:jm<=11?30:(jalCal(jy).leap===0?30:29);
const jL=iso=>{const j=J(iso);return `${faD(j.jd)} ${MON[j.jm-1]} ${faD(j.jy)}`};
const jS=iso=>{const j=J(iso);return `${faD(j.jd)} ${MON[j.jm-1]}`};
const jN=iso=>{const j=J(iso);return faD(`${j.jy}/${p2(j.jm)}/${p2(j.jd)}`)};
const jW=iso=>`${WD[wdi(iso)]} ${jL(iso)}`;
const weekStart=iso=>addD(iso,-wdi(iso));
const tsTxt=ts=>{const d=new Date(ts);return `${jL(isoOf(d))} — ساعت ${faD(p2(d.getHours())+':'+p2(d.getMinutes()))}`};
const tsFile=ts=>{const d=new Date(ts),j=J(isoOf(d));return `${j.jy}-${p2(j.jm)}-${p2(j.jd)}_${p2(d.getHours())}-${p2(d.getMinutes())}`};
/* ===== crypto vault (AES-256-GCM + PBKDF2-SHA256) ===== */
const te=new TextEncoder(),td=new TextDecoder();
const b64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const ITER=210000;
async function deriveKey(pass,salt,iter=ITER){
 if(!(window.crypto&&crypto.subtle))throw new Error('nocrypto');
 const base=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function enc(key,obj){const iv=rnd(12);const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,te.encode(JSON.stringify(obj)));return{iv:b64(iv),ct:b64(new Uint8Array(ct))}}
async function dec(key,box){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},key,unb64(box.ct));return JSON.parse(td.decode(pt))}
/* ===== IndexedDB key-value (fallback localStorage) ===== */
const KV=(()=>{let dbp=null;const open=()=>dbp||(dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('mst-study',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}));
 const tx=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction('kv',mode),st=t.objectStore('kv');const r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})};
 const ls={get:async k=>{const v=localStorage.getItem('kv:'+k);return v?JSON.parse(v):undefined},set:async(k,v)=>localStorage.setItem('kv:'+k,JSON.stringify(v)),del:async k=>localStorage.removeItem('kv:'+k),keys:async p=>Object.keys(localStorage).filter(k=>k.startsWith('kv:'+p)).map(k=>k.slice(3))};
 const idb={get:k=>tx('readonly',s=>s.get(k)),set:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k)),keys:async p=>(await tx('readonly',s=>s.getAllKeys())).filter(k=>String(k).startsWith(p))};
 let impl=null;const pick=async()=>{if(impl)return impl;try{await open();impl=idb}catch(e){impl=ls}return impl};
 return{get:async k=>(await pick()).get(k),set:async(k,v)=>(await pick()).set(k,v),del:async k=>(await pick()).del(k),keys:async p=>(await pick()).keys(p)}})();
/* ===== UI helpers ===== */
function toast(msg,ms=2600){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),ms)}
function openOv(id){$('#'+id).classList.add('on');document.body.style.overflow='hidden'}
function closeOv(id){$('#'+id).classList.remove('on');if(!$$('.ov.on').length)document.body.style.overflow=''}
function buzz(p=18){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
function beep(){try{const a=new (window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach((t,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=[660,880,1100][i];o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(.0001,a.currentTime+t);g.gain.exponentialRampToValueAtTime(.3,a.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+t+.22);o.start(a.currentTime+t);o.stop(a.currentTime+t+.25)})}catch(e){}}
function confetti(){const c=$('#confetti'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cols=['#FFB547','#FF7E5F','#E35DFF','#4BE8E2','#CFF56E','#4BE6A8'];
 const ps=Array.from({length:140},()=>({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.55,vx:(Math.random()-.5)*13,vy:-Math.random()*15-6,r:Math.random()*6+3,c:cols[Math.random()*6|0],a:Math.random()*6,s:Math.random()*.3}));
 let f=0;(function tick(){x.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.vy+=.42;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);x.restore()});if(++f<150)requestAnimationFrame(tick);else x.clearRect(0,0,c.width,c.height)})()}
function countUp(root){$$('[data-cu]',root).forEach(el=>{const v=+el.dataset.cu,dec=+(el.dataset.dec||0);if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=fa(v,dec);return}const t0=performance.now();(function st(t){const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);el.textContent=fa(v*e,dec);if(k<1)requestAnimationFrame(st)})(t0)})}
function wrapTxt(s,max){const w=String(s).split(/\s+/);const out=[];let cur='';w.forEach(x=>{if((cur+' '+x).trim().length>max&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out}
function ring(pct,size=92,sw=10,label){const r=(size-sw)/2,C=2*Math.PI*r,p=clamp(pct||0,0,100);
 return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><defs><linearGradient id="rg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--h4)"/><stop offset="1" stop-color="var(--h3)"/></linearGradient></defs><circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--card2)" stroke-width="${sw}" fill="none"/><circle class="p" cx="${size/2}" cy="${size/2}" r="${r}" stroke="url(#rg${size})" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-p/100)}"/></svg><div class="rv" style="font-size:${size/4.4}px">${label??(fa(p,0)+'٪')}</div></div>`}
/* ===== charts ===== */
const CH={};
function niceStep(range,t=4){if(range<=0)return 1;const raw=range/t,p=Math.pow(10,Math.floor(Math.log10(raw))),n=raw/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function svgOpen(W,H,cls=''){return `<svg class="c ${cls}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`}
function chartBar(o,W){
 const n=o.bars.length;if(!n)return '<div class="empty">داده‌ای برای نمایش نیست</div>';
 const H=o.height||250,padL=40,padR=8,padT=26,lines=Math.max(...o.bars.map(b=>b.l2?2:1));
 let slot=(W-padL-padR)/n;const minSlot=o.minSlot||22;if(slot<minSlot){slot=minSlot;W=padL+padR+slot*n}
 const padB=14+lines*15,pw=W-padL-padR,ph=H-padT-padB,bw=Math.min(o.maxBw||40,slot*.62);
 const tot=o.bars.map(b=>sum(b.s.map(s=>s.v)));let mx=Math.max(...tot,o.goal||0,1e-6);const st=niceStep(mx);mx=Math.ceil(mx/st)*st;
 const y=v=>padT+ph-(v/mx)*ph,f=o.fmt||(v=>fa(v,1));
 let s=svgOpen(W,H);
 for(let t=0;t<=mx+1e-9;t+=st)s+=`<line class="gridm" x1="${padL}" x2="${W-padR}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${padL-6}" y="${y(t)+4}" text-anchor="end">${f(t)}</text>`;
 const vfs=clamp(slot*.42,9,12.5),rot=slot<26;
 o.bars.forEach((b,i)=>{const cx=padL+slot*i+slot/2;let acc=0;
  b.s.forEach(sg=>{if(sg.v<=0)return;const y1=y(acc+sg.v),y0=y(acc);s+=`<rect class="b" style="--d:${i*35}ms" x="${cx-bw/2}" y="${y1}" width="${bw}" height="${Math.max(.5,y0-y1)}" rx="${Math.min(6,bw/4)}" fill="${sg.c}" data-tip="${esc(b.full||b.l)}${sg.n?' — '+esc(sg.n):''}: ${esc(f(sg.v))}${o.unit?' '+o.unit:''}"/>`;acc+=sg.v});
  if(tot[i]>0)s+=rot?`<text class="vl" font-size="${vfs}" transform="translate(${cx+vfs/3},${y(tot[i])-4}) rotate(-90)">${f(tot[i])}</text>`:`<text class="vl" font-size="${vfs}" x="${cx}" y="${y(tot[i])-6}" text-anchor="middle">${f(tot[i])}</text>`;
  s+=`<text class="ax" x="${cx}" y="${padT+ph+16}" text-anchor="middle"${b.hl?' style="fill:var(--glow);font-weight:900"':''}>${esc(b.l)}</text>`;
  if(b.l2)s+=`<text class="ax" x="${cx}" y="${padT+ph+31}" text-anchor="middle" font-size="11">${esc(b.l2)}</text>`});
 if(o.goal){s+=`<line class="goal" x1="${padL}" x2="${W-padR}" y1="${y(o.goal)}" y2="${y(o.goal)}"/><text x="${W-padR}" y="${y(o.goal)-5}" text-anchor="end" font-size="11.5" font-weight="800" style="fill:var(--glow)">هدف ${f(o.goal)}</text>`}
 return s+'</svg>'}
function chartLine(o,W){
 const n=o.labels.length;if(!n)return '<div class="empty">هنوز داده‌ای ثبت نشده است</div>';
 const H=o.height||270,padL=46,padR=22,padT=28;const wl=o.labels.map(l=>wrapTxt(l,12).slice(0,3));const ml=Math.max(...wl.map(a=>a.length));
 let slot=(W-padL-padR)/Math.max(1,n-1);const minSlot=o.minSlot||70;if(n>1&&slot<minSlot){slot=minSlot;W=padL+padR+slot*(n-1)}
 const padB=12+ml*15+(o.l2?15:0),pw=W-padL-padR,ph=H-padT-padB;
 const vals=o.series.flatMap(s=>s.v.filter(v=>v!=null));(o.refs||[]).forEach(r=>vals.push(r.v));
 if(!vals.length)return '<div class="empty">داده‌ای برای نمایش نیست</div>';
 let lo=o.min??Math.min(...vals),hi=o.max??Math.max(...vals);if(hi===lo){hi+=1;lo-=1}const pad=(hi-lo)*.12;if(o.min==null)lo-=pad;if(o.max==null)hi+=pad;
 const st=niceStep(hi-lo);lo=Math.floor(lo/st)*st;hi=Math.ceil(hi/st)*st;
 const x=i=>n===1?padL+pw/2:padL+slot*i,y=v=>padT+ph-(v-lo)/(hi-lo)*ph,f=o.fmt||(v=>fa(v,0));
 let s=svgOpen(W,H);s+=`<defs>${o.series.map((se,k)=>`<linearGradient id="lg${o.id||''}${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.c}" stop-opacity=".32"/><stop offset="1" stop-color="${se.c}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
 for(let t=lo;t<=hi+1e-9;t+=st)s+=`<line class="gridm" x1="${padL}" x2="${W-padR}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${padL-6}" y="${y(t)+4}" text-anchor="end">${f(t)}</text>`;
 (o.refs||[]).forEach(r=>{s+=`<line class="goal" style="stroke:${r.c||'var(--glow)'}" x1="${padL}" x2="${W-padR}" y1="${y(r.v)}" y2="${y(r.v)}"/><text x="${padL+4}" y="${y(r.v)-5}" font-size="11.5" font-weight="800" style="fill:${r.c||'var(--glow)'}">${esc(r.l)} ${f(r.v)}</text>`});
 const showV=o.showValues!==false&&o.series.length<=3;
 o.series.forEach((se,k)=>{const pts=se.v.map((v,i)=>v==null?null:[x(i),y(v),v,i]).filter(Boolean);if(!pts.length)return;
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);L=Math.ceil(L)+2;
  if(o.series.length===1&&pts.length>1)s+=`<path d="${d} L${pts[pts.length-1][0]} ${padT+ph} L${pts[0][0]} ${padT+ph}Z" fill="url(#lg${o.id||''}${k})"/>`;
  s+=`<path class="ln" style="--L:${L}" d="${d}" fill="none" stroke="${se.c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(pts.length>1&&o.series.length<=2)s+=`<path class="comet" style="--L:${L};color:${se.c};stroke-dasharray:22 ${L}" d="${d}" fill="none" stroke="${se.c}"/>`;
  pts.forEach(p=>{s+=`<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--bg)" stroke="${se.c}" stroke-width="3" data-tip="${esc(o.labels[p[3]])} — ${esc(se.n)}: ${esc(f(p[2]))}"/>`;
   if(showV){const below=k%2===1;s+=`<text class="vl" x="${p[0]}" y="${below?p[1]+20:p[1]-11}" text-anchor="middle" style="fill:${o.series.length>1?se.c:'var(--ink)'}">${f(p[2])}</text>`}})});
 wl.forEach((ls,i)=>{ls.forEach((t,j)=>s+=`<text class="ax" x="${x(i)}" y="${padT+ph+18+j*15}" text-anchor="middle">${esc(t)}</text>`);if(o.l2)s+=`<text class="ax" x="${x(i)}" y="${padT+ph+18+ls.length*15}" text-anchor="middle" font-size="11">${esc(o.l2[i])}</text>`});
 return s+'</svg>'}
function chartDonut(o){const items=o.items.filter(i=>i.v>0),T=sum(items.map(i=>i.v));if(!T)return '<div class="empty">در این بازه مطالعه‌ای ثبت نشده است</div>';
 const S=190,r=70,sw=28,C=2*Math.PI*r;let acc=0,s=`<svg class="c" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><g transform="rotate(-90 ${S/2} ${S/2})">`;
 items.forEach((it,i)=>{const L=it.v/T*C;s+=`<circle cx="${S/2}" cy="${S/2}" r="${r}" fill="none" stroke="${it.c}" stroke-width="${sw}" stroke-dasharray="${Math.max(0,L-2)} ${C}" stroke-dashoffset="${-acc}" data-tip="${esc(it.n)}: ${esc((o.fmt||fa)(it.v))} (${fa(it.v/T*100,0)}٪)" style="animation:pop .6s both;animation-delay:${i*60}ms;transform-origin:center;transform-box:view-box"/>`;acc+=L});
 s+=`</g><text x="${S/2}" y="${S/2-2}" text-anchor="middle" font-size="26" font-weight="900" style="fill:var(--ink)">${(o.fmt||fa)(T)}</text><text x="${S/2}" y="${S/2+20}" text-anchor="middle" class="ax">${esc(o.unit||'')}</text></svg>`;
 const lg=items.slice().sort((a,b)=>b.v-a.v).map(it=>`<span><i class="dot" style="background:${it.c}"></i>${esc(it.n)}<b class="lv">${(o.fmt||fa)(it.v)} · ${fa(it.v/T*100,0)}٪</b></span>`).join('');
 return `<div class="donut-wrap">${s}<div class="legend col">${lg}</div></div>`}
function chartHeat(o,W){const weeks=o.weeks||53,cs=o.cell||14,g=3,lw=46,top=20;const end=o.end,last=weekStart(end),start=addD(last,-(weeks-1)*7);
 const Wd=lw+weeks*(cs+g)+4,H=top+7*(cs+g)+2;let s=svgOpen(Wd,H,'heat');s=s.replace('style="max-width:100%;height:auto"','');
 [0,2,4,6].forEach(d=>s+=`<text class="ax" x="${lw-6}" y="${top+d*(cs+g)+cs-2}" text-anchor="end" font-size="11">${WD[d]}</text>`);
 let lastX=-99;for(let w=0;w<weeks;w++){const x=lw+w*(cs+g);
  for(let d=0;d<7;d++){const iso=addD(start,w*7+d);if(iso>end)continue;const m=o.data[iso]||0,lv=o.level(m);const j=J(iso);
   if(j.jd===1&&x-lastX>cs*3){s+=`<text class="ax" x="${x}" y="12" font-size="11.5" font-weight="700">${MON[j.jm-1]}</text>`;lastX=x}
   s+=`<rect class="hc" style="--d:${w*12}ms" x="${x}" y="${top+d*(cs+g)}" width="${cs}" height="${cs}" rx="3.5" fill="var(--h${lv})" ${iso===end?'stroke="var(--glow)" stroke-width="2"':''} data-tip="${esc(jW(iso))}: ${m?esc(hm(m)):'بدون مطالعه'}"/>`}}
 return s+'</svg>'}
function renderChart(el,o,forceW){const W=forceW||Math.floor(el.clientWidth||el.parentElement?.clientWidth||600);
 const h=o.type==='bar'?chartBar(o,W):o.type==='line'?chartLine(o,W):o.type==='donut'?chartDonut(o):chartHeat(o,W);
 el.innerHTML=h+(o.type!=='heat'&&!forceW?'<span class="zoom-hint">⤢ بزرگ‌نمایی و جدول</span>':'');
 const sv=el.querySelector('svg');if(sv&&sv.getAttribute('width')>W+1){el.classList.add('scroll');el.scrollLeft=el.scrollWidth}else el.classList.remove('scroll')}
function chart(el,id,o){if(!el)return;o.id=id;CH[id]=o;el.dataset.ch=id;el.classList.add('chart-box');renderChart(el,o)}
function tableOf(o){if(o.table)return o.table();
 if(o.type==='bar'){const names=[...new Set(o.bars.flatMap(b=>b.s.filter(s=>s.n).map(s=>s.n)))];const head=['دوره',...(names.length>1?names:[]),'جمع'+(o.unit?' ('+o.unit+')':'')];
  return{head,rows:o.bars.map(b=>[b.full||[b.l,b.l2].filter(Boolean).join(' '),...(names.length>1?names.map(n=>{const g=b.s.find(s=>s.n===n);return g?fa(g.v,1):'—'}):[]),fa(sum(b.s.map(s=>s.v)),1)])}}
 if(o.type==='line')return{head:['مورد',...o.series.map(s=>s.n)],rows:o.labels.map((l,i)=>[l,...o.series.map(s=>s.v[i]==null?'—':(o.fmt||fa)(s.v[i]))])};
 if(o.type==='donut'){const T=sum(o.items.map(i=>i.v));return{head:['مورد','مقدار','سهم'],rows:o.items.filter(i=>i.v>0).map(i=>[i.n,(o.fmt||fa)(i.v),fa(i.v/T*100,0)+'٪'])}}
 return{head:[],rows:[]}}
function tableHtml(t){return `<div class="tw"><table class="t"><thead><tr>${t.head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'n':''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function zoomChart(id){const o=CH[id];if(!o)return;$('#czT').textContent=o.title||'نمودار';$('#czS').textContent=o.sub||'';
 const body=$('#czB');let mode='chart';const draw=()=>{if(mode==='chart'){body.innerHTML='<div class="chart-box" id="czC"></div>';const W=Math.max(body.clientWidth-4,320);renderChart($('#czC'),{...o,height:(o.height||250)*1.35,minSlot:(o.minSlot||22)*1.2},W)}else body.innerHTML=tableHtml(tableOf(o));$('#czTab').textContent=mode==='chart'?'▦ جدول داده':'◔ نمودار'};
 $('#czTab').onclick=()=>{mode=mode==='chart'?'table':'chart';draw()};
 $('#czCsv').onclick=()=>{const t=tableOf(o);const csv='\ufeff'+[t.head,...t.rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');downloadFile((o.title||'chart')+'.csv',csv,'text/csv')};
 openOv('ovZoom');requestAnimationFrame(draw)}
function downloadFile(name,content,type){const b=content instanceof Blob?content:new Blob([content],{type:type+';charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
async function shareOrDownload(name,content,type,title){const file=new File([content],name,{type});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title});return 'shared'}}catch(e){if(e.name==='AbortError')return 'abort'}
 downloadFile(name,content,type);return 'downloaded'}
/* tooltip + card spotlight */
(()=>{let tip;const show=(e,t)=>{tip=tip||$('#tip');tip.textContent=t;tip.classList.add('on');const x=Math.min(e.clientX+12,innerWidth-tip.offsetWidth-8),y=Math.max(8,e.clientY-tip.offsetHeight-12);tip.style.left=x+'px';tip.style.top=y+'px'};
 document.addEventListener('pointermove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)show(e,t.dataset.tip);else if(tip)tip.classList.remove('on');const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}},{passive:true});
 document.addEventListener('click',e=>{const t=e.target.closest('[data-tip]');if(t&&e.pointerType!=='mouse'){show(e,t.dataset.tip);clearTimeout(show._t);show._t=setTimeout(()=>tip.classList.remove('on'),2200);return}
  const cb=e.target.closest('.chart-box[data-ch]');if(cb&&!cb.closest('#ovZoom')&&CH[cb.dataset.ch]&&CH[cb.dataset.ch].type!=='heat')zoomChart(cb.dataset.ch)})})();
/* Jalali date picker field */
function jdField(id,iso){const el=document.getElementById(id);if(!el)return;const j=J(iso||today()),ty=J(today()).jy;
 const ys=[];for(let y=ty-3;y<=ty+2;y++)ys.push(y);
 el.innerHTML=`<select class="in" data-p="d"></select><select class="in" data-p="m">${MON.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}</select><select class="in" data-p="y">${ys.map(y=>`<option value="${y}">${faD(y)}</option>`).join('')}</select>`;
 el.classList.add('jd');const [sd,sm,sy]=['d','m','y'].map(p=>el.querySelector(`[data-p=${p}]`));sm.value=j.jm;sy.value=j.jy;
 const fill=()=>{const L=jLen(+sy.value,+sm.value),cur=+sd.value||j.jd;sd.innerHTML=Array.from({length:L},(_,i)=>`<option value="${i+1}">${faD(i+1)}</option>`).join('');sd.value=Math.min(cur,L)};
 sd.value=j.jd;fill();sd.value=Math.min(j.jd,jLen(j.jy,j.jm));sm.onchange=sy.onchange=fill}
const jdGet=id=>{const el=document.getElementById(id);const g=p=>+el.querySelector(`[data-p=${p}]`).value;return jIso(g('y'),g('m'),g('d'))};
