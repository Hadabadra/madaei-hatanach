// 6.4.2 — השלמה ל-6.4.1 (מתוך PR #329 של שיחה מקבילה): תמר, צרויה, בני זוג. מקורות: תנ״ך ומפרשים מספריית אוצריא.
const io=require('./data-io.js');const F='guides/people/data/people-data.js';const o=io.load(F);
const g=n=>{const e=o.data.find(x=>x.name===n);if(!e)throw new Error('missing '+n);return e;};
const add=(arr,v)=>{if(!arr.includes(v))arr.push(v);};
// #322 #324 — ילדי מעכה בת תלמי: אבשלום (שמואל ב ג, ג), תמר (רש״י שמואל ב יג, א: ״שהיתה בת אמו״)
const m=g('מעכה בת תלמי');add(m.children,'אבשלום בן דוד');add(m.children,'תמר');
if(!(m.midrash||[]).some(x=>x.ref==='רש"י על שמואל ב יג, א'))m.midrash.push({ref:'רש"י על שמואל ב יג, א',text:'וּלְאַבְשָׁלוֹם אָחוֹת יָפָה. שֶׁהָיְתָה בַּת אִמּוֹ:'});
// #325 — אמו של אבשלום (שמואל ב ג, ג)
g('אבשלום בן דוד').mother='מעכה בת תלמי';
// #323 — אביה: בנו של רחבעם ושל מעכה בת אבישלום (דברי הימים ב יא, כ–כב)
const a=g('אביה בן מעכה');a.father='רחבעם';a.mother='מעכה בת אבישלום';
add(g('רחבעם').children,'אביה בן מעכה');add(g('רחבעם').spouses,'מעכה בת אבישלום');
const mb=g('מעכה בת אבישלום');add(mb.children,'אביה בן מעכה');add(mb.spouses,'רחבעם');
// #326 — צרויה: אחות דוד (דברי הימים א ב, טז), אשה; ״אבשי״ הוא אבישי (אותו אדם)
const z=g('צרויה');z.gender='נ';add(z.siblings,'דוד');z.children=z.children.filter(c=>c!=='אבשי');
if(!z.verses.some(v=>v.ref==='דברי הימים א ב, טז'))z.verses.unshift({ref:'דברי הימים א ב, טז',text:'וְאַחְיֹתֵיהֶ֖ם צְרוּיָ֣ה וַאֲבִיגָ֑יִל וּבְנֵ֣י צְרוּיָ֗ה אַבְשַׁ֛י וְיוֹאָ֥ב וַעֲשָׂהאֵ֖ל שְׁלֹשָֽׁה׃'});
io.save(F,o);console.log('ok',o.roundtrip);
