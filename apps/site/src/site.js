'use strict';
// رسا آموزش — storefront + profile + command center (vanilla SPA, history routing)
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PDG='۰۱۲۳۴۵۶۷۸۹',fa=v=>String(v??'').replace(/\d/g,d=>PDG[d]),num=n=>fa(Number(n||0).toLocaleString('en-US')).replace(/,/g,'٬');
const jd=t=>t?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'}).format(new Date(t)):'—';
const jdt=t=>t?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'—';
const LOGO='<svg viewBox="0 0 256 256" aria-hidden="true"><rect width="256" height="256" rx="56" fill="#080808"/><rect x="44" y="92" width="84" height="34" rx="17" fill="#FAFAFA"/><rect x="44" y="140" width="128" height="34" rx="17" fill="#F4D438"/><rect x="44" y="188" width="172" height="34" rx="17" fill="#FAFAFA"/><circle cx="72" cy="56" r="20" fill="#F4D438"/></svg>';
const KIND={lesson:'درس تعاملی',booklet:'جزوه',quiz:'آزمون',report:'گزارش و کارنامه',planner:'برنامه‌ریز',app:'سامانه'};
const ROLE={founder:'بنیان‌گذار',admin:'مدیر',editor:'ویراستار',support:'پشتیبان',marketer:'بازاریاب',creator:'سازنده',customer:'مشتری'};
const STATUS={live:'منتشرشده',draft:'پیش‌نویس',soon:'به‌زودی',archived:'بایگانی',open:'باز',answered:'پاسخ داده شد',closed:'بسته',review:'در انتظار تأیید',approved:'تأیید شد',rejected:'رد شد',pending:'در انتظار',ok:'منتشر',hidden:'پنهان',active:'فعال',paused:'متوقف'};
const S={me:null,roles:[],store:null,cart:JSON.parse(localStorage.getItem('ra:cart')||'[]'),ref:new URLSearchParams(location.search).get('utm_source')||new URLSearchParams(location.search).get('ref')||sessionStorage.getItem('ra:ref')||''};
if(S.ref)sessionStorage.setItem('ra:ref',S.ref);
const isStaff=()=>S.roles.some(r=>['founder','admin','editor','support','marketer'].includes(r));
const setMeta=(title,desc)=>{document.title=title;const m=document.querySelector('meta[name="description"]');if(m&&desc)m.content=desc};
const pathOf=pid=>(S.store?.paths||[]).find(p=>(p.steps||[]).some(s=>s.id===pid));
const toman=n=>n?`${num(n)}<span class="dim" style="font-size:11px;font-weight:700"> تومان</span>`:'<span class="free">رایگان</span>';
const cartTotal=()=>S.cart.reduce((s,id)=>s+(S.store?.products.find(p=>p.id===id)?.price||0),0);
const theme=localStorage.getItem('ra:theme');if(theme==='light')document.documentElement.classList.add('light');

async function api(p,o={}){
  const r=await fetch('/api/'+p,{method:o.method||(o.body?'POST':'GET'),headers:o.body?{'content-type':'application/json'}:{},body:o.body?JSON.stringify(o.body):undefined,credentials:'same-origin'});
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok){const e=new Error(j?.error||('خطا '+fa(r.status)));e.status=r.status;throw e}return j;
}
const ev=(name,pid,src)=>fetch('/api/ev',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,pid,src:src||S.ref})}).catch(()=>{});
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2600)}
function modal(html,cls='modal'){closeModal();const o=document.createElement('div');o.className='ov';o.id='ov';o.innerHTML=`<div class="${cls}" role="dialog" aria-modal="true">${html}</div>`;o.addEventListener('click',e=>{if(e.target===o)closeModal()});document.body.append(o);return o.firstChild}
function closeModal(){$('#ov')?.remove()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
const saveCart=()=>{localStorage.setItem('ra:cart',JSON.stringify(S.cart));const b=$('#cartN');if(b){b.textContent=fa(S.cart.length);b.hidden=!S.cart.length}};
const go=(path)=>{history.pushState(null,'',path);route();scrollTo(0,0)};
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="/"]');if(!a||a.target||e.ctrlKey||e.metaKey||a.hasAttribute('download'))return;const h=a.getAttribute('href');if(/^\/(p\/[^/]+\/(preview|open|download)|planner|kids|brand|api)/.test(h))return;e.preventDefault();go(h)});
addEventListener('popstate',route);

function cover(p,big){const st=p.meta?.steps?Math.min(5,Math.ceil(p.meta.steps/6)):3;
  return `<div class="cover" style="--c:${esc(p.color||'#F4D438')}">${p.status==='soon'?'<span class="soon">به‌زودی</span>':''}<div class="steps">${Array.from({length:st},(_,i)=>`<i style="width:${18+i*12}px"></i>`).join('')}</div><div class="ic">${esc(p.icon||'📘')}</div><div class="ct" ${big?'style="font-size:24px"':''}>${esc(p.title)}</div></div>`}
const catOf=id=>S.store?.categories.find(c=>c.id===id);
function pcard(p){const c=catOf(p.cat);
  return `<article class="pc" data-go="/p/${esc(p.id)}">${cover(p)}<div class="bd"><div class="row wrapr"><span class="tag" style="--c:${esc(c?.color||'#F4D438')}">${esc(c?.title||'')}</span><span class="tag" style="--c:var(--mute)">${KIND[p.kind]||''}</span></div>
  <h3 style="font-size:16px">${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="ft"><span>${p.status==='soon'?'<span class="dim">به‌زودی</span>':toman(p.price)}</span>
  <span class="row">${pathOf(p.id)?'<span class="tag" style="--c:var(--vi)">🧭 مسیر</span>':''}${p.rating?.n?`<span class="dim">★ ${fa(p.rating.a)}</span>`:''}${p.owned?'<span class="tag" style="--c:var(--ok)">در کتابخانه</span>':''}</span></div></div></article>`}
document.addEventListener('click',e=>{const c=e.target.closest('[data-go]');if(c&&!e.target.closest('button,a'))go(c.dataset.go)});

function nav(){
  const n=$('#nav');const path=location.pathname;
  const LINKS=[['/c','کاتالوگ',p=>p.startsWith('/c')],['/quiz','آزمون آنلاین',p=>p==='/quiz'],['/services','خدمات',p=>p==='/services'],['/planner/','برنامه‌ریز',()=>false],['/kids/','کلاس دوم',()=>false],['/support','پشتیبانی',p=>p==='/support']];
  const MORE=[['/pricing','تعرفه'],['/creators','سازندگان'],['/terms','قوانین'],['/about','دربارهٔ ما']];
  n.innerHTML=`<div class="wrap"><a class="brand" href="/">${LOGO}<span>رسا آموزش<small>RASA AMOZESH</small></span></a>
  <nav class="links">${LINKS.map(([h,t,on])=>`<a href="${h}" class="${on(path)?'on':''}">${t}</a>`).join('')}${isStaff()?`<a href="/admin" class="${path.startsWith('/admin')?'on':''}">مرکز فرمان</a>`:''}</nav>
  <span class="sp"></span><button class="ib" id="thm" title="تغییر تم" aria-label="تغییر تم">◐</button>
  <button class="ib" id="cartB" aria-label="سبد">🛍<b id="cartN" ${S.cart.length?'':'hidden'}>${fa(S.cart.length)}</b></button>
  <button class="ib mbtn" id="mbtn" aria-label="منو">☰</button>
  ${S.me?`<a class="btn sm" href="/me">${esc(S.me.name.split(' ')[0])}</a>`:'<button class="btn sm y" id="loginB">ورود / ثبت‌نام</button>'}</div>
  <div class="mmenu" id="mmenu">${LINKS.map(([h,t])=>`<a href="${h}">${t}</a>`).join('')}${MORE.map(([h,t])=>`<a href="${h}">${t}</a>`).join('')}${isStaff()?'<a href="/admin">مرکز فرمان</a>':''}<a href="/me">حساب من</a></div>`;
  $('#thm').onclick=()=>{const l=document.documentElement.classList.toggle('light');localStorage.setItem('ra:theme',l?'light':'dark')};
  $('#cartB').onclick=cartDrawer;$('#loginB')&&($('#loginB').onclick=()=>authModal());
  const mm=$('#mmenu');$('#mbtn').onclick=()=>mm.classList.toggle('open');
  mm.onclick=e=>{if(e.target.tagName==='A')mm.classList.remove('open')};
}
function foot(){$('#foot').innerHTML=`<div class="wrap"><div><a class="brand" href="/">${LOGO}<span>رسا آموزش</span></a><p>گام‌به‌گام، تا رسیدن.<br>پلتفرم یادگیری گام‌به‌گام برای دانش‌آموز، خانواده، معلم و مدرسه.</p></div>
<div><b>محصولات</b><a href="/c">کاتالوگ</a><a href="/planner/">برنامه‌ریز</a><a href="/kids/">سامانهٔ کلاس دوم</a></div><div><b>همکاری</b><a href="/creators">سازندگان محتوا</a><a href="/me#support">پشتیبانی</a><a href="/brand.html">برندبوک</a><a href="/logo-options.html">گزینه‌های نشان</a></div>
<div><b>اعتماد</b><span>پرداخت امن با زرین‌پال</span><span>دادهٔ کودک فروخته یا برای آموزش مدل استفاده نمی‌شود.</span></div></div>
<div class="wrap mt" style="border-top:1px solid var(--line);padding-top:14px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px"><a href="/about">دربارهٔ ما</a><a href="/terms">قوانین</a><a href="/privacy">حریم خصوصی</a><a href="/refund">بازگشت وجه</a><a href="/contact">تماس با ما</a></div></div>`}

async function loadMe(){try{const m=await api('me');S.me=m.user}catch(e){S.me=null}}
async function loadStore(q=''){S.store=await api('store'+q);S.roles=S.store.roles||[];return S.store}

function authModal(after){
  let mode='login';
  const m=modal('');const draw=()=>{m.innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="font-size:22px">${mode==='login'?'ورود به رسا آموزش':'ساخت حساب رایگان'}</h2><button class="ib" onclick="closeModal()" aria-label="بستن">✕</button></div>
  <p class="mute" style="margin:4px 0 18px">${mode==='login'?'با شمارهٔ موبایل یا ایمیل وارد شوید.':'در کمتر از یک دقیقه؛ همه‌چیز رایگان است.'}</p>
  <form id="af">${mode==='reg'?'<div class="f"><label>نام و نام خانوادگی</label><input class="in" name="name" required autocomplete="name"></div>':''}
  <div class="f"><label>شمارهٔ موبایل یا ایمیل</label><input class="in" name="login" required dir="ltr" autocomplete="username" inputmode="email"></div>
  <div class="f"><label>رمز عبور</label><input class="in" name="password" type="password" required minlength="6" dir="ltr" autocomplete="${mode==='login'?'current-password':'new-password'}"></div>
  ${mode==='reg'?'<div class="f"><label>نام فرزند (اختیاری، برای سامانهٔ کلاس دوم)</label><input class="in" name="child"></div>':''}
  <div class="err" id="ae"></div><button class="btn y" style="width:100%">${mode==='login'?'ورود':'ساخت حساب'}</button></form>
  <p class="dim" style="text-align:center;margin:14px 0 0">${mode==='login'?'حساب ندارید؟ <a href="#" id="sw" class="y">ثبت‌نام رایگان</a>':'حساب دارید؟ <a href="#" id="sw" class="y">ورود</a>'}</p>`;
  $('#sw',m).onclick=e=>{e.preventDefault();mode=mode==='login'?'reg':'login';draw()};
  $('#af',m).onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));$('#ae',m).textContent='';
    try{await api(mode==='login'?'login':'register',{body:mode==='login'?{login:f.login,password:f.password}:{name:f.name,login:f.login,password:f.password,child:f.child?{name:f.child}:undefined,ref:S.ref}});
      closeModal();await loadMe();await loadStore();nav();toast(mode==='login'?'خوش آمدید':'حساب شما ساخته شد');after?after():route()}catch(err){$('#ae',m).textContent=err.message}};
  $('input',m)?.focus()};draw();
}

function cartDrawer(){closeModal();const o=document.createElement('div');o.className='ov';o.id='ov';o.style.justifyContent='flex-start';
  const items=S.cart.map(id=>S.store.products.find(p=>p.id===id)).filter(Boolean);
  o.innerHTML=`<aside class="drawer"><div class="row" style="justify-content:space-between"><h2 style="font-size:20px">سبد شما</h2><button class="ib" onclick="closeModal()">✕</button></div>
  <div style="flex:1;overflow:auto;margin:16px 0">${items.length?items.map(p=>`<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><span style="font-size:26px">${esc(p.icon)}</span><div style="flex:1"><b style="font-size:14px">${esc(p.title)}</b><div class="free" style="font-size:13px">رایگان</div></div><button class="btn sm ghost" data-rm="${esc(p.id)}">حذف</button></div>`).join(''):'<div class="empty"><i>🛍</i>سبد خالی است.<br><a class="y" href="/c" onclick="closeModal()">دیدن کاتالوگ</a></div>'}</div>
  ${items.length?`<div class="card" style="padding:16px"><div class="row" style="justify-content:space-between"><span class="mute">${fa(items.length)} محصول</span><span class="price" style="font-size:22px">${toman(cartTotal())}</span></div><button class="btn y mt" id="co" style="width:100%">${cartTotal()?'ادامه و پرداخت':'دریافت همه'}</button><p class="dim" style="font-size:12px;margin:8px 0 0;text-align:center">${cartTotal()?'پرداخت امن از درگاه زرین‌پال؛ بلافاصله پس از تأیید به کتابخانه اضافه می‌شود.':'پرداختی در کار نیست؛ محصولات فوراً به کتابخانهٔ شما اضافه می‌شوند.'}</p></div>`:''}</aside>`;
  o.addEventListener('click',e=>{if(e.target===o)closeModal();const r=e.target.closest('[data-rm]');if(r){S.cart=S.cart.filter(x=>x!==r.dataset.rm);saveCart();cartDrawer()}});
  document.body.append(o);$('#co',o)&&($('#co',o).onclick=()=>checkout(S.cart));
}
async function checkout(ids){
  if(!S.me)return authModal(()=>checkout(ids));
  try{const r=await api('store/checkout',{body:{items:ids,ref:S.ref}});S.cart=S.cart.filter(x=>!r.items.includes(x));saveCart();
    if(!r.paid){closeModal();const p=await api('pay/request',{body:{order:r.order}});location.href=p.url;return}
    closeModal();await loadStore();
    modal(`<div style="text-align:center"><div style="font-size:54px">🎉</div><h2 style="font-size:22px">به کتابخانهٔ شما اضافه شد</h2><p class="mute">${fa(r.items.length)} محصول. از کتابخانه باز یا دانلودشان کنید.</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn y" href="/me" onclick="closeModal()">رفتن به کتابخانه</a><button class="btn" onclick="closeModal()">ادامهٔ گشت‌وگذار</button></div></div>`);route()}
  catch(e){toast(e.message)}
}
function addCart(id){if(!S.cart.includes(id)){S.cart.push(id);saveCart();ev('cart_add',id)}toast('به سبد اضافه شد')}

const main=()=>$('#main');
const SERVICES=[
  ['۰۱','درس‌های تعاملی','هر درس به گام‌های کوچک شکسته شده؛ با شبیه‌ساز، تمرین و بازخورد فوری — نه فقط خواندن.','درس','#4BE8E2','/c?kind=lesson'],
  ['۰۲','جزوه‌های گام‌به‌گام','جزوهٔ مرحله‌به‌مرحله با تمرین و پاسخ؛ برای مرور و جمع‌بندی.','جزوه','#7C9CFF','/c?kind=booklet'],
  ['۰۳','مسیرهای یادگیری','به‌جای تک‌تک درس، مسیر مرتب از ابتدا تا تسلط — هر مسیر چند گام دارد.','مسیر','#F4D438','#paths'],
  ['۰۴','کارنامهٔ روایی','به‌جای نمره: «بلد است، در حال تمرین، گام بعدی» + خلاصهٔ روشن برای والد.','گزارش','#4BE68A','/p/report-card-math8'],
  ['۰۵','برنامه‌ریز هوشمند','برنامهٔ هفتگی خودکار، مرور فاصله‌دار و پشتیبان رمزدار؛ وب‌اپ نصب‌شدنی.','اپ','#FFB547','/planner/'],
  ['۰۶','سامانهٔ کلاس دوم','روال روزانهٔ کودک: ستاره، مشق، کیف فردا و ۱۱ درس برای دبستان.','کودک','#E35DFF','/kids/'],
  ['۰۷','اطلاع‌رسانی و یادآوری','روال صبح، مشق، کیف فردا، گزارش هفتگی و نتیجهٔ آزمونک — در بله و تلگرام.','ربات','#26A69A','/me#notice'],
  ['۰۸','کارنامه برای والد','روایت پیشرفت فرزند با یک لمس به ربات خانواده ارسال می‌شود.','والد','#4BE68A','/me#report'],
  ['۰۹','بازار سازندگان','جزوه و گزارش از سازندگان مستقل؛ پیش‌نمایش زنده و صفحهٔ محصول اختصاصی.','بازار','#4BE8E2','/creators'],
  ['۱۰','پشتیبانی درسی','تیکت، ربات و پاسخ‌گویی انسانی — کنار خانواده هستیم.','پشتیبانی','#FF8A65','/support'],
  ['۱۱','تعرفه و اشتراک','ابزارهای پایه رایگان؛ محتواهای ویژه با پرداخت امن زرین‌پال.','مالی','#8A8A8A','/pricing']
];
function home(){
  const st=S.store,live=st.products.filter(p=>p.status==='live'),lv=st.live||{},cats=st.categories.filter(c=>!c.parent);
  setMeta('رسا آموزش · فروشگاه محصولات آموزشی','رسا آموزش: فروشگاه درس و جزوهٔ تعاملی، آزمون آنلاین، کارنامهٔ هوشمند و برنامه‌ریز درسی برای دانش‌آموزان و خانواده‌های ایران.');
  const svc=[['دسترسی','کانال‌ها'],['یادگیری','خدمات اصلی'],['ردیابی','پیشرفت و گزارش'],['بازار','فروش و درآمد']];
  const items={'کانال‌ها':[['وب‌اپ موبایل','همهٔ خدمات بدون نصب','/planner/','فعال'],['ربات بله','یادآوری و کارنامه در بله','/me#notice','فعال'],['ربات تلگرام','اطلاع‌رسانی به خانواده','/me#notice','فعال']],
   'خدمات اصلی':[['درس‌های تعاملی','گام‌های کوچک با بازخورد فوری','/c?kind=lesson','فعال'],['جزوهٔ گام‌به‌گام','مرحله‌به‌مرحله با تمرین','/c?kind=booklet','فعال'],['مسیر یادگیری','از ابتدا تا تسلط','/#paths','فعال'],['آزمون آنلاین','سؤال واقعی بر اساس مقطع','/quiz','فعال']],
   'پیشرفت و گزارش':[['کارنامهٔ هوشمند','بلد است / در حال تمرین / گام بعدی','/me#report','فعال'],['برنامه‌ریز درسی','برنامهٔ هفتگی و مرور فاصله‌دار','/planner/','فعال'],['اطلاع‌رسانی والد','یادآوری و گزارش هفتگی','/me#notice','فعال']],
   'فروش و درآمد':[['فروشگاه کاتالوگ','دسته‌بندی‌شده با پیش‌نمایش','/c','فعال'],['بازار سازندگان','سازندگان مستقل','/creators','فعال'],['تعرفه','هستهٔ رایگان + محتوای ویژه','/pricing','فعال']]};
  const show=live.slice(0,6);
  main().innerHTML=`<div class="ap">
  <aside class="ap-side">
    <a class="ap-logo" href="/">رسا آموزش<small>Rasa Amozesh</small></a>
    <form class="search" id="hss"><input name="q" placeholder="جست‌وجوی کاتالوگ…" aria-label="جست‌وجو"></form>
    <nav class="ap-nav" aria-label="بخش‌های صفحه">
      ${svc.map((x,i)=>`<a href="#ap-s${i}" class="ap-ni"><i>${fa(i+1)}</i>${x[1]}<small>${x[0]}</small></a>`).join('')}
      <a href="#ap-cat" class="ap-ni"><i>${fa(svc.length+1)}</i>کاتالوگ<small>محصولات</small></a>
      <a href="#ap-paths" class="ap-ni"><i>${fa(svc.length+2)}</i>مسیرها<small>یادگیری</small></a>
      <a href="#ap-price" class="ap-ni"><i>${fa(svc.length+3)}</i>تعرفه<small>قیمت</small></a>
    </nav>
    <div class="ap-live"><div class="ap-liveh"><span class="live-dot"></span>زنده</div>
      <div class="ap-liveg">${[['محصول',live.length],['گام',live.reduce((s,p)=>s+(p.meta?.steps||0),0)],['آزمونک امروز',lv.attempts||0],['خانواده',lv.families||0]].map(x=>`<div><b data-cu="${x[1]}">۰</b><span>${x[0]}</span></div>`).join('')}</div>
      <a class="ap-livea" href="/quiz">آزمون آنلاین ←</a>
    </div>
    <div class="ap-sidefoot"><a href="/me">حساب من</a><a href="/support">پشتیبانی</a><a href="/pricing">تعرفه</a></div>
  </aside>
  <div class="ap-main">
  <section class="ap-hero">
    <div class="ap-hero-in">
      <div class="ap-eyebrow"><span class="live-dot"></span>پلتفرم یادگیری فارسی — نسخهٔ عمومی</div>
      <h1>درس بخوانید،<br><span class="ap-yl">گام بردارید،</span><br>پیش بروید.</h1>
      <p class="ap-sub">فروشگاه محصولات آموزشی تعاملی: درس و جزوهٔ گام‌به‌گام، آزمون آنلاین، کارنامهٔ هوشمند و برنامه‌ریز درسی — برای دانش‌آموزان، والدین و معلمان.</p>
      <div class="ap-cta"><a class="btn y" href="/c">دیدن کاتالوگ</a><a class="btn ghost ap-ghost" href="/quiz">آزمون آنلاین</a><a class="btn ghost ap-ghost" href="/services">همهٔ خدمات</a></div>
    </div>
    <svg class="ap-art" viewBox="0 0 360 300" aria-hidden="true"><g fill="none" stroke="#F4D438" stroke-width="1.5" opacity=".5"><path d="M20 260 H340 M20 230 H300 M20 200 H260 M20 170 H220 M20 140 H180 M20 110 H140 M20 80 H100 M20 50 H60"/></g><circle cx="60" cy="50" r="9" fill="#F4D438"/><circle cx="60" cy="50" r="20" fill="none" stroke="#F4D438" stroke-width="1" opacity=".4"><animate attributeName="r" values="14;30;14" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0;.5" dur="3.5s" repeatCount="indefinite"/></circle><path d="M60 50 L120 50 L120 80 L160 80 L160 110 L200 110" fill="none" stroke="#F4D438" stroke-width="2" stroke-dasharray="4 5"><animate attributeName="stroke-dashoffset" values="0;-36" dur="4s" repeatCount="indefinite"/></path></svg>
  </section>
  ${svc.map((x,i)=>`<section class="ap-sec" id="ap-s${i}"><div class="ap-sec-h"><span class="ap-sec-n">${fa(i+1).padStart(2,'۰')}</span><div><h2>${x[1]}</h2><small>${x[0]}</small></div><a href="/services" class="ap-more">همه ←</a></div>
  <div class="ap-mod">${items[x[1]].map(m=>`<a class="ap-mi" href="${m[2]}"><div class="ap-mi-h"><b>${m[0]}</b><span class="ap-dot ${m[3]==='فعال'?'on':''}"></span></div><p>${m[1]}</p></a>`).join('')}</div></section>`).join('')}
  <section class="ap-sec" id="ap-cat"><div class="ap-sec-h"><span class="ap-sec-n">۰۵</span><div><h2>کاتالوگ</h2><small>محصولات و دسته‌بندی‌ها</small></div><a href="/c" class="ap-more">همه ←</a></div>
  <div class="ap-cats">${cats.map(c=>`<a class="ap-cat" href="/c/${esc(c.id)}" style="--c:${esc(c.color)}"><i>${esc(c.icon)}</i><b>${esc(c.title)}</b><span>${fa(live.filter(p=>p.cat===c.id).length)} محصول</span></a>`).join('')}</div>
  <div class="ap-prows">${show.map(p=>`<a class="ap-prow" href="/p/${esc(p.id)}"><span class="ap-kind" style="--c:var(--cy)">${esc(p.kind)}</span><b>${esc(p.title)}</b><span class="dim ap-prow-d">${esc(p.meta?.subject||p.summary||'')}</span><span class="ap-price">${p.price?p.price.toLocaleString('fa-IR')+' تومان':'رایگان'}</span></a>`).join('')}</div></section>
  <section class="ap-sec" id="ap-paths"><div class="ap-sec-h"><span class="ap-sec-n">۰۶</span><div><h2>مسیرهای یادگیری</h2><small>از ابتدا تا تسلط</small></div></div>
  <div class="ap-paths">${(st.paths||[]).map(pa=>`<a class="ap-path" href="/p/${esc(pa.steps[0].id)}"><i>${esc(pa.icon||'🧭')}</i><div><b>${esc(pa.title)}</b><p>${esc(pa.desc||'')}</p><span class="ap-pathsteps">${fa(pa.steps.length)} گام · ${esc(pa.audience||'')}</span></div><span class="ap-pathgo">←</span></a>`).join('')}</div></section>
  <section class="ap-sec" id="ap-price"><div class="ap-sec-h"><span class="ap-sec-n">۰۷</span><div><h2>تعرفه</h2><small>هستهٔ رایگان، محتوای ویژه قیمت‌دار</small></div><a href="/pricing" class="ap-more">جزئیات ←</a></div>
  <div class="ap-tiers">${[['رایگان','برنامه‌ریز، کلاس دوم، آزمونک و پیش‌نمایش همهٔ درس‌ها'],['محتوای ویژه','جزوه‌ها، کارنامهٔ روایی و گزارش‌ها با پرداخت امن زرین‌پال'],['سازندگان','فروش جزوه و گزارش در بازار با پیش‌نمایش زنده']].map((t,i)=>`<a class="ap-tier" href="/pricing"><i>${fa(i+1)}</i><b>${t[0]}</b><p>${t[1]}</p></a>`).join('')}</div></section>
  <section class="ap-cta"><div><h2>اولین گام را همین حالا بردارید</h2><p>ثبت‌نام رایگان — کمتر از یک دقیقه</p></div><div class="row"><a class="btn y" href="/c">کاتالوگ</a><a class="btn ghost ap-ghost" href="/quiz">آزمون آنلاین</a><a class="btn ghost ap-ghost" href="/planner/">برنامه‌ریز</a></div></section>
  </div></div>`;
  const hf=$('#hss');if(hf)hf.onsubmit=e=>{e.preventDefault();const q=new FormData(e.target).get('q');ev('search',null);go('/search?q='+encodeURIComponent(q))};
  $$('[data-cu]').forEach(el=>{const target=+el.dataset.cu,t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-k,3);el.textContent=num(Math.round(target*e));if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)});
  const nis=$$('.ap-ni'),secs=$$('.ap-sec,.ap-hero,.ap-cta');
  const spy=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const id=e.target.id||'hero';nis.forEach(n=>n.classList.toggle('on',n.getAttribute('href')==='#'+id))}})},{rootMargin:'-30% 0px -60% 0px'});
  secs.forEach((el,i)=>{el.id=el.id||'ap-hero'+i;spy.observe(el)});
}
function journeyRail(){const rn=$('#jrn');if(!rn)return;
  const sts=[...$$('[data-st]')];
  rn.innerHTML=sts.map((s,i)=>`<button class="jr-node ${i===0?'on':''}" data-i="${i}" data-n="${s.dataset.sn}" aria-label="${s.dataset.sn}">${s.dataset.st}</button>`).join('');
  rn.querySelectorAll('.jr-node').forEach(n=>n.onclick=()=>sts[+n.dataset.i].scrollIntoView({behavior:'smooth'}));
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const i=sts.indexOf(e.target);rn.querySelectorAll('.jr-node').forEach((n,x)=>n.classList.toggle('on',x===i));const d=$('#jrd');if(d)d.style.top=(i*60+17)+'px'}})},{rootMargin:'-35% 0px -55% 0px'});
  sts.forEach(s=>io.observe(s))}
function startTicker(){const t=$('#tickTxt');if(!t)return;const st=S.store,lv=st.live||{};
  const facts=[`${fa(st.products.filter(p=>p.status==='live').length)} محصول زنده در کاتالوگ`,`امروز ${fa(lv.attemptsToday||0)} آزمونک حل شد`,`${fa(lv.families||0)} خانواده فعال`,`${fa((st.paths||[]).length)} مسیر یادگیری`,`۱۹ ایجنت داخلی در مرکز فرمان`,`پرداخت امن زرین‌پال فعال`];
  let i=0;t.textContent=facts[0];setInterval(()=>{i=(i+1)%facts.length;t.style.opacity=0;setTimeout(()=>{t.textContent=facts[i];t.style.opacity=1},300)},4200)}
function bindQuiz(){const el=$('#quiz'),tabs=$('#qzTabs');if(!el)return;
  if(!S.qbank){el.innerHTML='<div class="empty" style="padding:30px">در حال آماده‌سازی سؤال‌ها…</div>';
    api('quiz').then(r=>{S.qbank=r.items||[];bindQuiz()}).catch(()=>{el.innerHTML='<div class="empty">سؤال‌ها بارگذاری نشد</div>'});return}
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const LV=['دبستان','متوسطهٔ اول','متوسطهٔ دوم','کنکور'];
  const lvPool=()=>S.qlv?S.qbank.filter(q=>q.lvn===S.qlv):S.qbank;
  const subs=()=>[...new Set(lvPool().map(q=>q.s))];
  const pool=()=>lvPool().filter(q=>!S.qsub||q.s===S.qsub);
  let i=0,score=0,qs;
  const pick=()=>{qs=shuffle([...pool()]).slice(0,5)};
  const drawTabs=()=>{const lvs=[...new Set(S.qbank.map(q=>q.lvn))].sort((a,b)=>LV.indexOf(a)-LV.indexOf(b));
    tabs.innerHTML=`<div class="qz-row">${[`<button class="chip ${!S.qlv?'on':''}" data-l="">همهٔ مقاطع (${fa(S.qbank.length)})</button>`,...lvs.map(l=>`<button class="chip ${l===S.qlv?'on':''}" data-l="${esc(l)}">${esc(l)} (${fa(lvPoolLen(l))})</button>`)].join('')}</div>
    <div class="qz-row">${[`<button class="chip sm ${!S.qsub?'on':''}" data-s="">همهٔ درس‌ها</button>`,...subs().map(s=>`<button class="chip sm ${s===S.qsub?'on':''}" data-s="${esc(s)}">${esc(s)}</button>`)].join('')}</div>`;
    tabs.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{S.qlv=b.dataset.l||null;S.qsub=null;i=0;score=0;pick();drawTabs();draw()});
    tabs.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{S.qsub=b.dataset.s||null;i=0;score=0;pick();drawTabs();draw()})};
  const lvPoolLen=l=>S.qbank.filter(q=>q.lvn===l).length;
  const draw=()=>{const pips=`<div class="hp-pips">${qs.map((_,x)=>`<i class="${x<i?'done':x===i?'now':''}"></i>`).join('')}</div>`;
    if(i>=qs.length){el.innerHTML=`<div style="text-align:center;padding:14px 0">${pips}<div style="font-size:44px">${score===qs.length?'🏆':'🌟'}</div><h3 style="font-size:20px">${score===qs.length?'عالی! همه را درست رفتی.':'خوب بود!'} ${fa(score)} از ${fa(qs.length)}</h3><p class="mute">این سؤال‌ها از بانک واقعی درس‌های رسا بود — در کاتالوگ هر درس چند برابر این دارد.${S.me?' نتیجه در کارنامهٔ هوشمندت ثبت شد.':''}</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn y" href="/c">دیدن کاتالوگ ←</a><button class="btn ghost" id="qz">دوباره</button></div></div>`;$('#qz').onclick=()=>{i=0;score=0;pick();draw()};
      if(S.me)api('quiz/attempt',{body:{s:S.qsub||'همهٔ درس‌ها',score,total:qs.length,topics:[{name:S.qsub||'عمومی',score,total:qs.length}]}}).catch(()=>{});
      return}
    const q=qs[i];el.innerHTML=`${pips}<div class="row" style="justify-content:space-between"><span class="dim" style="font-size:12px">سؤال ${fa(i+1)} از ${fa(qs.length)}</span><span class="tag" style="--c:var(--cy);font-size:11px">${esc(q.s)}${q.g?' · '+esc(q.g):''}</span></div><h3 style="font-size:21px;margin:10px 0 6px">${esc(q.q)}</h3>${q.m?`<div class="qz-m">${esc(q.m)}</div>`:''}<div class="hp-opts">${q.o.map((o,x)=>`<button class="hp-opt" data-x="${x}">${esc(o)}</button>`).join('')}</div><div class="hp-qmsg" id="qm"></div>`;
    el.querySelectorAll('.hp-opt').forEach(b=>b.onclick=()=>{const ok=+b.dataset.x===q.a;score+=ok?1:0;b.classList.add(ok?'ok':'no');el.querySelectorAll('.hp-opt').forEach(x=>{x.disabled=true;if(+x.dataset.x===q.a)x.classList.add('ok')});$('#qm').textContent=ok?(q.ex||'آفرین! درست بود.'):'پاسخ درست: '+q.o[q.a];ev('quiz_'+q.s,null);setTimeout(()=>{i++;draw()},1100)})};
  drawTabs();pick();draw()}

function catalog(cat){
  const st=S.store,q=new URLSearchParams(location.search),c=catOf(cat);let kind=q.get('kind')||'',text=q.get('q')||'';
  setMeta((c?c.title+' · ':'')+'کاتالوگ رسا آموزش','مرور درس‌های تعاملی، جزوه‌های گام‌به‌گام، مسیرهای یادگیری و گزارش‌های مدیریتی رسا آموزش؛ همه رایگان.');
  main().innerHTML=`<section class="wrap" style="padding:36px 20px 60px"><div class="eyebrow">کاتالوگ</div><h1 class="h2" style="margin:8px 0 18px">${esc(c?.title||'همهٔ محصولات')}</h1>
  <div class="search" style="max-width:none;margin:0 0 16px"><input id="cq" value="${esc(text)}" placeholder="جست‌وجو در عنوان، درس، برچسب…"></div>
  <div class="tabs"><a class="chip ${!cat?'on':''}" href="/c">همه</a>${st.categories.map(x=>`<a class="chip ${x.id===cat?'on':''}" href="/c/${esc(x.id)}">${esc(x.icon)} ${esc(x.title)}</a>`).join('')}</div>
  <div class="tabs" id="kinds">${[['','همهٔ انواع'],...Object.entries(KIND)].map(([k,t])=>`<button class="chip ${k===kind?'on':''}" data-k="${k}">${t}</button>`).join('')}</div><div id="res"></div></section>`;
  const draw=()=>{const kids=st.categories.filter(x=>x.parent===cat).map(x=>x.id),t=text.trim().toLowerCase();
    const ps=st.products.filter(p=>(!cat||p.cat===cat||kids.includes(p.cat))&&(!kind||p.kind===kind)&&(!t||(p.title+' '+p.summary+' '+p.tags.join(' ')+' '+p.subject).toLowerCase().includes(t)));
    $('#res').innerHTML=ps.length?`<p class="dim">${fa(ps.length)} محصول</p><div class="grid3">${ps.map(pcard).join('')}</div>`:'<div class="empty"><i>🔍</i>چیزی پیدا نشد. عبارت دیگری را امتحان کنید.</div>'};
  $('#cq').oninput=e=>{text=e.target.value;draw()};$('#kinds').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;kind=b.dataset.k;$$('#kinds .chip').forEach(x=>x.classList.toggle('on',x===b));draw()};draw();
}

async function product(id){
  main().innerHTML='<div class="empty"><i>⏳</i>در حال بارگذاری…</div>';
  let d;try{d=await api('store/p/'+encodeURIComponent(id))}catch(e){main().innerHTML=`<div class="empty"><i>🧭</i>${esc(e.message)}<br><a class="y" href="/c">بازگشت به کاتالوگ</a></div>`;return}
  const p=d.product,c=catOf(p.cat),url=location.origin+'/p/'+p.id,app=p.meta?.app,path=pathOf(p.id);setMeta(p.title+' · رسا آموزش',p.summary||'');
  const pv=p.hasFile?`<div class="pv"><div class="pvbar"><span class="dots"><i></i><i></i><i></i></span><b style="font-size:13px">پیش‌نمایش زنده</b><span class="sp"></span><button class="btn sm" id="fs">تمام‌صفحه ⤢</button></div><iframe id="pvf" title="پیش‌نمایش ${esc(p.title)}" src="/p/${esc(p.id)}/preview" sandbox="allow-scripts allow-forms allow-modals" loading="lazy"></iframe></div>`
    :app?`<div class="pv"><div class="pvbar"><b style="font-size:13px">نسخهٔ زنده</b><span class="sp"></span><a class="btn sm" href="${esc(app)}" target="_blank">باز کردن در صفحهٔ جدا ↗</a></div><iframe title="${esc(p.title)}" src="${esc(app)}" loading="lazy"></iframe></div>`
    :p.meta?.report?`<div class="card" id="rcdemo"></div>`:`<div class="pv" style="background:none;border:0">${cover(p,true)}</div>`;
  main().innerHTML=`<section class="wrap"><div class="row dim" style="padding-top:22px;font-size:13px"><a href="/c">کاتالوگ</a>›<a href="/c/${esc(p.cat)}">${esc(c?.title||'')}</a>›<span>${esc(p.title)}</span></div>
  <div class="pd"><div>${pv}<div class="card mt"><h2 style="font-size:20px">دربارهٔ این محصول</h2><p class="mute">${esc(p.body||p.summary)}</p><div class="row wrapr">${p.tags.map(t=>`<a class="chip" href="/c?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div></div>
  <div class="card mt"><div class="row" style="justify-content:space-between"><h2 style="font-size:20px">نظر خانواده‌ها</h2>${p.owned?'<button class="btn sm" id="rv">ثبت نظر</button>':''}</div>${d.reviews.length?d.reviews.map(r=>`<div style="padding:12px 0;border-bottom:1px solid var(--line)"><b>${esc(r.name)}</b> <span class="y">${'★'.repeat(r.stars)}</span><div class="mute">${esc(r.text)}</div></div>`).join(''):'<p class="dim">هنوز نظری ثبت نشده است.</p>'}</div></div>
  <aside class="buy card"><div class="row wrapr"><span class="tag" style="--c:${esc(c?.color||'#F4D438')}">${esc(c?.title||'')}</span><span class="tag" style="--c:var(--mute)">${KIND[p.kind]||''}</span>${p.grade?`<span class="tag" style="--c:var(--cy)">${esc(p.grade)}</span>`:''}</div>
  <h1 style="font-size:24px;margin:12px 0 6px">${esc(p.title)}</h1><p class="mute" style="margin:0">${esc(p.summary)}</p>
  <div class="row mt"><span class="price ${p.price?'':'free'}">${p.price?num(p.price):'رایگان'}</span>${p.price?'<span class="dim">تومان</span>':''}${p.meta?.minutes?`<span class="dim">· حدود ${fa(p.meta.minutes)} دقیقه</span>`:''}</div>
  <ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
  ${p.status==='soon'?'<button class="btn" disabled style="width:100%">به‌زودی</button><button class="btn ghost mt" id="notify" style="width:100%">خبرم کن</button>'
    :p.owned?`<div class="row">${p.hasFile?`<a class="btn y" style="flex:1" href="/p/${esc(p.id)}/open" target="_blank">باز کردن</a><a class="btn" href="/p/${esc(p.id)}/download" download>دانلود</a>`:app?`<a class="btn y" style="flex:1" href="${esc(app)}">ورود به ${esc(KIND[p.kind])}</a>`:'<a class="btn y" style="flex:1" href="/me">کتابخانهٔ من</a>'}</div><p class="dim" style="font-size:12px;text-align:center;margin:8px 0 0">این محصول در کتابخانهٔ شماست.</p>`
    :`<button class="btn y" id="get" style="width:100%">${p.price?'خرید و افزودن به کتابخانه':'دریافت رایگان'}</button><button class="btn ghost mt" id="add" style="width:100%">افزودن به سبد</button>${p.price?'<p class="dim" style="font-size:12px;text-align:center;margin:8px 0 0">پرداخت امن با زرین‌پال</p>':''}`}
  <div class="row mt"><button class="btn sm ghost" id="fav">${p.fav?'♥ ذخیره شده':'♡ ذخیره'}</button><span class="sp"></span><span class="dim" style="font-size:12px">${num(p.views)} بازدید · ${num(p.downloads)} دانلود</span></div>
  <div class="share"><a class="chip" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url+'?utm_source=telegram')}&text=${encodeURIComponent(p.title)}">تلگرام</a><a class="chip" target="_blank" rel="noopener" href="https://ble.ir/share?url=${encodeURIComponent(url+'?utm_source=bale')}">بله</a><a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(p.title+' '+url+'?utm_source=whatsapp')}">واتس‌اپ</a><button class="chip" id="cp">کپی لینک</button></div></aside></div>
  ${path?`<section class="wrap" style="padding-bottom:40px"><div class="card pathcard" style="--c:${esc(path.color||'#F4D438')}"><div class="row"><span style="font-size:24px">${esc(path.icon||'🧭')}</span><div style="flex:1"><div class="eyebrow">مسیر یادگیری</div><h2 style="font-size:19px;margin-top:4px">${esc(path.title)}</h2></div><span class="tag" style="--c:var(--mute)">گام ${fa(path.steps.findIndex(s=>s.id===p.id)+1)} از ${fa(path.steps.length)}</span></div>
  <p class="mute" style="font-size:13.5px;margin:10px 0 14px">${esc(path.desc)}</p>
  <div class="psteps">${path.steps.map((s,i)=>{const cur=s.id===p.id,nxt=path.steps[i+1];return `<div class="pstep ${cur?'cur':''} ${s.status==='soon'?'soon':''}"><i>${i+1}</i><span>${cur?'شما اینجا هستید':esc(s.title)}</span>${cur&&nxt?`<a class="btn sm y" href="/p/${esc(nxt.id)}" style="margin-inline-start:auto">گام بعدی ←</a>`:''}</div>`}).join('')}</div></div></section>`:''}
  ${d.related.length?`<div class="sech"><h2 class="h2" style="font-size:24px">محصولات مرتبط</h2></div><div class="grid3" style="padding-bottom:60px">${d.related.map(pcard).join('')}</div>`:''}</section>`;
  $('#get')&&($('#get').onclick=()=>checkout([p.id]));$('#add')&&($('#add').onclick=()=>addCart(p.id));
  $('#notify')&&($('#notify').onclick=()=>toast('ثبت شد؛ هنگام انتشار خبرتان می‌کنیم'));
  $('#fav').onclick=async()=>{if(!S.me)return authModal();await api('store/fav',{body:{pid:p.id,on:!p.fav}});p.fav=!p.fav;$('#fav').textContent=p.fav?'♥ ذخیره شده':'♡ ذخیره'};
  $('#cp').onclick=()=>{navigator.clipboard?.writeText(url+'?utm_source=link');ev('share',p.id);toast('لینک کپی شد')};
  $('#fs')&&($('#fs').onclick=()=>{ev('preview_open',p.id);const f=$('#pvf');(f.requestFullscreen||f.webkitRequestFullscreen)?.call(f)});
  $('#rv')&&($('#rv').onclick=()=>reviewModal(p));
  $('#rcdemo')&&reportCard($('#rcdemo'),{learner:'نمونه',title:'ریاضی هشتم',attempts:[{score:6,total:10,at:Date.now()-6*864e5},{score:7,total:10,at:Date.now()-3*864e5},{score:9,total:10,at:Date.now()}],topics:[{name:'عددهای صحیح',score:5,total:5},{name:'محور عدد',score:4,total:5},{name:'ضرب گویا',score:2,total:5},{name:'تقسیم گویا',score:1,total:4}]});
}
function reviewModal(p){let st=5;const m=modal(`<h2 style="font-size:20px">نظر شما دربارهٔ «${esc(p.title)}»</h2><div class="row mt" id="stars" style="font-size:30px;cursor:pointer">${[1,2,3,4,5].map(i=>`<span data-s="${i}" class="y">★</span>`).join('')}</div><div class="f mt"><textarea class="in" id="rt" placeholder="تجربهٔ شما برای خانواده‌های دیگر مفید است"></textarea></div><button class="btn y" id="rs" style="width:100%">ثبت نظر</button><p class="dim" style="font-size:12px">نظر پس از بازبینی منتشر می‌شود.</p>`);
  $('#stars',m).onclick=e=>{const s=e.target.dataset.s;if(!s)return;st=+s;$$('#stars span',m).forEach((x,i)=>x.style.opacity=i<st?1:.25)};
  $('#rs',m).onclick=async()=>{try{await api('store/review',{body:{pid:p.id,stars:st,text:$('#rt',m).value}});closeModal();toast('نظر شما ثبت شد و پس از بازبینی منتشر می‌شود')}catch(e){toast(e.message)}}}

// Narrative report card: «بلد است / در حال تمرین / گام بعدی» + step ladder
function reportCard(el,{learner,title,attempts,topics}){
  const pct=t=>t.total?t.score/t.total:0,good=topics.filter(t=>pct(t)>=.8),mid=topics.filter(t=>pct(t)>=.5&&pct(t)<.8),low=topics.filter(t=>pct(t)<.5);
  const last=attempts.at(-1),lp=last?Math.round(pct(last)*100):0;
  el.innerHTML=`<div class="row" style="justify-content:space-between;align-items:start"><div><div class="eyebrow">کارنامهٔ روایی</div><h2 style="font-size:22px;margin:6px 0 0">${esc(title)}${learner?` · ${esc(learner)}`:''}</h2><div class="dim" style="font-size:13px">${jd(last?.at)}</div></div><div style="text-align:center"><div style="font-size:40px;font-weight:900" class="y">${fa(lp)}٪</div><div class="dim" style="font-size:12px">آخرین آزمونک</div></div></div>
  <div class="ladder mt" style="height:110px">${attempts.slice(-8).map((a,i,arr)=>`<i class="${i===arr.length-1?'on':''}" style="height:${Math.max(8,pct(a)*100)}%"><span>${fa(Math.round(pct(a)*100))}</span></i>`).join('')}</div>
  <div class="rc mt"><div class="a"><div class="k">✓ بلد است</div>${good.map(t=>`<div style="font-size:13px">${esc(t.name)}</div>`).join('')||'<div class="dim" style="font-size:13px">به‌زودی</div>'}</div>
  <div class="b"><div class="k">↻ در حال تمرین</div>${mid.map(t=>`<div style="font-size:13px">${esc(t.name)}</div>`).join('')||'<div class="dim" style="font-size:13px">—</div>'}</div>
  <div class="c"><div class="k">← گام بعدی</div>${(low.length?low:mid).slice(0,2).map(t=>`<div style="font-size:13px">تمرین «${esc(t.name)}»، روزی ۱۵ دقیقه</div>`).join('')||'<div style="font-size:13px">رفتن به فصل بعد</div>'}</div></div>
  <table class="tbl mt"><thead><tr><th>مبحث</th><th>امتیاز</th><th style="width:40%">پیشرفت</th></tr></thead><tbody>${topics.map(t=>`<tr><td>${esc(t.name)}</td><td>${fa(t.score)} از ${fa(t.total)}</td><td><div class="bar"><i style="width:${pct(t)*100}%"></i></div></td></tr>`).join('')}</tbody></table>
  <div class="row mt"><button class="btn sm" onclick="window.print()">چاپ کارنامه</button></div>`}

// ---------- profile ----------
async function profile(){
  const pq=new URLSearchParams(location.search).get('pay');if(pq){toast(pq==='ok'?'پرداخت با موفقیت انجام شد؛ محصول‌ها در کتابخانه‌اند':'پرداخت انجام نشد یا لغو شد');history.replaceState(null,'',location.pathname+location.hash)}
  if(!S.me){main().innerHTML='<div class="empty"><i>🔐</i>برای دیدن کتابخانه وارد شوید.<br><button class="btn y mt" id="lg">ورود / ثبت‌نام</button></div>';$('#lg').onclick=()=>authModal();return}
  document.title='کتابخانهٔ من · رسا آموزش';let tab=location.hash.slice(1)||'lib';
  const [L,T,N,R]=await Promise.all([api('store/library'),api('tickets'),api('notices'),api('ref').catch(()=>({}))]);
  const tabs=[['lib','📚 کتابخانه'],['report','📊 کارنامه‌ها'],['fav','♡ ذخیره‌ها'],['orders','🧾 سفارش‌ها'],['support','💬 پشتیبانی'],['ref','🎁 دعوت'],['notice','🔔 اطلاعیه‌ها']];
  main().innerHTML=`<section class="wrap" style="padding:30px 20px 60px"><div class="row wrapr" style="justify-content:space-between"><div><div class="eyebrow">پروفایل</div><h1 class="h2">${esc(S.me.name)}</h1><div class="dim" dir="ltr" style="text-align:right">${esc(S.me.login)}</div></div>
  <div class="row"><span class="tag">${S.roles.map(r=>ROLE[r]).join('، ')||'مشتری'}</span><a class="btn sm" href="/kids/">سامانهٔ کلاس دوم</a><button class="btn sm ghost" id="lo">خروج</button></div></div>
  <div class="tabs mt" id="pt">${tabs.map(([k,t])=>`<button class="chip ${k===tab?'on':''}" data-t="${k}">${t}</button>`).join('')}</div><div id="pb"></div></section>`;
  $('#lo').onclick=async()=>{await api('logout',{method:'POST',body:{}});S.me=null;S.roles=[];await loadStore();go('/')};
  $('#pt').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;tab=b.dataset.t;history.replaceState(null,'','#'+tab);$$('#pt .chip').forEach(x=>x.classList.toggle('on',x===b));draw()};
  const draw=()=>{const pb=$('#pb');
    if(tab==='lib')pb.innerHTML=L.items.length?`<div class="grid3">${L.items.map(p=>`<div class="pc">${cover(p)}<div class="bd"><h3 style="font-size:15px">${esc(p.title)}</h3><div class="dim" style="font-size:12px">دریافت: ${jd(p.ownedAt)}</div><div class="row mt">${p.hasFile?`<a class="btn sm y" href="/p/${esc(p.id)}/open" target="_blank">باز کردن</a><a class="btn sm" href="/p/${esc(p.id)}/download" download>دانلود</a>`:p.meta?.app?`<a class="btn sm y" href="${esc(p.meta.app)}">ورود</a>`:''}<a class="btn sm ghost" href="/p/${esc(p.id)}">صفحه</a></div></div></div>`).join('')}</div>`:'<div class="empty"><i>📚</i>کتابخانه خالی است.<br><a class="btn y mt" href="/c">دیدن کاتالوگ</a></div>';
    if(tab==='report'){const by={};L.attempts.forEach(a=>(by[a.pid]=by[a.pid]||{title:a.title,att:[]}).att.unshift(a));const ks=Object.keys(by);
      pb.innerHTML=`<div class="card mb" id="smrc"><div class="eyebrow">کارنامهٔ هوشمند</div><p class="dim" style="font-size:13px">در حال تحلیل تلاش‌های تو…</p></div>`+(ks.length?ks.map(k=>`<div class="card mb" data-rc="${esc(k)}"></div>`).join(''):'<div class="empty"><i>📊</i>هنوز آزمونکی ثبت نشده است.<br>پس از حل آزمونک هر درس، کارنامهٔ روایی اینجا ساخته می‌شود.</div>');
      api('report').then(r=>{const c=$('#smrc');if(!c)return;const row=(items,none)=>items.length?items.map(t=>`<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line)"><span>${esc(t.name)}<span class="dim" style="font-size:11px"> · ${esc(t.where||'')}</span></span><b>${fa(t.ratio)}٪</b></div>`).join(''):`<p class="dim" style="font-size:13px">${none}</p>`;
        c.innerHTML=`<div class="eyebrow">کارنامهٔ هوشمند</div><div class="row gap" style="margin:10px 0 14px"><span class="tag" style="--c:var(--cy)">${fa(r.attempts)} آزمونک</span><span class="tag" style="--c:var(--ok)">${fa(r.recent)} در ۷ روز اخیر</span></div>
        <div class="rc"><div class="a"><div class="k">✓ بلد است</div>${row(r.knows,'هنوز مبحثی به تسلط نرسیده.')}</div><div class="b"><div class="k">↻ در حال تمرین</div>${row(r.practice,'—')}</div><div class="c"><div class="k">← گام بعدی</div>${row(r.next,'—')}</div></div>
        <button class="btn sm y mt" id="rcsend">📤 ارسال کارنامه به والد (بله/تلگرام)</button>`;
        const sb=$('#rcsend');if(sb)sb.onclick=async()=>{sb.disabled=true;try{await api('report/send');toast('کارنامه به ربات متصل ارسال شد')}catch(e){toast(e.message==='ربات اطلاع‌رسانی فعال نیست'?'اول ربات را در «اطلاعیه‌ها» وصل کن':e.message)}sb.disabled=false}}).catch(()=>{const c=$('#smrc');if(c)c.innerHTML=''});
      ks.forEach(k=>{const g=by[k],last=g.att.at(-1);reportCard($(`[data-rc="${k}"]`),{learner:last.learner,title:g.title,attempts:g.att,topics:last.topics.length?last.topics:[{name:'کل آزمون',score:last.score,total:last.total}]})})}
    if(tab==='fav'){const ps=S.store.products.filter(p=>L.favorites.includes(p.id));pb.innerHTML=ps.length?`<div class="grid3">${ps.map(pcard).join('')}</div>`:'<div class="empty"><i>♡</i>چیزی ذخیره نکرده‌اید.</div>'}
    if(tab==='orders'){const OST={paid:'تکمیل شد','paid-free':'رایگان',pending:'در انتظار پرداخت',failed:'ناموفق'};pb.innerHTML=L.orders.length?`<div class="card"><table class="tbl"><thead><tr><th>شماره</th><th>تاریخ</th><th>اقلام</th><th>مبلغ</th><th>وضعیت</th><th></th></tr></thead><tbody>${L.orders.map(o=>`<tr><td>${fa(o.id)}</td><td>${jd(o.at)}</td><td>${fa(o.n)}</td><td>${o.total?num(o.total)+' تومان':'رایگان'}</td><td><span class="tag" style="--c:${o.status==='paid'||o.status==='paid-free'?'var(--ok)':'var(--y)'}">${OST[o.status]||o.status}</span></td><td>${o.status==='pending'?`<button class="btn sm y" data-pay="${o.id}">پرداخت</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><i>🧾</i>سفارشی ندارید.</div>';
      pb.onclick=async e=>{const b=e.target.closest('[data-pay]');if(!b)return;b.disabled=true;try{const r=await api('pay/request',{body:{order:+b.dataset.pay}});location.href=r.url}catch(er){toast(er.message);b.disabled=false}}}
    if(tab==='support'){pb.innerHTML=`<div class="grid3" style="grid-template-columns:1fr 1.4fr"><form class="card" id="nt"><h3>پیام تازه</h3><div class="f mt"><label>موضوع</label><select class="in" name="topic"><option value="help">راهنمایی</option><option value="bug">مشکل فنی</option><option value="content">پیشنهاد محتوا</option><option value="creator">همکاری سازنده</option><option value="school">مدرسه و معلم</option></select></div><div class="f"><label>عنوان</label><input class="in" name="subject" required></div><div class="f"><label>پیام</label><textarea class="in" name="body" required></textarea></div><button class="btn y" style="width:100%">ارسال</button></form>
      <div class="card"><h3>پیام‌های من</h3>${T.length?T.map(t=>`<div class="row click" style="padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer" data-tk="${t.id}"><b style="flex:1">${esc(t.subject)}</b><span class="tag st-${t.status}" style="--c:var(--c)">${STATUS[t.status]}</span><span class="dim" style="font-size:12px">${jdt(t.updated)}</span></div>`).join(''):'<p class="dim">پیامی ندارید.</p>'}</div></div>`;
      if(innerWidth<900)pb.firstChild.style.gridTemplateColumns='1fr';
      $('#nt').onsubmit=async e=>{e.preventDefault();try{await api('tickets',{body:Object.fromEntries(new FormData(e.target))});toast('پیام شما ثبت شد');profile()}catch(er){toast(er.message)}};
      pb.onclick=e=>{const r=e.target.closest('[data-tk]');if(r)ticketModal(+r.dataset.tk)}}
    if(tab==='ref'){const link=location.origin+'/?ref=ref:'+R.code;pb.innerHTML=`<div class="card" style="max-width:640px"><div style="font-size:40px">🎁</div><h2 style="font-size:22px">دوستانتان را دعوت کنید</h2><p class="mute">هر خانواده‌ای که با لینک شما ثبت‌نام کند، اینجا شمرده می‌شود. به‌زودی برای دعوت‌ها جایزه و محتوای ویژه در نظر می‌گیریم.</p><div class="search" style="max-width:none"><input readonly value="${esc(link)}" dir="ltr"><button class="btn y" id="cr">کپی</button></div><p class="mt"><b class="y" style="font-size:26px">${fa(R.signups||0)}</b> ثبت‌نام با دعوت شما</p></div>`;$('#cr').onclick=()=>{navigator.clipboard?.writeText(link);toast('لینک دعوت کپی شد')}}
    if(tab==='notice'){pb.innerHTML=`<div class="card mb" id="nbox"><div class="eyebrow">اطلاع‌رسانی و یادآوری</div><p class="dim" style="font-size:13px;margin-top:8px">در حال بررسی اتصال…</p></div>`+(N.length?N.map(n=>`<div class="card mb"><b>${esc(n.title)}</b><div class="dim" style="font-size:12px">${jd(n.at)}</div><p class="mute">${esc(n.body)}</p>${n.link?`<a class="y" href="${esc(n.link)}">بیشتر ←</a>`:''}</div>`).join(''):'');
      api('notify').then(n=>{const b2=$('#nbox');if(!b2)return;
        const linked=(n.links||[]).map(l=>l.kind);
        b2.innerHTML=`<div class="eyebrow">اطلاع‌رسانی و یادآوری</div><p class="mute" style="font-size:14px;margin:10px 0">روال صبح، مشق، کیف فردا، گزارش هفتگی و نتیجهٔ آزمونک‌ها را در ربات دریافت کن.</p>
        <div class="row wrapr">${linked.length?linked.map(k=>`<span class="tag" style="--c:var(--ok)">✓ ${k==='bale'?'بله':'تلگرام'} متصل</span>`).join(''):'<span class="tag">هنوز رباتی وصل نیست</span>'}<button class="btn sm y" id="gcode">دریافت کد اتصال</button><button class="btn sm ghost" id="tnt">تست پیام</button></div>
        <div id="codew"></div>`;
        $('#gcode').onclick=async()=>{try{const r=await api('notify/link',{method:'POST',body:{}});$('#codew').innerHTML=`<div class="card" style="background:var(--card2);margin-top:12px"><b>کد اتصال تو:</b><div style="font-size:30px;font-weight:900;letter-spacing:.1em;color:var(--y);text-align:center;padding:8px">${fa(r.code)}</div><p class="dim" style="font-size:13px">کد را در یکی از ربات‌ها با دستور <code>/start</code> بفرست${r.names?.telegram?` — تلگرام: @${r.names.telegram}`:''}${r.names?.bale?` — بله: @${r.names.bale}`:''}. تا ۱۵ دقیقه معتبر است.</p></div>`}catch(e){toast(e.message)}};
        $('#tnt').onclick=async()=>{try{await api('notify/test',{method:'POST',body:{}});toast('پیام آزمایشی ارسال شد')}catch(e){toast(e.message)}}}).catch(()=>{const b2=$('#nbox');if(b2)b2.innerHTML='<p class="dim">سرویس اطلاع‌رسانی در دسترس نیست.</p>'})}
  };draw();
}
async function ticketModal(id,staffView){
  const d=await api('tickets/'+id);const m=modal(`<div class="row" style="justify-content:space-between"><h2 style="font-size:19px">${esc(d.ticket.subject)}</h2><button class="ib" onclick="closeModal()">✕</button></div><div class="mt" style="max-height:46vh;overflow:auto">${d.msgs.map(x=>`<div class="msg ${x.staff?'staff':''}"><div class="dim" style="font-size:12px">${x.staff?'پشتیبانی رسا':esc(x.name)} · ${jdt(x.at)}</div>${esc(x.body).replace(/\n/g,'<br>')}</div>`).join('')}</div>
  <textarea class="in mt" id="tm" placeholder="پاسخ…"></textarea><div class="row mt"><button class="btn y" id="ts" style="flex:1">ارسال</button>${staffView?'<button class="btn" id="tai">✨ پیش‌نویس با ایجنت</button><button class="btn ghost" id="tc">بستن تیکت</button>':''}</div>`,'modal');m.style.width='min(620px,100%)';
  $('#ts',m).onclick=async()=>{const b=$('#tm',m).value.trim();if(!b)return;await api(`tickets/${id}/msg`,{body:{body:b}});toast('ارسال شد');ticketModal(id,staffView)};
  if(staffView){$('#tai',m).onclick=async()=>{$('#tai',m).disabled=true;try{const r=await api('admin/agents/run',{body:{task:'support:reply',target:id}});$('#tm',m).value=r.output;toast(r.offline?'پیش‌نویس قالبی (کلید هوش مصنوعی تنظیم نشده)':'پیش‌نویس ایجنت آماده است؛ در صف تأیید هم ثبت شد')}catch(e){toast(e.message)}$('#tai',m).disabled=false};
    $('#tc',m).onclick=async()=>{await api('admin/tickets/'+id,{body:{status:'closed'}});closeModal();toast('تیکت بسته شد');route()}}
}

function creators(){document.title='سازندگان محتوا · رسا آموزش';
  main().innerHTML=`<section class="hero"><div class="wrap"><div class="eyebrow">موتور سازندگان</div><h1 class="h1" style="font-size:clamp(32px,5vw,58px);margin-top:12px">جزوه و گزارش تعاملی بسازید،<br><span class="y">رسا به دست خانواده‌ها می‌رساند.</span></h1><p class="lead">فایل HTML تعاملی، PDF یا بستهٔ ZIP خود را بفرستید. ما پیش‌نمایش زنده، صفحهٔ محصول، کارنامهٔ روایی، اعلان و آمار را فراهم می‌کنیم.</p></div></section>
  <section class="wrap" style="padding-bottom:60px"><div class="how"><div class="card"><b>۱</b><h3>بسازید</h3><p class="mute">با قالب گام‌به‌گام رسا یا ابزار خودتان. فقط یک فایل HTML خودکفا که بدون اینترنت هم کار کند.</p></div><div class="card"><b>۲</b><h3>نتیجه را اعلام کنید</h3><p class="mute">در پایان آزمونک یک خط کد اضافه کنید تا کارنامه ساخته شود:</p><pre class="out" dir="ltr" style="font-size:12px">parent.postMessage({type:'rasa:result',
 score:8,total:10,learner:'نام',
 topics:[{name:'محور عدد',score:4,total:5}]},'*')</pre></div><div class="card"><b>۳</b><h3>منتشر کنید</h3><p class="mute">ناظر کیفیت و سردبیر بازبینی می‌کنند و محصول با صفحهٔ اختصاصی منتشر می‌شود. آمار بازدید، دریافت و کارنامه‌ها را می‌بینید.</p></div></div>
  <form class="card mt" id="cf" style="max-width:720px"><h2 style="font-size:22px">درخواست همکاری و ارسال اثر</h2><div class="f mt"><label>عنوان پیشنهادی محصول</label><input class="in" name="subject" required></div><div class="f"><label>توضیح، پایه و درس، و نمونه‌کار (لینک)</label><textarea class="in" name="body" required></textarea></div>
  <div class="f"><label>فایل اثر (HTML خودکفا، PDF یا ZIP — تا ۴۰ مگابایت)</label><input class="in" type="file" id="cff" accept=".html,.pdf,.zip,text/html,application/pdf,application/zip" style="padding:10px"></div>
  <div class="err" id="cfe"></div><button class="btn y">ارسال درخواست</button><p class="dim" style="font-size:12px;margin:10px 0 0">فایل بلافاصله روی سرور امن ذخیره و برای تیم بازبینی می‌رود؛ بدون فایل هم می‌توانید درخواست دهید.</p></form></section>`;
  $('#cf').onsubmit=async e=>{e.preventDefault();if(!S.me)return authModal(()=>$('#cf').requestSubmit());const f=$('#cff').files[0];
    try{const r=await api('tickets',{body:{...Object.fromEntries(new FormData(e.target)),topic:'creator'}});
      if(f){const up=await fetch(`/api/tickets/${r.id}/file`,{method:'PUT',headers:{'content-type':f.type||'application/octet-stream','x-file-name':encodeURIComponent(f.name)},body:f});if(!up.ok)throw new Error('ارسال فایل ناموفق بود؛ درخواست بدون فایل ثبت شد')}
      toast('درخواست و فایل شما ثبت شد؛ از پشتیبانی پیگیری کنید');e.target.reset()}catch(er){toast(er.message)}}}

// results posted by interactive lessons (open in a new tab or inside the preview)
addEventListener('message',async e=>{const d=e.data;if(!d||d.type!=='rasa:result'||!S.me)return;const m=location.pathname.match(/^\/p\/([\w-]+)/);if(!m)return;
  try{await api('store/attempts',{body:{pid:m[1],score:d.score,total:d.total,learner:d.learner,topics:d.topics,secs:d.secs}});toast('نتیجه در کارنامه ثبت شد')}catch(er){}});

// ---------- command center ----------
const CC=[['overview','◎','نمای کلی'],['products','▦','محصولات'],['categories','◈','دسته‌بندی'],['customers','☺','مشتریان'],['tickets','✉','تیکت‌ها'],['reviews','★','نظرها'],['notices','🔔','اطلاع‌رسانی'],['campaigns','📣','بازاریابی'],['agents','✦','ایجنت‌ها'],['audit','⧗','دفتر ممیزی']];
function spark(series,keys){const W=640,H=180,max=Math.max(1,...series.flatMap(s=>keys.map(k=>s[k[0]])));const x=i=>i/(series.length-1||1)*W,y=v=>H-8-v/max*(H-24);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="نمودار ۳۰ روز">${[0,.5,1].map(t=>`<line x1="0" x2="${W}" y1="${y(max*t)}" y2="${y(max*t)}" stroke="var(--line)"/>`).join('')}${keys.map(([k,c])=>`<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${series.map((s,i)=>x(i)+','+y(s[k])).join(' ')}"/>`).join('')}</svg>
  <div class="row wrapr" style="font-size:12px">${keys.map(([k,c,t])=>`<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c}"></i> ${t}</span>`).join('')}</div>`}
async function admin(sec){
  if(!S.me||!isStaff()){main().innerHTML='<div class="empty"><i>🛡</i>مرکز فرمان فقط برای اعضای تیم است.</div>';return}
  sec=sec||'overview';document.title='مرکز فرمان · رسا آموزش';
  main().innerHTML=`<div class="wrap cc"><nav class="side">${CC.map(([k,i,t])=>`<a href="/admin/${k}" class="${k===sec?'on':''}"><span>${i}</span>${t}<b id="b-${k}" hidden></b></a>`).join('')}</nav><div id="cb"><div class="empty"><i>⏳</i></div></div></div>`;
  const cb=$('#cb');const H=(t,sub,act='')=>`<div class="row wrapr mb" style="justify-content:space-between"><div><div class="eyebrow">مرکز فرمان</div><h1 class="h2" style="font-size:26px">${t}</h1>${sub?`<div class="dim">${sub}</div>`:''}</div><div class="row">${act}</div></div>`;
  try{await (ADM[sec]||ADM.overview)(cb,H)}catch(e){cb.innerHTML=`<div class="empty"><i>⚠</i>${esc(e.message)}</div>`}
}
const ADM={
  async overview(cb,H){const d=await api('admin/overview'),k=d.kpis;
    cb.innerHTML=H('نمای کلی','۳۰ روز گذشته',`<span class="tag" style="--c:${d.ai?'var(--ok)':'var(--bad)'}">هوش مصنوعی: ${d.ai?'متصل':'بدون کلید'}</span><span class="tag" style="--c:${d.bots.length?'var(--ok)':'var(--bad)'}">ربات‌ها: ${d.bots.length?fa(d.bots.length)+' فعال':'بدون توکن'}</span>`)+
    `<div class="kpis">${[['کاربران',k.users,'+'+fa(k.newUsers)+' تازه',1],['بازدید محصول',k.views],['دریافت',k.claims,'نرخ تبدیل '+fa(k.conv)+'٪',1],['آزمونک حل‌شده',k.attempts],['محصول منتشرشده',k.products],['دانلود',k.downloads],['تیکت باز',k.openTickets],['در انتظار تأیید',k.pending+k.reviewsPending]].map(([t,v,s,h])=>`<div class="card kpi ${h?'hl':''}"><span>${t}</span><b>${num(v)}</b>${s?`<span>${s}</span>`:''}</div>`).join('')}</div>
    <div class="grid3 mt" style="grid-template-columns:1.6fr 1fr"><div class="card"><h3 class="mb">روند روزانه</h3>${spark(d.series,[['view','var(--cy)','بازدید'],['claim','var(--y)','دریافت'],['signup','var(--ok)','ثبت‌نام']])}</div>
    <div class="card"><h3 class="mb">منبع ورود</h3>${d.sources.map(s=>`<div class="mb"><div class="row" style="justify-content:space-between;font-size:13px"><span>${esc(s.src)}</span><b>${num(s.n)}</b></div><div class="bar"><i style="width:${s.n/Math.max(...d.sources.map(x=>x.n))*100}%"></i></div></div>`).join('')||'<p class="dim">هنوز داده‌ای نیست.</p>'}</div></div>
    <div class="grid3 mt" style="grid-template-columns:1fr 1fr"><div class="card"><h3 class="mb">پرطرفدارها</h3><table class="tbl"><thead><tr><th>محصول</th><th>بازدید</th><th>دریافت</th></tr></thead><tbody>${d.top.map(p=>`<tr class="click" data-go="/p/${esc(p.id)}"><td>${esc(p.title)}</td><td>${num(p.views)}</td><td>${num(p.claims)}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3 class="mb">آخرین رویدادها</h3>${d.recent.map(a=>`<div class="row" style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)"><code>${esc(a.action)}</code><span class="dim">${esc(a.target||'')}</span><span class="sp"></span><span class="dim">${jdt(a.at)}</span></div>`).join('')||'<p class="dim">—</p>'}</div></div>`;
    if(innerWidth<900)$$('.grid3',cb).forEach(g=>g.style.gridTemplateColumns='1fr')},
  async products(cb,H){const d=await api('admin/products');
    cb.innerHTML=H('محصولات',fa(d.products.length)+' محصول','<button class="btn y sm" id="np">+ محصول تازه</button>')+`<div class="card"><table class="tbl"><thead><tr><th></th><th>عنوان</th><th>دسته</th><th>نوع</th><th>فایل</th><th>وضعیت</th><th>بازدید</th></tr></thead><tbody>${d.products.map(p=>`<tr class="click" data-pe="${esc(p.id)}"><td style="font-size:22px">${esc(p.icon)}</td><td><b>${esc(p.title)}</b><div class="dim" style="font-size:12px" dir="ltr">${esc(p.id)}</div></td><td>${esc(d.categories.find(c=>c.id===p.cat)?.title||'')}</td><td>${KIND[p.kind]||p.kind}</td><td>${p.hasFile?'✓ نسخهٔ '+fa(p.ver):'<span class="dim">—</span>'}</td><td><span class="tag st-${p.status}" style="--c:var(--c)">${STATUS[p.status]}</span></td><td>${num(p.views)}</td></tr>`).join('')}</tbody></table></div>`;
    $('#np').onclick=()=>productEditor({id:'',kind:'lesson',status:'draft',tags:[],features:[],meta:{}},d.categories);
    cb.onclick=e=>{const r=e.target.closest('[data-pe]');if(r)productEditor(d.products.find(p=>p.id===r.dataset.pe),d.categories)}},
  async categories(cb,H){const d=await api('admin/products');
    cb.innerHTML=H('دسته‌بندی محتوا','درخت دسته‌ها؛ زیردسته با «والد»')+`<div class="grid3" style="grid-template-columns:1.4fr 1fr"><div class="card"><table class="tbl"><thead><tr><th></th><th>عنوان</th><th>والد</th><th>محصول</th></tr></thead><tbody>${d.categories.map(c=>`<tr class="click" data-ce="${esc(c.id)}"><td><span class="tag" style="--c:${esc(c.color)}">${esc(c.icon)}</span></td><td>${c.parent?'↳ ':''}<b>${esc(c.title)}</b></td><td>${esc(d.categories.find(x=>x.id===c.parent)?.title||'—')}</td><td>${fa(d.products.filter(p=>p.cat===c.id).length)}</td></tr>`).join('')}</tbody></table></div>
    <form class="card" id="cf"><h3 class="mb">افزودن یا ویرایش</h3>${['id:شناسه (لاتین)','title:عنوان','icon:نماد','color:رنگ','info:توضیح','sort:ترتیب'].map(x=>{const[k,t]=x.split(':');return `<div class="f"><label>${t}</label><input class="in" name="${k}" ${k==='id'||k==='color'?'dir="ltr"':''}></div>`}).join('')}<div class="f"><label>والد</label><select class="in" name="parent"><option value="">— ریشه —</option>${d.categories.filter(c=>!c.parent).map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</select></div><button class="btn y" style="width:100%">ذخیره</button></form></div>`;
    const f=$('#cf');cb.onclick=e=>{const r=e.target.closest('[data-ce]');if(!r)return;const c=d.categories.find(x=>x.id===r.dataset.ce);for(const k of ['id','title','icon','color','info','sort','parent'])f.elements[k].value=c[k]??''};
    f.onsubmit=async e=>{e.preventDefault();try{await api('admin/categories',{body:Object.fromEntries(new FormData(f))});toast('ذخیره شد');await loadStore();admin('categories')}catch(er){toast(er.message)}}},
  async customers(cb,H){let q='';const draw=async()=>{const L=await api('admin/customers?q='+encodeURIComponent(q));
    $('#cl').innerHTML=`<table class="tbl"><thead><tr><th>نام</th><th>شناسه ورود</th><th>نقش</th><th>برچسب</th><th>کتابخانه</th><th>فرزند</th><th>آخرین فعالیت</th></tr></thead><tbody>${L.map(u=>`<tr class="click" data-cu="${u.id}"><td><b>${esc(u.name)}</b></td><td dir="ltr" style="text-align:right">${esc(u.login)}</td><td>${(u.roles||'').split(',').filter(Boolean).map(r=>`<span class="tag">${ROLE[r]}</span>`).join(' ')}</td><td>${(u.tags||'').split(',').filter(Boolean).map(t=>`<span class="tag" style="--c:var(--cy)">${esc(t)}</span>`).join(' ')}</td><td>${fa(u.owned)}</td><td>${fa(u.kids)}</td><td class="dim">${jdt(u.seen||u.created)}</td></tr>`).join('')}</tbody></table>${L.length?'':'<p class="dim">کسی پیدا نشد.</p>'}`};
    cb.innerHTML=H('مدیریت ارتباط با مشتری','پروفایل، برچسب، یادداشت، نقش و تاریخچه')+`<div class="search mb" style="max-width:none"><input id="cq" placeholder="جست‌وجوی نام، موبایل یا ایمیل"></div><div class="card" id="cl"></div>`;
    $('#cq').oninput=e=>{q=e.target.value;clearTimeout(this._t);this._t=setTimeout(draw,250)};cb.onclick=e=>{const r=e.target.closest('[data-cu]');if(r)customerDrawer(+r.dataset.cu)};draw()},
  async tickets(cb,H){const L=await api('admin/tickets');
    cb.innerHTML=H('تیکت‌ها',fa(L.filter(t=>t.status==='open').length)+' تیکت باز')+`<div class="card"><table class="tbl"><thead><tr><th>#</th><th>موضوع</th><th>کاربر</th><th>نوع</th><th>پیام</th><th>وضعیت</th><th>به‌روز</th></tr></thead><tbody>${L.map(t=>`<tr class="click" data-tk="${t.id}"><td>${fa(t.id)}</td><td><b>${esc(t.subject)}</b></td><td>${esc(t.name)}</td><td>${esc(t.topic||'')}</td><td>${fa(t.n)}</td><td><span class="tag st-${t.status}" style="--c:var(--c)">${STATUS[t.status]}</span></td><td class="dim">${jdt(t.updated)}</td></tr>`).join('')}</tbody></table>${L.length?'':'<p class="dim">تیکتی نیست.</p>'}</div>`;
    cb.onclick=e=>{const r=e.target.closest('[data-tk]');if(r)ticketModal(+r.dataset.tk,true)}},
  async reviews(cb,H){const L=await api('admin/reviews');
    cb.innerHTML=H('نظرها','نظرها پس از تأیید منتشر می‌شوند')+`<div class="card"><table class="tbl"><thead><tr><th>محصول</th><th>کاربر</th><th>امتیاز</th><th>متن</th><th>وضعیت</th><th></th></tr></thead><tbody>${L.map(r=>`<tr><td>${esc(r.title)}</td><td>${esc(r.name)}</td><td class="y">${'★'.repeat(r.stars)}</td><td>${esc(r.text)}</td><td>${STATUS[r.status]}</td><td class="row"><button class="btn sm" data-rv="1" data-u="${r.uid}" data-p="${esc(r.pid)}">انتشار</button><button class="btn sm ghost" data-rv="0" data-u="${r.uid}" data-p="${esc(r.pid)}">پنهان</button></td></tr>`).join('')}</tbody></table>${L.length?'':'<p class="dim">نظری نیست.</p>'}</div>`;
    cb.onclick=async e=>{const b=e.target.closest('[data-rv]');if(!b)return;await api('admin/reviews',{body:{ok:b.dataset.rv==='1',uid:+b.dataset.u,pid:b.dataset.p}});toast('انجام شد');admin('reviews')}},
  async notices(cb,H){const L=await api('notices');
    cb.innerHTML=H('اطلاع‌رسانی','اطلاعیه در پروفایل همهٔ کاربران؛ ارسال در بله و تلگرام پس از اتصال ربات‌ها')+`<div class="grid3" style="grid-template-columns:1fr 1.3fr"><form class="card" id="nf"><div class="f"><label>عنوان</label><input class="in" name="title" required></div><div class="f"><label>متن</label><textarea class="in" name="body"></textarea></div><div class="f"><label>لینک (اختیاری)</label><input class="in" name="link" dir="ltr" placeholder="/p/riazi8-f1"></div><div class="f"><label>مخاطب</label><select class="in" name="audience"><option value="all">همه</option><option value="parents">والدین</option><option value="students">دانش‌آموزان</option><option value="creators">سازندگان</option></select></div><button class="btn y" style="width:100%">انتشار</button></form>
    <div class="card">${L.map(n=>`<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><div style="flex:1"><b>${esc(n.title)}</b><div class="dim" style="font-size:12px">${jdt(n.at)}</div></div><button class="btn sm ghost danger" data-nd="${n.id}">حذف</button></div>`).join('')||'<p class="dim">اطلاعیه‌ای نیست.</p>'}</div></div>`;
    $('#nf').onsubmit=async e=>{e.preventDefault();await api('admin/notices',{body:Object.fromEntries(new FormData(e.target))});toast('منتشر شد');admin('notices')};
    cb.onclick=async e=>{const b=e.target.closest('[data-nd]');if(!b)return;await api('admin/notices/'+b.dataset.nd,{method:'DELETE'});admin('notices')}},
  async campaigns(cb,H){const [L,P]=await Promise.all([api('admin/campaigns'),api('admin/products')]);
    cb.innerHTML=H('بازاریابی و کمپین','لینک ردیابی، قیف هر کمپین و پیش‌نویس پست شبکه‌های اجتماعی')+`<div class="grid3" style="grid-template-columns:1fr 1.4fr"><form class="card" id="kf"><h3 class="mb">کمپین</h3><div class="f"><label>شناسه (لاتین، در لینک می‌آید)</label><input class="in" name="id" dir="ltr" required></div><div class="f"><label>نام</label><input class="in" name="name" required></div><div class="f"><label>کانال</label><select class="in" name="channel"><option>تلگرام</option><option>بله</option><option>اینستاگرام</option><option>ایتا</option><option>آپارات</option><option>پیامک</option><option>مدرسه</option><option>تبلیغ کلیکی</option></select></div><div class="f"><label>مقصد</label><select class="in" name="target"><option value="/">صفحهٔ اصلی</option>${P.products.map(p=>`<option value="/p/${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></div><div class="f"><label>وضعیت</label><select class="in" name="status"><option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="paused">متوقف</option></select></div><div class="f"><label>یادداشت</label><textarea class="in" name="notes"></textarea></div><button class="btn y" style="width:100%">ذخیره</button></form>
    <div><div class="card mb"><table class="tbl"><thead><tr><th>کمپین</th><th>کانال</th><th>بازدید</th><th>ثبت‌نام</th><th>دریافت</th><th>لینک</th></tr></thead><tbody>${L.map(c=>`<tr><td><b>${esc(c.name)}</b> <span class="tag st-${c.status==='active'?'live':'draft'}" style="--c:var(--c)">${STATUS[c.status]||c.status}</span></td><td>${esc(c.channel)}</td><td>${num(c.views)}</td><td>${num(c.signups)}</td><td>${num(c.claims)}</td><td><button class="btn sm" data-cl="${esc(location.origin+(c.target||'/')+'?utm_source='+c.id)}">کپی</button></td></tr>`).join('')}</tbody></table>${L.length?'':'<p class="dim">کمپینی نیست.</p>'}</div>
    <div class="card"><h3>✦ بازاریاب محتوا</h3><p class="dim" style="font-size:13px">پست تلگرام، بله و اینستاگرام برای یک محصول؛ پیش‌نویس به صف تأیید می‌رود.</p><div class="row"><select class="in" id="mp">${P.products.filter(p=>p.status==='live').map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select><button class="btn y" id="mg">نوشتن</button></div><pre class="out mt" id="mo" hidden></pre></div></div></div>`;
    $('#kf').onsubmit=async e=>{e.preventDefault();try{await api('admin/campaigns',{body:Object.fromEntries(new FormData(e.target))});toast('ذخیره شد');admin('campaigns')}catch(er){toast(er.message)}};
    $('#mg').onclick=async()=>{$('#mg').disabled=true;try{const r=await api('admin/agents/run',{body:{task:'marketer:social',target:$('#mp').value}});$('#mo').hidden=false;$('#mo').textContent=r.output;toast(r.offline?'پیش‌نویس قالبی؛ برای متن هوشمند کلید AI را تنظیم کنید':'پیش‌نویس در صف تأیید ثبت شد')}catch(e){toast(e.message)}$('#mg').disabled=false};
    cb.onclick=e=>{const b=e.target.closest('[data-cl]');if(b){navigator.clipboard?.writeText(b.dataset.cl);toast('لینک ردیابی کپی شد')}}},
  async agents(cb,H){const d=await api('admin/agents'),pend=d.jobs.filter(j=>j.status==='review');
    const TL={'marketer:social':'پست شبکه‌های اجتماعی','support:reply':'پاسخ تیکت','report-writer:weekly':'گزارش هفتگی والد','qa:catalog':'بازبینی کاتالوگ','growth:digest':'خلاصهٔ رشد'};
    cb.innerHTML=H('تیم ایجنت‌ها',`${fa(d.agents.length)} ایجنت · مدل: <span dir="ltr">${esc(d.model)}</span> · ${d.ai?'<span style="color:var(--ok)">متصل</span>':'<span style="color:var(--bad)">بدون کلید (حالت قالبی)</span>'}`,`<button class="btn sm" data-run="qa:catalog">بازبینی کاتالوگ</button><button class="btn sm" data-run="growth:digest">خلاصهٔ رشد</button>`)+
    `<div class="card mb" style="border-color:color-mix(in srgb,var(--y) 40%,transparent)"><h3>صف تأیید بنیان‌گذار <span class="tag">${fa(pend.length)}</span></h3>${pend.map(j=>`<div class="mt" style="border-top:1px solid var(--line);padding-top:12px"><div class="row wrapr"><b>${esc(j.agent_name)}</b><span class="dim">· ${TL[j.kind]||j.kind}${j.target?' · '+esc(j.target):''}</span>${j.offline?'<span class="tag" style="--c:var(--dim)">قالبی</span>':''}<span class="sp"></span><span class="dim" style="font-size:12px">${jdt(j.at)}</span></div><textarea class="in mt" data-jo="${j.id}" style="min-height:120px">${esc(j.output)}</textarea><div class="row mt"><button class="btn sm y" data-jd="${j.id}" data-ok="1">تأیید</button><button class="btn sm ghost danger" data-jd="${j.id}" data-ok="0">رد</button><button class="btn sm ghost" data-copy="${j.id}">کپی</button></div></div>`).join('')||'<p class="dim">چیزی در انتظار تأیید نیست.</p>'}</div>
    <div class="ag">${d.agents.map(a=>`<div class="card" style="${a.enabled?'':'opacity:.55'}"><div class="row"><b style="flex:1">${esc(a.name)}</b><button class="sw ${a.enabled?'on':''}" data-tg="${esc(a.id)}" aria-label="روشن/خاموش"></button></div><div class="row wrapr mt" style="font-size:12px"><span class="tag" style="--c:var(--cy)">${esc(a.dept)}</span><span class="tag" style="--c:var(--vi)">${esc(a.level)}</span>${a.pending?`<span class="tag">${fa(a.pending)} در صف</span>`:''}</div><p class="mute" style="font-size:13px;margin:8px 0">${esc(a.mission)}</p><div class="dim" style="font-size:12px">بودجهٔ امروز: ${num(a.used)} از ${num(a.daily_tokens)} توکن</div><div class="bar mt"><i style="width:${Math.min(100,a.used/a.daily_tokens*100)}%"></i></div>${d.tasks.filter(t=>t.startsWith(a.id+':')).map(t=>t.endsWith('social')||t.endsWith('reply')||t.endsWith('weekly')?'':`<button class="btn sm mt" data-run="${t}">${TL[t]}</button>`).join('')}</div>`).join('')}</div>
    <div class="card mt"><h3 class="mb">کارهای اخیر</h3><table class="tbl"><thead><tr><th>#</th><th>ایجنت</th><th>کار</th><th>توکن</th><th>وضعیت</th><th>زمان</th></tr></thead><tbody>${d.jobs.map(j=>`<tr><td>${fa(j.id)}</td><td>${esc(j.agent_name)}</td><td>${TL[j.kind]||j.kind}</td><td>${num(j.tokens)}</td><td><span class="tag st-${j.status}" style="--c:var(--c)">${STATUS[j.status]}</span></td><td class="dim">${jdt(j.at)}</td></tr>`).join('')}</tbody></table></div>`;
    cb.onclick=async e=>{const t=e.target;
      if(t.dataset.tg){const a=d.agents.find(x=>x.id===t.dataset.tg);await api('admin/agents/'+a.id,{method:'PATCH',body:{enabled:!a.enabled}});toast(a.enabled?'ایجنت متوقف شد':'ایجنت فعال شد');return admin('agents')}
      if(t.dataset.run){t.disabled=true;try{await api('admin/agents/run',{body:{task:t.dataset.run}});toast('گزارش در صف تأیید است')}catch(er){toast(er.message)}return admin('agents')}
      if(t.dataset.jd){await api(`admin/jobs/${t.dataset.jd}/decide`,{body:{ok:t.dataset.ok==='1',output:$(`[data-jo="${t.dataset.jd}"]`).value}});toast(t.dataset.ok==='1'?'تأیید شد':'رد شد');return admin('agents')}
      if(t.dataset.copy){navigator.clipboard?.writeText($(`[data-jo="${t.dataset.copy}"]`).value);toast('کپی شد')}}},
  async audit(cb,H){const L=await api('admin/audit');
    cb.innerHTML=H('دفتر ممیزی','هر تغییر انسان یا ایجنت ثبت می‌شود')+`<div class="card"><table class="tbl"><thead><tr><th>زمان</th><th>عامل</th><th>عمل</th><th>هدف</th><th>جزئیات</th></tr></thead><tbody>${L.map(a=>`<tr><td class="dim">${jdt(a.at)}</td><td>${esc(a.name||a.actor)}</td><td><code>${esc(a.action)}</code></td><td>${esc(a.target||'')}</td><td class="dim" style="font-size:12px;max-width:280px;overflow:hidden;text-overflow:ellipsis" dir="ltr">${esc(a.data||'')}</td></tr>`).join('')}</tbody></table></div>`}
};
function productEditor(p,cats){
  const m=modal(`<div class="row" style="justify-content:space-between"><h2 style="font-size:20px">${p.id?'ویرایش محصول':'محصول تازه'}</h2><button class="ib" onclick="closeModal()">✕</button></div><form id="pf" class="mt">
  <div class="grid3" style="grid-template-columns:1fr 1fr;gap:10px">
  <div class="f"><label>شناسه (لاتین)</label><input class="in" name="id" dir="ltr" value="${esc(p.id)}" ${p.id?'readonly':''} required></div>
  <div class="f"><label>نوع</label><select class="in" name="kind">${Object.entries(KIND).map(([k,t])=>`<option value="${k}" ${k===p.kind?'selected':''}>${t}</option>`).join('')}</select></div>
  <div class="f" style="grid-column:1/-1"><label>عنوان</label><input class="in" name="title" value="${esc(p.title)}" required></div>
  <div class="f"><label>دسته</label><select class="in" name="cat">${cats.map(c=>`<option value="${esc(c.id)}" ${c.id===p.cat?'selected':''}>${c.parent?'↳ ':''}${esc(c.title)}</option>`).join('')}</select></div>
  <div class="f"><label>وضعیت</label><select class="in" name="status">${['draft','live','soon','archived'].map(s=>`<option value="${s}" ${s===p.status?'selected':''}>${STATUS[s]}</option>`).join('')}</select></div>
  <div class="f"><label>پایه</label><input class="in" name="grade" value="${esc(p.grade)}"></div><div class="f"><label>درس</label><input class="in" name="subject" value="${esc(p.subject)}"></div>
  <div class="f"><label>نماد</label><input class="in" name="icon" value="${esc(p.icon)}"></div><div class="f"><label>رنگ</label><input class="in" name="color" type="color" value="${esc(p.color||'#F4D438')}" style="padding:4px"></div>
  <div class="f" style="grid-column:1/-1"><label>خلاصه (حداقل ۳۰ نویسه)</label><textarea class="in" name="summary">${esc(p.summary)}</textarea></div>
  <div class="f" style="grid-column:1/-1"><label>توضیح کامل</label><textarea class="in" name="body">${esc(p.body)}</textarea></div>
  <div class="f" style="grid-column:1/-1"><label>ویژگی‌ها (هر خط یکی)</label><textarea class="in" name="features">${esc((p.features||[]).join('\n'))}</textarea></div>
  <div class="f"><label>برچسب‌ها (با ویرگول)</label><input class="in" name="tags" value="${esc((p.tags||[]).join('، '))}"></div><div class="f"><label>ترتیب نمایش</label><input class="in" name="sort" type="number" value="${esc(p.sort||0)}"></div></div>
  <div class="card mt" style="padding:14px"><b>فایل محصول</b> <span class="dim">${p.hasFile?'نسخهٔ '+fa(p.ver)+' · '+num(Math.round(p.fsize/1024))+' کیلوبایت':'بدون فایل'}</span><div class="row mt"><input type="file" id="pfile" accept=".html,.pdf,.zip,text/html,application/pdf,application/zip"></div><div class="dim" style="font-size:12px">HTML تعاملی (پیش‌نمایش زنده)، PDF یا ZIP؛ حداکثر ۴۰ مگابایت. هر آپلود یک نسخهٔ تازه است.</div></div>
  <div class="row mt"><button class="btn y" style="flex:1">ذخیره</button>${p.id?`<a class="btn" href="/p/${esc(p.id)}" onclick="closeModal()">مشاهده</a>`:''}</div></form>`);
  m.style.width='min(760px,100%)';
  $('#pf',m).onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    f.features=f.features.split('\n').map(s=>s.trim()).filter(Boolean);f.tags=f.tags.split(/[،,]/).map(s=>s.trim()).filter(Boolean);f.meta=p.meta||{};
    try{await api('admin/products',{body:f});const file=$('#pfile',m).files[0];
      if(file){toast('در حال آپلود…');const r=await fetch('/api/admin/products/'+f.id+'/file',{method:'PUT',headers:{'content-type':file.type||'text/html'},body:file});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'آپلود ناموفق')}
      closeModal();toast('ذخیره شد');await loadStore();admin('products')}catch(er){toast(er.message)}};
}
async function customerDrawer(id){const d=await api('admin/customers/'+id);closeModal();const o=document.createElement('div');o.className='ov';o.id='ov';o.style.justifyContent='flex-start';
  const founder=S.roles.includes('founder');
  o.innerHTML=`<aside class="drawer" style="width:min(520px,100%);overflow:auto"><div class="row" style="justify-content:space-between"><div><h2 style="font-size:20px">${esc(d.user.name)}</h2><div class="dim" dir="ltr" style="text-align:right">${esc(d.user.login)} · عضو از ${jd(d.user.created)}</div></div><button class="ib" onclick="closeModal()">✕</button></div>
  <div class="kpis mt" style="grid-template-columns:repeat(3,1fr)"><div class="card kpi"><span>کتابخانه</span><b>${fa(d.owned.length)}</b></div><div class="card kpi"><span>آزمونک</span><b>${fa(d.attempts.length)}</b></div><div class="card kpi"><span>تیکت</span><b>${fa(d.tickets.length)}</b></div></div>
  <div class="f mt"><label>برچسب‌ها (با ویرگول)</label><div class="row"><input class="in" id="tg" value="${esc(d.tags.join('، '))}" placeholder="والد فعال، مدرسه، سازنده"><button class="btn sm" id="tgs">ذخیره</button></div></div>
  ${founder?`<div class="f"><label>نقش‌ها</label><div class="row wrapr" id="rl">${['admin','editor','support','marketer','creator'].map(r=>`<label class="chip"><input type="checkbox" value="${r}" ${d.roles.includes(r)?'checked':''}> ${ROLE[r]}</label>`).join('')}</div><button class="btn sm mt" id="rls">ذخیرهٔ نقش‌ها</button></div>`:''}
  <div class="f"><label>یادداشت تازه</label><textarea class="in" id="nb"></textarea><button class="btn sm y mt" id="nbs">افزودن یادداشت</button></div>
  ${d.notes.map(n=>`<div class="msg" style="max-width:none"><div class="dim" style="font-size:12px">${esc(n.author_name||'')} · ${jdt(n.at)}</div>${esc(n.body)}</div>`).join('')}
  <h3 class="mt">کتابخانه</h3>${d.owned.map(x=>`<div class="row" style="font-size:13px;padding:5px 0"><span style="flex:1">${esc(x.title||x.pid)}</span><span class="dim">${jd(x.at)}</span></div>`).join('')||'<p class="dim">—</p>'}
  <h3 class="mt">تاریخچه</h3>${d.timeline.map(x=>`<div class="row" style="font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--line)"><code>${esc(x.name)}</code><span class="dim">${esc(x.pid||'')}${x.src?' · '+esc(x.src):''}</span><span class="sp"></span><span class="dim">${jdt(x.at)}</span></div>`).join('')||'<p class="dim">—</p>'}</aside>`;
  o.addEventListener('click',e=>{if(e.target===o)closeModal()});document.body.append(o);
  $('#tgs',o).onclick=async()=>{await api(`admin/customers/${id}/tags`,{body:{tags:$('#tg',o).value.split(/[،,]/).map(s=>s.trim())}});toast('برچسب‌ها ذخیره شد')};
  $('#nbs',o).onclick=async()=>{const b=$('#nb',o).value.trim();if(!b)return;await api(`admin/customers/${id}/note`,{body:{body:b}});customerDrawer(id)};
  $('#rls',o)&&($('#rls',o).onclick=async()=>{await api(`admin/customers/${id}/roles`,{body:{roles:$$('#rl input:checked',o).map(x=>x.value)}});toast('نقش‌ها ذخیره شد')});
}

// ---------- legal / trust pages ----------
const LEGAL={
about:{t:'دربارهٔ رسا آموزش',d:'رسا آموزش پلتفرم یادگیری گام‌به‌گام فارسی است؛ درس و آزمون تعاملی، جزوه‌های گام‌به‌گام، مسیرهای یادگیری، برنامه‌ریز هوشمند و کارنامه‌ای روایی که به‌جای نمره می‌گوید فرزندتان چه بلد است و گام بعدی چیست.',s:[['ما چه می‌کنیم','محتوای آموزشی را به گام‌های کوچک، دیدنی و قابل‌لمس می‌شکنیم تا کودک با انجام‌دادن یاد بگیرد، نه با خواندنِ طولانی.'],['چرا','باور داریم هر دانش‌آموز ایرانی حق دارد هر روز یک گام روشن بردارد و خانواده‌اش آن را ببیند.']]},
terms:{t:'قوانین و مقررات',d:'با استفاده از رسا آموزش این قوانین را می‌پذیرید.',s:[['کالاها','محصولات دیجیتال (درس، جزوه، گزارش) پس از پرداخت یا دریافت رایگان، برای استفادهٔ شخصی و خانواده مجاز است؛ کپی و انتشار تجاری بدون اجازه ممنوع.'],['حساب کاربری','اطلاعات ورود را محرمانه نگه دارید؛ مسئولیت فعالیت‌های حساب با شماست.'],['محتوای کاربر','سازندگان مالک محتوای خود هستند و رسا آموزش حق بازبینی و حذف محتوای نامناسب را دارد.'],['تغییرات','قوانین ممکن است به‌روز شود؛ ادامهٔ استفاده به معنای پذیرش نسخهٔ جدید است.']]},
privacy:{t:'حریم خصوصی',d:'دادهٔ کودک مقدس است؛ این سیاست می‌گوید چه جمع می‌کنیم و چه نمی‌کنیم.',s:[['چه جمع می‌کنیم','نام، شمارهٔ موبایل یا ایمیل، نام فرزند و پیشرفت آموزشی (در صورت استفاده از سامانهٔ کلاس دوم)، و رویدادهای استفاده برای بهبود سرویس.'],['چه جمع نمی‌کنیم','دادهٔ کودک هرگز فروخته نمی‌شود و برای آموزش مدل هوش مصنوعی استفاده نمی‌گردد. تبلیغ شخص‌ثالث در محتوای کودک نداریم.'],['ذخیره و امنیت','داده‌ها روی سرورهای داخل ایران با رمزنگاری و دسترسی محدود نگه‌داری می‌شوند؛ بکاپ منظم گرفته می‌شود.'],['حقوق شما','در هر زمان می‌توانید داده‌ها را ببینید، اصلاح یا حذف کنید؛ برای این کار از بخش پشتیبانی پیام دهید.'],['کوکی‌ها','فقط برای نشست ورود و تنظیمات تم استفاده می‌شود.']]},
refund:{t:'رویهٔ بازگشت وجه',d:'کالای دیجیتال؛ بازگشت وجه تا زمانی که محتوا باز نشده باشد.',s:[['شرایط بازگشت','اگر محصول را باز یا دانلود نکرده باشید، تا ۷ روز از خرید می‌توانید وجه را پس بگیرید.'],['چطور','از بخش «سفارش‌ها» در پروفایل یا پشتیبانی درخواست دهید؛ وجه به همان درگاه پرداخت برمی‌گردد.'],['استثنا','پس از باز کردن محتوا، بازگشت وجه فقط در صورت defect فنی اثبات‌شده و در صورت حل‌نشدن مشکل با پشتیبانی انجام می‌شود.']]},
contact:{t:'تماس با ما',d:'پاسخ‌گویی در روزهای کاری، حداکثر تا ۲۴ ساعت.',s:[['پشتیبانی','از داخل سایت: پروفایل ← پشتیبانی؛ یا info@<domain>'],['همکاری سازندگان','در صفحهٔ «سازندگان» درخواست خود را با فایل ارسال کنید.'],['مدارس و معلمان','برای مجوز گروهی و نسخهٔ مدرسه با ما در تماس باشید.']]}
};
function legal(k){const L=LEGAL[k];if(!L)return;setMeta(L.t+' · رسا آموزش',L.d);
  main().innerHTML=`<section class="wrap" style="padding:40px 20px 80px;max-width:760px"><div class="eyebrow">رسا آموزش</div><h1 class="h2" style="margin:8px 0 6px">${esc(L.t)}</h1><p class="mute">${esc(L.d)}</p>
  <div class="mt">${L.s.map(x=>`<div class="card mb" style="padding:20px"><h3 style="font-size:17px">${esc(x[0])}</h3><p class="mute" style="margin:8px 0 0">${esc(x[1])}</p></div>`).join('')}</div>
  <div class="row mt"><a class="btn y" href="/">بازگشت به صفحهٔ اصلی</a></div></section>`}

function pricing(){const plans=S.store?.pricing?.plans||[];setMeta('تعرفه‌ها · رسا آموزش','پلن‌های رایگان، خانواده، مدرسه و سازنده در رسا آموزش.');
  main().innerHTML=`<section class="wrap" style="padding:40px 20px 80px"><div class="eyebrow">تعرفه</div><h1 class="h2" style="margin:8px 0 6px">ساده و شفاف</h1><p class="mute">ابزارهای پایه رایگان‌اند؛ برای محتوا و خدمات ویژه پلن دارید.</p>
  <div class="grid3 mt" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${plans.map(pl=>`<div class="card" style="display:flex;flex-direction:column;${pl.id==='family'?'border-color:color-mix(in srgb,var(--y) 55%,transparent)':''}"><h3 style="font-size:19px">${esc(pl.title)}</h3><div class="mt"><span style="font-size:30px;font-weight:900">${pl.price?num(pl.price):'رایگان'}</span> <span class="dim">${esc(pl.period)}</span></div>
  <ul style="list-style:none;padding:0;margin:16px 0;flex:1">${pl.features.map(f=>`<li style="padding:6px 0;border-bottom:1px dashed var(--line);font-size:13.5px">✓ ${esc(f)}</li>`).join('')}</ul>
  <a class="btn ${pl.id==='family'?'y':'ghost'}" href="/c" style="width:100%">${pl.id.startsWith('family')?'شروع خانواده':'مشاهده'}</a></div>`).join('')}</div>
  <p class="dim mt" style="font-size:12.5px">قیمت‌ها به تومان و پیش‌نویس‌اند؛ پلن خانواده به‌زودی فعال می‌شود. برای مدرسه و سازندگان با ما در تماس باشید.</p></section>`}

// ---------- router ----------
async function quizPage(){
  setMeta('آزمون آنلاین · رسا آموزش','آزمون آنلاین رسا آموزش بر اساس مقطع تحصیلی و درس؛ سؤال‌های واقعی درس‌ها با بازخورد فوری و ثبت در کارنامهٔ هوشمند.');
  main().innerHTML=`<section class="nt-sec" style="padding-top:30px"><div class="wrap">
  <div class="nt-sh"><span class="nt-pg">آزمون</span><h2>آزمون آنلاین — بر اساس مقطع و درس</h2><span class="nt-rule"></span></div>
  <div class="exam" style="margin-bottom:20px"><div class="exam-head"><b>برگهٔ آزمونک</b><span>سؤال‌های واقعی درس‌های رسا</span></div><div class="qz-tabs" id="qzTabs"></div><div id="quiz"></div></div>
  <div id="qhist"></div></div></section>`;
  bindQuiz();
  if(S.me)api('store/library').then(L=>{const h=$('#qhist');if(!h)return;const atts=(L.attempts||[]).filter(a=>String(a.pid).startsWith('quiz:')).slice(0,10);
    if(atts.length)h.innerHTML=`<div class="card"><b>سوابق آزمونک تو</b>${atts.map(a=>`<div class="row" style="justify-content:space-between;padding:7px 0;border-bottom:1px dashed var(--line)"><span>${esc(a.pid.slice(5))}</span><span><b>${fa(a.score)} از ${fa(a.total)}</b> <span class="dim" style="font-size:12px">${jd(a.at)}</span></span></div>`).join('')}</div>`}).catch(()=>{});
}
const SVC_GROUPS=[
  ['📚 یادگیری',[['درس‌های تعاملی','گام‌های کوچک با شبیه‌ساز و بازخورد فوری','/c?kind=lesson'],['جزوه‌های گام‌به‌گام','مرحله‌به‌مرحله با تمرین و پاسخ','/c?kind=booklet'],['مسیرهای یادگیری','از ابتدا تا تسلط، مرتب و شماره‌دار','/#paths'],['آزمون آنلاین','بانک سؤال واقعی بر اساس مقطع و درس','/quiz'],['سامانهٔ کلاس دوم','روال روزانه، ستاره، مشق و کیف فردا','/kids/']]],
  ['📊 ردیابی و رشد',[['کارنامهٔ هوشمند','تحلیل تلاش‌ها به «بلد است / در حال تمرین / گام بعدی»','/me#report'],['کارنامه برای والد','ارسال روایت پیشرفت فرزند در بله و تلگرام','/me#report'],['برنامه‌ریز درسی','برنامهٔ هفتگی، مرور فاصله‌دار، پشتیبان ابری رمزدار','/planner/'],['اطلاع‌رسانی و یادآوری','روال صبح، مشق، کیف فردا، گزارش هفتگی در ربات','/me#notice']]],
  ['🤝 جامعه',[['بازار سازندگان','جزوه و گزارش از سازندگان مستقل با پیش‌نمایش زنده','/creators'],['تعرفه و اشتراک','ابزارهای پایه رایگان، محتواهای ویژه با زرین‌پال','/pricing'],['پشتیبانی درسی','تیکت، ربات و پاسخ‌گویی به خانواده‌ها','/support'],['مرکز فرمان','۱۹ ایجنت داخلی برای تولید و پشتیبانی','/admin']]]
];
function servicesPage(){
  setMeta('خدمات · رسا آموزش','همهٔ سرویس‌های رسا آموزش: درس تعاملی، آزمون، کارنامهٔ هوشمند، برنامه‌ریز، اطلاع‌رسانی ربات، بازار سازندگان و پشتیبانی.');
  main().innerHTML=`<section class="nt-sec" style="padding-top:36px"><div class="wrap">
  <div class="nt-sh"><span class="nt-pg">خدمات</span><h2>همهٔ سرویس‌های رسا، در یک نگاه</h2><span class="nt-rule"></span></div>
  ${SVC_GROUPS.map(([g,items])=>`<h3 class="mt" style="margin-bottom:14px;font-size:19px">${g}</h3><div class="tkts">${items.map((s,i)=>`<a class="tkt" style="--c:var(--cy)" href="${s[2]}"><span class="tkt-stub"><b>${fa(i+1).padStart(2,'۰')}</b><span class="tkt-bc"></span></span><span class="tkt-body"><strong>${s[0]}</strong><em>${s[1]}</em></span><span class="tkt-a">←</span></a>`).join('')}</div>`).join('')}
  </div></section>`;
}
function supportPage(){
  setMeta('پشتیبانی · رسا آموزش','پشتیبانی رسا آموزش: تیکت داخل حساب، ربات بله و تلگرام، و پاسخ به خانواده‌ها.');
  main().innerHTML=`<section class="nt-sec" style="padding-top:36px"><div class="wrap">
  <div class="nt-sh"><span class="nt-pg">پشتیبانی</span><h2>کنار توییم، گام‌به‌گام</h2><span class="nt-rule"></span></div>
  <div class="grid3">
  <div class="card"><div style="font-size:32px">💬</div><h3>تیکت پشتیبانی</h3><p class="mute" style="font-size:14px">سریع‌ترین راه؛ داخل حساب شما پیگیری می‌شود.</p><a class="btn y sm mt" href="/me#support">رفتن به تیکت‌ها</a></div>
  <div class="card"><div style="font-size:32px">🤖</div><h3>ربات بله و تلگرام</h3><p class="mute" style="font-size:14px">اطلاع‌رسانی، یادآوری و پیام‌رسانی مستقیم — در «اطلاعیه‌ها» وصلش کن.</p><a class="btn sm mt" href="/me#notice">اتصال ربات</a></div>
  <div class="card"><div style="font-size:32px">❓</div><h3>پرسش‌های پرتکرار</h3><p class="mute" style="font-size:14px">پاسخ دربارهٔ قیمت، حریم خصوصی کودک، رفتار روی گوشی.</p><a class="btn sm mt" href="/">دیدن صفحهٔ اول</a></div>
  </div>
  ${!S.me?`<div class="cta mt"><div><h2 style="font-size:20px">برای ارسال تیکت وارد شو</h2><p class="mute">ورود با موبایل یا ایمیل، کمتر از یک دقیقه.</p></div><button class="btn y" id="sl">ورود / ثبت‌نام</button></div>`:''}
  <div class="card mt"><h3>کانال‌های دیگر</h3><p class="mute" style="font-size:14px;margin:8px 0 0">مدرسه و همکاری سازمانی → <a class="y" href="/contact">صفحهٔ تماس</a> · قوانین → <a class="y" href="/terms">شرایط استفاده</a> · بازگشت وجه → <a class="y" href="/refund">سیاست بازگشت</a></p></div>
  </div></section>`;
  const b=$('#sl');if(b)b.onclick=()=>authModal();
}
async function searchPage(){
  const q=new URLSearchParams(location.search).get('q')||'';
  setMeta('جست‌وجو: '+q+' · رسا آموزش','جست‌وجو در محصولات، مسیرها و سرویس‌های رسا آموزش');
  main().innerHTML=`<section class="wrap" style="padding:36px 20px 60px"><div class="nt-sh"><span class="nt-pg">جست‌وجو</span><h2>«${esc(q)}»</h2><span class="nt-rule"></span></div>
  <form class="search" id="sf" style="margin:0 0 24px;max-width:none"><input name="q" value="${esc(q)}" placeholder="درس، جزوه، سرویس…"><button class="btn y">جست‌وجو</button></form><div id="sres"></div></section>`;
  $('#sf').onsubmit=e=>{e.preventDefault();go('/search?q='+encodeURIComponent(new FormData(e.target).get('q')))};
  const el=$('#sres');el.innerHTML='<p class="dim">در حال جست‌وجو…</p>';
  try{const r=await api('search?q='+encodeURIComponent(q));
    const blk=(t,h)=>h?`<h3 class="mt" style="margin-bottom:12px">${t}</h3>${h}`:'';
    el.innerHTML=
      blk('صفحه‌ها و خدمات',r.pages.map(x=>`<a class="chip" style="margin:0 0 8px 8px" href="${esc(x.url)}">${esc(x.title)}</a>`).join(''))+
      blk('مسیرهای یادگیری',r.paths.map(p=>`<a class="pstep mb" href="/"><i>🧭</i><span>${esc(p.icon||'')} ${esc(p.title)}</span></a>`).join(''))+
      blk('محصولات',r.products.length?`<div class="grid3">${r.products.map(p=>{const full=S.store.products.find(x=>x.id===p.id);return full?pcard(full):''}).join('')}</div>`:'')+
      ((!r.pages.length&&!r.paths.length&&!r.products.length)?'<div class="empty"><i>🔍</i>چیزی پیدا نشد.<br><a class="y" href="/c">کاتالوگ کامل</a></div>':'');
  }catch(e){el.innerHTML='<p class="err">'+esc(e.message)+'</p>'}
}
async function route(){
  const p=location.pathname;closeModal();nav();
  if(p==='/'||p==='')home();
  else if(p==='/c'||p.startsWith('/c/'))catalog(decodeURIComponent(p.slice(3)));
  else if(p.startsWith('/p/'))await product(decodeURIComponent(p.split('/')[2]));
  else if(p==='/me')await profile();
  else if(p==='/creators')creators();
  else if(p.startsWith('/admin'))await admin(p.split('/')[2]);
  else if(p==='/pricing')pricing();
  else if(p==='/quiz')quizPage();
  else if(p==='/services')servicesPage();
  else if(p==='/support')supportPage();
  else if(p==='/search')searchPage();
  else if(LEGAL[p.slice(1)])legal(p.slice(1));
  else main().innerHTML='<div class="empty"><i>🧭</i>این صفحه پیدا نشد.<br><a class="y" href="/">صفحهٔ اصلی</a></div>';
  if(p==='/'&&S.ref)ev('ref_visit',null);
}
(async()=>{foot();await loadMe();try{await loadStore()}catch(e){S.store={categories:[],products:[],roles:[]}}await route();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})})();
