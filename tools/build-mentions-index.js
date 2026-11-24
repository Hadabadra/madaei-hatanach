#!/usr/bin/env node
// 6.5.0 — אינדקס ״היכן נזכר״: לכל ספר בספריית אוצריא (בבלי, ירושלמי, משנה, מדרשים, תנ״ך) ולכל יחידה בו
// (דף ועמוד / פרק והלכה / פרק ומשנה / כותרת / פרק ופסוק) — אילו ערכים מהמדריכים נזכרים בה, לפי השם והכינויים.
// זיהוי אוטומטי לפי השם בלבד (לא אומת בכל מופע). פלט: guides/_mentions/mentions-data.js (נטען בעצלות, shell/mentions.js).
//   node tools/build-mentions-index.js <שורש ספריית אוצריא (התיקייה אוצריא)> <רשימת קבצים>
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const [ROOT,LIST]=process.argv.slice(2);
const GUIDES={people:'guides/people/data/people-data.js',places:'guides/places/data/places.js',animal:'guides/animal/data/animal-data.js',
  flora:'guides/flora/data/flora-data.js',domem:'guides/domem/data/domem-data.js',amoraim:'guides/amoraim/data/amoraim-data.js',
  beithamikdash:'guides/beithamikdash/data/beithamikdash-data.js'};
const loadData=f=>{const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(f,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);return c.DATA;};
const norm=s=>String(s||'').replace(/[־]/g,' ').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
// מילים שהן גם מילים רגילות — לא נספרות כשם לבדן
const STOP=new Set(('אבן כסף זהב עץ מים אש ארץ הר עיר בית שדה יום לחם דם חלב שמן יין מלח עפר חול כלי כלים ים נהר אור קול רוח בן בת אב אם גן דרך שער מקום ראש יד רגל עין פה לב אל גד דן עם צל חי כל מה זה קנה מנה סלע עדה חרב רמה גבע עי נוב עמק מדבר שור חמור עגל כבש שה עז איל פר צאן בקר דג עוף נחש זאב אריה דוב כלב סוס גמל עורב יונה תור צבי קוץ תאנה גפן זית רמון תמר חטה חטים שעורים עדשים פול שום בצל קשת אפר סיד נחשת ברזל עופרת שש שני אמה טפח זרת אצבע סאה קב לוג הין כור שקל גרה ככר דינר פרוטה מעה איסר זוז יעל ערער חשבון מדין עזה גבים נגב צפון שמש ירח כוכב לבן אדום ירוק שחור תכלת ארגמן מור קדש נס עד אור טוב רע חן שלום שלם אמת נח דבש פרי ירק עשב זרע שבט שבע מטה מנחה עולה בכור לוי כהן ישראל אדם איש אשה נער ילד עבד מלך שר נביא חכם תלמיד רב רבי מר אבא אמא ברך אמן תמים חיה בהמה שרץ רמש חיים מות').split(' '));
// מילה בודדת שהיא מ-2,500 המילים השכיחות בבבלי/משנה/ירושלמי — לא נספרת כשם, אלא אם הערך ״מוכר״ (אישיות תנ״כית עם 20 פסוקים
// ומעלה, או חכם מהרשימה המקורית שאינו מילה רגילה). כך ״משה״, ״דוד״, ״רבא״, ״אביי״ נשארים, ו״אלא״, ״אומר״, ״אשר״ לא.
const FILES0=fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>/תלמוד בבלי|תלמוד ירושלמי|\/משנה\//.test(f));
const freq=new Map();for(const rel of FILES0){const f=path.join(ROOT,rel.replace(/^אוצריא\//,''));if(!fs.existsSync(f))continue;
  for(const w of norm(fs.readFileSync(f,'utf8')).split(' '))freq.set(w,(freq.get(w)||0)+1);}
const tfreq=new Map();for(const rel of fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>/\/תנך\//.test(f))){const f=path.join(ROOT,rel.replace(/^אוצריא\//,''));if(!fs.existsSync(f))continue;
  for(const w of norm(fs.readFileSync(f,'utf8')).split(' '))tfreq.set(w,(tfreq.get(w)||0)+1);}
const COMMON=new Set([...freq].sort((a,b)=>b[1]-a[1]).slice(0,6000).map(x=>x[0]));
const NOT_NAMES=new Set(['אחר','אחרים','כדי','שמע','אמרי','דברי','ושתי','עובד','שמר','מדי','דברת','גלים','אולאי','נהר אולאי','יענה','בת היענה','רחם','זמר','אהלות','מגפה','שרף','חור','כסיל','רכב','גלגל','משמרת','איפה','צרי']);
// אישי תנ״ך ששמם מופיע הרבה גם בגמרא כשם (ולא כמילה אחרת)
const FAMOUS=new Set('אברהם יצחק יעקב שרה רבקה רחל לאה יוסף ראובן שמעון יהודה יששכר זבולון בנימין נפתלי משה אהרן מרים יהושע כלב פנחס שמואל שאול דוד שלמה אליהו אלישע ישעיהו ירמיהו יחזקאל דניאל עזרא נחמיה מרדכי אסתר המן פרעה נבוכדנצר בלעם בלק עמלק עשו ישמעאל לבן לוט נח חוה קין הבל חנוך מתושלח יפת נמרוד יתרו קרח דתן אבירם עכן גדעון שמשון דבורה יפתח חנה אבשלום אמנון יואב אבנר חזקיהו יאשיהו אחאב איזבל ירבעם רחבעם יהושפט עוזיהו צדקיהו בועז רות נעמי איוב יונה עמוס הושע מיכה חבקוק צפניה חגי זכריה סנחריב כורש אחשורוש ושתי בתשבע מיכל יונתן ישי עובד תמר דינה בלהה זלפה אסנת מנשה אפרים'.split(' '));
const forms=new Map();const ents=[];let maxLen=1;
for(const [g,f] of Object.entries(GUIDES)){if(!fs.existsSync(f))continue;for(const e of loadData(f)){
  if(/\(\d+\)\s*$/.test(e.name))continue; // שם משותף לכמה חכמים — לא מנחשים מי מהם
  const id=ents.length;ents.push([g,e.name]);
  const famous=(g==='people'&&FAMOUS.has(norm(e.name)))||(g==='amoraim'&&!e.src);
  for(const n0 of [e.name,...(e.aliases||[])]){const n=norm(n0).replace(/ [א-ת]$/,'');if(n.length<3||STOP.has(n)||NOT_NAMES.has(n))continue;const L=n.split(' ').length;
    if(L===1&&COMMON.has(n)&&!famous)continue;
    if(L===1&&g==='people'&&!famous&&(e.verses||[]).length<5)continue; // אישיות שנזכרת בפסוקים מעטים — בשמה לבד לרוב מילה אחרת (״יוכל״, ״ישוב״)
    if(L===1&&g==='people'&&n.length<3)continue;maxLen=Math.max(maxLen,L);if(!forms.has(n))forms.set(n,new Set());forms.get(n).add(id);}}}
const pickCache=new Map();
function pick(ids){if(ids.size===1)return ids;if(pickCache.has(ids))return pickCache.get(ids);
  const byG={};ids.forEach(id=>(byG[ents[id][0]]=byG[ents[id][0]]||[]).push(id));const out=new Set();
  for(const list of Object.values(byG)){if(list.length===1){out.add(list[0]);continue;}
    // כמה ערכים באותו מדריך באותה צורה (״יהודה״): רק מי ששמו הוא הצורה עצמה; אם אין — לא משייכים
    const ex=list.filter(id=>{const nm=norm(ents[id][1]);return [...forms].some(([f,s])=>s===ids&&f===nm);});ex.forEach(id=>out.add(id));}
  pickCache.set(ids,out);return out;}
const files=fs.readFileSync(LIST,'utf8').trim().split('\n').filter(f=>!/סדר הדורות/.test(f));
const PFX1=/^(ו|ה|וה|ד|וד|ל|ול)/;           // תחיליות שמותרות גם לשם בן מילה אחת
const PFX=/^[ובהלמשכד]{1,2}/;                // לשם של כמה מילים
const bookKey=f=>{const b=path.basename(f,'.txt');if(f.includes('/תלמוד בבלי/'))return 'בבלי '+b;if(f.includes('/תלמוד ירושלמי/'))return 'ירושלמי '+b.replace(/^תלמוד ירושלמי /,'');if(f.includes('/משנה/'))return 'משנה '+b.replace(/^משנה /,'');if(f.includes('/תנך/'))return 'תנ״ך '+b;return 'מדרש '+b;};
const OUT={};let pairs=0;
for(const rel of files){const f=path.join(ROOT,rel.replace(/^אוצריא\//,''));if(!fs.existsSync(f))continue;
  const key=bookKey(rel);const bavli=key.startsWith('בבלי ');const units=[];const map=new Map();let h2='',h3='',mk='',cur=null;
  const unitOf=()=>{let u;if(bavli)u=h2.replace(/^דף /,'').trim();else if(key.startsWith('משנה ')||key.startsWith('תנ״ך '))u=h2.replace(/^פרק /,'')+(mk?':'+mk:'');else if(key.startsWith('ירושלמי '))u=h2.replace(/^פרק /,'')+(h3?':'+h3.replace(/^הלכה /,''):'');else u=(h2+(h3?' '+h3:'')).trim();
    if(!map.has(u)){map.set(u,{i:units.length,s:new Set()});units.push(u);}return map.get(u);};
  for(const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/<h([23])>([^<]+)<\/h\1>/);
    if(m){if(m[1]==='2'){h2=m[2].replace(/\s+/g,' ').trim();h3='';}else h3=m[2].replace(/\s+/g,' ').trim();mk='';cur=null;continue;}
    const mm=line.match(/^\(([א-ת]{1,3})\)/);if(mm&&(key.startsWith('משנה ')||key.startsWith('תנ״ך '))){mk=mm[1];cur=null;}
    const W=[];for(const w of norm(line).split(' ')){if(!w)continue;if(/^[ודכלמ]{0,3}ר$/.test(w)){W.push('רבי');continue;}W.push(w);}
    if(W.length<2)continue;
    for(let i=0;i<W.length;i++){for(let n=Math.min(maxLen,W.length-i);n>=1;n--){let s=W.slice(i,i+n).join(' ');let ids=forms.get(s);
        if(!ids){const p=s.match(n===1?PFX1:PFX);if(p&&!(n===1&&COMMON.has(s))){const s2=s.slice(p[0].length);if(s2.length>=3)ids=forms.get(s2);}}
        if(!ids)continue;if(!cur)cur=unitOf();pick(ids).forEach(id=>cur.s.add(id));i+=n-1;break;}}
  }
  if(!units.length)continue;
  const byEnt={};for(const [,{i,s}] of map)for(const id of s){(byEnt[id]=byEnt[id]||[]).push(i);pairs++;}
  OUT[key]={u:units,e:byEnt};
}
// 6.8.0 — f: צורה ← ערך אחד, לקישורים בתוך הכרטיסים (shell/xlinks.js). צורה שמשותפת לכמה מדריכים —
// לפי סדר העדיפות (מקומות קודם); כמה ערכים באותו מדריך — רק מי ששמו הוא הצורה עצמה, אחרת בלי קישור.
const PRIO=['places','people','amoraim','domem','animal','flora','beithamikdash','archaeology'];const F={};
for(const [f,ids] of forms){const byG={};ids.forEach(id=>(byG[ents[id][0]]=byG[ents[id][0]]||[]).push(id));
  const g=PRIO.find(x=>byG[x]);if(!g)continue;let l=byG[g];if(l.length>1)l=l.filter(id=>norm(ents[id][1])===f);if(l.length===1)F[f]=l[0];}
const header='/* אינדקס ״היכן נזכר״ — נוצר ע״י tools/build-mentions-index.js מספריית אוצריא. זיהוי אוטומטי לפי השם בלבד. */\n';
fs.writeFileSync('guides/_mentions/mentions-data.js',header+'const DATA = '+JSON.stringify({ents,f:F,books:OUT})+';\n');
console.log({entities:ents.length,forms:forms.size,books:Object.keys(OUT).length,pairs,sizeMB:(fs.statSync('guides/_mentions/mentions-data.js').size/1e6).toFixed(1)});
