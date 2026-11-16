#!/usr/bin/env node
// 6.3.0 — מקורות לערכי המקומות, הצומח, הדומם ובעלי החיים מתוך הבבלי, הירושלמי, המשנה והמדרשים (ספריית אוצריא בלבד).
// לכל ערך שיש לו פחות משני מקורות חז״ל (midrash / makorot) — מחפש את שמו וכינוייו בטקסטים ומוסיף עד שניים, עם ציטוט.
// שם בן מילה אחת — המופע מסומן ״לא אומת״ (לא נבדק שהמילה במקור מתייחסת לערך הזה).
//   node library-items-scan-63.js <שורש ספריית אוצריא> <רשימת קבצים> [--dry]
'use strict';
const {libRef}=require('./lib-ref-63.js');
const fs=require('fs'),path=require('path'),vm=require('vm');
const [ROOT,LIST]=process.argv.slice(2);const DRY=process.argv.includes('--dry');
const G={places:['guides/places/data/places.js','midrash'],animal:['guides/animal/data/animal-data.js','midrash'],
  flora:['guides/flora/data/flora-data.js','midrash'],domem:['guides/domem/data/domem-data.js','makorot']};
const loadData=f=>{const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(f,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);return c.DATA;};
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
// מילים שהן גם מילים רגילות — לא מחפשים אותן לבדן
const STOP=new Set(['יעל','ערער','ויעל','אבן','כסף','זהב','עץ','מים','אש','ארץ','הר','עיר','בית','שדה','יום','לחם','דם','חלב','שמן','יין','מלח','עפר','חול','כלי','כלים','ים','נהר','אור','קול','רוח','בן','בת','אב','אם','גן','דרך','שער','מקום','ראש','יד','רגל','עין','פה','לב','אל','גד','דן','עם','צל','חי','כל','מה','זה','קנה','קנים','מנה','סלע','עדה','חרב','חרבה','רמה','גבע','עי','נוב','עמק','מדבר','שור','חמור','עגל','כבש','שה','עז','איל','פר','צאן','בקר','דג','עוף','נחש','זאב','אריה','דוב','כלב','חתול','סוס','גמל','עורב','יונה','תור','חזיר','ארי','צבי','אחו','קוץ','דרדר','תאנה','גפן','זית','רמון','תמר','שעורה','חטה','חטים','שעורים','עדשים','פול','שום','בצל','קשת','אפר','סיד','נחשת','ברזל','עופרת','בדיל','שש','תכלת','ארגמן','שני','משקל','אמה','טפח','זרת','אצבע','סאה','קב','לוג','הין','איפה','עמר','כור','לתך','שקל','גרה','מנה','ככר','דינר','פרוטה','מעה','פונדיון','איסר','זוז']);
const items=new Map();let maxLen=1;const targets=[];
for(const [g,[f,field]] of Object.entries(G)){const D=loadData(f);
  for(const e of D){const have=(e[field]||[]).filter(x=>!/^(בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל|מלכים|ישעיה|ירמיה|יחזקאל|תהלים|משלי|איוב|דניאל|עזרא|נחמיה|דברי הימים|רות|אסתר|איכה|קהלת|שיר השירים|הושע|עמוס|מיכה|יונה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|יואל|עובדיה)/.test(x.ref||x.source||'')).length;
    if(have>=2)continue;const t={g,f,field,name:e.name,need:2-have,refs:new Set((e[field]||[]).map(x=>x.ref||x.source)),hits:[]};targets.push(t);
    for(const n0 of [e.name,...(e.aliases||[])]){const n=norm(n0);if(n.length<3||STOP.has(n))continue;const L=n.split(' ').length;maxLen=Math.max(maxLen,L);
      if(!items.has(n))items.set(n,[]);items.get(n).push(t);}}}
const files=fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>!/סדר הדורות/.test(f)).map(f=>path.join(ROOT,f.replace(/^אוצריא\//,'')));
const bookName=f=>path.basename(f,'.txt').replace(/^תלמוד ירושלמי /,'ירושלמי ');
const dafRef=d=>d.replace(/^דף /,'').replace(/\.$/,' ע"א').replace(/:$/,' ע"ב');
const PFX=/^[ובהלמשכד]{1,2}/;
const PLACE_CUE=new Set(['איש','אנשי','עיר','לעיר','מעיר','בעיר','ארץ','בארץ','לארץ','מארץ','הר','בהר','כפר','נהר']);
for(const f of files){if(!fs.existsSync(f))continue;const bavli=f.includes('/תלמוד בבלי/');let h2='',h3='',mk='';
  for(const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/<h([23])>([^<]+)<\/h\1>/);
    if(m){if(m[1]==='2'){h2=m[2].trim();h3='';}else h3=m[2].trim();mk='';continue;}
    {const mm=line.match(/^\(([א-ת]{1,3})\)/);if(mm)mk=mm[1];}
    const W=norm(line).split(' ');if(W.length<3)continue;
    for(let i=0;i<W.length;i++)for(let n=Math.min(maxLen,W.length-i);n>=1;n--){
      let s=W.slice(i,i+n).join(' ');let ts=items.get(s),pre='';if(!ts&&PFX.test(s)){pre=s.match(PFX)[0];ts=items.get(s.replace(PFX,''));}
      if(!ts)continue;
      if(n===1){// מילה אחת: דומם — לא (מילים כלליות מדי; נשאר לבדיקה ידנית); מקום — רק עם רמז מקום (איש/עיר/ארץ… לפניו, או ב/מ/ל בתחילתו); אחרים — בלי תחילית או ו/ה בלבד
        const cue=PLACE_CUE.has(W[i-1]||'');ts=ts.filter(t=>t.g==='domem'?false:t.g==='places'?(cue&&(pre===''||pre==='ו')):(pre===''||pre==='ו'||pre==='ה'||pre==='וה'));if(!ts.length)continue;}const ref=libRef(f,h2,h3,mk);
      for(const t of ts){if(t.hits.length>=t.need||t.refs.has(ref)||t.hits.some(h=>h.book===bookName(f)))continue;
        t.hits.push({book:bookName(f),ref,q:W.slice(Math.max(0,i-6),i+n+7).join(' '),single:n===1});}
      i+=n-1;break;}
  }}
// ---- כתיבה: הוספה לתחילת המערך של הערך (עריכת טקסט, שומר על סגנון הקובץ) ----
function addSource(file,name,src,field){let t=fs.readFileSync(file,'utf8');
  const keys=['"name":'+JSON.stringify(name),'name:'+JSON.stringify(name),'"name": '+JSON.stringify(name)];
  let at=-1;for(const k of keys){at=t.indexOf(k+',');if(at!==-1)break;}if(at===-1)return false;
  let next=Infinity;for(const k of ['"name":','name:"','"name": ']){const x=t.indexOf(k,at+8);if(x!==-1&&x<next)next=x;}
  const seg=t.slice(at,next===Infinity?undefined:next);const fk=seg.search(new RegExp('"?'+field+'"?\\s*:\\s*\\['));
  if(fk===-1){// אין שדה — מוסיפים אחרי השם
    const ins=at+keys.find(k=>t.startsWith(k,at)).length+1;const q=t.startsWith('"name"',at)?'"':'';
    t=t.slice(0,ins)+q+field+q+':['+JSON.stringify(src)+'],'+t.slice(ins);fs.writeFileSync(file,t);return true;}
  const br=t.indexOf('[',at+fk)+1;const empty=/^\s*\]/.test(t.slice(br));
  t=t.slice(0,br)+JSON.stringify(src)+(empty?'':',')+t.slice(br);fs.writeFileSync(file,t);return true;}
const st={};const rep=[];
for(const t of targets){st[t.g]=st[t.g]||{targets:0,withHits:0,added:0,unverified:0,none:0};const s=st[t.g];s.targets++;
  if(!t.hits.length){s.none++;rep.push([t.g,t.name,'—'].join('\t'));continue;}s.withHits++;
  for(const h of t.hits){const note=h.q+(h.single?' (זיהוי אוטומטי לפי השם — לא אומת שהמופע מתייחס לערך זה)':'');
    const src=t.field==='makorot'?{ref:h.ref,text:note}:{source:h.ref,note};
    if(!DRY&&addSource(t.f,t.name,src,t.field)){s.added++;if(h.single)s.unverified++;}
    rep.push([t.g,t.name,h.ref,h.single?'לא אומת':'',h.q].join('\t'));}}
fs.mkdirSync('_עבודה/out',{recursive:true});fs.writeFileSync('_עבודה/out/library-items-63.tsv',rep.join('\n'));
console.log(st);
