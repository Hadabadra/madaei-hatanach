// 6.5.0 — קישור לכל חכם לערך שלו ב״סדר הדורות״ (חלק ״סדר תנאים ואמוראים״): sdIndex = מספר השורה (0-based) של כותרת הערך
// בקובץ הספר בספריית אוצריא, ו-sdTitle = הכותרת כפי שהיא שם. נפתח ב-reader.openBook לפי index.
//   node sd-links-65.js <…/סדר הדורות.txt>
const fs=require('fs');const io=require('./data-io.js');const AF='guides/amoraim/data/amoraim-data.js';const a=io.load(AF);
const L=fs.readFileSync(process.argv[2],'utf8').split('\n');const st=L.findIndex(l=>l.includes('<h2>סדר תנאים ואמוראים</h2>'));
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳'"״]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
const formOf=s=>norm(s.replace(/׳/g,"'").replace(/^'?ר' /,'רבי ').replace(/ בר' /g,' ברבי '));
const sd=new Map();
for(let i=st+1;i<L.length;i++){const m=L[i].match(/^<b>([^<]+)<\/b>/);if(!m)continue;const h=m[1].trim().replace(/[.,:]+$/,'');const f=formOf(h);
  if(!f)continue;if(sd.has(f)&&sd.get(f).i!==i)sd.get(f).amb=true;else sd.set(f,{i,h});
  const f2=f.replace(/^רבי /,'רב ');if(f2!==f&&!sd.has(f2))sd.set(f2,{i,h,weak:true});}
let n=0,amb=0;
for(const e of a.data){delete e.sdIndex;delete e.sdTitle;
  for(const nm of [e.name.replace(/\s*\(\d+\)\s*$/,''),...(e.aliases||[])]){const f=formOf(nm).replace(/ [א-ת]$/,'');const s=sd.get(f);
    if(!s||s.weak)continue;if(s.amb){amb++;break;}
    // שם משותף לכמה חכמים במדריך (״אבא (7)״) — לא מקשרים, כי סדר הדורות כולל לפעמים כמה באותו ערך
    if(/\(\d+\)\s*$/.test(e.name))break;
    e.sdIndex=s.i;e.sdTitle=s.h;n++;break;}}
io.save(AF,a);console.log({sdHeadwords:sd.size,linked:n,ambiguous:amb,of:a.data.length});
