# מה אפשר להוסיף מ-SDK של אוצריא 0.9.97–0.9.98 (סריקה 11.10.2026)

מקור: `Otzaria/otzaria` ענף `dev`, ‏`docs/plugin-sdk/spec.json` + `API_REFERENCE.md` (6000 שורות).
המפרט: 58 הרשאות, 160 קריאות, 28 אירועים. כאן רק מה שרלוונטי לכלי המערכת ולצופה ה-PDF, לפי סדר עדיפות.

## הרשאות בסיס (לא צריך להצהיר)
`app.info.read` (כולל `app.getLocale`, `app.getTheme`, `fonts.listInstalled`, `plugin.listInstalled`), `plugin.storage.read/write`, `ui.feedback`, `notifications.send`, `events.subscribe:theme.changed`. ‏`feedback.report` ‏(0.9.97) — בלי הרשאה, עם דיאלוג אישור של אוצריא.

## תוקן מיד
- **סייר: חסרה `fs.user_files.write`** — "שמירת עותק" במצב בלי גשר קוראת ל-`fs.beginBinaryWrite`/`fs.commitUserFileWrite`. הוולידטור לא תפס, כי הקריאה עוברת דרך `FX.callHost(...)` ולא דרך `Otzaria.call('...')`. נוסף ב-0.0.2.

## עדיפות גבוהה
| יכולת | קריאה / הרשאה / גרסה | לאן |
|---|---|---|
| פתיחת קובץ בתוסף אחר עם פרמטר | `plugin.openOther` · `plugin.open_other` · 0.9.97; היעד מקבל `plugin.page_opened` עם `openedBy` + `param` | סייר → "פתח בצופה PDF+OCR". דורש שהצופה יקבל את הקובץ: ב-param ‏`{ name, url }` מ-`fs.resolveFileUrl` (מצב בלי גשר), או בייטים base64 בקובץ קטן. **פותר את שאלה פתוחה 1 בחלקה.** |
| קובץ שמאחורי ספר בספרייה | `library.openBookFile` · `library.content.read` · 0.9.98 → `{ token, url, name, size }` | צופה PDF: לפתוח ספרי PDF/DOCX של הספרייה ישירות, בלי העתקה. |
| הדפסה וייצוא PDF של דף התוסף | `ui.print`, `ui.exportPdf` · בלי הרשאה · 0.9.97 | צופה Word/טקסט בסייר; תוצאת OCR בצופה ה-PDF. |
| קיצורי מקלדת גלובליים | `app.registerShortcut` + אירוע `app.command` · `app.shortcuts` · 0.9.97 | סייר: Ctrl+Shift+E לפתיחה; צופה PDF: OCR לעמוד. |
| קיצור דרך בשולחן העבודה לתוסף | `shortcut.create` · `ui.create_shortcut` · 0.9.94 | סייר/הגדרות: כפתור בהגדרות (משלים את קיצור הדרך של הגשר). |
| שינוי שפה חי | אירוע `settings.changed` · `events.subscribe:settings.changed` | שני התוספים: להחליף שפה בלי טעינה מחדש כשמשנים שפה באוצריא. |

## עדיפות בינונית
- **ספרים מתוסף בחיפוש הספרייה** — `library.setProviderBooks` + `contributes.startup.libraryBooks` + אירוע `library.providerBook.openRequested` · `library.books.provide` · 0.9.98. אפשר להציג קובצי PDF/Word מתיקיות שהמשתמש בחר כ"ספרים" במסך הספרייה, והלחיצה תפתח אותם בצופה/בסייר.
- **קורא טקסט ברירת מחדל** — `reader.setDefaultTextReader` / `reader.getDefaultTextReader` / `reader.reportTextReaderLocation` · `reader.open` · 0.9.98. לבדוק אם תוסף יכול להירשם כקורא חלופי (רלוונטי לצופה ה-Word).
- **סימון "יש שינויים שלא נשמרו"** — `ui.setUnsavedChanges` · 0.9.97. לעורך טקסט עתידי בסייר.
- **מצב רשת** — `app.getConnectivity` · 0.9.96. להסתיר את "פתח בדפדפן" כשאין אינטרנט, ולהשאיר "העתק קישור".
- **גופנים מותקנים** — `fonts.listInstalled` · 0.9.97. לצופה ה-Word: גופן תואם למסמך.
- **מעקב אחרי הרשאות** — `app.getGrantedPermissions` + `events.subscribe:plugin.permissions_changed`. הודעה ברורה כשמשתמש כיבה הרשאה, במקום "לא קורה כלום".

## מערכת קבצים של אוצריא (0.9.97–0.9.98) — למצב בלי גשר
`fs.moveEntry`, `fs.deleteFolder` (0.9.98), `fs.listDir`, `fs.makeDir`, `fs.stat`, `fs.readFile`, `fs.writeFile`, `fs.deleteEntry` (0.9.97). לבדוק אם הן פועלות על תיקיות המשתמש שאושרו (`fs.pickUserFolder`). אם כן — אפשר לאפשר במצב החלופי יצירת תיקייה וקובץ והעתקה, בלי גשר.

## מראה
- `app.getTheme` + `theme.changed` — כבר בשימוש. טוקנים בלבד ב-`:root`, `font-family` רק `var(--font-*)`, `font-size`/`border-radius` בלי px (חוץ מסלקטור פס הכותרת). שני התוספים: 0 הערות עיצוב.
- `fonts.resolveFamilies` — לטעון את גופן הקריאה של המשתמש לצופים הפנימיים.
