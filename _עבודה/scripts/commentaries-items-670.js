// 6.7.0 — מפרשי התנ״ך (רש״י, רד״ק, מלבי״ם, מצודת ציון/דוד) ומפרשי המדרשים (אוצריא/מדרש/**/מפרשים) כמקורות זיהוי
// לצומח, לבעלי החיים, לדומם ולמקומות. הרחבה של bartenura-items-66.js ושל laazei-rashi-661.js לספרים האלה.
//
// מה נחשב ״דיבור מזהה״: דיבור המתחיל (<b>…</b>) של מילה אחת או שתיים, שההסבר שאחריו קובע מה הוא —
//   צומח: ״מין/שם עשב|ירק|אילן|פרי|קטנית|תבואה|צמח״; בע״ח: ״מין/שם עוף|חיה|בהמה|שרץ|דג|תולעת|רמש״;
//   דומם: ״מין/שם כלי|מלבוש|בגד|אבן|מתכת|מטבע|משקל|מדה״, ״אבן טובה״; מקומות: ״שם מקום|עיר|ארץ|הר|נהר|מדינה|מדבר|עמק|נחל|כפר|מעין״.
//   לע״ז / ערבי / ״קורין״ — מקור לפריט קיים בצומח/בע״ח/דומם בלבד (לא קובע לבדו סוג לפריט חדש).
// התאמה מדויקת בלבד: הדיבור (אחרי הסרת אותיות שימוש ו/ה/ב/ל/מ/כ בתחילתו, כשנשארות 3 אותיות לפחות) שווה לשם או לכינוי.
//   בלי השמטת סיומות ובלי דמיון כתיב. שם שמופיע ביותר ממדריך אחד — רק במדריך שהסוג בהסבר מתאים לו.
// פריט חדש: מילה שאין לה ערך בשום מדריך, שאינה מ-6,000 המילים השכיחות בבבלי, עם סוג מפורש בהסבר;
//   במפרשי התנ״ך — רק אם המילה כתובה בפסוק עצמו (ציטוט הפסוק נכנס למקור). כל פריט חדש מסומן ״לא אומת״.
//   node commentaries-items-670.js <…/אוצריא> [--dry]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');const ROOT=process.argv[2];const DRY=process.argv.includes('--dry');
const norm=s=>String(s||'').replace(/[־]/g,' ').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\[[^\]]*\]/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
const strip=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/[֑-ׇ]/g,'').replace(/\s+/g,' ').trim();
const LAAZ=/בלע״ז|בלע"ז|בלעז|בל״ע|בערבי|בלשון ערבי|קורין|שקורין|קורים אותו/;
const TYPE={
  flora:/(?:^|[ .:,;])(?:מין|שם|מיני) (?:עשב|ירק|אילן|פרי|קטני|תבואה|צמח|דשא|קוץ|קוצים|עץ)/,
  animal:/(?:^|[ .:,;])(?:מין|שם|מיני) (?:עוף|עופות|חיה|בהמה|שרץ|דג|דגים|תולעת|רמש|ארבה)/,
  domem:/(?:^|[ .:,;])(?:מין|שם|מיני) (?:כלי|מלבוש|בגד|אבן|מתכת|מטבע|משקל|מדה|תכשיט)|אבן טובה|אבנים טובות/,
  places:/(?:^|[ .:,;])שם (?:מקום|עיר|ארץ|הר|נהר|מדינה|מדבר|עמק|נחל|כפר|מעין|המקום|העיר|הארץ|ההר|הנהר|המדינה|המדבר)/};
const PCAT=ex=>/שם (?:ה?עיר|כפר)/.test(ex)?(/כפר/.test(ex)?'villages':'cities'):/שם ה?הר/.test(ex)?'mountains':/שם (?:ה?נהר|נחל|מעין)/.test(ex)?'water':/שם (?:ה?ארץ|ה?מדינה)/.test(ex)?'lands':/שם ה?מדבר/.test(ex)?'deserts':/שם עמק/.test(ex)?'valleys':'regions';
const GENERIC=new Set(['נגב','הר','עמק','ארץ','נחל','ערי','עיר','מדבר','ים','נהר','בקעת','מי','אלוני','אלון','ככר','גבול','מעלה','מעלות','שדה','שדות']);
// 6.8.0: רק ו/ה בתחילת המילה. ב-6.7.0 הוסרו גם ב/ל/מ/כ — ו״בכפירים״ נהיה ״פירים״ (תוקן ב-fix-670-names-680.js)
const NAME=s=>s.replace(/^ו(?=[א-ת]{3})/,'').replace(/^ה(?=[א-ת]{3})/,'');
const variants=w=>{const out=new Set([w]);let x=w;for(let i=0;i<2;i++){const m=x.match(/^[ובלמכהש](?=[א-ת]{3,})/);if(!m)break;x=x.slice(1);out.add(x);}return [...out];};
// ספרים
const files=[];const walk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(f.endsWith('.txt'))files.push(p);}};
for(const d of ['תנך/ראשונים/רשי','תנך/ראשונים/רדק','תנך/אחרונים/מלבים','תנך/אחרונים/מצודת ציון','תנך/אחרונים/מצודת דוד'])walk(path.join(ROOT,d));
const tanachN=files.length;
const mwalk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(!fs.statSync(p).isDirectory())continue;if(f==='מפרשים')walk(p);else mwalk(p);}};mwalk(path.join(ROOT,'מדרש'));
// פסוקי התנ״ך — לבדיקה שהמילה בפסוק ולציטוט
const V=new Map();for(const part of ['תורה','נביאים','כתובים'])for(const f of fs.readdirSync(path.join(ROOT,'תנך',part))){const b=f.replace(/\.txt$/,'');let p='';
  for(const l of fs.readFileSync(path.join(ROOT,'תנך',part,f),'utf8').split('\n')){const h=l.match(/<h2>פרק ([^<]+)<\/h2>/);if(h){p=h[1].trim();continue;}const m=l.match(/^\(([א-ת]{1,3})\)\s*(.*)$/);if(m)V.set(b+'|'+p+'|'+m[1],strip(m[2]).replace(/&[a-z]+;/g,' ').replace(/\{[פס]\}/g,'').trim());}}
const DH=[];
files.forEach((f,i)=>{const isT=i<tanachN;let h1='',h2='',h3='',book='';
  for(const l of fs.readFileSync(f,'utf8').split('\n')){let h=l.match(/<h1>([^<]+)<\/h1>/);if(h){h1=strip(h[1]);book=(h1.match(/ על (.+)$/)||[])[1]||'';continue;}
    h=l.match(/<h2>([^<]+)<\/h2>/);if(h){h2=strip(h[1]);h3='';continue;}h=l.match(/<h3>([^<]+)<\/h3>/);if(h){h3=strip(h[1]);continue;}
    const d=l.match(/^<b>([^<]+)<\/b>\s*(.*)$/);if(!d||!h1)continue;const dh=norm(d[1]);if(!dh||dh.split(' ').length>2)continue;const ex=strip(d[2]);
    const types=Object.keys(TYPE).filter(g=>TYPE[g].test(ex.slice(0,160)));const head=Object.keys(TYPE).filter(g=>TYPE[g].test(ex.slice(0,40).replace(/^(?:[^.:,]{0,25}?)(?=שם|מין|אבן)/,'')))&&Object.keys(TYPE).filter(g=>{const m=ex.match(TYPE[g]);return m&&m.index<=30;});const near=Object.keys(TYPE).filter(g=>{const m=ex.match(TYPE[g]);return m&&m.index<=60;});const lm=ex.match(LAAZ);const laaz=!!lm&&lm.index<=80;if(!near.length&&!laaz)continue;
    let ref,vkey=null;if(isT){const c=h2.replace(/^פרק /,''),v=h3.replace(/^פסוק /,'');ref=h1+' '+c+', '+v;vkey=book+'|'+c+'|'+v;}else ref=h1+(h2?' '+h2:'')+(h3?', '+h3:'');
    DH.push({ref,vkey,isT,dh,dhRaw:strip(d[1]).replace(/[.:]+$/,'').trim(),ex:ex.slice(0,400),types,near,head,laaz,who:h1.replace(/ על .*$/,'')});}});
// מדריכים
const G={flora:'guides/flora/data/flora-data.js',animal:'guides/animal/data/animal-data.js',domem:'guides/domem/data/domem-data.js',places:'guides/places/data/places.js'};
const loadData=f=>{const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(f,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES|ICONS|EXTRA_TOWNS) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);return c.DATA;};
const forms=new Map();const ANY=new Set();
for(const [g,f] of Object.entries(G))for(const e of loadData(f))for(const n of [e.name,...(e.aliases||[])]){const x=norm(n);if(x.length<2)continue;if(!forms.has(x))forms.set(x,[]);if(!forms.get(x).some(h=>h[0]===g&&h[1]===e.name))forms.get(x).push([g,e.name]);ANY.add(x);}
for(const f of ['guides/people/data/people-data.js','guides/amoraim/data/amoraim-data.js'])for(const e of loadData(f))for(const n of [e.name,...(e.aliases||[])])ANY.add(norm(n));
const freq=new Map();for(const s of fs.readdirSync(path.join(ROOT,'תלמוד בבלי')).filter(x=>/^סדר /.test(x)))for(const f of fs.readdirSync(path.join(ROOT,'תלמוד בבלי',s)))for(const w of norm(fs.readFileSync(path.join(ROOT,'תלמוד בבלי',s,f),'utf8')).split(' '))freq.set(w,(freq.get(w)||0)+1);
const COMMON=new Set([...freq].sort((a,b)=>b[1]-a[1]).slice(0,6000).map(x=>x[0]));
// מילים בטקסטים של המדרשים — פריט חדש ממפרש מדרש רק אם המילה כתובה במדרש עצמו
const MW=new Set();(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory()){if(!/מפרשים|הערות/.test(f))w(p);}else if(f.endsWith('.txt'))for(const x of norm(fs.readFileSync(p,'utf8')).split(' '))MW.add(x);}})(path.join(ROOT,'מדרש'));
const SUFF=/(יך|יו|יה|יהם|יכם|יהן|יהון|יהן|תי|ני|נו|כם|הם|תם|ך|יהו)$/;
// נבדקו בעין: צורה נטויה → שם הערך (null = לא ערך: הסבר לשוני, שוק, מקום שאינו גאוגרפי, כפילות)
const RENAME={'אגרטלי':'אגרטל','רדידי':'רדיד','שעלו':'שעל','עכברי':'עכבר','תרשישה':'תרשיש','צרפתה':'צרפת','קירה':'קיר','שעירתה':'שעירה','בכד':'כד','איפת':'איפה','אשישי':null,'סלה':null,'יות':null,'אבוס':null,'אגם':null,'סדקי':null,'סירקי':null,'סוגיא':null,'ספירה':null,'אסיטון':null,'יספר':null,'יקרה':null,'פצו':null,'פיץ':null,'נגינת':null,'רמש':null,'חיתו':null,'אילי':null,'סרה':null,'תקועים':null,'נכון':null};
// נבדקו בעין ונפסלו (לא פריט/מקום, או שם כללי)
const EXCL=new Set(['מקום','עיר','ארץ','הר','נהר','מדבר','כלי','אבן','עוף','חיה','בהמה','עשב','אילן','שם','זה','הוא','מין','בגד','מדינה','מלבוש','שדה','בית','נחל','עמק','ים','גבול','דרך']);
const inVerse=(dh,vkey)=>{const v=V.get(vkey);if(!v)return null;const t=' '+norm(v)+' ';return dh.split(' ').every(w=>t.includes(w))?v:null;};
const src={};const NEW={flora:new Map(),animal:new Map(),domem:new Map(),places:new Map()};const st={dibburim:DH.length,files:files.length};
for(const b of DH){const words=b.dh.split(' ');const cands=new Set([b.dh]);if(words.length===1)variants(words[0]).forEach(x=>cands.add(x));else if(GENERIC.has(NAME(words[0])))variants(words[1]).forEach(x=>cands.add(x));
  let hits=[];for(const c of cands)if(forms.has(c))hits.push(...forms.get(c));
  hits=hits.filter((h,i,a)=>a.findIndex(x=>x[0]===h[0]&&x[1]===h[1])===i);
  // הסוג בהסבר מכריע; לע״ז לבד — רק צומח/בע״ח/דומם, ורק כשאין דו-משמעות בין מדריכים
  let ok=hits.filter(h=>b.near.includes(h[0]));if(!ok.length&&b.laaz){const nonP=hits.filter(h=>h[0]!=='places');if(nonP.length&&new Set(nonP.map(h=>h[0])).size===1)ok=nonP;}
  if(b.isT&&ok.length&&!inVerse(b.dh,b.vkey))ok=[];
  if(ok.length){for(const [g,n] of ok){const k=g+'|'+n;src[k]=src[k]||[];if(src[k].length<3&&!src[k].some(x=>x.ref===b.ref||x.who===b.who))src[k].push(b);}continue;}
  if(hits.length||!b.types.length)continue;
  // פריט חדש
  if(b.head.length!==1||/באור המילות/.test(b.ref))continue;const g=b.head[0];if(!b.isT&&(g==='places'||!MW.has(words[words.length-1])))continue;
  if(SUFF.test(words[words.length-1])||(g!=='places'&&/(ים|ין|ות|יות)$/.test(words[words.length-1])))continue;
  const nameWords=words.length===2&&!(g==='places'&&GENERIC.has(NAME(words[0])))?null:words;if(!nameWords)continue;
  let nm=words.length===1?NAME(words[0]):b.dh;if(RENAME[nm]===null)continue;if(RENAME[nm])nm=RENAME[nm];const key=norm(nm);
  if(key.length<3||ANY.has(key)||variants(words[0]).some(x=>ANY.has(x))||EXCL.has(key)||COMMON.has(key)||COMMON.has(words[0]))continue;
  let vq=null;if(b.isT){vq=inVerse(b.dh,b.vkey);if(!vq)continue;}
  if(!NEW[g].has(key))NEW[g].set(key,{name:nm,list:[]});const it=NEW[g].get(key);if(it.list.length<3&&!it.list.some(x=>x.who===b.who))it.list.push({...b,vq});}
function addToFile(file,name,o,field){let t=fs.readFileSync(file,'utf8');let at=-1,kk;for(const k of ['{"name":'+JSON.stringify(name)+',','{name:'+JSON.stringify(name)+',']){at=t.indexOf(k);if(at>=0){kk=k;break;}}if(at<0)return false;
  const next=t.indexOf('\n{',at+5);const seg=t.slice(at,next<0?undefined:next);const r=o.ref||o.source;if(seg.includes(JSON.stringify(r).slice(1,-1)))return false;const fk=seg.search(new RegExp('"?'+field+'"?\\s*:\\s*\\['));
  if(fk<0){const q=kk.startsWith('{"')?'"':'';t=t.slice(0,at+kk.length)+q+field+q+':['+JSON.stringify(o)+'],'+t.slice(at+kk.length);}
  else{const br=t.indexOf('[',at+fk)+1;const empty=/^\s*\]/.test(t.slice(br));t=t.slice(0,br)+JSON.stringify(o)+(empty?'':',')+t.slice(br);}fs.writeFileSync(file,t);return true;}
const rep=['מדריך\tערך\tמקור\tדיבור\tהסבר'];
for(const [k,list] of Object.entries(src)){const [g,n]=k.split('|');for(const b of list){const note=b.dhRaw+'. '+b.ex;const o=g==='domem'?{ref:b.ref,text:note}:{source:b.ref,note};
  if(DRY||addToFile(G[g],n,o,g==='domem'?'makorot':'midrash')){st[g+'-src']=(st[g+'-src']||0)+1;rep.push([g,n,b.ref,b.dhRaw,b.ex.slice(0,120)].join('\t'));}}}
const FC=ex=>/אילן|פרי/.test(ex)?'fruit-trees':/קטני|תבואה/.test(ex)?'grains':/קוץ|קוצים/.test(ex)?'thorns-wild':'vegetables';
const AC=ex=>/עוף|עופות/.test(ex)?'birds':/דג/.test(ex)?'water':/תולעת|ארבה/.test(ex)?'insects':/שרץ|רמש/.test(ex)?'shratzim':'mammals-other';
const DC=ex=>/מלבוש|בגד/.test(ex)?'clothing':/תכשיט/.test(ex)?'jewelry':'objects';
const out={};for(const g of Object.keys(NEW)){const arr=[];
  for(const [,it] of NEW[g]){const srcs=[];for(const b of it.list){if(b.vq)srcs.push({r:b.ref.replace(/^.+? על /,''),t:b.vq.slice(0,300)});srcs.push({r:b.ref,t:b.dhRaw+'. '+b.ex});}
    const uniq=srcs.filter((s,i,a)=>a.findIndex(x=>x.r===s.r)===i);const b0=it.list[0];
    const expl='לפי '+it.list.map(b=>b.ref).join('; ')+': '+b0.ex.slice(0,220)+' — נוסף מתוך סריקת מפרשי התנ״ך והמדרשים; הזיהוי לא אומת, הצעות עריכה יתקבלו בברכה.';
    if(g==='domem')arr.push({name:it.name,cat:DC(b0.ex),img:null,aliases:[],tribe:null,explanation:expl,identification:'לא אומת',note:'',gallery:[],makorot:uniq.map(s=>({ref:s.r,text:s.t})),src:'commentaries-670'});
    else if(g==='places')arr.push({name:it.name,cat:PCAT(b0.ex),aliases:[],methods:[{label:'לפי המפרשים',explanation:expl,modern:'לא אומת',confidence:'לא אומת'}],verses:[],midrash:uniq.map(s=>({source:s.r,note:s.t})),academic:[],src:'commentaries-670'});
    else arr.push({name:it.name,cat:(g==='flora'?FC:AC)(b0.ex),aliases:[],methods:[{label:'לפי המפרשים',confidence:'לא אומת',explanation:expl}],verses:[],midrash:uniq.map(s=>({source:s.r,note:s.t})),src:'commentaries-670'});}
  out[g]=arr;if(!DRY&&arr.length){let t=fs.readFileSync(G[g],'utf8');const at=t.search(/^(?:const|let) DATA\s*=\s*\[/m);const br=t.indexOf('[',at)+1;t=t.slice(0,br)+'\n'+arr.map(x=>JSON.stringify(x)).join(',\n')+',\n'+t.slice(br);fs.writeFileSync(G[g],t);}
  for(const x of arr)rep.push([g,x.name+' (חדש)',x.explanation?x.explanation.slice(0,140):x.methods[0].explanation.slice(0,140),(x.midrash||x.makorot).map(s=>s.source||s.ref).join('; '),'','לא אומת'].join('\t'));}
fs.mkdirSync('_עבודה/out',{recursive:true});fs.writeFileSync('_עבודה/out/commentaries-items-670.tsv',rep.join('\n')+'\n');
console.log({...st,newFlora:out.flora.length,newAnimal:out.animal.length,newDomem:out.domem.length,newPlaces:out.places.length});
for(const g of Object.keys(out))console.log(g+': '+out[g].map(x=>x.name).join(', ').slice(0,900));
