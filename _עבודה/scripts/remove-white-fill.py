# מסיר גם "דף" לבן סגור בתוך מסגרת האייקון: כל רכיב קשירות כמעט-לבן (>=240)
# שגודלו מעל 2% מהתמונה הופך שקוף. נקודות הברק הקטנות בזהב נשמרות.
import sys
from collections import deque
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p).convert('RGBA'); w, h = im.size; px = im.load()
    wh = lambda c: c[3] > 0 and min(c[:3]) >= 240
    seen = bytearray(w*h); total = 0
    for sy in range(h):
        for sx in range(w):
            if seen[sy*w+sx] or not wh(px[sx,sy]): continue
            comp = []; q = deque([(sx,sy)]); seen[sy*w+sx] = 1
            while q:
                x, y = q.popleft(); comp.append((x,y))
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx] and wh(px[nx,ny]):
                        seen[ny*w+nx] = 1; q.append((nx,ny))
            if len(comp) > w*h*0.02:
                for x, y in comp: c = px[x,y]; px[x,y] = (c[0],c[1],c[2],0)
                total += len(comp)
    im.save(p, optimize=True); print(p, total)
