<#
  verify-4.1.ps1 - אימות סעיף 4.1: דיווח מתוך התוסף פותח GitHub Issue בפועל.

  מריץ אוטומטית:
   1. GET לממסר  - האם הכתובת מנותבת לסקריפט חי
   2. POST בדיקה - האם הצד השרתי (טוקן/ריפו/פריסה) פותח Issue עכשיו   [חלק א']
      * הממסר מחזיר 302 -> googleusercontent שחוזר 404; זה תקין וזהה למה
        שקורה לתוסף (ר' personal.js:220). לכן ה-POST *לא* נמדד לפי קוד ה-HTTP
        אלא לפי כך שנפתח Issue חדש בגיטהאב תוך דקה.
   3. אימות + סגירה של ה-Issue שנפתח
   4. פורנזיקה על ה-Issues הקיימים - מי הגיע מתוך אוצריא, ומי ודאי דרך ה-Web App

  חלקים ב'+ג' (דיווח חי מ-WebView של אוצריא + יומן ההרצות ב-script.google.com)
  אינם ניתנים לתסריט מבחוץ - ר' plan file / ROADMAP.

  שימוש:   pwsh _עבודה/scripts/verify-4.1.ps1            # הכל, כולל POST + סגירה
           pwsh _עבודה/scripts/verify-4.1.ps1 -NoPost   # פורנזיקה בלבד, בלי לפתוח Issue
#>
[CmdletBinding()]
param([switch]$NoPost)

$ErrorActionPreference = 'Stop'
$REPO       = 'Hadabadra/madaei-hatanach'
$WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxzlCAZzhaEM68jRqqekW8InrtbSiZrtiiIjgCKOInUvyBG43wLY29MYY6PrbHijpO6/exec'
$MERGE_UTC  = [datetimeoffset]::Parse('2026-09-01T08:14:00Z')   # מיזוג PR Otzaria/otzaria#1070 ל-dev

function Line { Write-Host ('-' * 72) }
function AsDto($v) { if ($v -is [datetime]) { [datetimeoffset]$v } else { [datetimeoffset]::Parse([string]$v, [cultureinfo]::InvariantCulture) } }

# ---------------------------------------------------------------------------
Line; Write-Host '1) GET לממסר - האם הכתובת חיה' -ForegroundColor Cyan
try {
  $g = Invoke-WebRequest -Uri $WEBAPP_URL -Method Get -TimeoutSec 30 -SkipHttpErrorCheck
  if ($g.Content -match 'פונקציית הסקריפט לא נמצאה: doGet' -or $g.Content -match 'function not found: doGet') {
    Write-Host '   הכתובת מנותבת לסקריפט חי, אך לפריסה אין doGet.' -ForegroundColor Yellow
    Write-Host '   לא קריטי: התוסף אף פעם לא קורא doGet. doPost הוא מה שנבדק בשלב 2.'
  } elseif ($g.Content -match '"status"\s*:\s*"ok"') {
    Write-Host '   OK - הממסר החזיר status:ok.' -ForegroundColor Green
  } else {
    Write-Host ('   תשובה לא מזוהה (' + $g.StatusCode + '), 200 תווים ראשונים:')
    Write-Host ('   ' + ($g.Content.Substring(0, [Math]::Min(200, $g.Content.Length))))
  }
} catch {
  Write-Host ('   ! GET נכשל: ' + $_.Exception.Message) -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
Line; Write-Host "2) POST בדיקה לממסר  [חלק א']" -ForegroundColor Cyan
$newIssueNum = $null
if ($NoPost) {
  Write-Host '   דילוג (-NoPost).' -ForegroundColor Yellow
} else {
  $id      = 'verify-4.1-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $title   = 'אימות ממסר 4.1 — אפשר לסגור'
  $payload = @{ id=$id; kind='בדיקה'; title=$title
               details="בדיקת ממסר צד-שרת (verify-4.1.ps1, id=$id). לא נשלח מתוך אוצריא."
               env='curl / verify-4.1' } | ConvertTo-Json -Compress

  Write-Host "   שולח POST (Content-Type: text/plain, id=$id) ..."
  try {
    # -SkipHttpErrorCheck: ה-404 על ה-redirect ל-googleusercontent צפוי ואינו כישלון.
    Invoke-WebRequest -Uri $WEBAPP_URL -Method Post -ContentType 'text/plain; charset=utf-8' `
      -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 45 -SkipHttpErrorCheck | Out-Null
  } catch {
    Write-Host ('   (חריגת HTTP - צפוי, ממשיכים לבדוק את גיטהאב: ' + $_.Exception.Message + ')') -ForegroundColor DarkGray
  }

  Write-Host '   ממתין שה-Issue יופיע בגיטהאב (עד 90 שניות) ...'
  for ($i = 0; $i -lt 18 -and -not $newIssueNum; $i++) {
    Start-Sleep -Seconds 5
    $hit = gh issue list -R $REPO -s all -L 10 --search $title --json number,title,body |
             ConvertFrom-Json | Where-Object { $_.body -match [regex]::Escape($id) } | Select-Object -First 1
    if ($hit) { $newIssueNum = [int]$hit.number }
  }
  if ($newIssueNum) {
    Write-Host ("   PASS - הממסר פתח Issue #$newIssueNum מ-POST בפועל.") -ForegroundColor Green
  } else {
    Write-Host '   FAIL - לא נפתח Issue תוך 90 שניות. הצד השרתי לא פעל.' -ForegroundColor Red
  }
}

# ---------------------------------------------------------------------------
Line; Write-Host '3) סגירת ה-Issue שנפתח' -ForegroundColor Cyan
if ($newIssueNum) {
  gh issue close $newIssueNum -R $REPO -c 'בדיקת אימות 4.1 (verify-4.1.ps1) — נסגר אוטומטית.' | Out-Null
  Write-Host ("   נסגר #$newIssueNum.") -ForegroundColor Green
} else {
  Write-Host '   אין Issue חדש לסגור.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
Line; Write-Host '4) פורנזיקה על ה-Issues הקיימים' -ForegroundColor Cyan
Write-Host '   סביבה "אוצריא 0.9.x" = נשלח מתוך האפליקציה · "אוצריא —" = דפדפן'
Write-Host '   תמונה מוטבעת (![צילום מסך) = ודאי דרך doPost / Web App (הטופס לא מעלה תמונות)'
Line
$issues = gh issue list -R $REPO -s all -L 300 --json number,title,createdAt,body | ConvertFrom-Json
$rows = foreach ($it in $issues) {
  $envLine = ($it.body -split "`n" | Where-Object { $_ -match '\*\*סביבה:\*\*' } | Select-Object -First 1)
  $envTxt  = if ($envLine) { ($envLine -replace '.*\*\*סביבה:\*\*\s*', '').Trim() } else { '' }
  $src =
    if ($envTxt -match 'אוצריא\s*0\.9')      { 'אוצריא' }
    elseif ($envTxt -match 'אוצריא\s*[—-]')  { 'דפדפן' }
    elseif ($envTxt)                          { 'לא ודאי' }
    else                                      { '(אין סביבה)' }
  $created = AsDto $it.createdAt
  [pscustomobject]@{
    '#'        = $it.number
    'תאריך'    = $created.UtcDateTime.ToString('yyyy-MM-dd HH:mm')
    'אחרי1070' = if ($created -ge $MERGE_UTC) { 'כן' } else { '' }
    'מקור'     = $src
    'WebApp'   = if ($it.body -match '!\[צילום מסך') { 'ודאי' } else { '' }
    'סביבה'    = $envTxt
    'כותרת'    = $it.title.Substring(0, [Math]::Min(40, $it.title.Length))
  }
}
$rows | Sort-Object '#' -Descending | Format-Table -AutoSize | Out-String -Width 200 | Write-Host

$fromApp    = @($rows | Where-Object { $_.'מקור' -eq 'אוצריא' })
$webAppSure = @($rows | Where-Object { $_.'WebApp' -eq 'ודאי' })
$afterMerge = @($fromApp | Where-Object { $_.'אחרי1070' -eq 'כן' })
Line
Write-Host ("סיכום: {0} Issues עם סביבת אוצריא אמיתית · {1} ודאי דרך Web App (תמונה מוטבעת)" -f $fromApp.Count, $webAppSure.Count)
if ($afterMerge.Count) {
  Write-Host ("מתוך אוצריא אחרי מיזוג 1070 (01.9.26 08:14Z): #" + (($afterMerge.'#') -join ', #')) -ForegroundColor Green
}
Line
Write-Host @'
נותר ידני (לא ניתן לתסריט מבחוץ):
  חלק ב' - באוצריא: האזור האישי > "בדיקת שליחה" > "שליחת בדיקה עכשיו".
           לוודא שההודעה אומרת מסלול "webapp", ושנפתח Issue חדש עם סביבת אוצריא.
  חלק ג' - script.google.com > פרויקט "דיווחים — עינים למקרא" > Executions:
           לוודא שרצה doPost (לא רק onFormSubmit) בזמן בדיקת חלק ב'.
'@
