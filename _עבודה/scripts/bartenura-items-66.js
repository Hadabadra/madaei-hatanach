// 6.6.0 — פירוש ברטנורא על המשנה (ספריית אוצריא) כמקור לזיהוי פריטים:
//  (1) לכל פריט קיים בצומח/בע״ח/דומם שיש לו דיבור המתחיל בברטנורא עם הסבר מזהה (״בלע״ז״, ״בערבי״, ״קורין לו״, ״מין…״) —
//      נוסף מקור ״ברטנורא על משנה X פרק, משנה״ עם ההסבר.
//  (2) דיבור המתחיל מזהה שאין לו ערך — ערך חדש (סדר זרעים ועוקצים → צומח; כלים, שבת ושאר טהרות → דומם), עם ציטוט המשנה
//      והסבר ברטנורא. מסומן ״לא אומת״.
//   node bartenura-items-66.js <…/אוצריא> [--dry]
const fs=require('fs'),path=require('path'),vm=require('vm');const ROOT=process.argv[2];const DRY=process.argv.includes('--dry');
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\[[^\]]*\]/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
const ID=/בלע״ז|בלע"ז|בערבי|בלשון ערבי|לע״ז|לעז|קורין לו|שקורין|ובלשון|בל׳ לע/;
const ZERAIM=new Set(['כלאים','שביעית','מעשרות','ערלה','עוקצים','תרומות','מעשר שני','ביכורים','פאה','דמאי','חלה','ברכות']);
const KELIM=new Set(['כלים','שבת','אהלות','טהרות','מקואות','נגעים','זבים','ידים','טבול יום','מכשירין','פרה','בבא מציעא','בבא בתרא','בבא קמא','ביצה','סוכה','עירובין','מנחות','תמיד','מדות']);
const FLORA_HINT=/עשב|ירק|אילן|זרע|פרי|פירות|ענף|עלין|עלים|קטני|תבואה|שורש|פרח|מין ירק|מין קטנית|מין עשב|מין אילן|קנה/;
// ברטנורא
const B=[];const bd=path.join(ROOT,'משנה/ראשונים/ברטנורא');
for(const s of fs.readdirSync(bd))for(const f of fs.readdirSync(path.join(bd,s))){const tr=path.basename(f,'.txt').replace(/^ברטנורא על משנה /,'');let p='',m='';
  for(const l of fs.readFileSync(path.join(bd,s,f),'utf8').split('\n')){let h=l.match(/<h2>פרק ([^<]+)<\/h2>/);if(h){p=h[1].trim();continue;}h=l.match(/<h3>משנה ([^<]+)<\/h3>/);if(h){m=h[1].trim();continue;}
    const d=l.match(/^<b>([^<]+)<\/b>\s*(.*)$/);if(!d||!p)continue;const dh=norm(d[1]);const ex=d[2].replace(/<[^>]+>/g,'').trim();
    if(!dh||dh.split(' ').length>3||!ID.test(ex))continue;B.push({tr,p,m,dh,dhRaw:d[1].replace(/[.:]+$/,'').trim(),ex});}}
// משנה — לציטוט
const MQ=new Map();const md=path.join(ROOT,'משנה');
for(const s of fs.readdirSync(md)){if(!/^סדר /.test(s))continue;for(const f of fs.readdirSync(path.join(md,s))){const tr=path.basename(f,'.txt').replace(/^משנה /,'');let p='';
  for(const l of fs.readFileSync(path.join(md,s,f),'utf8').split('\n')){const h=l.match(/<h2>פרק ([^<]+)<\/h2>/);if(h){p=h[1].trim();continue;}const m=l.match(/^\(([א-ת]{1,3})\)\s*(.*)$/);if(m)MQ.set(tr+'|'+p+'|'+m[1],m[2].replace(/<[^>]+>/g,'').trim());}}}
const G={flora:'guides/flora/data/flora-data.js',animal:'guides/animal/data/animal-data.js',domem:'guides/domem/data/domem-data.js'};
const loadData=f=>{const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(fs.readFileSync(f,'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);return c.DATA;};
// מילים שכיחות בבבלי (6,000 הראשונות) — לא פריט חדש
const freq=new Map();for(const s of fs.readdirSync(path.join(ROOT,'תלמוד בבלי')).filter(x=>/^סדר /.test(x)))for(const f of fs.readdirSync(path.join(ROOT,'תלמוד בבלי',s)))for(const w of norm(fs.readFileSync(path.join(ROOT,'תלמוד בבלי',s,f),'utf8')).split(' '))freq.set(w,(freq.get(w)||0)+1);
const COMMON=new Set([...freq].sort((a,b)=>b[1]-a[1]).slice(0,6000).map(x=>x[0]));
const fz=x=>stem(x).replace(/[וי]/g,'').replace(/[אה]$/,'');
const stem=x=>x.replace(/^(וה|וב|ול|ו|ה|ב|ל)(?=[א-ת]{3})/,'').replace(/(ים|ין|ות|יות)$/,'');
const forms=new Map();const D={};
for(const [g,f] of Object.entries(G)){D[g]=loadData(f);for(const e of D[g])for(const n of [e.name,...(e.aliases||[])]){const x=norm(n);if(x.length<2)continue;for(const k of [x,stem(x),'~'+fz(x)]){if(!forms.has(k))forms.set(k,[]);forms.get(k).push([g,e.name]);}}}
// (1) מקורות לפריטים קיימים
const addSrc={};const newItems={flora:new Map(),domem:new Map()};// נבדקו בעין: לא פריט (איבר, אדם, מקום, מונח) או כפילות בכתיב אחר
const EXCL=new Set(['מלפפונות','קפוטקיא','בכרייה','שלנה','פשפשין','מרפק','סרקן','יבלות','יבלת','כחרת','זון','עוררין','אמרכלין','אנדיפי','אלל','מחץ','פרקלינין','אנפוריא','אסטים','שגפתן','בטנון','באסדא','בסם','דולמטיקיון','מרפקו']);
const STOPDH=new Set(['כלי','כלים','אחד','כל','זה','הוא','שהוא','מין','עשב','אילן','ירק','ירקות','פירות','פרי','זרע']);
for(const b of B){const k=b.dh;const hit=forms.get(k)||forms.get(stem(k))||forms.get('~'+fz(k));const ref='ברטנורא על משנה '+b.tr+' '+b.p+', '+b.m;
  if(hit){for(const [g,n] of hit){const key=g+'|'+n;addSrc[key]=addSrc[key]||[];if(addSrc[key].length<2&&!addSrc[key].some(x=>x.tr===b.tr))addSrc[key].push({...b,ref});}continue;}
  // פריט חדש: מילה אחת (בלי תחילית), לא שכיחה, ולא כתיב אחר של פריט שכבר נוסף
  const w1=k.replace(/^(וה|ו|ה)(?=[א-ת]{3})/,'');
  if(k.split(' ').length!==1||STOPDH.has(w1)||stem(w1).length<3||COMMON.has(w1)||COMMON.has(k))continue;
  if(EXCL.has(w1)||EXCL.has(k))continue;
  const isVessel=/כלי|בגד|מלבוש|עור|מתכת|עץ שעושין|שעושין/.test(b.ex);
  const g=(ZERAIM.has(b.tr)&&!isVessel)||(FLORA_HINT.test(b.ex)&&!isVessel)?'flora':(KELIM.has(b.tr)||isVessel)?'domem':null;if(!g)continue;
  const nk=fz(w1);if(newItems.flora.has(nk)||newItems.domem.has(nk))continue;if(!newItems[g].has(nk))newItems[g].set(nk,{...b,ref});}
const st={};
function addToFile(file,name,src,field){let t=fs.readFileSync(file,'utf8');const keys=['{"name":'+JSON.stringify(name)+',','{name:'+JSON.stringify(name)+','];let at=-1,kk;for(const k of keys){at=t.indexOf(k);if(at>=0){kk=k;break;}}if(at<0)return false;
  let next=t.indexOf('\n{',at+5);const seg=t.slice(at,next<0?undefined:next);const fk=seg.search(new RegExp('"?'+field+'"?\\s*:\\s*\\['));
  if(fk<0){const ins=at+kk.length;const q=kk.startsWith('{"')?'"':'';t=t.slice(0,ins)+q+field+q+':['+JSON.stringify(src)+'],'+t.slice(ins);}
  else{const br=t.indexOf('[',at+fk)+1;if(t.slice(br,br+400).includes(JSON.stringify(src.ref||src.source).slice(1,-1)))return false;const empty=/^\s*\]/.test(t.slice(br));t=t.slice(0,br)+JSON.stringify(src)+(empty?'':',')+t.slice(br);}
  fs.writeFileSync(file,t);return true;}
for(const [key,list] of Object.entries(addSrc)){const [g,n]=key.split('|');const field=g==='domem'?'makorot':'midrash';
  for(const b of list){const src=g==='domem'?{ref:b.ref,text:b.dhRaw+'. '+b.ex}:{source:b.ref,note:b.dhRaw+'. '+b.ex};
    if(!DRY&&addToFile(G[g],n,src,field)){st[g+'-src']=(st[g+'-src']||0)+1;}else if(DRY)st[g+'-src']=(st[g+'-src']||0)+1;}}
// (2) פריטים חדשים
const out={};
for(const g of ['flora','domem']){const add=[];
  for(const [,b] of newItems[g]){const mref='משנה, '+b.tr+' '+b.p+', '+b.m;const mq=MQ.get(b.tr+'|'+b.p+'|'+b.m)||'';
    const name=b.dhRaw.replace(/[׳״'"]/g,'').replace(/^ו?ה(?=[א-ת]{3})/,'').replace(/^ו(?=[א-ת]{3})/,'').replace(/^[בכ](?=(?:קנקנתום|קונפון|טפוס|צוצטרה|אסקריא))/,'');
    const expl='לפי פירוש ברטנורא ('+b.tr+' '+b.p+', '+b.m+'): '+b.ex+' — פריט שנוסף מתוך סריקת פירוש ברטנורא; הזיהוי לא אומת, הצעות עריכה יתקבלו בברכה.';
    if(g==='domem')add.push({name,cat:'objects',img:null,aliases:[],tribe:null,explanation:expl,identification:'לא אומת',note:'',gallery:[],makorot:[{ref:mref,text:mq.slice(0,300)},{ref:b.ref,text:b.dhRaw+'. '+b.ex}],src:'bartenura-66'});
    else add.push({name,cat:/אילן|פירות|פרי/.test(b.ex)?'fruit-trees':/קטני|תבואה|זרע/.test(b.ex)?'grains':/קוץ|מדבר|בר\b/.test(b.ex)?'thorns-wild':'vegetables',aliases:[],methods:[{label:'לפי ברטנורא',confidence:'לא אומת',explanation:expl}],verses:[],midrash:[{source:mref,note:mq.slice(0,300)},{source:b.ref,note:b.dhRaw+'. '+b.ex}],src:'bartenura-66'});}
  out[g]=add;
  if(!DRY&&add.length){let t=fs.readFileSync(G[g],'utf8');const at=t.search(/^(?:const|let) DATA\s*=\s*\[/m);const br=t.indexOf('[',at)+1;t=t.slice(0,br)+'\n'+add.map(x=>JSON.stringify(x)).join(',\n')+',\n'+t.slice(br);fs.writeFileSync(G[g],t);}}
console.log({bartenuraIdDH:B.length,...st,newFlora:out.flora.length,newDomem:out.domem.length});
console.log('flora: '+out.flora.map(x=>x.name).join(', '));console.log('domem: '+out.domem.map(x=>x.name).join(', '));
