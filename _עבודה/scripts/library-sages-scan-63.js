#!/usr/bin/env node
// 6.3.0 — סריקת חכמים בכל הבבלי, הירושלמי, המשנה והמדרשים (ספריית אוצריא) מול מדריך ״אנשים מהתלמוד״.
// מוצא כותרות ערכים של ״סדר הדורות״ (סדר תנאים ואמוראים) שנזכרות בטקסטים ואין להן ערך (שם/כינוי) במדריך,
// ומוסיף להן ערך: תיאור מסדר הדורות + שני מראי מקום עם ציטוט מהטקסט. דור/מקום ריקים (לא נכתבים בלי מקור).
//   node library-sages-scan-63.js <שורש ספריית אוצריא (התיקייה אוצריא)> <רשימת קבצים יחסית> [--dry] [--min=N]
// ריצה חוזרת מחליפה את ערכי src:'library-63'. דוח מלא: _עבודה/out/library-sages-63.tsv
'use strict';
const {libRef}=require('./lib-ref-63.js');
const fs=require('fs'),path=require('path');const io=require('./data-io.js');
const [ROOT,LIST]=process.argv.slice(2);const DRY=process.argv.includes('--dry');
const MIN=+((process.argv.find(x=>x.startsWith('--min='))||'--min=3').slice(6));
const AF='guides/amoraim/data/amoraim-data.js',SRC='library-63';
const a=io.load(AF);a.data=a.data.filter(e=>e.src!==SRC);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳']/g,'').replace(/[^א-ת" ]/g,' ').replace(/\s+/g,' ').trim();
const key=s=>norm(s).replace(/"/g,'');
// צורות המדריך
const guide=new Set();
for(const e of a.data)for(const n of [e.name,...(e.aliases||[])]){const f=key(n.replace(/\s*\(\d+\)\s*$/,'')).replace(/ [א-ת]$/,'');if(!f)continue;guide.add(f);if(/^ר /.test(f)){guide.add(f.replace(/^ר /,'רבי '));guide.add(f.replace(/^ר /,'רב '));}}
// התאמה רופפת (כתיב מלא/חסר, א/ה, ח/ה) — רק כדי לא ליצור כפילות; שם כזה נרשם בדוח ולא נוסף
const fuzzy=s=>s.split(' ').map(w=>w==='רבי'||w==='רב'?w:w.replace(/[וי]/g,'').replace(/[אהח]/g,'ה')).join(' ');
const gfuzzy=new Set([...guide].map(fuzzy));
const TITLE=/^(רבי|רב|רבן|מר|אבא|בן|רמי|רפרם|רבה|רבא|רבינא|איסי|אבימי|שמואל|לוי|חזקיה|יהודה|יוסי|שמעון|נחום|חנן|אדא|זעירי|זירא|יוחנן|אלעזר|אליעזר|ישמעאל|עקיבא|טרפון|מאיר|נתן|חנינא|יהושע|הלל|שמאי|שמעיה|אבטליון|עקביא|בונייס|אחר|נחמיה|גמליאל)$/;
const okForm=f=>{const w=f.split(' ');if(/^(בר|בן|ברבי|בריה|דרב|דרבי)$/.test(w.at(-1)))return false;return TITLE.test(w[0])||w[1]==='בן'||w[1]==='בר';};
const fuzzySkipped=[];
// כותרות סדר הדורות
const SD=path.join(ROOT,'ספרות עזר/תולדות עם ישראל/סדר הדורות.txt');
const L=fs.readFileSync(SD,'utf8').split('\n');const st=L.findIndex(l=>l.includes('<h2>סדר תנאים ואמוראים</h2>'));
const sd=new Map();
for(let i=st+1;i<L.length;i++){const m=L[i].match(/^<b>([^<]+)<\/b>/);if(!m)continue;const h=m[1].trim().replace(/[.,:]+$/,'');if(sd.has(h))continue;
  const b=[];for(let j=i;j<L.length&&!/^<h[1-3]>/.test(L[j]);j++)b.push(L[j]);sd.set(h,b.join(' '));}
const formOf=s=>key(s.replace(/׳/g,"'").replace(/^'?ר' /,'רבי ').replace(/ בר' /g,' ברבי '));
const SKIP=new Set(['אהל מועד','בית אל','בעל הלשון','דברי הימים','לב אהרן','לחם הפנים','מנחת כהן','מרפא לשון','עיני הכהן','צורבא מרבנן','קדש קדשים','שלחו מתם','רבי לא','בן בתירא','בן דוד','בן יוסף','בן אורי','בן שמואל','בן דעת','רבי ישראל','רב כהן']);
const cand=new Map(),amb=new Set();
for(const h of sd.keys()){const f=formOf(h);if(f.split(' ').length<2||SKIP.has(f)||guide.has(f)||!okForm(f))continue;const bare=f.replace(/^(רבי|רב|רבן) /,'');if(guide.has(bare)||gfuzzy.has(fuzzy(bare))||gfuzzy.has(fuzzy(f))){fuzzySkipped.push(f);continue;}if(cand.has(f)&&cand.get(f)!==h)amb.add(f);else cand.set(f,h);}
amb.forEach(f=>cand.delete(f));
const maxLen=Math.max(...[...cand.keys(),...guide].map(k=>k.split(' ').length));
const SAY=new Set(['אמר','ואמר','דאמר','אומר','תני','ותני','משום','משמיה','דברי','כדברי','לדברי','מחלוקת','אליבא','סבר','בעא','מיניה','שאל','כדאמר','מתני','אמרי','קמיה','ליה','להו','בשם']);
const hits=new Map();
const bookName=f=>path.basename(f,'.txt').replace(/^תלמוד ירושלמי /,'ירושלמי ');
const files=fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>!/סדר הדורות/.test(f)).map(f=>path.join(ROOT,f.replace(/^אוצריא\//,'')));
for(const f of files){if(!fs.existsSync(f))continue;const bavli=f.includes('/תלמוד בבלי/');
  const pre=bavli?'בבלי, ':f.includes('/משנה/')?'':'' ;let h2='',h3='',mk='';
  for(const line of fs.readFileSync(f,'utf8').split('\n')){
    const m=line.match(/<h([23])>([^<]+)<\/h\1>/);if(m){if(m[1]==='2'){h2=m[2].trim();h3='';}else h3=m[2].trim();mk='';continue;}
    {const mm=line.match(/^\(([א-ת]{1,3})\)/);if(mm)mk=mm[1];}
    const W=[];for(const w of norm(line).split(' ')){if(!w)continue;if(w.includes('"')){const b=w.replace(/"/g,'');if(/^[ודכ]?אר$/.test(b)){W.push('אמר','רבי');continue;}W.push(b);continue;}
      if(/^[ודכלמ]{0,3}ר$/.test(w)){W.push('רבי');continue;}W.push(w);}
    for(let i=0;i<W.length;i++){let hit=null,len=0;
      for(let n=Math.min(maxLen,W.length-i);n>=2;n--){let s=W.slice(i,i+n).join(' ');let s2=s.replace(/^[ודכל](רבי?|רבן|מר|אבא)\b/,'$1');
        if(guide.has(s)||guide.has(s2)){len=n;hit=null;break;}if(cand.has(s)||cand.has(s2)){hit=cand.has(s)?s:s2;len=n;break;}}
      if(!hit){if(len)i+=len-1;continue;}
      const ctx=SAY.has(W[i-1])||SAY.has(W[i+len])||SAY.has(W[i-2]);
      if(ctx){const ref=libRef(f,h2,h3,mk);const q=W.slice(Math.max(0,i-4),i+len+5).join(' ');
        if(!hits.has(hit))hits.set(hit,{n:0,refs:new Map()});const o=hits.get(hit);o.n++;if(!o.refs.has(ref)&&o.refs.size<50)o.refs.set(ref,q);}
      i+=len-1;}
  }}
const rows=[...hits].sort((x,y)=>y[1].n-x[1].n);
fs.mkdirSync('_עבודה/out',{recursive:true});
fs.writeFileSync('_עבודה/out/library-sages-63.tsv',rows.map(([f,o])=>[f,cand.get(f),o.n,o.refs.size,[...o.refs.keys()].slice(0,3).join(' | ')].join('\t')).join('\n'));
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const summ=h=>{let t=clean(sd.get(h)||'');if(t.length>700){const c=t.lastIndexOf('. ',700);t=t.slice(0,c>300?c+1:700)+' …';}return t+' (סדר הדורות, סדר תנאים ואמוראים)';};
const seenF=new Map();const add=[];
for(const r of rows.filter(([,o])=>o.refs.size>=MIN)){const z=fuzzy(r[0]);if(seenF.has(z)){seenF.get(z).push(r[0]);continue;}seenF.set(z,[]);add.push(r);}
for(const [f,o] of add){const h=cand.get(f);const al=[h,...(seenF.get(fuzzy(f))||[])].filter(x=>formOf(x)!==f&&x!==f);
  a.data.push({name:f,cat:'other',aliases:al,role:'',dor:'',place:'',methods:[{explanation:summ(h)}],
    midrash:[...o.refs].slice(0,2).map(([ref,text])=>({ref,text})),src:SRC});}
fs.writeFileSync('_עבודה/out/library-sages-63-fuzzy.txt',fuzzySkipped.join('\n'));console.log({fuzzySkipped:fuzzySkipped.length,files:files.length,candidates:cand.size,found:rows.length,added:add.length,belowMin:rows.length-add.length});
console.log(add.slice(0,40).map(([f,o])=>f+'('+o.refs.size+')').join(' · '));
if(!DRY)io.save(AF,a);
