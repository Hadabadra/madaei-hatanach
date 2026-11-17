// 6.5.0 — שיוך שבטי לערכי המקומות לפי פרשיות הנחלות בספר יהושע (מספריית אוצריא): שם הערך או כינויו
// כמילה שלמה (גם בתחיליות ו/ה/ב/מ/ל) בפסוקי נחלת השבט. נוסף ל-tribes / tribeRefs, בלי למחוק שיוך קיים.
//   node places-tribes-65.js <קובץ יהושע.txt>
const fs=require('fs'),vm=require('vm');
const F='guides/places/data/places.js';
const RANGES=[['ראובן',13,15,13,23],['גד',13,24,13,28],['מנשה',13,29,13,31],['יהודה',15,1,15,63],['אפרים',16,1,16,10],['מנשה',17,1,17,13],
 ['בנימין',18,11,18,28],['שמעון',19,1,19,9],['זבולון',19,10,19,16],['יששכר',19,17,19,23],['אשר',19,24,19,31],['נפתלי',19,32,19,39],['דן',19,40,19,48]];
const HEB=n=>{const a=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];if(n===15)return 'טו';if(n===16)return 'טז';let o='';for(const [v,c] of a)while(n>=v){o+=c;n-=v;}return o;};
const GEO=new Set(['נגב','ים','ירדן','הר','מדבר','גבול','שפלה','עמק','נחל','ערבה','ים המלח','הירדן','הים הגדול','צפון']);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/[־]/g,' ').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
// פסוקי יהושע
const L=fs.readFileSync(process.argv[2],'utf8').split('\n');let ch=0;const V=[];
for(const l of L){const h=l.match(/<h2>פרק ([א-ת]+)<\/h2>/);if(h){ch=gem(h[1]);continue;}const m=l.match(/^\(([א-ת]+)\)\s*(.*)$/);if(m&&ch)V.push({c:ch,v:gem(m[1]),w:norm(m[2]).split(' ')});}
function gem(s){const g={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400};return [...s].reduce((a,c)=>a+(g[c]||0),0);}
const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(F,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);
let t=fs.readFileSync(F,'utf8');let added=0,ents=0;
for(const e of c.DATA){const forms=[e.name,...(e.aliases||[])].map(norm).filter(x=>x.length>=3&&!GEO.has(x));
  const got=new Map();
  for(const [tr,c1,v1,c2,v2] of RANGES)for(const v of V){if((v.c<c1||(v.c===c1&&v.v<v1))||(v.c>c2||(v.c===c2&&v.v>v2)))continue;
    const s=' '+v.w.join(' ')+' ';
    for(const f of forms){const re=new RegExp(' (?:[ובהמל]{0,2})'+f.replace(/ /g,' ')+' ');if(re.test(s)){if(!got.has(tr))got.set(tr,'יהושע '+HEB(v.c)+' '+HEB(v.v));break;}}}
  if(!got.size)continue;const old=e.tribes||[];const nt=[...new Set([...old,...got.keys()])];if(nt.length===old.length)continue;
  const refs=[e.tribeRefs,...[...got].filter(([k])=>!old.includes(k)).map(([k,r])=>k+': '+r)].filter(Boolean).join('; ');
  const key='{"name":'+JSON.stringify(e.name)+',';const at=t.indexOf(key);if(at<0)continue;const next=t.indexOf('\n{"name":',at+5);const seg=t.slice(at,next<0?undefined:next);
  let ns;if(/"tribes":\[/.test(seg)){ns=seg.replace(/"tribes":\[[^\]]*\]/,'"tribes":'+JSON.stringify(nt)).replace(/"tribeRefs":"[^"]*"/,'"tribeRefs":'+JSON.stringify(refs));if(!/"tribeRefs":/.test(ns))ns=ns.replace(/("tribes":\[[^\]]*\])/,'$1,"tribeRefs":'+JSON.stringify(refs));}
  else ns=key+'"tribes":'+JSON.stringify(nt)+',"tribeRefs":'+JSON.stringify(refs)+','+seg.slice(key.length);
  t=t.slice(0,at)+ns+(next<0?'':t.slice(next));added+=nt.length-old.length;ents++;}
fs.writeFileSync(F,t);console.log({entries:ents,tribesAdded:added});
