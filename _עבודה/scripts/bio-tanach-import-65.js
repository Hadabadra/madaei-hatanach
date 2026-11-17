// 6.5.0 — אישי התנ״ך מתוסף ״ביוגרפיות+״ של יאיר דניאל (באישורו; cat:'biblical') שאין להם ערך במדריך ״אישים בתנ״ך״.
// לכל שם: עד שלושה פסוקים שבהם השם נזכר (מספריית אוצריא), והספר הראשון קובע את הקטגוריה. בלי פסוק — הערך נכנס בלי קטגוריה ובלי מקור.
//   node bio-tanach-import-65.js <…/otzaria-biographies-plus-plugin/src/data> <…/אוצריא/תנך>
const fs=require('fs'),path=require('path');const io=require('./data-io.js');
const [D,T]=process.argv.slice(2);const F='guides/people/data/people-data.js';
const ld=f=>{const t=fs.readFileSync(path.join(D,f),'utf8');return JSON.parse(t.slice(t.indexOf('=')+1).trim().replace(/;\s*$/,''));};
const A=ld('bio-data.js').filter(a=>a.cat==='biblical');
const o=io.load(F);
const strip=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/[־-]/g,' ').replace(/[״"׳'`]/g,'').replace(/\s+/g,' ').trim();
const fz=s=>strip(s).split(' ').map(w=>w.replace(/[וי]/g,'')).join(' ');
const have=new Set();o.data.forEach(e=>[e.name,...(e.aliases||[])].forEach(n=>have.add(fz(n))));
const CAT={'בראשית':'sefer-bereshit','שמות':'shemot','ויקרא':'vayikra','במדבר':'bamidbar','דברים':'devarim','יהושע':'yehoshua','שופטים':'shoftim','שמואל א':'shmuel','שמואל ב':'shmuel','מלכים א':'melachim','מלכים ב':'melachim','ישעיהו':'yeshayahu','ירמיהו':'yirmiyahu','יחזקאל':'yechezkel','תהלים':'tehilim','משלי':'mishlei','איוב':'iyov','רות':'rut','קהלת':'kohelet','אסתר':'esther','דניאל':'daniel','עזרא':'ezra','נחמיה':'nechemia','דברי הימים א':'divreihayamim','דברי הימים ב':'divreihayamim'};
const ORDER=['בראשית','שמות','ויקרא','במדבר','דברים','יהושע','שופטים','שמואל א','שמואל ב','מלכים א','מלכים ב','ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום','חבקוק','צפניה','חגי','זכריה','מלאכי','תהלים','משלי','איוב','שיר השירים','רות','איכה','קהלת','אסתר','דניאל','עזרא','נחמיה','דברי הימים א','דברי הימים ב'];
const TREI=new Set(['הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום','חבקוק','צפניה','חגי','זכריה','מלאכי']);
// אינדקס פסוקים
const files={};for(const d of fs.readdirSync(T))for(const f of fs.readdirSync(path.join(T,d)))files[f.replace(/\.txt$/,'')]=path.join(T,d,f);
const verses=[];
for(const b of ORDER){const f=files[b];if(!f)continue;let ch='';for(const l of fs.readFileSync(f,'utf8').split('\n')){const h=l.match(/<h2>פרק ([א-ת]+)<\/h2>/);if(h){ch=h[1];continue;}
  const m=l.match(/^\(([א-ת]+)\)\s*(.*)$/);if(m&&ch)verses.push({book:b,ref:b+' '+ch+', '+m[1],raw:m[2].replace(/<[^>]+>/g,'').trim(),s:' '+strip(m[2].replace(/<[^>]+>/g,''))+' ',f:' '+fz(m[2].replace(/<[^>]+>/g,''))+' '});}}
let id=Math.max(...o.data.map(e=>+String(e.id||'p0').slice(1)||0));
let added=0,withV=0,dup=0;const cats={};
for(const a of A){const nm=strip(a.n);if(!nm||have.has(fz(nm))){dup++;continue;}
  const re=new RegExp(' [ובהלמכש]{0,2}'+nm.replace(/ /g,' [ובהלמכש]{0,2}')+' ');
  const vs=[];for(const v of verses){if(re.test(v.s)){vs.push({ref:v.ref,text:v.raw,_b:v.book});if(vs.length>=3)break;}}
  if(!vs.length){const fn=fz(nm);if(fn.replace(/ /g,'').length>=3){const re2=new RegExp(' [ובהלמכש]{0,2}'+fn.replace(/ /g,' [ובהלמכש]{0,2}')+' ');
    for(const v of verses){if(re2.test(v.f)){vs.push({ref:v.ref,text:v.raw,_b:v.book});if(vs.length>=3)break;}}}}
  // בלי פסוק: שם תיאורי של אישיות שכבר יש לה ערך (״בלק בן צפור״, ״יונה הנביא״) — כפילות, לא ערך חדש; וגם לא ערכים שאינם אישים
  if(!vs.length){if(/^(ספר|פרשת|רבי|רב) /.test(nm)||/אחו[יה] ד?רב/.test(nm)){dup++;continue;}
    const base=nm.replace(/\s*\(.*\)\s*$/,'').replace(/^(המלך|האישה|הנביא) /,'').split(' ')[0];if(have.has(fz(base))){dup++;continue;}}
  const cat=vs.length?(TREI.has(vs[0]._b)?'treasar':(CAT[vs[0]._b]||'')):'';vs.forEach(v=>delete v._b);
  const note=((a.b||'').trim()+' (מתוך תוסף ״ביוגרפיות+״ של יאיר דניאל, באישורו)').trim();
  o.data.push({id:'p'+String(++id).padStart(4,'0'),name:nm,cat,aliases:[],gender:'',father:'',mother:'',spouses:[],children:[],siblings:[],roles:[],tribe:'',birthPlace:'',dwelling:'',deathPlace:'',burialPlace:'',age:'',note,verses:vs,midrash:[],src:'biographies-plus-65'});
  have.add(fz(nm));added++;if(vs.length)withV++;cats[cat||'-']=(cats[cat||'-']||0)+1;}
io.save(F,o);console.log({biblical:A.length,dup,added,withVerses:withV,cats});
