// טעינה/שמירה של מערך DATA בקובצי guides/*/data/*-data.js, בשמירת הסגנון המקורי.
// שלושה סגנונות: שורה אחת (compact), JSON מעוצב (2 רווחים), ורשומה לשורה (people).
const fs=require('fs');
function load(f){
  const t=fs.readFileSync(f,'utf8');
  const s=t.indexOf('const DATA = ')+'const DATA = '.length;
  let end, style;
  const nl=t.indexOf('\n',s);
  if(t.slice(s,nl).trim().endsWith('];')||t.slice(s,nl).trim().endsWith(']')){end=t.lastIndexOf(']',nl)+1;style='compact';}
  else{end=t.indexOf('\n];',s)+2;style=t.slice(nl+1,nl+4)==='  {'?'pretty':'perline';}
  const src=t.slice(s,end);
  const data=JSON.parse(style==='perline'?src.replace(/,\s*\]$/,']'):src);
  const o={t,s,end,style,data,src};
  if(ser(o)!==src) o.roundtrip=false; else o.roundtrip=true;
  return o;
}
function ser(o){
  if(o.style==='compact')return JSON.stringify(o.data);
  if(o.style==='pretty')return JSON.stringify(o.data,null,2);
  // perline: לשחזר את הפרדת השורות המקורית
  const head=o.src.slice(0,o.src.indexOf('{'));
  const tail=o.src.slice(o.src.lastIndexOf('}')+1);
  return head+o.data.map(e=>JSON.stringify(e)).join(',\n')+tail;
}
function save(f,o){fs.writeFileSync(f,o.t.slice(0,o.s)+ser(o)+o.t.slice(o.end));}
module.exports={load,save};
// שמירה מקומית של רשומה אחת בקובץ מעוצב-מעורב: מחליף רק את טווח הטקסט של אותה רשומה
function replaceEntryPretty(f,oldName,entry){
  const t=fs.readFileSync(f,'utf8');
  const key=`"name": ${JSON.stringify(oldName)}`;
  const k=t.indexOf(key); if(k<0||t.indexOf(key,k+1)>=0) throw new Error('not unique '+oldName);
  let a=t.lastIndexOf('\n  {',k)+1;
  let d=0,i=a,inS=false;
  for(;i<t.length;i++){const c=t[i];if(inS){if(c==='\\')i++;else if(c==='"')inS=false;continue;}
    if(c==='"')inS=true;else if(c==='{')d++;else if(c==='}'){d--;if(!d){i++;break;}}}
  const body=JSON.stringify(entry,null,2).split('\n').map(l=>'  '+l).join('\n');
  fs.writeFileSync(f,t.slice(0,a)+body+t.slice(i));
}
module.exports.replaceEntryPretty=replaceEntryPretty;
