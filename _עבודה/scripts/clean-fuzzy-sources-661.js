// 6.6.1 — הסרת מקורות ברטנורא/רש״י (6.6.0) שהוצמדו לפריט לפי דמיון כתיב בלבד (כוס/כיס): הדיבור המתחיל שבתחילת ההערה
// חייב להתאים לשם או לכינוי של הפריט (בתחיליות ו/ה/ב/ל ובסיומת רבים), אחרת המקור נמחק.
const fs=require('fs'),vm=require('vm');
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/<[^>]*>/g,' ').replace(/\(.*?\)/g,' ').replace(/[׳״'"]/g,'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
const stem=x=>x.replace(/^(וה|וב|ול|ו|ה|ב|ל)(?=[א-ת]{3})/,'').replace(/(ים|ין|ות|יות)$/,'');
const G={flora:['guides/flora/data/flora-data.js','midrash','source','note'],animal:['guides/animal/data/animal-data.js','midrash','source','note'],domem:['guides/domem/data/domem-data.js','makorot','ref','text']};
let rm=0,kept=0;
for(const [g,[f,field,rk,tk]] of Object.entries(G)){let t=fs.readFileSync(f,'utf8');
  const c={K:new Proxy({},{get:(_,k)=>k})};vm.runInNewContext(t.replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg,'this.$2 =').replace(/^const /mg,'var '),c);
  for(const e of c.DATA){const ok=new Set();[e.name,...(e.aliases||[])].forEach(n=>{const x=norm(n);ok.add(x);ok.add(stem(x));});
    for(const s of e[field]||[]){const r=s[rk]||'';if(!/^(ברטנורא על משנה|רש"י על)/.test(r))continue;const txt=s[tk]||'';if(/^לעז רש/.test(txt)||e.src==='bartenura-66'||e.src==='rashi-66')continue;
      const dh=norm(txt.split(/\.\s|\s–\s/)[0]);if(!dh)continue;if(ok.has(dh)||ok.has(stem(dh))){kept++;continue;}
      // מחיקת האובייקט מהטקסט
      const js=JSON.stringify({[rk]:s[rk],[tk]:s[tk]});const variants=[js+',',','+js,js];let done=false;for(const v of variants){const i=t.indexOf(v);if(i>=0){t=t.slice(0,i)+t.slice(i+v.length);done=true;break;}}
      if(done){rm++;console.log(g,e.name,'←',dh);}}}
  fs.writeFileSync(f,t);}
console.log({removed:rm,kept});
