// 6.3.0 — מראה מקום מקובץ בספריית אוצריא, בצורה ש-shell/refs.js (parseMidrashRef) יודע לפתוח.
const path=require('path');
const L=s=>String(s||'').replace(/^(דף|פרק|הלכה|פרשה|סימן)\s+/,'').trim();
function libRef(file,h2,h3,mark){h2=String(h2||'').replace(/\s+/g,' ').trim();h3=String(h3||'').replace(/\s+/g,' ').trim();if(!h2&&h3){h2=h3;h3='';}
  const b=path.basename(file,'.txt');
  if(file.includes('/תלמוד בבלי/'))return 'בבלי, '+b+' '+L(h2).replace(/\.$/,' ע"א').replace(/:$/,' ע"ב');
  if(file.includes('/תלמוד ירושלמי/'))return 'ירושלמי '+b.replace(/^תלמוד ירושלמי /,'')+' '+L(h2)+(h3?', '+L(h3):', א');
  if(file.includes('/משנה/'))return 'משנה, '+b.replace(/^משנה /,'')+' '+L(h2)+', '+(mark||'א');
  if(/ רבה$/.test(b))return b+', פרשה '+L(h2);
  if(/^פרק /.test(h2||''))return b+', פרק '+L(h2);
  return (b+' '+(h2||'')+(h3?' '+h3:'')).trim();
}
function heb(n){const a=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let s='';if(n%100===15){s='טו';n-=15}else if(n%100===16){s='טז';n-=16}let o='';for(const [v,c] of a)while(n>=v){o+=c;n-=v;}return o+s;}
module.exports={libRef};
