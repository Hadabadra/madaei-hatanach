// 6.3.0 — ערכים שנוספו מערכין (src:'arachin-62'): midrash מקוצר לשני מקורות. הרשימה המלאה לפי דף — בהקשר ״חכמי המסכת״.
const io=require('./data-io.js');const F='guides/amoraim/data/amoraim-data.js';
const o=io.load(F);let n=0,cut=0;
for(const e of o.data){if(e.src!=='arachin-62'||!Array.isArray(e.midrash)||e.midrash.length<=2)continue;cut+=e.midrash.length-2;e.midrash=e.midrash.slice(0,2);n++;}
io.save(F,o);console.log('trimmed entries',n,'removed refs',cut);
