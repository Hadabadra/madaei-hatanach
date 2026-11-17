// 6.5.0 — מחיל את הצעות העריכה (פלט edit-suggestions-65.py): שינויי שדות ומקורות שאין בערך. אישים — data-io; מקומות — עריכת טקסט.
const fs=require('fs');const io=require('./data-io.js');
const S=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const EXTRA={'ברכות ד א':{ref:'בבלי, ברכות ד ע"א',text:'ואמר רבי יוחנן: לא ״כלאב״ שמו אלא ״דניאל״ שמו, ולמה נקרא שמו ״כלאב״ — שהיה מכלים פני מפיבשת בהלכה.'}};
const PF='guides/people/data/people-data.js';const P=io.load(PF);const log=[];
const nk=r=>String(r).replace(/["״׳']/g,'').replace(/\s+/g,' ').trim();
for(const s of S){
  if(s.guide==='places'){ if(s.changes.aliases){let t=fs.readFileSync('guides/places/data/places.js','utf8');
      const k='{"name":'+JSON.stringify(s.name)+',';const at=t.indexOf(k);const a=t.indexOf('"aliases":[',at)+11;
      for(const v of s.changes.aliases){const seg=t.slice(a,t.indexOf(']',a));if(!seg.includes(JSON.stringify(v))){t=t.slice(0,a)+JSON.stringify(v)+(seg.trim()?',':'')+t.slice(a);log.push(s.n+' alias '+v);}}
      fs.writeFileSync('guides/places/data/places.js',t);}
    continue;}
  const e=P.data.find(x=>x.name===s.name);if(!e){log.push(s.n+' MISSING '+s.name);continue;}
  for(const [f,vals] of Object.entries(s.changes)){e[f]=e[f]||[];for(const v of vals)if(!e[f].includes(v)){e[f].push(v);log.push(s.n+' '+f+'+'+v);}}
  for(const [f,list] of [['verses',s.verses],['midrash',s.midrash]]){e[f]=e[f]||[];const have=new Set(e[f].map(x=>nk(x.ref||x.source)));
    for(const v of list){v.ref=v.ref.replace(/^איש (?=אברבנאל על )/,'');if(!have.has(nk(v.ref))){e[f].push({ref:v.ref,text:v.text});have.add(nk(v.ref));log.push(s.n+' '+f+'+'+v.ref);}}}
  if(s.extra&&EXTRA[s.extra]&&!e.midrash.some(x=>nk(x.ref)===nk(EXTRA[s.extra].ref))){e.midrash.push(EXTRA[s.extra]);log.push(s.n+' extra '+s.extra);}
}
// אבים = אביה (מלכים א טו, ח מול דברי הימים ב יג, א): כינוי, לא ילד נוסף — אם ״אבים״ אינו ערך נפרד
const mb=P.data.find(x=>x.name==='מעכה בת אבישלום');if(mb&&!P.data.some(x=>x.name==='אבים')){mb.children=mb.children.filter(c=>c!=='אבים');const ab=P.data.find(x=>x.name==='אביה בן מעכה');if(ab&&!ab.aliases.includes('אבים')){ab.aliases.push('אבים');log.push('אבים → alias of אביה בן מעכה');}}
io.save(PF,P);console.log(log.join('\n'));
