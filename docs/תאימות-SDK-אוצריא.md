# תאימות ל-SDK של אוצריא — ביקורת מלאה (19/08/2026)

נכתב אחרי קריאה מלאה של `docs/plugin-sdk/` באוצריא (README, API_REFERENCE,
DESIGN_GUIDE, `otzaria_plugin.d.ts`) **ואימות מול קוד המקור עצמו** בענף `dev`
(`lib/plugins/...`), לא רק מול התיעוד. כל ממצא כאן מסומן במקור שממנו הוא נובע.

מקור-האמת לאכיפה, לפי סדר:

| מה | קובץ באוצריא |
|---|---|
| רשימת ההרשאות החוקיות | `lib/plugins/models/plugin_valid_permissions.dart` |
| ולידציית מניפסט (חוסמת) | `lib/plugins/services/plugin_manifest_validator.dart` |
| ולידציה מורחבת (סריקת קוד, גרסאות, `contributes.startup`) | `lib/plugins/services/plugin_extended_validator.dart` |
| רישום התרומות הדקלרטיביות בזמן ריצה | `lib/plugins/services/plugin_startup_contributions_service.dart` |
| שמירת ההרשאות בהתקנה | `lib/plugins/services/plugin_installer_service.dart` |
| אכיפת רשת ב-WebView | `lib/plugins/view/plugin_tab_page.dart` + `plugin_network_access_resolver.dart` |
| ה-allowlist הרשמי | `plugin_network_allowlist.txt` בשורש הריפו, ענף `dev` |

---

> 📌 **עדכון 06/09/2026 — הפיצול לשתי חבילות בוטל (3.7.0).**
> אוצריא 0.9.97+769 שוחררה ב-6.9.26. uild/pack-997-variant.ps1 נמחק, וכל
> ה-overlay שלו נכנס ל-manifest.json של חבילת הבסיס: minAppVersion: 0.9.97,
> 
eader.toolbar, pp.startup_contributions ו-contributes.startup
> (contextMenuItems + 	oolbarItems + ctivationEvents). המשמעות לסעיפים
> שלמטה: **§א.1 — הפתרון של "בסיס בלי הסעיף, וריאנט אִתו" אינו רלוונטי יותר**,
> ו-**§ב.4 (״מה יקרה ב-0.9.98״) בוצע מראש** — הרצפה כבר 0.9.97, ולכן מחיקת
> מסלול הטעינה-בעלייה ב-0.9.98 לא תפגע ברישום פריט תפריט ההקשר.
> ⚠️ **§ב.2 נפתח**: הטיעון ״
etwork.fetchStream הוא API של 0.9.97 והמחרוזת
> תחסום אריזה עם minAppVersion: 0.9.96״ בטל — אפשר לקרוא ישירות. ר׳ [#47](https://github.com/Hadabadra/madaei-hatanach/issues/47).
> ⚠️ הביקורת הזו נכתבה מול התיעוד של 19–28/08. מאז היו **8 עדכוני SDK**
> (25/08–05/09) שסעיף ג׳ אינו מכיר — הרשימה המלאה ב-[#100](https://github.com/Hadabadra/madaei-hatanach/issues/100).
## א. מה שהיה שבור — ותוקן ב-2.20.3

### א.1 🔴 `contributes.startup` בלי `app.startup_contributions` — חסם התקנה, וגם ניטרל את הפריט

**הממצא.** `PluginExtendedValidator._validateStartupContributions` מוסיף שגיאה
**חוסמת**: `contributes.startup דורש את ההרשאה "app.startup_contributions" ב-manifest`.
הוולידציה הזו אינה רצה רק באריזה — `PluginInstallerService.prepareInstall`
מריץ אותה ב-Isolate וזורק על כל `errors`, כלומר **ההתקנה עצמה נכשלת** בכל
בניית אוצריא שמכילה את הקוד הזה.

ובכיוון השני, גם אם ההתקנה עברה (בנייה ישנה יותר):
`PluginStartupContributionsService._syncInternal` מוציא את ההרשאות המאושרות
מה-DB, ואם `app.startup_contributions` אינה שם — קורא ל-`_removePlugin` ויוצא.
`PluginInstallerService.finalizeInstall` שומר **בדיוק** את ההרשאות שבמניפסט
(וזורק אם יש הפרש), ולכן להרשאה שלא הוצהרה אין רשומה כלל, ואין שום ״ברירת
מחדל דלוקה״. כלומר הסעיף כולו — `contextMenuItems` ו-`activationEvents` —
היה מת מ-2.17.1.

**ההשלכה בפועל:** בשילוב עם א.2, פריט ״זיהוי בעינים למקרא״ לא נרשם באף מסלול
בכל אוצריא 0.9.96 ומעלה, מ-2.17.1 ועד 2.20.2.

**התיקון.** אין מניפסט אחד שעובר גם בבנייה ישנה (שדוחה את ההרשאה כ״לא חוקית״)
וגם בחדשה (שדורשת אותה). לכן:
* **חבילת הבסיס** — בלי `contributes.startup` כלל.
* **`build/pack-997-variant.ps1`** — מוסיף את הסעיף **יחד עם** ההרשאה,
  `reader.toolbar`, `toolbarItems` ו-`minAppVersion: 0.9.97`.

### א.2 🔴 `registerUnifiedMenuItem` דילג על כל גרסה מודרנית

`shell/bridge.js` פתח ב-`if (await isModernApp()) return;` — בהנחה שמ-0.9.96
הפריט מגיע מההצהרה. משנתגלה שההצהרה מנוטרלת (א.1), הדילוג הותיר את הפיצ׳ר בלי
מסלול רישום. **תוקן:** הרישום הדינמי רץ עכשיו תמיד. רישום חוזר על אותו `id`
מחליף ואינו צורך מהמכסה (`API_REFERENCE.md` §`reader.addContextMenuItem`),
ולכן זה בטוח גם בווריאנט שבו ההצהרה פעילה.

### א.3 🟠 ״ערך היום״ ליומן אוצריא — קוד חי שלא נטען

`publishTodayEvents()` (publishedData.upsert) ישב רק ב-`shell/background.js`,
שנטען רק מ-`background.html` — אבל `contributes.background.entrypoint` הוסר
מהמניפסט ב-13/08/2026, ולכן מנוע הרקע טוען את `index.html` והקובץ לא נטען
בשום מסלול. הפיצ׳ר שיצא ב-2.18.0 פשוט לא רץ.

**התיקון:** הלוגיקה עברה ל-`shell/daily-publish.js`, שנטען בשני העמודים,
ו-`bridge.js` מפעיל אותה ב-`plugin.boot`. נוספה חותמת יום עברי באחסון כדי
שהפרסום לא ירוץ מחדש בכל פתיחת לשונית.

### א.4 🟠 עבודה מתמשכת שלא נעצרה ב-`plugin.suspended`

`README.md` §״השהיה ברקע״: ההקפאה נייטיבית רק ב-Windows/Android; בשאר
הפלטפורמות **התוסף אחראי לעצור בעצמו**. לתוסף היו שתי לולאות נצח:
`setInterval(consumePendingIdentify, 1500)` וסריקת 11 הפורטים של הנקדן כל
3 שניות. **תוקן:** `Otzaria.on('plugin.suspended'/'plugin.resumed')` עוצר ומחדש
את שתיהן; `NikudEngine` קיבל `unwatch()`.

### א.5 🟡 `network.allowlist` — כתובות גנריות

`API_REFERENCE.md` §״חובה: כתובות מדויקות בלבד״ אוסר במפורש קידומות כמו
`https://api.github.com`. המניפסט הצהיר חמש כאלה. **תוקן:** כל ערך הוא עכשיו
נתיב מלא. נוסף גם `https://he.wikipedia.org/api/rest_v1/page/summary` —
`shell/guides.js:fetchWikiThumbnail` קורא אליו מאז ומעולם ומעולם לא הוצהר.

### א.6 🟡 `app.getInfo` בלי נפילה ל-`res` ללא `data`

מלכודת מתועדת ב-`CLAUDE.md` של הפרויקט. `shell/core.js` ו-`shell/bridge.js`
קראו רק `res.data.version`; כשהתשובה אינה עטופה, `appVersionAtLeast` קיבל
`null`, הניח ״גרסה לא ידועה״ — ושלח APIs חדשים גם לגרסה שאינה תומכת. **תוקן**
בשני המקומות ל-`(res && (res.data || res)) || {}`.

### א.7 🟡 `homepage` חסר במניפסט

מומלץ בחנות (`README.md` §שדות אופציונליים). **נוסף.**

---

## ב. מה שנשאר פתוח וחייב פעולה מחוץ לריפו

### ב.1 ✅ נסגר — ה-PR מוזג ל-dev (01/09/2026)

הצהרה במניפסט היא **תנאי הכרחי ולא מספיק**. `PluginNetworkAccessResolver.isUriAllowedForPlugin`
דורש התאמה גם ל-`plugin_network_allowlist.txt` שבענף `dev`, ו-`plugin_tab_page.dart`
מחזיר `403 Forbidden` לכל בקשה שנכשלת — כולל `fetch()` ישיר מה-WebView.
נבדק ב-19/08/2026 מול הקובץ בענף `dev`: **אף אחת מהכתובות שלנו אינה שם.**

המשמעות: בדיקת העדכון וממסר הדיווחים נחסמים בפועל אצל כל המשתמשים, ואינם
״נכשלים בשקט בגלל שאין רשת״. גישת loopback (הנקדן) אינה מושפעת — לוקאלהוסט
אינו נכלל ב-allowlist הגלובלי.

**✅ מה נעשה בפועל (31/08/2026): ה-PR נפתח — `Otzaria/otzaria#1070`**
(base `dev`, `MERGEABLE`, שני קבצים, +14 שורות, בלי מחיקות).
✅ **מוזג בפועל ב-01.9.26 08:14 (`Y-PLONI`); אומת שהכתובות קיימות ב-`dev`.** המיזוג נכנס לתוקף מיד אצל כל המשתמשים, בלי release.

⚠️ **שני דברים השתנו מאז הרישום המקורי (19–20/08), ומי שקורא את הסעיף הזה
חייב לדעת אותם:**

1. **הקלון המקומי של אוצריא אינו קיים יותר במחשב.** הענף
   `plugin-allowlist-madaei-hatanach` שנכתב בו נעלם איתו; מה שנשאר בפורק
   `Hadabadra/Prayer-pointA` היה מבוסס על `dev` ישן ולא נפתח ממנו PR מעולם.
   הענף נבנה **מחדש** מ-`dev` העדכני (`973e802`) דרך ה-API של גיטהאב.
2. **מבנה הרשימה באוצריא השתנה.** `lib/plugins/models/plugin_network_allowlist.dart`
   **כבר אינו מכיל את הרשימה** — הוא רק לוגיקת התאמה שמייצאת מקובץ מחולל.
   שני הקבצים לעריכה היום הם:
   * `plugin_network_allowlist.txt` (שורש הריפו) — **מקור האמת**, נמשך בזמן ריצה מ-`dev`
   * `lib/plugins/models/plugin_network_allowlist.g.dart` — העותק המקומפל.
     מסומן `DO NOT MODIFY BY HAND` ומחולל ע״י
     `dart run tool/generate_plugin_network_allowlist.dart`, **אבל הוא מחויב בריפו**
     ו-`plugin_network_allowlist_branch_sync_test.dart` נכשל אם הוא אינו זהה
     ל-`.txt` **ובאותו סדר בדיוק**. בלי דארט מקומי מוסיפים לשניהם ידנית
     ומאמתים שהרשימות זהות — כך נעשה כאן (37 ערכים בשניהם).

שש הכתובות שנוספו, וממי הן נדרשות:

| כתובת | מי קורא | מה עובר |
|---|---|---|
| `https://raw.githubusercontent.com/Hadabadra/madaei-hatanach/main/manifest.json` | `shell/bridge.js` | GET של ה-manifest שלנו בלבד, להשוואת מספר גרסה |
| `https://api.github.com/repos/Hadabadra/madaei-hatanach/contents/manifest.json` | `shell/bridge.js` | אותו דבר, כשה-raw חסום/נופל |
| `https://script.google.com/macros/s/AKfycbxz…/exec` | `shell/personal.js` | POST של דיווח באג שהמשתמש כתב; פותח GitHub Issue |
| `https://script.googleusercontent.com/macros/echo` | (redirect) | יעד ההפניה של Apps Script — בלעדיו הבקשה נחסמת באמצע |
| `https://docs.google.com/forms/d/e/1FAIpQLSd7…/formResponse` | `shell/personal.js` | אותו דיווח, מסלול גיבוי |
| `https://he.wikipedia.org/api/rest_v1/page/summary` | `shell/guides.js` | GET תקציר לפי שם מדעי, לתמונת כרטיס במדריך הצומח |

⚠️ `https://github.com/Hadabadra/madaei-hatanach/releases` מוצהר במניפסט
אבל **לא** נוסף לרשימה הגלובלית, בכוונה: הוא נפתח דרך `app.openUrl` בדפדפן
המערכת, ו-`app.openUrl` אינו נבדק מול ה-allowlist (רק מול הסכמה `http/https`).
לפי עקרון המינימום שבתיעוד, אין סיבה לפתוח אותו לרשת ה-WebView.

בגוף ה-PR יש לכלול, לפי `API_REFERENCE.md` §״תוכן ה-PR שיש לפתוח״: הכתובות
המדויקות, שם התוסף ו-`id`, מה עובר בכל כתובת, וקישור לריפו — הטבלה למעלה
מכסה את כל זה.

### ב.2 🟠 קריאות loopback חייבות לעבור דרך `network.fetchStream`

`README.md` §רשת ו-`API_REFERENCE.md` §שירותים מקומיים אומרים במפורש שקריאות
ל-`127.0.0.1` חייבות לעבור דרך ה-API ולא דרך `fetch()` ישיר, שנחסם ב-CORS מול
שרת מקומי שדוחה `Origin: null`. `shell/nikud-engine.js` עדיין קורא ב-`fetch`
ישיר. זה לא תוקן כאן בכוונה: `network.fetchStream` הוא API של 0.9.97 (הזכרת
המחרוזת בקוד תחסום אריזה עם `minAppVersion: 0.9.96` — `_checkMethodVersions`),
ואין כאן דרך לבדוק אותו מול הנקדן החי. מסלול נכון: עטיפה דרך `callIfSupported`
(`shell/core.js`) עם נפילה ל-`fetch` הישיר, ובדיקה על מכשיר עם הנקדן פועל.

### ב.3 🟡 דוח תאימות העיצוב (לא חוסם)

`PluginExtendedValidator._checkDesignCompliance` מדווח על 6 הפרות בקבצים
שנארזים בפועל:

| קובץ | ההפרה | הערכה |
|---|---|---|
| `shell/router.css` | `#444`, `#fff`, `#000` | **נכון להשאיר** — כולן בתוך `@media print` בלבד. דף מודפס חייב שחור על לבן, לא צבעי ערכת נושא |
| `guides/talmud-tools/chullin/index.html` | hex + `rgb()` | קוד המדריכים המקוריים, נארז בפועל. שווה מעבר ל-`var(--color-*)` |
| `guides/talmud-tools/sukkah-lulav/index.html` | hex + `rgb()` | כנ״ל |
| `guides/talmud-tools/mumim-bechorot/style.css` | `rgb()` | כנ״ל |

שאר ההפרות שהכלי מדווח (`guides/*/view.html`, `mishna-talmud-addons/`) הן בקבצים
שאינם נארזים. ⚠️ ה-`.otzignore` **אינו** משתיק אותן: `_collectScannableFiles`
סורק את תיקיית המקור ב-`listSync` רקורסיבי בלי להתחשב בו. הן ייעלמו רק בהתקנה,
שרצה על החבילה המחולצת. אותו דבר לגבי אזהרת `feedback.sendEmail`.

### ב.4 🟠 מה יקרה ב-0.9.98

מסלול הטעינה-בעלייה של `app.run_on_startup` נמחק ב-0.9.98
(`plugin_extended_validator.dart`, `TODO(0.9.98)`). בחבילת הבסיס, בלי
`contributes.startup`, פירוש הדבר שהפריט בתפריט ההקשר יירשם רק אחרי שהמשתמש
פתח את לשונית התוסף באותו סשן. **זהו המועד שבו וריאנט 0.9.97 חייב להפוך
לחבילה הראשית** — או, אם עד אז 0.9.96 כבר נעלם מהשטח, למזג אותו חזרה לבסיס.

---

## ג. APIs שהתוסף יכול לממש ואינו מממש

מסודר לפי יחס תועלת/עלות עבור **התוסף הזה** דווקא, לא כרשימה גנרית.

### ג.1 ✅ הדגשות בטקסט — `reader.setHighlight` ומשפחתו — בוצע ב-3.9.0
הרשאה: `reader.highlight`. קיים מ-0.9.89 (`revealHighlight` מ-0.9.96).

זה ה-API שהכי מתאים למהות התוסף ואינו בשימוש כלל: אחרי זיהוי, לצבוע **בטקסט
עצמו** את כל מה שזוהה — שמות אישים בצבע אחד, צמחים באחר. `reader.getSelection`
מחזיר `TextRangeAnchor` שהוא העוגן המומלץ (החתימה הישנה לפי `index` נשמרת
לתאימות בלבד), ו-`reader.findTextOccurrences` / `reader.getSectionTextMap`
(שניהם 0.9.95, הרשאת `reader.open` שכבר יש לנו) נותנים את כל המופעים בקטע
כדי לצבוע את כולם בבת אחת ולא רק את מה שסומן.
⚠️ ההדגשות זמניות בזיכרון — התוסף אחראי לשמור ב-`storage` ולהקים מחדש ב-`plugin.boot`.

### ג.2 ✅ `plugin.openSelf({param})` + `plugin.page_opened` — בוצע ב-3.8.0
הרשאה: `navigation.write` (כבר מוצהרת). קיים מ-0.9.96.

היום `plugin.openSelf` נקרא **בלי `param`**, וכל מסירת הזיהוי בין המופעים
עוברת דרך `storage` + פולינג של 1.5 שניות + חותמות `origin`/`ts` (כ-80 שורות
ב-`bridge.js`). ה-SDK מוסר את ה-`param` ישירות לדף באירוע `plugin.page_opened`,
״גם אם הוא נטען רק עכשיו — האירוע ממתין לסיום ה-boot״. זה מייתר כמעט את כל
המנגנון. **ההמלצה: להוסיף את `plugin.page_opened` כמסלול ראשי ולהשאיר את
האחסון כגיבוי** לגרסאות/מקרים שבהם האירוע לא הגיע.

### ג.3 ✅ תאריך עברי ולוח שנה — `calendar.*` — בוצע ב-4.3.0
הרשאה: `calendar.read` (לא מוצהרת). קיים מ-0.9.89.

`guides/_shared/dates.js` מחשב תאריך עברי לבד. `calendar.getJewishDate`
מחזיר אותו מהאפליקציה, `calendar.getSelectedDate` נותן את התאריך שהמשתמש
**בחר** בלוח (ולא רק ״היום״), ו-`events.subscribe:calendar.date_changed`
מאפשר ל״ערך היום״ להתעדכן כשהמשתמש מדפדף בלוח. שינוי קטן, התאמה גדולה לאפליקציה.

### ג.4 ✅ כפתור בסרגל הקורא — `reader.toolbar` — בוצע ב-3.7.0 (מזהה את מה שפתוח מ-3.7.1)
כבר קיים בווריאנט 0.9.97 (`toolbarItems`), אבל רק כלחצן `openPlugin`. אפשר
`type: "menu"` עם ילדים (״זהה בחירה״ / ״ערך היום״ / ״פרשת השבוע״) — עד שני
פקדים עליונים לתוסף, עד 20 ילדים.

### ג.5 ✅ חיפוש — `search.query` / `search.fullText` — `search.query` בוצע ב-3.8.0
הרשאה: `search.fulltext.read`. `search.query` מ-0.9.97, `AsyncIterable` עם
עימוד ופאסטים. שימוש טבעי: ״היכן עוד מוזכר <שם הערך> בש״ס״ ישירות מהכרטיס,
במקום מראי המקום הסטטיים בלבד.

### ג.6 🟡 זיהוי ספר אמין — `library.resolveBooks` / `getBookMetadata` — חלקי: `library.resolveRef` בשימוש מ-3.8.0
הרשאה: `library.books.read`. `resolveBooks` (0.9.97) פותר עד 100 ספרים בקריאה
אחת ומחזיר `id`+`type`+`source`. היום `openInReader` שולח `bookId` מחרוזתי
בלבד; שני ספרים באותו שם אינם ניתנים להבחנה, ופתיחה נכשלת בשקט. פתרון מראי
מקום מראש היה גם מאפשר להסתיר קישור לספר שאינו מותקן אצל המשתמש.

### ג.7 דיווח שלא תלוי ברשת — `feedback.sendEmail`
הרשאה: `feedback.send_email`. פותח את תוכנת הדוא״ל של המשתמש (`mailto:`,
`plugin_bridge_adapter._handleFeedback`) — כלומר עובד גם כשהממסר חסום (ב.1)
וגם בלי אינטרנט בכלל. המדריכים הישנים (`guides/*/view.html`) כבר משתמשים בו,
אבל הם אינם נארזים; ה-shell עצמו לא. מתבקש כמסלול נפילה שלישי ב-`personal.js`.

### ג.8 קטנים ושווים
* `app.getGrantedPermissions` + `events.subscribe:plugin.permissions_changed` —
  לדעת בזמן אמת שהמשתמש כיבה הרשאה, במקום ״לא קורה כלום״.
* `shortcut.create` (הרשאת `ui.create_shortcut`) — קיצור דרך לתוסף בשולחן
  העבודה, מתוך מסך ״אודות״. דסקטופ בלבד.
* `notifications.scheduleSystem` (הרשאת `notifications.system`) — תזכורת יומית
  ל״ערך היום״. זו גם הדרך הנכונה לתזמן ממופע רקע, שלא שורד `setTimeout` ארוך.
* `history.list` (הרשאת `history.read`) — ״הערכים שקראת לאחרונה״.
* `app.getLocale` + `settings.changed` (i18n) — ר׳ ROADMAP 4.13; ההערכה שם
  שזה לא כדאי לתוסף הזה נשארת. מה שכן זול: לכבד `textDirection: 'ltr'` בזמן ריצה.
* `ui.showWarning` — לאזהרות אמיתיות; היום הכול עובר ב-`showConfirm`/`showError`.

---

## ד2. ממצאים חדשים (28/08/2026, גרסאות 3.1.0–3.2.0)

### ד2.1 🔴 `feedback.report` — התיעוד הרשמי סותר את עצמו, והמכשיר מכריע

`API_REFERENCE.md` §`feedback.report` אומר במפורש **"Permission Required: None
(user consent dialog governs access)"**, אבל §Manifest Declaration שבסוף אותו
קובץ מציע להוסיף `"feedback.report"` ל-`permissions`. הצהרנו — וההתקנה על
מכשיר 0.9.97 נכשלה מיידית:

> `Exception: הרשאה לא חוקית שנדרשת על ידי התוסף: feedback.report`

היא אינה ב-`plugin_valid_permissions.dart`. **אין להצהיר עליה.** דיאלוג האישור
למשתמש הוא מנגנון ההגנה במקום הרשאה, והקריאה עובדת בלי שום הצהרה. מומש
ב-`postViaOtzariaFeedback` (`shell/personal.js`) דרך `callIfSupported`, כך
שהמחרוזת אינה ליטרל בקוד ואינה חוסמת את אריזת ה-0.9.96.

**למה זה חשוב:** זהו מסלול הדיווח היחיד שאינו עובר ברשת של התוסף, ולכן היחיד
שאינו כפוף ל-allowlist הגלובלי (§ב.1). כלומר הוא פותר בפועל את חסימת הדיווחים
בלי להמתין ל-PR חיצוני.

### ד2.2 🟢 `library.*` — זמין הרבה מתחת לרצפה שהנחנו

בניגוד להנחה שהופיעה בתכנון, אלה **אינם** APIs של 0.9.97:

| API | הרשאה | מ-גרסה | לְמה שימש |
|---|---|---|---|
| `library.getTree` | `library.books.read` | 0.9.93 | עץ הספרייה המלא — רשימת כל הספרים והקטגוריות |
| `library.getBookToc` | `library.content.read` | 0.9.93 | מבנה הפרקים/הקטעים של ספר |
| `library.getBookContent` | `library.content.read` | 0.9.93 | הטקסט עצמו |
| `library.findBooks` | `library.books.read` | 0.9.89 | חיפוש לפי כותרת (דורש `query`, לא מחזיר הכל) |

כולם מתחת ל-`minAppVersion: 0.9.96` שלנו, ולכן נכנסו לחבילת הבסיס ולא לווריאנט.
עליהם נבנה "זיהוי בכל ספר מהספרייה" (`shell/shas.js`) — זיהוי טקסטואלי חי על
תוכן הספר, בשונה משלושת השערים שעובדים על מראי מקום מתויגים מראש.

⚠️ **`getTree` מחזיר שמות זהים בכמה מקומות** ("עירובין" בבבלי, בירושלמי
ובמשנה). חובה לשמור את נתיב הקטגוריה בזמן ה-flatten ולהציג אותו — אחרת
המשתמש אינו יכול לדעת איזה ספר הוא בוחר.

### ד2.3 🟡 החנות אוכפת יותר מהוולידטור המקומי

שתי דחיות אמיתיות שהתקבלו מהחנות (HTTP 400 / הודעת שרת) ולא נתפסו קודם:

1. **`library.getTree` בלי `library.books.read`** — הרשאה שנשכחה במניפסט
   חוסמת **פרסום**, לא רק מזהירה. 3.1.0 נדחתה לגמרי.
2. **תגית "מראה תואם לאוצריא"** — נוספת רק כשיש **0 הערות עיצוב**. הורדנו
   מ-13 ל-0 ב-3.1.4: צבעי `@media print` הפכו לטוקנים ב-`:root`, גדלים
   ב-px ל-em, ובשלושת מדריכי הכלים כל צבע גולמי מחוץ ל-`:root` הפך לטוקן.
   ⚠️ הבדיקה סורקת גם `rgba(var(--x-rgb), a)` כ"מקודד" — הפתרון היה
   `color-mix(in srgb, var(--x) N%, transparent)`.

## ד. איך לאמת מחדש

אין דרך להריץ את `otzaria pack-plugin` מ-macOS (הסקריפט מייבא Flutter ואינו
רץ תחת `dart run` רגיל). מה שכן אפשר:

1. **ולידציה** — שכפול נאמן של `PluginExtendedValidator` (סורק את אותם קבצים,
   אותם regex, אותן מפות `method→permission` ו-`method→minVersion`, שנקראות
   ישירות מקוד ה-Dart). נשמר מחוץ לריפו; לשחזור, לגזור מ-
   `plugin_extended_validator.dart` + `plugin_valid_permissions.dart`.
2. **סנכרון מוטבעים** — `node tools/verify-embedded.js` (רץ גם ב-CI).
3. **דאטה** — `node tools/validate.js --strict`.
4. **המבחן היחיד שקובע** — התקנה על מכשיר אמיתי עם 0.9.96 ועם 0.9.97.
   כל מה שמסומן כאן 🔴 נגזר מקוד המקור, אבל אין תחליף להתקנה בפועל.
