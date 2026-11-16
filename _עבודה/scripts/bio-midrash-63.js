#!/usr/bin/env node
// 6.3.0 — מראי מקום עם ציטוט (עד שניים) לערכים שיובאו מתוסף ״ביוגרפיות״ (src:'biographies-63'), מתוך הבבלי, הירושלמי, המשנה והמדרשים.
// רק שם של שתי מילים לפחות, בלי מספור ״(n)״ (שם משותף לכמה חכמים — לא מנחשים), ורק בהקשר של מימרא (אמר/תני/משום…).
// התאמה ארוכה ביותר מול כל שמות המדריך, כדי ש״רבי יוחנן בן נורי״ לא ייחשב ״רבי יוחנן״.
//   node bio-midrash-63.js <שורש ספריית אוצריא> <רשימת קבצים>
'use strict';
const {libRef}=require('./lib-ref-63.js');
const fs=require('fs'),path=require('path');const io=require('./data-io.js');
const [ROOT,LIST]=process.argv.slice(2);const AF='guides/amoraim/data/amoraim-data.js';const a=io.load(AF);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳']/g,'').replace(/[^א-ת" ]/g,' ').replace(/\s+/g,' ').trim();
const key=s=>norm(s).replace(/"/g,'');
const forms=new Map();// צורה → ערך (או null אם דו-משמעית)
for(const e of a.data)for(const n of [e.name,...(e.aliases||[])]){let f=key(n.replace(/\s*\(\d+\)\s*$/,'')).replace(/ [א-ת]$/,'');if(!f)continue;
  const vs=[f];if(/^ר /.test(f))vs.push(f.replace(/^ר /,'רבי '));
  for(const v of vs){if(forms.has(v)&&forms.get(v)!==e)forms.set(v,null);else forms.set(v,e);}}
const want=new Set(a.data.filter(e=>e.src==='biographies-63'&&!(e.midrash||[]).length&&!/\(\d+\)\s*$/.test(e.name)&&key(e.name).split(' ').length>=2));
const maxLen=Math.max(...[...forms.keys()].map(k=>k.split(' ').length));
const SAY=new Set(['אמר','ואמר','דאמר','אומר','תני','ותני','משום','משמיה','דברי','כדברי','לדברי','אליבא','סבר','בעא','מיניה','שאל','כדאמר','אמרי','קמיה','בשם']);
const got=new Map();
const files=fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>!/סדר הדורות/.test(f)).map(f=>path.join(ROOT,f.replace(/^אוצריא\//,'')));
for(const f of files){if(!fs.existsSync(f))continue;let h2='',h3='',mk='';const book=path.basename(f,'.txt');
  for(const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/<h([23])>([^<]+)<\/h\1>/);
    if(m){if(m[1]==='2'){h2=m[2].trim();h3='';}else h3=m[2].trim();mk='';continue;}
    {const mm=line.match(/^\(([א-ת]{1,3})\)/);if(mm)mk=mm[1];}
    const W=[];for(const w of norm(line).split(' ')){if(!w)continue;if(w.includes('"')){const b=w.replace(/"/g,'');if(/^[ודכ]?אר$/.test(b)){W.push('אמר','רבי');continue;}W.push(b);continue;}
      if(/^[ודכלמ]{0,3}ר$/.test(w)){W.push('רבי');continue;}W.push(w);}
    for(let i=0;i<W.length;i++){for(let n=Math.min(maxLen,W.length-i);n>=1;n--){const s=W.slice(i,i+n).join(' ');if(!forms.has(s))continue;
        const e=forms.get(s);if(e&&want.has(e)&&n>=2&&(SAY.has(W[i-1])||SAY.has(W[i+n]))){const g=got.get(e)||[];
          if(g.length<2&&!g.some(x=>x.book===book)){g.push({book,ref:libRef(f,h2,h3,mk),text:W.slice(Math.max(0,i-4),i+n+6).join(' ')});got.set(e,g);}}
        i+=n-1;break;}}
  }}
let n=0,r=0;for(const [e,g] of got){e.midrash=g.map(({ref,text})=>({ref,text}));n++;r+=g.length;}
io.save(AF,a);console.log({candidates:want.size,filled:n,refs:r});
