# מסיר רקע לבן מאייקונים: רק פיקסלים כמעט-לבנים שמחוברים לשולי התמונה (flood fill),
# כך שלבן בתוך האייקון נשמר. שימוש: python3 remove-white-bg.py icon/cats/*.png
import sys
from collections import deque
from PIL import Image
done = 0
for p in sys.argv[1:]:
    im = Image.open(p).convert('RGBA'); w, h = im.size; px = im.load()
    white = lambda c: c[3] > 0 and min(c[:3]) >= 235
    corners = [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    seen = bytearray(w*h); q = deque()
    for x in range(w): q.extend([(x,0),(x,h-1)])
    for y in range(h): q.extend([(0,y),(w-1,y)])
    n = 0
    while q:
        x, y = q.popleft(); i = y*w+x
        if seen[i]: continue
        seen[i] = 1
        c = px[x,y]
        if c[3] == 0: pass                      # שקוף — עוברים דרכו (לבן שאינו נוגע בשוליים)
        elif not white(c): continue
        else: px[x,y] = (c[0],c[1],c[2],0); n += 1
        if x>0: q.append((x-1,y))
        if x<w-1: q.append((x+1,y))
        if y>0: q.append((x,y-1))
        if y<h-1: q.append((x,y+1))
    if n: im.save(p, optimize=True); done += 1; print('נוקה:', p, n)
print('סה״כ', done)
