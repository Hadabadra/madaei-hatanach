# 6.5.0 — החלת הצעות עריכה מ-Issues פתוחים (אישים בתנ״ך / מקומות): שינויי שדות + מקורות חסרים.
# python3 edit-suggestions-65.py <issues.json>  → מדפיס JSON של פעולות לכל Issue (נצרך ע״י apply-edit-suggestions-65.js)
import json,re,sys
I=json.load(open(sys.argv[1],encoding='utf8'))
REF=r'((?:בבלי, )?(?:[א-ת"\']+ ){0,4}[א-ת"\']+ [א-ת]{1,3}(?:, [א-ת]{1,3}|[.:]))\s*\|\s*'
out=[]
for i in I:
    b=re.sub(r'\s+',' ',i['body'].replace('**',''))
    m=re.search(r'הצעת עריכה:\s*([^•\n*]+?)\s*(?:•|\* מדריך)',b) or re.search(r'הצעת עריכה — (.+?) \(',i['title'])
    if not m: continue
    name=m.group(1).strip(); guide='places' if 'מקומות' in b[:400] else 'people'
    ch={}
    for k,f in [('כינויים','aliases'),('בני/בנות זוג','spouses'),('ילדים','children')]:
        mm=re.search(re.escape(k)+r':\s*(.+?)\s*←\s*(.+?)(?=\s*(?:\*|•|מקורות|---|$))',b)
        if mm: ch[f]=[x.strip() for x in re.split(r',\s*',mm.group(2)) if x.strip() and x.strip()!='—']
    def sect(a,stops):
        s=b.find(a)
        if s<0: return []
        s+=len(a); e=min([x for x in (b.find(t,s) for t in stops) if x>=0] or [len(b)])
        t=b[s:e]; pos=[(mm.start(),mm.end(),mm.group(1)) for mm in re.finditer(REF,t)]
        return [{'ref':r,'text':t[e1:(pos[j+1][0] if j+1<len(pos) else len(t))].strip(' :')} for j,(s1,e1,r) in enumerate(pos)]
    verses=sect('מקורות בתנ״ך:',['מקורות חז״ל:','מקורות נוספים:','---'])
    mid=sect('מקורות חז״ל:',['מקורות נוספים:','---'])
    extra=re.search(r'מקורות נוספים:\s*(.+?)\s*---',b)
    out.append({'n':i['number'],'name':name,'guide':guide,'changes':ch,'verses':verses,'midrash':mid,'extra':extra.group(1) if extra else '','image':'תמונה:' in b})
json.dump(out,sys.stdout,ensure_ascii=False,indent=0)
