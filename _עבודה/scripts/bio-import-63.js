// 6.3.0 — ייבוא כל החכמים מתוסף ״ביוגרפיות״ של יאיר דניאל (באישורו) למדריך ״אנשים מהתלמוד״.
// שימוש: node bio-import-63.js <תיקיית src/data של otzaria-biographies-plugin> [--dry]
// הקבצים נקראים כ-JSON בלבד (לא מריצים קוד מהריפו החיצוני).
// כללים: ערך חדש רק לשם שאין לו ערך (שם או כינוי) במדריך; כינויים, דור ומקום — רק אם כתובים במקור; קרדיט בכל ערך.
const fs=require('fs'),path=require('path');const io=require('./data-io.js');
const D=process.argv[2],DRY=process.argv.includes('--dry');
const F='guides/amoraim/data/amoraim-data.js';
const ld=f=>{const t=fs.readFileSync(path.join(D,f),'utf8');return JSON.parse(t.slice(t.indexOf('=')+1).trim().replace(/;\s*$/,''));};
const A=ld('bio-data.js'),E=ld('bio-enrich.js');
const o=io.load(F);
const norm=s=>String(s||'').replace(/[״"׳'`׳״]/g,'').replace(/\s*\(\d+\)\s*$/,'').replace(/\s+/g,' ').trim();
const have=new Map();for(const e of o.data)for(const n of [e.name,...(e.aliases||[])])have.set(norm(n),e.name);
const base=n=>norm(n);const baseCount={};for(const a of A)baseCount[base(a.n)]=(baseCount[base(a.n)]||0)+1;
const ORD={'ראשון':1,'שני':2,'שלישי':3,'רביעי':4,'חמישי':5,'שישי':6,'שביעי':7,'שמיני':8};
const ORDN=Object.keys(ORD);
const CREDIT='(מתוך תוסף ״ביוגרפיות״ של יאיר דניאל, באישורו)';
let added=0,dupName=0,dupAmbig=0,withDor=0,withPlace=0,withAlias=0;const ambig=[],skipped=[];
const out=[];const roleless={};
const variants=s=>{const n=norm(s);const r=n.replace(/^ר /,'');return n.startsWith('ר ')?['רבי '+r,'רב '+r,r]:[n];};
const redirectTarget=b=>{let m=b.match(/^ע"ע\s+([^.(]+?)\s*\.?\s*$/);if(m)return m[1];
  if(b.length<70){m=b.match(/^(?:מובא [^.]*?,\s*)?(?:ו?הוא)\s+([^.(,]+?)\s*(?:[.(]|$)/);if(m&&!/^(?:אבי|בן|בנו|אחי|תלמיד|חבר|רבו|חמיו|אמורא|תנא)/.test(m[1]))return m[1];}
  return null;};
const plugMain=new Map();for(const a of A){if(!redirectTarget(String(a.b||'').trim()))plugMain.set(norm(a.n),a);}
let redirAlias=0,redirMiss=0;const pendingAlias=new Map();
for(const a of A){const tg=redirectTarget(String(a.b||'').trim());if(!tg)continue;
  const hit=variants(tg).find(v=>have.has(v)||plugMain.has(v));
  if(!hit){redirMiss++;continue;}
  if(have.has(norm(a.n))){a._skip=1;continue;}
  const key=have.has(hit)?'G:'+have.get(hit):'P:'+hit;
  if(!pendingAlias.has(key))pendingAlias.set(key,[]);pendingAlias.get(key).push(a.n.replace(/\s*\(\d+\)\s*$/,''));a._skip=1;redirAlias++;}
for(const a of A){
  if(a._skip)continue;
  const b=String(a.b||'').trim();const nb=base(a.n);
  const numbered=/\(\d+\)\s*$/.test(a.n);
  if(!numbered&&have.has(nb)){dupName++;continue;}
  if(numbered&&have.has(nb)){ // השם הבסיסי קיים במדריך: אם יש בתוסף כמה בשם זה — לא מכריעים מי הוא שלנו
    if(baseCount[nb]>1){dupAmbig++;ambig.push(a.n+' ← '+have.get(nb));}else dupName++;
    continue;}
  const head=b.slice(0,120);const en=E[String(a.i)]||{};
  // תפקיד — לפי פתיחת הביוגרפיה או השדה type
  let role=en.type||'';
  if(!role){if(/^(?:היה\s+)?תנא/.test(head))role='תנא';else if(/^(?:היה\s+)?אמורא/.test(head))role='אמורא';}
  // דור — רק ״בדור ה<X>״ מפורש, בלי ״נראה ש״ לפניו ובלי טווח
  let dor='';const m=head.match(/(נראה\s+ש[^.]*?)?בדור\s+ה(ראשון|שני|שלישי|רביעי|חמישי|שישי|שביעי|שמיני)(?![^.]{0,4}[-–]\s*ה?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שביעי|שמיני))/);
  if(m&&!m[1])dor='דור '+m[2];
  if(!dor&&en.dor){const k=+String(en.dor).replace(/\D/g,'');if(k>=1&&k<=8)dor='דור '+ORDN[k-1];}
  // מקום — מהשדה place, או ״אמורא בבלי״/״ארץ ישראלי״ בפתיחה
  let place=en.place||'';
  if(!place){if(/^(?:תנא|אמורא)\s+בבלי/.test(head))place='בבל';else if(/^(?:תנא|אמורא)\s+ארץ[ -]ישראלי/.test(head))place='א"י';}
  // כינויים — רק ״נקרא/מכונה (גם) X״ מפורש
  const aliases=[];const am=b.match(/(?:נקרא|ונקרא|מכונה|המכונה|נקרא גם|מכונה גם)\s+(?:גם\s+)?["״]([^"״]{2,30})["״]/g)||[];
  for(const x of am){const v=x.replace(/^.*?["״]/,'').replace(/["״]$/,'').trim();if(v&&norm(v)!==nb&&!have.has(norm(v)))aliases.push(v);}
  if(!role){const w=head.split(/[ .,]/)[0];roleless[w]=(roleless[w]||0)+1;}
  let cat='other';const k=ORD[dor.replace('דור ','')]||0;
  if(role==='תנא')cat='tannaim';else if(role==='אמורא'&&k)cat=k<=2?'amoraim-early':k<=4?'amoraim-mid':'amoraim-late';
  const expl=b+(en.fact?' '+en.fact+'.':'')+' '+CREDIT;
  const e={name:a.n,cat,aliases:[...new Set(aliases)],role:role||'',dor,place,methods:[{explanation:expl}],midrash:[],src:'biographies-63'};
  if(dor)withDor++;if(place)withPlace++;if(e.aliases.length)withAlias++;
  const pa=pendingAlias.get('P:'+nb);if(pa&&!numbered)e.aliases=[...new Set([...e.aliases,...pa])];
  out.push(e);have.set(norm(a.n),a.n);added++;
}
let gAlias=0;for(const [k,v] of pendingAlias){if(!k.startsWith('G:'))continue;const g=o.data.find(e=>e.name===k.slice(2));
  for(const x of v){if(!g.aliases.includes(x)&&x!==g.name){g.aliases.push(x);gAlias++;}}}
const cats={};out.forEach(e=>cats[e.cat]=(cats[e.cat]||0)+1);
console.log(Object.entries(roleless).sort((a,b)=>b[1]-a[1]).slice(0,15));console.log({redirAlias,redirMiss,gAlias,source:A.length,added,dupName,dupAmbig,withDor,withPlace,withAlias,cats});
fs.mkdirSync('_עבודה/out',{recursive:true});fs.writeFileSync('_עבודה/out/bio-import-63-ambiguous.txt',ambig.join('\n'));
if(!DRY){o.data.push(...out);io.save(F,o);console.log('saved',o.data.length);}
