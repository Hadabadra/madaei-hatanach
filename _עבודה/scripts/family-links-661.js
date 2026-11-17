// 6.6.1 — אישים בתנ״ך: תיקון עצי המשפחה כך שכל קישור יגיע לרשומה הנכונה ויהיה הדדי.
//  א. מחרוזת עם הבהרה בסוגריים (״אמנון (בכורו…)״) → שם הרשומה, כשיש רשומה אחת בדיוק בשם הבסיס או בשם המלא.
//  ב. הדדיות: ילד שרושם הורה → ההורה מקבל אותו ב-children; הורה שרושם ילד שאין לו הורה מאותו מין → הילד מקבל את ההורה;
//     אחים ובני זוג — לשני הצדדים.
//  ג. סתירה (ההורה רושם ילד שלפי רשומת הילד יש לו הורה אחר מאותו מין): אם ההורה הרשום אצל הילד הוא בעצמו ילד של
//     הרושם — זו טעות דור (נכד שנרשם כבן) — מוחקים מהרושם. אחרת — אם יש רשומה אחרת באותו שם בסיס שאין לה הורה כזה,
//     מקשרים אליה; אחרת משאירים (לבדיקה, נרשם ב-_עבודה/out/family-conflicts-661.tsv).
const fs=require('fs');const io=require('./data-io.js');const F='guides/people/data/people-data.js';const o=io.load(F);
const base=s=>String(s||'').replace(/\s*\(.*?\)\s*/g,' ').replace(/\s+/g,' ').trim();
const byName=new Map(),byBase=new Map();
for(const e of o.data){byName.set(e.name,e);const b=base(e.name);if(!byBase.has(b))byBase.set(b,[]);byBase.get(b).push(e);}
const resolve=s=>{if(byName.has(s))return byName.get(s);const b=base(s);const l=byBase.get(b)||[];return l.length===1?l[0]:null;};
// פסוקי התנ״ך (לאימות קשר הורה–ילד בערך חדש): node family-links-661.js <…/אוצריא/תנך>
const path=require('path');const TD=process.argv[2];const V=[];
const strip=s=>String(s||'').replace(/[־]/g,' ').replace(/[֑-ׇ]/g,'').replace(/<[^>]+>/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
if(TD)for(const d of fs.readdirSync(TD))for(const f of fs.readdirSync(path.join(TD,d))){const b=f.replace(/\.txt$/,'');let ch='';
  for(const l of fs.readFileSync(path.join(TD,d,f),'utf8').split('\n')){const h=l.match(/<h2>פרק ([א-ת]+)<\/h2>/);if(h){ch=h[1];continue;}const m=l.match(/^\(([א-ת]+)\)\s*(.*)$/);
    if(m&&ch)V.push({ref:b+' '+ch+', '+m[1],text:m[2].replace(/<[^>]+>/g,'').trim(),s:' '+strip(m[2])+' '});}}
const wre=w=>new RegExp(' [ובהלמכש]{0,2}'+w.split(' ').join(' ')+' ');
const verseWith=(a,b)=>{const ra=wre(a),rb=wre(b);return V.filter(v=>ra.test(v.s)&&rb.test(v.s)).slice(0,2);};
let maxId=Math.max(...o.data.map(e=>+String(e.id||'p0').slice(1)||0));
const st={renamed:0,childAdded:0,parentSet:0,sibAdded:0,spouseAdded:0,genFix:0,relinked:0,conflictsLeft:0};const conf=[];
// א — נרמול מחרוזות קישור
for(const e of o.data){for(const f of ['father','mother'])if(e[f]&&!byName.has(e[f])){const r=resolve(e[f]);if(r){e[f]=r.name;st.renamed++;}}
  for(const f of ['spouses','children','siblings'])if(Array.isArray(e[f]))e[f]=[...new Set(e[f].map(x=>{if(byName.has(x))return x;const r=resolve(x);if(r){st.renamed++;return r.name;}return x;}))];}
const add=(arr,v)=>{if(!arr.includes(v)){arr.push(v);return true;}return false;};
const isChildOf=(c,p)=>c.father===p.name||c.mother===p.name;
// ג — סתירות
for(const p of o.data){const pf=p.gender==='ז'?'father':p.gender==='נ'?'mother':null;if(!pf||!Array.isArray(p.children))continue;
  p.children=p.children.filter(cn=>{const c=byName.get(cn);if(!c||!c[pf]||c[pf]===p.name)return true;
    const other=byName.get(c[pf]);
    if(other&&isChildOf(other,p)){st.genFix++;return false;}            // נכד שנרשם כבן
    const alt=(byBase.get(base(cn))||[]).filter(x=>x!==c&&(!x[pf]||x[pf]===p.name));
    if(alt.length===1){alt[0][pf]=p.name;p.children.push('\u0000'+alt[0].name);st.relinked++;return false;}
    // אדם אחר באותו שם, שאין לו ערך — ערך חדש ״X בן/בת P״ עם ההורה, הקטגוריה של ההורה ופסוקים של ההורה שבהם נזכר השם
    const nm=cn+' ('+(c.gender==='נ'?'בת':'בן')+' '+p.name+')';
    const vs=byName.has(nm)?[]:verseWith(base(p.name),base(cn)).map(v=>({ref:v.ref,text:v.text}));
    if(!byName.has(nm)&&!vs.length){st.conflictsLeft++;conf.push([p.name,cn,c[pf],'— אין פסוק שבו שניהם; נשאר לבדיקה'].join('\t'));return true;}
    if(!byName.has(nm)){
      const id='p'+String(++maxId).padStart(4,'0');
      const ne={id,name:nm,cat:p.cat,aliases:[],gender:c.gender==='נ'?'נ':'',father:pf==='father'?p.name:'',mother:pf==='mother'?p.name:'',spouses:[],children:[],siblings:[],roles:[],tribe:p.tribe||'',birthPlace:'',dwelling:'',deathPlace:'',burialPlace:'',age:'',
        note:'נזכר ברשימת צאצאיו של '+p.name+'. אינו '+cn+' שבערך הנפרד (שם זהה, אדם אחר). ערך שנוצר בתיקון עצי המשפחה — לא אומת.',verses:vs,midrash:[],src:'family-661'};
      o.data.push(ne);byName.set(nm,ne);}
    p.children.push('\u0000'+nm);st.stubs=(st.stubs||0)+1;conf.push([p.name,cn,c[pf],nm].join('\t'));return false;});
  p.children=p.children.map(x=>x.replace(/^\u0000/,''));p.children=[...new Set(p.children)];}
// ב — הדדיות
for(const c of o.data){for(const pf of ['father','mother']){const p=c[pf]&&byName.get(c[pf]);if(p){p.children=p.children||[];if(add(p.children,c.name))st.childAdded++;}}}
for(const p of o.data){const pf=p.gender==='ז'?'father':p.gender==='נ'?'mother':null;if(!pf)continue;
  for(const cn of p.children||[]){const c=byName.get(cn);if(c&&!c[pf]){c[pf]=p.name;st.parentSet++;}}}
for(const e of o.data){for(const sn of e.siblings||[]){const s=byName.get(sn);if(s&&s!==e){s.siblings=s.siblings||[];if(add(s.siblings,e.name))st.sibAdded++;}}
  for(const sn of e.spouses||[]){const s=byName.get(sn);if(s&&s!==e){s.spouses=s.spouses||[];if(add(s.spouses,e.name))st.spouseAdded++;}}}
fs.mkdirSync('_עבודה/out',{recursive:true});fs.writeFileSync('_עבודה/out/family-conflicts-661.tsv','הרושם\tהילד שנרשם\tההורה שבערך הילד\tהערך החדש\n'+conf.join('\n'));
io.save(F,o);console.log(st);
