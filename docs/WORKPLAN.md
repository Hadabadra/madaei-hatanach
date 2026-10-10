# תוכנית עבודה חסכונית — כלי מערכת (נכון ל-10.10.2026)

מטרת הקובץ: שכל סשן יתחיל מכאן בלי לסרוק את הריפו. **לקרוא רק את הקובץ הזה** ואת הקבצים שמצוינים בשלב הנוכחי.
ידע קבוע שנמצא בעבודה (SDK, גשר, כללים): [KNOWLEDGE.md](KNOWLEDGE.md) — לקרוא את הסעיף הרלוונטי בלבד, ולהוסיף לשם כל עובדה חדשה.

## כללי חיסכון (לכל סשן)
- בלי סוכנים, בלי צילומי מסך, בלי playwright. כותבים קוד ישירות.
- לא לקרוא קבצים שלמים: `grep -n` לשמות פונקציות, ואז `sed -n 'A,Bp'` לטווח הדרוש בלבד.
- קבצים גדולים/ספריות (pdf.js, jszip) מעתיקים ב-`cp`, לא קוראים.
- בדיקות: רק `node --check` על קבצי JS, וקומפילציה ב-CI. לא יותר מ-2 סבבי תיקון CI לסשן; אם עדיין אדום — לעצור ולרשום כאן.
- בסוף כל שלב: קומיט (author/committer = `Claude <noreply@anthropic.com>`), דחיפה לענף `כלי-מערכת` בלבד, סימון ✅ בקובץ הזה.
- בלי גרש ASCII בודד בהערות JS. לא נוגעים ב-`main` וב-`.github/workflows` של main. לא מפרסמים לחנות.

## מה כבר קיים (מעודכן — STATUS.md ישן בנקודה זו)
| רכיב | מצב |
|---|---|
| `system-settings/` | גמור (נבדק רק מול גשר מדומה) |
| `file-explorer/` | ליבה גמורה (שלב 2): `index.html`, `js/app.js`, `css/fx.css` + הקבצים הקודמים |
| גשר | נכתב ב-`bridge/` (שלב 1). חוזה: `docs/BRIDGE_API.md` |
| צופה PDF | ריפו נפרד `e0548433917-gif/pdf-viewer`: `index.html` (1649 שורות) + `vendor/` (pdf.js, jszip, tesseract, UTIF) |

## עובדות מה-SDK (נמצאו בצופה ה-PDF — לא לחפש שוב)
- כפתור בסרגל הקורא: `contributes.startup.toolbarItems[{id,type:"button",title,icon,contexts:[...],openPlugin}]` + הרשאות `reader.toolbar`, `app.startup_contributions`, `app.run_on_startup`; אירוע `Otzaria.on('reader.toolbar_item_clicked', fn)`.
  ה-context שידוע: `reader-pdf`. לספרי טקסט — לנסות `reader-text` (לא אומת).
- קריאות: `Otzaria.call('storage.get'|'storage.set'|'notifications.showInApp'|'library.getBookContent'|'reader.addContextMenuItem')`.
- **לא ידוע:** קריאה שפותחת קובץ חיצוני (txt/docx) בתוך אוצריא או פותחת תוסף אחר עם פרמטר. → שאלה פתוחה 1.

## שלבים

### שלב 1 — הגשר (סשן 1)  ✅
קבצים: `bridge/OtzariaBridge.csproj`, `bridge/Program.cs`, `bridge/Server.cs` (Kestrel + middleware כותרות/Origin + מעטפת תשובה), `bridge/FsApi.cs`, `bridge/SysApi.cs`, `bridge/Kiosk.cs`, `bridge/Installer.cs`, `bridge/Tray.cs`, `.github/workflows/bridge.yml` (בענף הזה בלבד, `windows-latest`, `dotnet publish -r win-x64 --self-contained -p:PublishSingleFile=true`, העלאת artifact + Release עם תג `bridge-v*`).
- לקרוא מהחוזה רק את הטבלה של הקבוצה שכותבים כרגע (`grep -n '^## '` ואז `sed`).
- **התקנה (`--install`)**: מעתיק את עצמו ל-`%LOCALAPPDATA%\OtzariaBridge`, HKCU Run, **קיצור דרך בשולחן העבודה** "גשר אוצריא" (WScript.Shell דרך COM), ומתקין את שני התוספים ששמורים כמשאבים מוטמעים (`.otzplugin` שנארזים ב-CI מ-`system-settings/` ו-`file-explorer/`) — ראו שאלה פתוחה 2.
- מערכת (`/sys/*`): שמע דרך Core Audio COM, בהירות WMI, Wi-Fi דרך `netsh wlan`, רדיו/בלוטות׳ דרך `Windows.Devices.Radios` (TFM `net8.0-windows10.0.19041.0`). מה שלא נתמך מחזיר `unsupported`.
- נעילה קפדנית (החלפת Shell): **כבויה כברירת מחדל**, מאחורי הגדרה מפורשת.
- הערכה: פלט ~25–35K, + סבב/שניים של CI ~10–15K.
- **בוצע (11.10)**: CI ירוק בסבב הראשון (קומפילציה מקומית עם ‎.NET 8‏ + `EnableWindowsTargeting`). הערות לשלבים הבאים:
  - שורת hit בחיפוש: `{type:"hit", entryType:"dir"|"file", ...}` — תואם ל-`bridge.js`.
  - נעילה קפדנית: המעטפת (HKCU Winlogon Shell) היא הגשר עצמו עם `--background`, והוא מפעיל את אוצריא. נדרש `strict:true` מפורש ב-`/kiosk/enable`.
  - ה-exe דחוס, כ-89MB (ASP.NET + WinForms + WinRT). Release נוצר רק בדחיפת תג `bridge-v*`; עדיין לא נדחף תג.
  - לא נבדק על Windows אמיתי: Wi-Fi דרך netsh, IPolicyConfig (החלפת התקן שמע), בלוטות׳, hook מקלדת.

### שלב 2 — סייר הקבצים, ליבה (סשן 2)  ✅
- `file-explorer/index.html` + `js/app.js`: עץ/נתיב, רשימה, בחירה מרובה, העתק/גזור/הדבק, מחיקה, שינוי שם, תיקייה/קובץ חדש, חיפוש זורם, מעבר אוטומטי למצב חלופי (`fallback.js`) כשאין גשר.
- לפני כתיבה: `grep -n` על `bridge.js`/`fallback.js`/`ui.js` כדי לראות את ממשק הספקים (לא לקרוא אותם במלואם).
- **קישור להורדת הגשר** בשני התוספים (באנר כשאין גשר): כפתור "פתח בדפדפן" (`app.open_url`) + "העתק קישור". קישור: עמוד ה-Releases של הענף (`bridge-v*`).
- הערכה: פלט ~12–18K.
- **בוצע (11.10)**: `index.html`, `js/app.js`, `css/fx.css` (רק טוקנים ו-em). הערות לשלב 3:
  - `ui.js` בסייר הוא עותק של הגדרות מערכת ומוגדר כ-`SS.ui`; `app.js` מציב `FX.ui = SS.ui`. אייקונים בסייר — `FX.icon`.
  - פתיחה (`openEntry` ב-`app.js`): תיקייה → ניווט; טקסט/תמונה → `preview()`; אחר → `/fs/open`. בשלב 3 להוסיף כאן PDF ו-Word לפני ה-`open`.
  - הקישור לגשר: `FX.BRIDGE_URL` / `SS.BRIDGE_URL` = עמוד Releases מסונן ל-`bridge-v`. בהגדרות מערכת נוסף "העתק קישור" במסך שאין בו גשר.
  - לא אומת: שמות ההרשאות למצב החלופי (שינוי שם/מחיקה/`storage`) — במניפסט יש רק `fs.user_files.read`.

### שלב 3 — פתיחת קבצים + כפתור + בקורא (סשן 3)  ✅
- **PDF**: להעתיק `vendor/pdf.min.js`, `pdf.worker.min.js` מהריפו pdf-viewer ל-`file-explorer/vendor/`, ולכתוב צופה מינימלי (`js/viewer-pdf.js`, ~150 שורות) — **לא** להעתיק את כל ה-1649 שורות; OCR לא נכלל (מי שרוצה OCR — כפתור "פתח בצופה PDF+OCR"). קריאת הקובץ: `/fs/read` (base64).
- **טקסט**: פתיחה באוצריא — תלוי בשאלה 1. גיבוי: תצוגה פנימית פשוטה.
- **Word**: ברירת מחדל = תוסף וורד לאוצריא (תלוי בשאלה 1), חלופה בהגדרות = תצוגה פנימית בשני טורים (`js/viewer-docx.js`, jszip + המרת `document.xml` לפסקאות, ~150 שורות). הגדרה ב-`storage` במפתח `fx.wordMode`.
- **כפתור + בקורא**: `toolbarItems` ב-manifest של הסייר (`id: chadbedera-fx-new-doc`, `icon: add_24_regular`, `openPlugin: true`), והאזנה ב-`app.js` שפותחת דיאלוג "מסמך חדש" (שם + תיקייה → `/fs/write-text`).
- הערכה: קלט ~10K, פלט ~10–15K.
- **בוצע (11.10)**: `js/viewers.js` — צופה טקסט פנימי (פעיל), צופה PDF מינימלי ותצוגת Word בטור/שני טורים (כתובים, מופעלים רק אם `pdfjsLib`/`JSZip` קיימים). כפתור + בקורא (`chadbedera-fx-new-doc`) → דיאלוג מסמך חדש. הרשאות נוספו במניפסט.
  - pdf.js 3.11.174 ו-jszip הועתקו מ-pdf-viewer ל-`file-explorer/vendor/` (באישור). מסך הגדרות (⚙ בסרגל העליון, `fx.options` ב-localStorage): לכל סוג — צופה פנימי או יישום חיצוני; Word בטור/שני טורים; שפה.
  - נוספה תמיכה באנגלית: `js/i18n.js` (משותף) + `js/lang-en.js` בכל תוסף; מתג בסרגל העליון, זיהוי `app.getLocale`. בגשר: `bridge/Lang.cs`, מגש → English, `--lang en`.

### שלב 4 — סיום (סשן 3, בסוף)  ✅ (חוץ מפרסום לחנות)
- עדכון `docs/STATUS.md` (ושורה ב-WIP.md / מחיקתו), גרסאות ב-manifest.
- **לא** לפרסם לחנות עד אישור.
- **בוצע (11.10)**: WIP.md נמחק, הגדרות מערכת 1.1.0, סייר 1.0.0. ‏CI: ולידציה של שני התוספים (0 שגיאות), צילומי מסך לסייר נוצרים ב-CI (`tools/screens/fx-demo.js`), Release בטא בתג `bridge-v*` עם ה-exe ושני ה-`.otzplugin`.
  - פרסום לחנות: מוכן אבל **ידני** (Actions → Run workflow → store) — הוחלט לא לפרסם אוטומטית לפני בדיקה על Windows אמיתי ובדיקת אבטחה לנעילה, כפי שהתבקש בפורום (נושא 2673).

## החלטות (נבדקו מול docs/תאימות-SDK-אוצריא.md בענף main)
1. **אין API ידוע** לפתיחת קובץ מקומי באוצריא או לפתיחת תוסף אחר עם קובץ (`plugin.openSelf({param})` פותח רק את התוסף עצמו). לכן בגרסה 1: טקסט ו-Word מוצגים בתוך הסייר; Word כברירת מחדל בשני טורים. ההגדרה `fx.wordMode` נשארת לעתיד, אם יתווסף API.
2. **אין התקנה שקטה של תוספים** (ההתקנה רושמת הרשאות ב-DB של אוצריא). הגשר מכיל את שני קובצי `.otzplugin` כמשאב, פורס אותם ל-`%LOCALAPPDATA%\OtzariaBridge\plugins` ופותח את התיקייה, והמשתמש מתקין מתוך אוצריא.
3. כפתור + : `toolbarItems` **בלי `contexts`** (מופיע בכל קורא). הרשאות נדרשות במניפסט הסייר: `reader.toolbar`, `app.startup_contributions`, `navigation.write`. בלי `app.run_on_startup` (הוסר ב-0.9.98).
4. החנות דוחה הרשאה חסרה, ותגית "מראה תואם" רק עם 0 הערות עיצוב: צבעים רק כטוקנים ב-`:root`, גדלים ב-em.

## סיכום הערכה
סה״כ פלט ~60–80K טוקנים בשלושה סשנים. הסיכון העיקרי בעלות: סבבי תיקון בקומפילציית C# (ללא Windows מקומי).
