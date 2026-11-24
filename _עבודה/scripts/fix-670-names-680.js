// 6.8.0 — תיקון שמות של ערכים חדשים מ-6.7.0 (commentaries-items-670.js) שבהם הוסרה אות שורש כאילו היא אות שימוש
// (״בכפירים״ → ״פירים״). שינוי שם · מיזוג לערך קיים (המקור והכינוי עוברים) · מחיקה כשהזיהוי אינו ברור.
'use strict';
const fs=require('fs');const io=require('./data-io.js');
const G={flora:'guides/flora/data/flora-data.js',animal:'guides/animal/data/animal-data.js',domem:'guides/domem/data/domem-data.js',places:'guides/places/data/places.js'};
const RENAME={places:{'פירים':'כפירים','ספיא':'כספיא','שגב':'משגב','נית':'מנית','לנה':'כלנה','רוז':'מרוז','נחלמי':'נחלם'},domem:{'שיכלא':'משיכלא'}};
const MERGE={flora:{'סמת':['כוסמת','כסמת']},domem:{'דלח':['בדולח','בדלח']}};
const DROP={places:['פכת'],flora:['רנכי'],animal:['יונס']};const log=[];
for(const [g,f] of Object.entries(G)){
  // flora-data.js אינו JSON תקני (מפתחות בלי מרכאות) — עבודה על טקסט: כל ערך חדש של 6.7.0 הוא שורת JSON אחת
  let t=fs.readFileSync(f,'utf8');const lines=t.split('\n');
  const idx=n=>lines.findIndex(l=>l.startsWith('{"name":'+JSON.stringify(n)+',')&&l.includes('"src":"commentaries-670"'));
  for(const [a,b] of Object.entries(RENAME[g]||{})){const i=idx(a);if(i<0)continue;const o=JSON.parse(lines[i].replace(/,\s*$/,''));o.name=b;o.aliases=[...new Set([...(o.aliases||[]),...(g==='places'&&a==='נחלמי'?['הנחלמי']:[])])];lines[i]=JSON.stringify(o)+',';log.push(g+': '+a+' → '+b);}
  for(const a of DROP[g]||[]){const i=idx(a);if(i<0)continue;lines.splice(i,1);log.push(g+': נמחק '+a);}
  for(const [a,[to,al]] of Object.entries(MERGE[g]||{})){const i=idx(a);if(i<0)continue;const o=JSON.parse(lines[i].replace(/,\s*$/,''));lines.splice(i,1);
    t=lines.join('\n');const k=['{"name":'+JSON.stringify(to)+',','{name:'+JSON.stringify(to)+','].find(x=>t.includes(x));if(!k){log.push(g+': לא נמצא '+to);continue;}
    const at=t.indexOf(k);const field=g==='domem'?'makorot':'midrash';const src=(o[field]||[]).filter(s=>/ על /.test(s.ref||s.source));
    const seg=t.slice(at,t.indexOf('\n{',at+3));const fk=seg.search(new RegExp('"?'+field+'"?\\s*:\\s*\\['));
    const ins=src.map(s=>JSON.stringify(s)).join(',');
    if(fk>=0){const br=t.indexOf('[',at+fk)+1;t=t.slice(0,br)+ins+(/^\s*\]/.test(t.slice(br))?'':',')+t.slice(br);}
    const ak=t.indexOf('aliases',at);const abr=t.indexOf('[',ak)+1;if(ak>0&&ak<at+seg.length)t=t.slice(0,abr)+JSON.stringify(al)+(/^\s*\]/.test(t.slice(abr))?'':',')+t.slice(abr);
    lines.length=0;lines.push(...t.split('\n'));log.push(g+': '+a+' אוחד עם '+to+' (+כינוי '+al+', '+src.length+' מקורות)');}
  fs.writeFileSync(f,lines.join('\n'));}
console.log(log.join('\n'));
