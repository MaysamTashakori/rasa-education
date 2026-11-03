// Builds dist/kids (grade-2 system web app). Shares core.js + design system with apps/planner.
import {readFileSync as r, writeFileSync as w, mkdirSync} from 'node:fs';
const here = new URL('.', import.meta.url).pathname, root = here + '../../', pl = root + 'apps/planner/';
const fonts = ['arabic', 'latin'].flatMap(set => [400, 700, 900].map(wt => {
  const b64 = r(`${pl}fonts/vazirmatn-${set}-${wt}-normal.woff2`).toString('base64');
  const range = set === 'arabic' ? 'U+0600-06FF,U+0750-077F,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  return `@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:${wt};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range}}`;
})).join('\n');
const css = [pl + 'src/style.css', pl + 'src/rasa.css', here + 'src/kids.css'].map(f => r(f, 'utf8')).join('\n');
const js = [r(pl + 'src/core.js', 'utf8'), r(here + 'src/kids.js', 'utf8')].join('\n').replace(/<\/script/gi, '<\\/script');
const html = r(here + 'src/index.html', 'utf8').replace('/*FONTS*/', () => fonts).replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
const out = root + 'dist/kids/';
mkdirSync(out, {recursive: true});
w(out + 'index.html', html);
w(out + 'icon.svg', r(root + 'brand/logo.svg', 'utf8'));
w(out + 'manifest.webmanifest', JSON.stringify({name: 'رسا اجوکیشن — کلاس دوم', short_name: 'رسا · کلاس دوم', lang: 'fa', dir: 'rtl', start_url: './', scope: './', display: 'standalone', background_color: '#F7F7F7', theme_color: '#F7F7F7', icons: [{src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable'}]}, null, 2));
const ver = Date.now().toString(36);
w(out + 'sw.js', `const C='rasa-kids-${ver}',A=['./','index.html','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.includes('/api/'))return;
 e.respondWith(fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match(e.request).then(h=>h||caches.match('index.html'))))});
`);
console.log('built kids', (html.length / 1024).toFixed(0) + ' KB');
