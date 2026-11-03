// Builds dist/rasa-planner.html (single offline file) and dist/web/ (PWA for GitHub Pages).
import {readFileSync as r, writeFileSync as w, mkdirSync} from 'node:fs';
const here = new URL('.', import.meta.url).pathname, root = here + '../../';
const src = f => r(here + 'src/' + f, 'utf8');
const fonts = ['arabic', 'latin'].flatMap(set => [400, 700, 900].map(wt => {
  const b64 = r(`${here}fonts/vazirmatn-${set}-${wt}-normal.woff2`).toString('base64');
  const range = set === 'arabic' ? 'U+0600-06FF,U+0750-077F,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  return `@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:${wt};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range}}`;
})).join('\n');
const logo = r(root + 'brand/logo.svg', 'utf8').trim();
const catalog = JSON.stringify(JSON.parse(r(root + 'content/catalog.json', 'utf8')));
const js = ['core.js', 'app.js', 'views.js'].map(src).join('\n').replace(/<\/script/gi, '<\\/script');
const css = src('style.css') + '\n' + src('rasa.css');
const manifest = {name: 'رسا اجوکیشن — برنامه‌ریز هوشمند', short_name: 'رسا اجوکیشن', lang: 'fa', dir: 'rtl', start_url: './', scope: './', display: 'standalone', background_color: '#050505', theme_color: '#050505', icons: [{src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable'}]};
const page = (iconHref, manifestHref) => src('index.html')
  .replace('<!--ICON-->', `<link rel="icon" type="image/svg+xml" href="${iconHref}"><link rel="apple-touch-icon" href="${iconHref}">`)
  .replace('<!--MANIFEST-->', manifestHref ? `<link rel="manifest" href="${manifestHref}">` : '')
  .replace('/*FONTS*/', () => fonts).replace('/*CSS*/', () => css)
  .replace('/*CATALOG*/', () => catalog).replace('/*JS*/', () => js);
const dataIcon = 'data:image/svg+xml,' + encodeURIComponent(logo);
mkdirSync(root + 'dist/web', {recursive: true});
w(root + 'dist/rasa-planner.html', page(dataIcon, null));
w(root + 'dist/web/index.html', page('icon.svg', 'manifest.webmanifest'));
w(root + 'dist/web/icon.svg', logo);
w(root + 'dist/web/manifest.webmanifest', JSON.stringify(manifest, null, 2));
const bb = r(root + 'brand/brandbook.html', 'utf8').replace('/*FONTS*/', () => fonts).replaceAll('<!--LOGO-->', () => logo);
w(root + 'dist/web/brand.html', bb);
const ver = Date.now().toString(36);
w(root + 'dist/web/sw.js', `const C='rasa-planner-${ver}',A=['./','index.html','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match('index.html'))))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l[0]?l[0].focus():clients.openWindow('./')))});
`);
console.log('built', (r(root + 'dist/rasa-planner.html').length / 1024).toFixed(0) + ' KB');
