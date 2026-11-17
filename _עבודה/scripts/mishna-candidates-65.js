// 6.5.0 — מועמדים לפריטים חדשים מהמשנה: מילים שמיוחדות למסכתות מסוימות (כלאים/שביעית/מעשרות/ערלה/עוקצין לצומח,
// כלים לדומם), שאינן מ-6,000 המילים השכיחות בש״ס ואינן שם/כינוי במדריך. מדפיס JSON של מועמדים עם מראה מקום ראשון וציטוט.
//   node mishna-candidates-65.js <…/אוצריא> <guide-file> <tractate,tractate…> [minSpec]
const fs=require('fs'),path=require('path'),vm=require('vm');
const [ROOT,GF,TR,MS]=process.argv.slice(2);const MIN_SPEC=+(MS||0.5);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
const mdir=path.join(ROOT,'משנה');const all=[];for(const s of fs.readdirSync(mdir))for(const f of fs.readdirSync(path.join(mdir,s)))all.push(path.join(mdir,s,f));
const freq=new Map(),loc=new Map();const want=new Set(TR.split(','));
for(const f of all){const tr=path.basename(f,'.txt').replace(/^משנה /,'');let h2='',mk='';
  for(const l of fs.readFileSync(f,'utf8').split('\n')){const h=l.match(/<h2>([^<]+)<\/h2>/);if(h){h2=h[1].replace(/^פרק /,'').trim();continue;}const m=l.match(/^\(([א-ת]{1,3})\)/);if(m)mk=m[1];
    const W=norm(l).split(' ');W.forEach((w,i)=>{const k=w.replace(/^ו?ה/,'');if(k.length<3)return;const o=freq.get(k)||{all:0,in:0};o.all++;if(want.has(tr))o.in++;freq.set(k,o);
      if(want.has(tr)&&!loc.has(k))loc.set(k,{ref:'משנה, '+tr+' '+h2+', '+mk,text:l.replace(/<[^>]+>/g,'').replace(/^\([א-ת]+\)\s*/,'').trim().slice(0,240)});});}}
// השכיחות בכל הש״ס (בבלי) — להוצאת מילים רגילות
const common=new Map();for(const s of fs.readdirSync(path.join(ROOT,'תלמוד בבלי')))for(const f of fs.readdirSync(path.join(ROOT,'תלמוד בבלי',s)))for(const w of norm(fs.readFileSync(path.join(ROOT,'תלמוד בבלי',s,f),'utf8')).split(' '))common.set(w,(common.get(w)||0)+1);
const COMMON=new Set([...common].sort((a,b)=>b[1]-a[1]).slice(0,6000).map(x=>x[0]));
const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(GF,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);
const have=new Set();c.DATA.forEach(e=>[e.name,...(e.aliases||[])].forEach(n=>{const x=norm(n);have.add(x);have.add(x.replace(/^ה/,''));have.add(x.replace(/(ים|ות|ין)$/,''));}));
const out=[];for(const [k,o] of freq){if(o.in<2||o.in/o.all<MIN_SPEC||COMMON.has(k)||COMMON.has('ה'+k)||have.has(k)||have.has(k.replace(/(ים|ות|ין)$/,'')))continue;out.push({w:k,n:o.in,spec:+(o.in/o.all).toFixed(2),...loc.get(k)});}
out.sort((a,b)=>b.n-a.n);console.log(JSON.stringify(out));
