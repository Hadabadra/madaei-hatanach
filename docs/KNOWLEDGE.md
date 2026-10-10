# ידע מצטבר — כלי מערכת לאוצריא

קובץ ידע קבוע: עובדות שנמצאו בעבודה ואין צורך לחפש אותן שוב. מעדכנים בכל סשן שמגלה משהו חדש.
מצב השלבים ב-[WORKPLAN.md](WORKPLAN.md), מצב כללי ב-[STATUS.md](STATUS.md), חוזה הגשר ב-[BRIDGE_API.md](BRIDGE_API.md).

## אוצריא — SDK וחנות
- **הרשאות:** החנות דוחה תוסף עם הרשאה חסרה. כל קריאה ל-`Otzaria.call` צריכה הרשאה מתאימה במניפסט.
- **תגית "מראה תואם":** ניתנת רק עם 0 הערות עיצוב. צבעים רק כטוקנים ב-`:root`, גדלים ב-em.
- **`app.run_on_startup`:** הוסר בגרסה 0.9.98, ולכן לא משתמשים בו.
- **כפתור בסרגל הקורא:**
  - `contributes.startup.toolbarItems[{id,type:"button",title,icon,openPlugin}]`, עם ההרשאות `reader.toolbar` ו-`app.startup_contributions`.
  - האירוע: `Otzaria.on('reader.toolbar_item_clicked', fn)`.
  - בלי `contexts` הכפתור מופיע בכל קורא. ה-context הידוע הוא `reader-pdf`.
- **קריאות שאומתו:** `storage.get`, `storage.set`, `notifications.showInApp`, `library.getBookContent`, `reader.addContextMenuItem`, `app.open_url`, `network.fetchStream`.
- **אין API ידוע לשלושה דברים:**
  - פתיחת קובץ מקומי באוצריא;
  - פתיחת תוסף אחר עם פרמטר (`plugin.openSelf({param})` פותח רק את התוסף עצמו);
  - התקנה שקטה של תוסף (ההתקנה רושמת הרשאות ב-DB של אוצריא). המשתמש מתקין קובץ `.otzplugin` מתוך אוצריא.
- **תקשורת עם תוכנה מקומית:** דרך `network.fetchStream` עם ההרשאה `network.localhost`, ובמניפסט `network.allowlist: ["127.0.0.1","localhost"]`.
- **מקור מלא לתאימות:** `docs/תאימות-SDK-אוצריא.md` בענף main.

## הגשר (bridge/)
- **טכנולוגיה:**
  - C#/.NET 8 עם TFM ‏`net8.0-windows10.0.19041.0`;
  - Kestrel עם `FrameworkReference Microsoft.AspNetCore.App`;
  - WinForms למגש;
  - `System.Management` ל-WMI.
- **קבצים:**

  | קובץ | תפקיד |
  |---|---|
  | `Program.cs` | ארגומנטים, Config, הרצת תהליכים |
  | `Server.cs` | מעטפת תשובה, מיפוי שגיאות, עזרי JSON |
  | `FsApi.cs` | נקודות הקצה של `/fs` |
  | `SysApi.cs` | Wi-Fi, שמע ונקודות הקצה של `/sys` |
  | `Kiosk.cs` | נעילה |
  | `Installer.cs` | התקנה והסרה |
  | `Tray.cs` | אייקון במגש |

- **ארגומנטים:**
  - `--install`;
  - `--background`;
  - `--portable` (הרצה בלי התקנה);
  - `--uninstall [--password X]`;
  - `--unlock <קוד שחזור>`.
- **קומפילציה מקומית בלי Windows:**
  1. להתקין .NET 8 SDK עם `dotnet-install.sh --channel 8.0`.
  2. להריץ `dotnet build -c Release -r win-x64`.
  3. `EnableWindowsTargeting` כבר מוגדר בקובץ csproj.

  כך נמנעים סבבי CI.
- **CI:**
  - `.github/workflows/bridge.yml` בענף הזה בלבד, על `windows-latest`.
  - אורז את `system-settings/` ואת `file-explorer/` לקובצי `.otzplugin` בתוך `bridge/plugins/`. התיקייה ב-gitignore, ומשם הקבצים מוטמעים כמשאב.
  - artifact נוצר בכל דחיפה. Release נוצר רק בתג `bridge-v*`.
- **גודל ה-exe:** כ-89MB, עם `EnableCompressionInSingleFile`. אי אפשר לבצע trimming, כי הגשר משתמש ב-WinForms.
- **שורת hit בחיפוש:** `{type:"hit", entryType:"dir"|"file", name, path, size, modified}`. ב-`bridge.js` הקוד כבר קורא את `entryType`.
- **Wi-Fi דרך netsh:**
  - מריצים `chcp 65001` כדי שהפלט יגיע ב-UTF-8.
  - הפענוח לא תלוי בשפת המערכת: שורות `SSID n :`, אחוז האות לפי `NN%`, וסוג האימות בשורה השנייה של כל גוש. ערכי האימות (Open, WPA2...) באנגלית בכל שפה.
- **שמע:** Core Audio COM. החלפת ההתקן המוגדר כברירת מחדל נעשית דרך הממשק הלא מתועד `IPolicyConfig`. אם נכשל, מחזירים `unsupported`.
- **נעילה:**
  - נעילה רכה: הגשר סוגר את explorer שוב ושוב כל 2 שניות, מתקין hook מקלדת על החוט של המגש, ומחזיר את אוצריא לחזית.
  - נעילה קפדנית: מחליפה את ה-Shell ב-HKCU לגשר עצמו עם `--background`, והגשר מפעיל את אוצריא. כבויה כברירת מחדל, ונדרש `strict:true` מפורש.
  - קוד השחזור (12 תווים) מוצג פעם אחת בלבד, בהגדרת הסיסמה הראשונה.
- **לא נבדק עדיין על Windows אמיתי:** Wi-Fi, בלוטות׳, `IPolicyConfig`, hook המקלדת, קיצור הדרך בשולחן העבודה.

## כללי עבודה (לכל התוספים)
- **קומיטים:** author ו-committer רק `Claude <noreply@anthropic.com>`.
- **דרך העבודה:**
  - בלי סוכנים, בלי צילומי מסך, בלי playwright;
  - `grep -n` ואחריו `sed` לטווח הדרוש, במקום לקרוא קבצים שלמים;
  - עד 2 סבבי תיקון CI.
- **הערות JS:** בלי גרש ASCII בודד.
- **פרסום:** לא מפרסמים לחנות בלי אישור.
- **שמירת ידע:** פרטים חשובים נשמרים בזיכרון של Claude. הידע הטכני נשמר כאן, בגיט.
