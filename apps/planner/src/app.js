/* ===== state ===== */
const PAL=['#FFB547','#FF7E5F','#E35DFF','#4BE8E2','#7C9CFF','#4BE6A8','#FF86CF','#CFF56E','#B9A0FF','#FFD36E','#5FD3FF','#FF9E7A'];
const DEF_SUBJ=[['ریاضی',3],['فیزیک',3],['شیمی',3],['زیست‌شناسی',4],['ادبیات فارسی',1],['عربی',1],['دین و زندگی',1],['زبان انگلیسی',1]];
const REV_INT=[1,3,7,16,30];
const EV_TYPES={exam:['آزمون','📝'],class:['کلاس','🏫'],due:['مهلت تکلیف','📌'],consult:['مشاوره','💬'],other:['شخصی','⭐']};
let S=null,KEY=null,USER=null,VIEW='home',saveT=null,lastAct=Date.now();
function fresh(){return{v:2,profile:{name:'',grade:'',school:'',target:7000},
 settings:{dailyGoal:240,weeklyGoal:28,streakMin:30,theme:'rasa',block:45,brk:10,lock:15,avail:[180,180,180,180,180,120,360],start:['17:00','17:00','17:00','17:00','17:00','16:00','09:00'],lastAuto:'',notif:true,smartRem:true},
 subjects:DEF_SUBJ.map((s,i)=>({id:'s'+i,name:s[0],w:s[1],color:PAL[i]})),sessions:[],exams:[],todos:{},events:[],reviews:[],plans:{},
 reminders:[{id:'r1',title:'زمان شروع مطالعه',time:'17:00',days:[1,1,1,1,1,1,0],on:true},{id:'r2',title:'مرور شبانه و برنامه فردا',time:'22:00',days:[1,1,1,1,1,1,1],on:true}],
 timer:null,fired:{},created:Date.now()}}
function norm(s){const f=fresh();s=Object.assign(f,s||{});s.settings=Object.assign(fresh().settings,s.settings||{});s.profile=Object.assign(fresh().profile,s.profile||{});['sessions','exams','events','reviews','reminders','subjects'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});['todos','plans','fired'].forEach(k=>{if(!s[k]||typeof s[k]!=='object')s[k]={}});if(!['rasa','light','navy','ocean'].includes(s.settings.theme))s.settings.theme='rasa';s.v=2;return s}
const sub=id=>S.subjects.find(s=>s.id===id)||{id,name:'سایر',color:'#8892b0',w:1};
const users=()=>{try{return JSON.parse(localStorage.getItem('mst.users'))||[]}catch(e){return[]}};
const setUsers=a=>localStorage.setItem('mst.users',JSON.stringify(a));
function save(now){if(!S||!KEY)return;clearTimeout(saveT);const run=async()=>{try{const v=await enc(KEY,S);await KV.set('vault:'+USER.u,v);fetch('/api/planner',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({blob:JSON.stringify(v)})}).catch(()=>{})}catch(e){toast('خطا در ذخیره‌سازی: '+e.message)}};if(now)return run();saveT=setTimeout(run,350)}
function commit(){save();render()}
/* ===== aggregates ===== */
function byDay(subj){const m={};S.sessions.forEach(s=>{if(!subj||s.subj===subj)m[s.date]=(m[s.date]||0)+s.min});return m}
function minsIn(a,b,subj){return sum(S.sessions.filter(s=>s.date>=a&&s.date<=b&&(!subj||s.subj===subj)).map(s=>s.min))}
const totalMin=()=>sum(S.sessions.map(s=>s.min));
function streak(){const m=byDay(),th=S.settings.streakMin,act=d=>(m[d]||0)>=th,t=today();let cur=0,d=act(t)?t:addD(t,-1);while(act(d)){cur++;d=addD(d,-1)}
 const days=Object.keys(m).filter(act).sort();let best=0,run=0,prev=null;days.forEach(x=>{run=prev&&addD(prev,1)===x?run+1:1;best=Math.max(best,run);prev=x});
 return{cur,best,active:days.length,todayOk:act(t),todayMin:m[t]||0}}
const todosOf=d=>S.todos[d]||(S.todos[d]=[]);
function todoPct(d){const a=S.todos[d]||[];return a.length?a.filter(x=>x.done).length/a.length*100:null}
const tasksDone=()=>sum(Object.values(S.todos).map(a=>a.filter(x=>x.done).length));
const examsSorted=()=>S.exams.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
function examAvg(sid,n=3){const v=examsSorted().map(e=>e.scores?.[sid]).filter(x=>x!=null&&x!=='');const l=v.slice(-n);return l.length?sum(l.map(Number))/l.length:null}
function lastStudied(sid){let l=null;S.sessions.forEach(s=>{if(s.subj===sid&&(!l||s.date>l))l=s.date});return l}
function regress(ys){const n=ys.length;if(n<2)return null;const xs=ys.map((_,i)=>i),mx=sum(xs)/n,my=sum(ys)/n;let a=0,b=0;xs.forEach((x,i)=>{a+=(x-mx)*(ys[i]-my);b+=(x-mx)**2});const slope=a/b,ic=my-slope*mx;const res=Math.sqrt(sum(ys.map((y,i)=>(y-(ic+slope*i))**2))/Math.max(1,n-2));return{slope,ic,next:ic+slope*n,res}}
function predictTaraz(){const t=examsSorted().map(e=>e.taraz).filter(v=>v!=null&&v!=='').map(Number).slice(-6);const r=regress(t);if(!r)return null;return{v:r.next,lo:r.next-r.res,hi:r.next+r.res,slope:r.slope,n:t.length}}
function upcomingExams(days=60){const t=today();return S.events.filter(e=>e.type==='exam'&&e.date>=t&&diffD(e.date,t)<=days).sort((a,b)=>a.date<b.date?-1:1)}
function dueReviews(d=today()){return S.reviews.filter(r=>!r.done&&r.due<=d)}
function xpInfo(){const xp=Math.round(totalMin()+15*tasksDone()+40*S.exams.length+10*S.reviews.reduce((a,r)=>a+r.stage,0));const lv=Math.floor(Math.sqrt(xp/120))+1,lo=120*(lv-1)**2,hi=120*lv**2;
 const T=['نوآموز','کوشا','پرتلاش','پیگیر','ستارهٔ کلاس','قهرمان','استاد','نابغه','افسانه'];return{xp,lv,lo,hi,pct:(xp-lo)/(hi-lo)*100,title:T[Math.min(T.length-1,Math.floor((lv-1)/2))]}}
/* ===== smart engine ===== */
function priorities(){const t=today(),ue=upcomingExams(30),m7=minsIn(addD(t,-6),t)||1;
 const list=S.subjects.map(s=>{const ex=examAvg(s.id),last=lastStudied(s.id),gap=last?diffD(t,last):15;
  const weak=ex==null?.35:clamp((75-ex)/75,0,1.2),neglect=clamp(gap/7,0,1.5);const ne=ue.find(e=>!e.subj||e.subj===s.id);const dd=ne?diffD(ne.date,t):null;const urg=ne?clamp((30-dd)/30,0,1):0;
  const share=minsIn(addD(t,-6),t,s.id)/m7;const score=(+s.w||1)*(1+1.5*weak+.8*neglect+1.2*urg);const why=[];
  if(ex!=null&&ex<45)why.push(`درصد پایین آزمون (${fa(ex,0)}٪)`);else if(ex!=null&&ex<65)why.push(`جای رشد در آزمون (${fa(ex,0)}٪)`);
  if(gap>=5)why.push(last?`${faD(gap)} روز مطالعه نشده`:'هنوز مطالعه نشده');if(ne&&dd<=21)why.push(`${ne.title||'آزمون'} ${dd?faD(dd)+' روز دیگر':'امروز'}`);if((+s.w||1)>=3)why.push(`ضریب ${faD(s.w)}`);
  return{s,score,ex,gap,urg,share,why}});const T=sum(list.map(x=>x.score))||1;list.forEach(x=>x.target=x.score/T);return list.sort((a,b)=>b.score-a.score)}
function buildPlan(ws){const st=S.settings,P=priorities(),t=today();const old=S.plans[ws];const plan={ws,created:Date.now(),days:{},why:P.map(p=>({sid:p.s.id,target:p.target,why:p.why}))};
 const cnt={};P.forEach(p=>cnt[p.s.id]=0);let totalB=0;const revSim=S.reviews.filter(r=>!r.done).map(r=>({...r}));
 for(let i=0;i<7;i++){const d=addD(ws,i);if(d<t&&old&&old.days[d]){plan.days[d]=old.days[d];continue}if(d<t){plan.days[d]=[];continue}
  let cap=+st.avail[i]||0;const blocks=[];
  revSim.filter(r=>r.due<=d).slice(0,4).forEach(r=>{if(cap<20)return;blocks.push({id:uid(),subj:r.subj,min:15,kind:'review',note:'مرور: '+r.topic,rid:r.id});cap-=15+5;r.due='9999'});
  const B=+st.block||45;let prev=null,rep=0;
  while(cap>=Math.min(B,30)){const m=Math.min(B,cap);let best=null,bv=-1e9;
   P.forEach(p=>{let v=p.target*(totalB+1)-cnt[p.s.id];const ne=upcomingExams(30).find(e=>e.subj===p.s.id);if(ne){const dd=diffD(ne.date,d);if(dd>=0&&dd<=3)v+=.6}if(p.s.id===prev&&rep>=1)v-=1.2;if(v>bv){bv=v;best=p}});
   if(!best)break;const isTest=(i===6&&blocks.filter(b=>b.kind==='test').length<1&&cap<=B*2);
   blocks.push({id:uid(),subj:best.s.id,min:m,kind:isTest?'test':'study',note:isTest?'آزمونک و تست زمان‌دار':(best.ex!=null&&best.ex<50?'درسنامه + تست پایه':'تست و رفع اشکال')});
   cnt[best.s.id]++;totalB++;rep=best.s.id===prev?rep+1:0;prev=best.s.id;cap-=m+(+st.brk||10)}
  plan.days[d]=blocks}
 return plan}
function blockTimes(day,i0){const st=S.settings;const [h,m]=String(st.start[wdi(day)]||'17:00').split(':').map(Number);let t=h*60+m;return(S.plans[weekStart(day)]?.days[day]||[]).map(b=>{const a=t;t+=b.min+(b.kind==='review'?5:+st.brk||10);return a})}
const hhmm=m=>faD(p2(Math.floor(m/60)%24)+':'+p2(m%60));
function insights(){const out=[],t=today(),st=streak(),g=S.settings.dailyGoal,now=new Date(),left=g-st.todayMin;
 if(!S.sessions.length&&!S.exams.length)return[{i:'👋',t:'با ثبت اولین جلسهٔ مطالعه یا اجرای تایمر، تحلیل‌های هوشمند فعال می‌شود.'}];
 if(left>0){const blocks=Math.ceil(left/(+S.settings.block||45));out.push({i:'🎯',t:`تا هدف امروز ${hm(left)} مانده است؛ معادل ${faD(blocks)} بلوک ${faD(S.settings.block)} دقیقه‌ای.`})}else out.push({i:'🏆',t:`هدف امروز کامل شد (${hm(st.todayMin)}). عالی!`});
 if(st.cur>0&&!st.todayOk&&now.getHours()>=18)out.push({i:'🔥',t:`استریک ${faD(st.cur)} روزه در خطر است؛ دست‌کم ${faD(S.settings.streakMin)} دقیقه مطالعه کن.`});
 const w=minsIn(weekStart(t),t),pw=minsIn(addD(weekStart(t),-7),addD(t,-7));if(pw>0){const ch=(w-pw)/pw*100;out.push({i:ch>=0?'📈':'📉',t:`نسبت به همین بازهٔ هفتهٔ قبل ${fa(Math.abs(ch),0)}٪ ${ch>=0?'بیشتر':'کمتر'} مطالعه کرده‌ای.`})}
 const P=priorities();const top=P[0];if(top)out.push({i:'🧠',t:`اولویت هوشمند امروز: «${top.s.name}»${top.why.length?' — '+top.why.slice(0,2).join('، '):''}.`});
 const neg=P.filter(p=>p.gap>=5&&p.s.w>=2).map(p=>p.s.name);if(neg.length)out.push({i:'⏳',t:`درس‌های عقب‌مانده: ${neg.join('، ')}.`});
 const ue=upcomingExams(14)[0];if(ue)out.push({i:'📝',t:`${ue.title} ${diffD(ue.date,t)?faD(diffD(ue.date,t))+' روز دیگر':'امروز'} (${jS(ue.date)}).`});
 const dr=dueReviews().length;if(dr)out.push({i:'🔁',t:`${faD(dr)} مرور فاصله‌دار برای امروز موعد دارد.`});
 const pr=predictTaraz();if(pr&&pr.n>=3)out.push({i:'🔮',t:`پیش‌بینی تراز آزمون بعدی: حدود ${fa(pr.v,0)} (بازه ${fa(pr.lo,0)} تا ${fa(pr.hi,0)}). روند: ${pr.slope>=0?'صعودی':'نزولی'} ${fa(Math.abs(pr.slope),0)} در هر آزمون.`});
 const hrsM={};S.sessions.filter(s=>s.h!=null).forEach(s=>hrsM[s.h]=(hrsM[s.h]||0)+s.min);const bh=Object.entries(hrsM).sort((a,b)=>b[1]-a[1])[0];if(bh&&Object.keys(hrsM).length>=3)out.push({i:'⏰',t:`ساعت طلایی تمرکز تو حدود ${hhmm(bh[0]*60)} است؛ درس‌های سخت را در این زمان بگذار.`});
 return out}
/* ===== backups ===== */
async function bkList(){const ks=await KV.keys('bk:'+USER.u+':');const out=[];for(const k of ks){try{const b=await dec(KEY,await KV.get(k));out.push({k,...b.meta})}catch(e){}}return out.sort((a,b)=>b.ts-a.ts)}
async function makeBackup(kind,label){const meta={id:uid(),ts:Date.now(),kind,label:label||'',stats:{s:S.sessions.length,e:S.exams.length,t:Object.values(S.todos).reduce((a,x)=>a+x.length,0),m:totalMin()}};
 await KV.set(`bk:${USER.u}:${meta.id}`,await enc(KEY,{meta,data:{...S,timer:null}}));
 const l=await bkList();const autos=l.filter(b=>b.kind==='auto');for(const b of autos.slice(20))await KV.del(b.k);const rest=l.filter(b=>b.kind!=='auto');for(const b of rest.slice(60))await KV.del(b.k);return meta}
async function autoBackup(){if(S.settings.lastAuto!==today()&&(S.sessions.length||S.exams.length)){await makeBackup('auto');S.settings.lastAuto=today();save()}}
const BK_KIND={manual:'دستی',auto:'خودکار روزانه',pre:'پیش از بازگردانی',imp:'پیش از ورود فایل',reset:'پیش از پاک‌سازی'};
async function exportBackupFile(k){let data,ts=Date.now();if(k){const b=await dec(KEY,await KV.get(k));data=b.data;ts=b.meta.ts}else data={...S,timer:null};
 const salt=rnd(16),pass=await ask({title:'رمز فایل پشتیبان',msg:'فایل با این رمز رمزگذاری می‌شود (می‌تواند همان رمز ورود باشد). برای بازکردن فایل روی دستگاه دیگر لازم است.',input:'password',ok:'رمزگذاری و ذخیره'});if(!pass)return;
 const fk=await deriveKey(pass,salt);const box=await enc(fk,data);const file=JSON.stringify({app:'mst-study',v:2,enc:'AES-256-GCM/PBKDF2-SHA256',iter:ITER,salt:b64(salt),ts,user:USER.u,box});
 const r=await shareOrDownload(`study-backup-${USER.u}-${tsFile(ts)}.mstbak`,file,'application/octet-stream','پشتیبان داشبورد درسی');if(r!=='abort')toast('فایل پشتیبان رمزگذاری‌شده آماده شد')}
async function importBackupFile(file){try{const j=JSON.parse(await file.text());if(j.app!=='mst-study'||!j.box)throw new Error('فرمت فایل نامعتبر است');
  const pass=await ask({title:'رمز فایل پشتیبان',msg:`فایل مربوط به ${tsTxt(j.ts)} است. رمز آن را وارد کن.`,input:'password',ok:'بازکردن'});if(!pass)return;
  let data;try{data=await dec(await deriveKey(pass,unb64(j.salt),j.iter||ITER),j.box)}catch(e){toast('رمز فایل نادرست است');return}
  await makeBackup('imp');S=norm(data);save(true);render();toast('داده‌ها از فایل بازگردانی شد')}catch(e){toast('خطا: '+e.message)}}
async function restoreBackup(k){const b=await dec(KEY,await KV.get(k));if(!await ask({title:'بازگردانی نسخه',msg:`داده‌های فعلی با نسخهٔ «${tsTxt(b.meta.ts)}» جایگزین می‌شود. پیش از آن یک کپی خودکار از وضعیت فعلی ذخیره می‌شود.`,ok:'بازگردانی'}))return;
 await makeBackup('pre');const tm=S.timer;S=norm(b.data);S.timer=tm;save(true);render();renderBk();toast('نسخهٔ انتخابی بازگردانی شد');confetti()}
/* ===== ask dialog ===== */
function ask({title,msg,input,ok='تأیید',value=''}){return new Promise(res=>{$('#askT').textContent=title;$('#askM').textContent=msg||'';const inp=$('#askI');inp.hidden=!input;inp.type=input||'text';inp.value=value;$('#askOk').textContent=ok;openOv('ovAsk');if(input)setTimeout(()=>inp.focus(),150);
 const done=v=>{closeOv('ovAsk');$('#askOk').onclick=$('#askNo').onclick=null;inp.onkeydown=null;res(v)};$('#askOk').onclick=()=>done(input?inp.value:true);$('#askNo').onclick=()=>done(input?null:false);inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value)}})}
/* ===== auth gate ===== */
function gate(mode){const us=users();if(!us.length)mode='reg';const g=$('#gate');g.hidden=false;$('#app').hidden=true;$('#nav').hidden=true;
 const last=localStorage.getItem('mst.last')||us[0]?.u||'';
 const logo=`<div class="logo">${LOGO_SVG}</div>`;
 g.innerHTML=`<div class="box">${logo}<h1>رسا آموزش</h1><p class="c">برنامه‌ریز هوشمند درسی · ردیاب مطالعه · تحلیل آزمون</p>${mode==='reg'?`
 <form class="form" id="gReg" autocomplete="off"><label class="fld"><span>نام و نام خانوادگی دانش‌آموز / دانشجو</span><input class="in" id="rName" required maxlength="60"></label>
 <div class="row"><label class="fld"><span>نام کاربری (لاتین)</span><input class="in" id="rUser" required pattern="[A-Za-z0-9_.\\-]{3,24}" dir="ltr" autocapitalize="off"></label><label class="fld"><span>پایه / رشته</span><input class="in" id="rGrade" placeholder="مثلاً دوازدهم تجربی"></label></div>
 <div class="row"><label class="fld"><span>رمز عبور</span><input class="in" id="rPass" type="password" required minlength="4" dir="ltr"></label><label class="fld"><span>تکرار رمز</span><input class="in" id="rPass2" type="password" required dir="ltr"></label></div>
 <div class="bar"><i id="rStr" style="width:0"></i></div><div class="err" id="gErr"></div><button class="btn p w" type="submit">ساخت حساب و ورود</button>
 ${us.length?'<button class="btn w" type="button" id="gToLogin">ورود با حساب موجود</button>':''}</form>
 <div class="lock-note">🔒 همهٔ داده‌ها و پشتیبان‌ها با رمز تو و الگوریتم AES-256 روی همین دستگاه رمزگذاری می‌شوند و به هیچ سروری ارسال نمی‌شوند. رمز قابل بازیابی نیست؛ آن را فراموش نکن.</div>`:`
 <div class="users">${us.map(x=>`<button class="uc ${x.u===last?'on':''}" data-u="${esc(x.u)}"><span class="av">${esc(x.u[0].toUpperCase())}</span>${esc(x.u)}</button>`).join('')}</div>
 <form class="form" id="gLog"><label class="fld"><span>نام کاربری</span><input class="in" id="lUser" value="${esc(last)}" dir="ltr" autocapitalize="off" required></label>
 <label class="fld"><span>رمز عبور</span><div class="subj-row"><input class="in" id="lPass" type="password" dir="ltr" required><button type="button" class="ib" id="lEye">👁</button></div></label>
 <div class="err" id="gErr"></div><button class="btn p w" type="submit">ورود امن</button><button class="btn w" type="button" id="gToReg">ثبت‌نام کاربر جدید</button></form>
 <div class="lock-note">🔒 داده‌ها رمزگذاری‌شده (AES-256) و فقط روی همین دستگاه ذخیره می‌شوند.</div>`}<div class="credit">Prepared by Maysam Tashakori</div></div>`;
 if(mode==='reg'){$('#rPass').oninput=e=>{const p=e.target.value;let s=0;if(p.length>=6)s++;if(p.length>=10)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;$('#rStr').style.width=s*20+'%'};
  $('#gToLogin')&&($('#gToLogin').onclick=()=>gate('login'));
  $('#gReg').onsubmit=async e=>{e.preventDefault();const u=$('#rUser').value.trim().toLowerCase(),p=$('#rPass').value;
   if(p!==$('#rPass2').value)return $('#gErr').textContent='تکرار رمز یکسان نیست';if(users().some(x=>x.u===u))return $('#gErr').textContent='این نام کاربری وجود دارد';
   try{$('#gErr').textContent='در حال ساخت کلید امن…';const salt=rnd(16);const k=await deriveKey(p,salt);S=fresh();S.profile.name=$('#rName').value.trim();S.profile.grade=$('#rGrade').value.trim();
    USER={u,salt:b64(salt),iter:ITER,created:Date.now()};KEY=k;setUsers([...users(),USER]);await save(true);enter(true)}catch(err){$('#gErr').textContent=err.message==='nocrypto'?'مرورگر از رمزنگاری امن پشتیبانی نمی‌کند (فایل را با Chrome باز کن).':'خطا: '+err.message}}}
 else{$$('.uc').forEach(b=>b.onclick=()=>{$$('.uc').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#lUser').value=b.dataset.u;$('#lPass').focus()});
  $('#lEye').onclick=()=>{const i=$('#lPass');i.type=i.type==='password'?'text':'password'};$('#gToReg').onclick=()=>gate('reg');
  $('#gLog').onsubmit=async e=>{e.preventDefault();const u=$('#lUser').value.trim().toLowerCase(),rec=users().find(x=>x.u===u);if(!rec)return $('#gErr').textContent='کاربر پیدا نشد';
   $('#gErr').textContent='در حال بازکردن قفل…';try{const k=await deriveKey($('#lPass').value,unb64(rec.salt),rec.iter);const box=await KV.get('vault:'+u);S=norm(box?await dec(k,box):fresh());KEY=k;USER=rec;enter()}
   catch(err){$('#gErr').textContent=err.message==='nocrypto'?'مرورگر از رمزنگاری امن پشتیبانی نمی‌کند.':'رمز عبور نادرست است';buzz([40,40,40])}};setTimeout(()=>$('#lPass')?.focus(),100)}}
function enter(isNew){localStorage.setItem('mst.last',USER.u);$('#gate').hidden=true;$('#gate').innerHTML='';$('#app').hidden=false;$('#nav').hidden=false;applyTheme();lastAct=Date.now();
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}autoBackup();go(location.hash.slice(1)||'home');if(isNew)toast('حساب ساخته شد. خوش آمدی '+S.profile.name)}
async function lock(){if(!S)return;await save(true);S=null;KEY=null;closeAll();gate('login')}
function closeAll(){$$('.ov.on').forEach(o=>o.classList.remove('on'));document.body.style.overflow=''}
async function changePass(){const cur=await ask({title:'تغییر رمز',msg:'رمز فعلی را وارد کن',input:'password'});if(cur==null)return;
 try{const k=await deriveKey(cur,unb64(USER.salt),USER.iter);await dec(k,await KV.get('vault:'+USER.u))}catch(e){return toast('رمز فعلی نادرست است')}
 const np=await ask({title:'رمز جدید',msg:'حداقل ۴ نویسه',input:'password'});if(!np||np.length<4)return toast('رمز جدید کوتاه است');const np2=await ask({title:'تکرار رمز جدید',input:'password'});if(np!==np2)return toast('تکرار رمز یکسان نیست');
 const salt=rnd(16),nk=await deriveKey(np,salt);const ks=await KV.keys('bk:'+USER.u+':');const boxes=[];for(const k of ks){try{boxes.push([k,await dec(KEY,await KV.get(k))])}catch(e){}}
 KEY=nk;USER={...USER,salt:b64(salt),iter:ITER};setUsers(users().map(x=>x.u===USER.u?USER:x));await save(true);for(const [k,b] of boxes)await KV.set(k,await enc(KEY,b));toast('رمز تغییر کرد و همهٔ داده‌ها و پشتیبان‌ها دوباره رمزگذاری شدند')}
async function deleteAccount(){const p=await ask({title:'حذف کامل حساب',msg:`همهٔ داده‌ها و پشتیبان‌های «${USER.u}» برای همیشه حذف می‌شود. برای تأیید رمز را وارد کن.`,input:'password',ok:'حذف همیشگی'});if(p==null)return;
 try{const k=await deriveKey(p,unb64(USER.salt),USER.iter);await dec(k,await KV.get('vault:'+USER.u))}catch(e){return toast('رمز نادرست است')}
 for(const k of await KV.keys('bk:'+USER.u+':'))await KV.del(k);await KV.del('vault:'+USER.u);setUsers(users().filter(x=>x.u!==USER.u));localStorage.removeItem('mst.last');S=null;KEY=null;closeAll();gate()}
['pointerdown','keydown','scroll'].forEach(ev=>addEventListener(ev,()=>lastAct=Date.now(),{passive:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S)save(true)});
/* ===== reminders ===== */
async function notify(title,body){toast('🔔 '+title+(body?' — '+body:''),6000);beep();buzz([200,100,200]);
 if(!S.settings.notif||!('Notification' in window)||Notification.permission!=='granted')return;
 try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(r){r.showNotification(title,{body,tag:title,icon:ICON_URL});return}new Notification(title,{body,icon:ICON_URL})}catch(e){}}
function tickReminders(){if(!S)return;const now=new Date(),d=today(),hmNow=p2(now.getHours())+':'+p2(now.getMinutes()),wi=wdi(d),F=S.fired;let ch=false;
 const fire=(k,t,b)=>{if(F[k])return;F[k]=d;ch=true;notify(t,b)};
 S.reminders.forEach(r=>{if(r.on&&r.days[wi]&&r.time===hmNow)fire(r.id+'|'+d,r.title,'رسا آموزش')});
 S.events.forEach(e=>{if(e.rem==null||e.rem<0||!e.time)return;const [h,m]=e.time.split(':').map(Number);const at=new Date(...e.date.split('-').map((x,i)=>i===1?x-1:+x),h,m).getTime()-e.rem*60000;if(now>=at&&now-at<180000)fire('ev'+e.id,`${EV_TYPES[e.type]?.[1]||''} ${e.title}`,`${jW(e.date)} ساعت ${faD(e.time)}`)});
 if(S.settings.smartRem){const st=streak();if(hmNow>='21:00'&&hmNow<'21:03'&&st.cur>0&&!st.todayOk)fire('streak|'+d,'استریک در خطر است 🔥',`برای حفظ ${faD(st.cur)} روز پیاپی، امروز ${faD(S.settings.streakMin)} دقیقه مطالعه کن.`);
  const dr=dueReviews().length;if(hmNow==='18:00'&&dr)fire('rev|'+d,'مرورهای امروز',`${faD(dr)} مبحث برای مرور فاصله‌دار موعد دارد.`)}
 Object.keys(F).forEach(k=>{if(F[k]<addD(d,-2))delete F[k]});if(ch)save()}
/* ===== timer ===== */
const tEl=()=>S.timer?(S.timer.acc+(S.timer.run?Date.now()-S.timer.t0:0)):0;
function timerStart(){const T=S.timer||(S.timer={mode:'pomo',target:+S.settings.block||45,subj:S.subjects[0]?.id,acc:0,run:false,t0:0,h:new Date().getHours()});if(!T.run){T.run=true;T.t0=Date.now();if(!T.acc)T.h=new Date().getHours()}save();renderTimer()}
function timerPause(){const T=S.timer;if(T&&T.run){T.acc+=Date.now()-T.t0;T.run=false;save();renderTimer()}}
function timerFinish(auto){const T=S.timer;if(!T)return;const min=Math.round(tEl()/60000);if(min<1){if(!auto)toast('کمتر از یک دقیقه است؛ ثبت نشد');S.timer=null;save();renderTimer();return}
 S.sessions.push({id:uid(),date:today(),subj:T.subj,min,note:T.mode==='pomo'?'پومودورو':'تایمر',h:T.h,src:'timer'});S.timer=null;save();renderTimer();render();toast(`${hm(min)} «${sub(T.subj).name}» ثبت شد`);buzz([60,40,120]);if(streak().todayOk&&streak().todayMin-min<S.settings.streakMin)confetti()}
function tickTimer(){if(!S||!S.timer)return;const T=S.timer;if(T.run&&T.mode==='pomo'&&tEl()>=T.target*60000){T.acc=T.target*60000;T.run=false;notify('پایان بلوک مطالعه ⏰',`${faD(T.target)} دقیقه «${sub(T.subj).name}» تمام شد. ${faD(S.settings.brk)} دقیقه استراحت کن.`);timerFinish(true);confetti();return}
 if($('#ovTimer').classList.contains('on'))paintTimer();$('#fab').classList.toggle('run',!!T.run)}
/* ===== theme ===== */
const THEMES=[['rasa','رسا · شب'],['light','رسا · روز'],['navy','کهکشانی'],['ocean','اقیانوس']];
function applyTheme(){document.documentElement.dataset.theme=S?S.settings.theme:'rasa';const m=$('meta[name=theme-color]');if(m)m.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()}
function cycleTheme(){const i=THEMES.findIndex(t=>t[0]===S.settings.theme);S.settings.theme=THEMES[(i+1)%THEMES.length][0];applyTheme();save();render();toast('تم: '+THEMES.find(t=>t[0]===S.settings.theme)[1])}
