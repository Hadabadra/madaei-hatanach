// 6.7.0 — הכרעה ב-34 הסתירות שנשארו ב-_עבודה/out/family-conflicts-661.tsv (״אין פסוק שבו שניהם״).
// הסיבה שלא נמצא פסוק ב-6.6.1: הניקוד הוסר לפני המקף (U+05BE נמצא בטווח הניקוד), ולכן ״בת־אילן״ נקרא ״בתאילן״.
// כל הכרעה כאן נבדקה מול הפסוק בספריית אוצריא (מראה המקום רשום בכל שורה). פלט: _עבודה/out/family-conflicts-670.tsv
//   node family-conflicts-670.js <…/אוצריא/תנך>
'use strict';
const fs=require('fs'),path=require('path');const io=require('./data-io.js');const F='guides/people/data/people-data.js';const o=io.load(F);const TD=process.argv[2];
const V=new Map();for(const d of ['תורה','נביאים','כתובים'])for(const f of fs.readdirSync(path.join(TD,d))){const b=f.replace(/\.txt$/,'');let ch='';
  for(const l of fs.readFileSync(path.join(TD,d,f),'utf8').split('\n')){const h=l.match(/<h2>פרק ([א-ת]+)<\/h2>/);if(h){ch=h[1];continue;}const m=l.match(/^\(([א-ת]+)\)\s*(.*)$/);
    if(m&&ch)V.set(b+' '+ch+', '+m[1],m[2].replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,' ').replace(/\{[פס]\}/g,'').replace(/\s+/g,' ').trim());}}
const by=()=>new Map(o.data.map(e=>[e.name,e]));let B=by();const get=n=>B.get(n);
const rep=['הרושם\tהילד שנרשם\tההכרעה\tמראה מקום'];const R=(p,c,d,ref)=>rep.push([p,c,d,ref||''].join('\t'));
const rmChild=(p,c)=>{const e=get(p);if(e&&e.children)e.children=e.children.filter(x=>x!==c);};
const repl=(arr,a,b)=>arr?[...new Set(arr.map(x=>x===a?b:x))]:arr;
let maxId=Math.max(...o.data.map(e=>+String(e.id||'p0').slice(1)||0));const st={merged:0,removed:0,created:0,fixed:0};
// א. כפילויות: אותו אדם בשני כתיבים — הכינוי עובר לערך העיקרי, הפסוקים מצטרפים, כל ההפניות מתעדכנות
function merge(dup,keep,ref){const d=get(dup),k=get(keep);if(!d||!k)return;k.aliases=[...new Set([...(k.aliases||[]),dup,...(d.aliases||[])])].filter(x=>x!==keep);
  const refs=new Set((k.verses||[]).map(v=>v.ref));for(const v of d.verses||[])if(!refs.has(v.ref))(k.verses=k.verses||[]).push(v);
  for(const f of ['children','spouses','siblings'])k[f]=[...new Set([...(k[f]||[]),...(d[f]||[])])];
  for(const e of o.data){for(const f of ['father','mother'])if(e[f]===dup)e[f]=keep;for(const f of ['children','spouses','siblings'])e[f]=repl(e[f],dup,keep);}
  o.data.splice(o.data.indexOf(d),1);B=by();st.merged++;R(dup,'(כל הערך)','כפילות — אוחד עם ״'+keep+'״ (נשאר ככינוי)',ref);}
merge('גדעוני','גדעני','במדבר י, כד');merge('צריה','צרויה','שמואל ב יד, א');merge('אילן','אילון','בראשית כו, לד');
// ב. ילד שנרשם בטעות (שם שבט, מילה רגילה, נשיא שבט שאינו בנו של השבט, אב שנרשם כבן)
const WRONG=[['רמון','חם','חם בן נח; בני רמון הבארתי הם רכב ובענה','שמואל ב ד, ב'],['פרץ','ראש','״מן בני פרץ הראש לכל שרי הצבאות״ — ראש = ממונה','דברי הימים א כז, ג'],
  ['אפרים','קמואל','נשיא מטה אפרים, ״קמואל בן שפטן״','במדבר לד, כד'],['יששכר','פלטיאל','נשיא מטה יששכר, ״פלטיאל בן עזן״','במדבר לד, כו'],['דן','בקי','נשיא מטה דן, ״בקי בן יגלי״','במדבר לד, כב'],
  ['נפתלי','פדהאל','נשיא מטה נפתלי, ״פדהאל בן עמיהוד״','במדבר לד, כח'],['ראובן','גדי','״בני ראובן וגדי״ — שבט גד; גדי בן סוסי הוא ממטה מנשה','דברי הימים א ה, יח'],
  ['קרח','שריה','״יוחנן ויונתן בני קרח ושריה בן תנחמת״','ירמיהו מ, ח'],['חור','אבי','״אבי בית לחם״ — תואר, לא שם','דברי הימים א ד, ד'],
  ['ישי','אליאב','כפילות של ״אליאב בן ישי״','דברי הימים א ב, יג'],['אליעם','שבע','כפילות של ״בת שבע״ (״בת שבע בת אליעם״)','שמואל ב יא, ג'],
  ['נתניהו','ישמעאל','נתניהו שבערך זה הוא אבי יהודי (בן שלמיהו); ישמעאל בן נתניה — ערך חדש למטה','ירמיהו לו, יד'],
  ['אילון','בשמת','כפילות של ״בשמת בת אילון״ (עם האיחוד של ״אילן״)','בראשית כו, לד'],['רם','ירחמאל','ירחמאל ורם אחים, בני חצרון (״ובני חצרון… את ירחמאל ואת רם״)','דברי הימים א ב, ט'],
  ['ירחמאל','חצרון','חצרון הוא אביו של ירחמאל (״בני ירחמאל בכור חצרון״), לא בנו','דברי הימים א ב, כה']];
for(const [p,c,why,ref] of WRONG){rmChild(p,c);st.removed++;R(p,c,'נמחק מרשימת הילדים: '+why,ref);}
const yr=get('ירחמאל');if(yr){yr.father='חצרון';const h=get('חצרון');if(h&&!h.children.includes('ירחמאל'))h.children.push('ירחמאל');st.fixed++;}
// אחזי בן משלמות — ״משלמות״ הוא כינוי של ״שלמות״ בערך; הקישור מתוקן לשם הערך
const az=get('אחזי');if(az&&az.father==='משלמות'){az.father='שלמות';st.fixed++;R('שלמות','אחזי','אותו אדם — ״משלמות״ הוא כינוי בערך ״שלמות״; האב תוקן לשם הערך','נחמיה יא, יג');}
const yo=get('יואב');if(yo&&yo.father==='צרויה'){yo.father='';st.fixed++;}
// ארן ועוץ בני דישן (החורי) — לא בני דישון בן ענה
const ar=get('ארן');if(ar){ar.father='דישן';ar.verses=(ar.verses||[]).filter(v=>v.ref!=='דברי הימים א ב, כה');rmChild('דישון','ארן');st.fixed++;R('דישן','ארן','ארן בן דישן (״אלה בני דישן עוץ וארן״); נמחק מבני דישון בן ענה','בראשית לו, כח');}
const uz=get('עוץ (בן דישון)');if(uz){uz.name='עוץ (בן דישן)';uz.father='דישן';uz.gender='ז';uz.verses=[{ref:'בראשית לו, כח',text:V.get('בראשית לו, כח')||''},...(uz.verses||[])];
  rmChild('דישון','עוץ (בן דישון)');const ds=get('דישן');if(ds)ds.children=repl(ds.children,'עוץ','עוץ (בן דישן)');B=by();st.fixed++;R('דישן','עוץ','הערך ״עוץ (בן דישון)״ → ״עוץ (בן דישן)״; עוץ בן ארם הוא אחר','בראשית לו, כח');}
// ג. אדם אחר באותו שם — ערך חדש ״X (בן P)״ עם הפסוק
const NEW=[['יתר','גדעון (ירובעל)','שופטים ח, כ'],['נתנאל','ישי','דברי הימים א ב, יד'],['אצם','ישי','דברי הימים א ב, טו'],['בלהן','אצר','בראשית לו, כז'],
  ['קמואל','שפטן','במדבר לד, כד'],['ישמעאל','יהוחנן','דברי הימים ב כג, א'],['אליפלט','דוד','שמואל ב ה, טז'],['נפג','דוד','שמואל ב ה, טו'],['אלישמע','דוד','שמואל ב ה, טז'],
  ['ירימות','דוד','דברי הימים ב יא, יח'],['אחיה','ירחמאל','דברי הימים א ב, כה'],['ארן','ירחמאל','דברי הימים א ב, כה'],['שמואל','עמיהוד','במדבר לד, כ'],
  ['ישמעאל','נתניה','ירמיהו מא, א'],['שמעא','דוד','דברי הימים א ג, ה'],['אליעזר','דדוהו','דברי הימים ב כ, לז']];
for(const [c,p,ref] of NEW){const pe=get(p);if(!pe){R(p,c,'לא בוצע — אין ערך להורה',ref);continue;}const pb=p.replace(/\s*\(.*?\)/,'');
  const nm=c+' (בן '+pb+')';const exist=[nm,c+' בן '+pb].find(x=>get(x));let name=exist;
  if(!exist){const t=V.get(ref);if(!t){R(p,c,'לא בוצע — הפסוק לא נמצא',ref);continue;}
    o.data.push({id:'p'+String(++maxId).padStart(4,'0'),name:nm,cat:pe.cat,aliases:[],gender:'ז',father:p,mother:'',spouses:[],children:[],siblings:[],roles:[],tribe:pe.tribe||'',birthPlace:'',dwelling:'',deathPlace:'',burialPlace:'',age:'',
      note:'בנו של '+pb+' ('+ref+'). אינו '+c+' שבערך הנפרד (שם זהה, אדם אחר). ערך שנוצר בהכרעת סתירות עצי המשפחה.',verses:[{ref,text:t}],midrash:[],src:'family-670'});
    name=nm;B=by();st.created++;}
  pe.children=repl(pe.children||[],c,name);if(!pe.children.includes(name))pe.children.push(name);const ce=get(name);if(ce&&!ce.father)ce.father=p;
  R(p,c,(exist?'קושר לערך הקיים ״':'ערך חדש ״')+name+'״',ref);}
const bs=get('בת שבע');if(bs&&get('שמעא (בן דוד)'))bs.children=repl(bs.children,'שמעא','שמעא (בן דוד)');const sd=get('שמעא (בן דוד)');if(sd&&bs)sd.mother='בת שבע';
fs.writeFileSync('_עבודה/out/family-conflicts-670.tsv',rep.join('\n')+'\n');io.save(F,o);console.log(st,'rows',rep.length-1);
