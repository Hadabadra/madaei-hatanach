// 6.6.0 — אישים בתנ״ך: ילד שרשום בערך של הורה (children) ואין לו אב/אם — משלימים את ההורה לפי מין ההורה. רק שדה ריק; לא דורסים.
const io=require('./data-io.js');const F='guides/people/data/people-data.js';const o=io.load(F);
const by=new Map();o.data.forEach(e=>by.set(e.name,e));let f=0,m=0;
for(const p of o.data)for(const cn of p.children||[]){const c=by.get(cn);if(!c)continue;
  if(p.gender==='ז'&&!c.father){c.father=p.name;f++;}else if(p.gender==='נ'&&!c.mother){c.mother=p.name;m++;}}
io.save(F,o);console.log({fatherSet:f,motherSet:m});
