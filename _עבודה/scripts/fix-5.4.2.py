import re,json,sys
def edit(f,old,new,count=1):
    s=open(f,encoding='utf8').read(); n=s.count(old)
    assert n==count, (f,old[:60],n)
    open(f,'w',encoding='utf8').write(s.replace(old,new)); print('ok',f)
# 175 כלב ים
edit('guides/animal/data/animal-data.js',
 "כדוגמה ל'הולך על כפיו' טהור, ומזוהה על פי שמו עם כלב-הים",
 "כדוגמה ל'הולך על כפיו' טהור (אין עורו מקבל טומאה), ומזוהה על פי שמו עם כלב-הים")
# 176 אהליבה — סימון כמשל
edit('guides/people/data/people-data.js',
 '"name":"אהליבה","cat":"yechezkel","aliases":[],"gender":"ז","father":"","mother":"","spouses":[],"children":[],"siblings":[],"roles":[],"tribe":"","birthPlace":"","dwelling":"","deathPlace":"","burialPlace":"","age":"","note":""',
 '"name":"אהליבה","cat":"yechezkel","aliases":[],"gender":"","father":"","mother":"","spouses":[],"children":[],"siblings":[],"roles":["משל — אינה אדם"],"tribe":"","birthPlace":"","dwelling":"","deathPlace":"","burialPlace":"","age":"","note":"משל ולא אדם: כינוי לירושלים — מלכות יהודה (יחזקאל כג, ד), ואחותה אהלה — שומרון, מלכות ישראל"')
# 178 לשכת הגזית — הסרת התמונה
f='guides/beithamikdash/data/beithamikdash-data.js'; s=open(f,encoding='utf8').read()
s2,n=re.subn(r',"img":"beithamikdash:לשכת הגזית \(מושב הסנהדרין\)","credit":"[^"]*"','',s); assert n==1
open(f,'w',encoding='utf8').write(s2); print('ok',f)
f='guides/beithamikdash/data/beithamikdash-data-images.js'; s=open(f,encoding='utf8').read()
s2,n=re.subn(r'\n"beithamikdash:לשכת הגזית \(מושב הסנהדרין\)":"data:[^"]*",?','',s); assert n==1
open(f,'w',encoding='utf8').write(s2); print('ok',f)
# 182 יעקב — מקום קבורה
f='guides/people/data/people-data.js'; s=open(f,encoding='utf8').read()
old='"note":"נשלח על ידי אביו ואמו לפדן ארם'
i=s.index('"id":"p0171"'); j=s.index(old,i)
seg=s[i:j]; assert seg.count('"burialPlace":""')==1
s=s[:i]+seg.replace('"burialPlace":""','"burialPlace":"מערת המכפלה (בראשית נ, יג)"')+s[j:]
open(f,'w',encoding='utf8').write(s); print('ok jacob')
