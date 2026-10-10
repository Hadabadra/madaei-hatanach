namespace OtzariaBridge;

/// <summary>שפת הממשק של הגשר (מגש, הודעת התקנה, שורת פקודה). ברירת מחדל עברית;
/// אנגלית נבחרת בתפריט המגש או ב-<c>--lang en</c>, ונשמרת ב-config.json</summary>
public static class Lang
{
    private static bool? _en;

    public static bool En
    {
        get
        {
            if (_en == null) _en = string.Equals(Config.Get("lang", "he"), "en", StringComparison.OrdinalIgnoreCase);
            return _en.Value;
        }
    }

    public static string T(string he, string en) => En ? en : he;

    public static void Set(string code)
    {
        code = code == "en" ? "en" : "he";
        Config.Set("lang", code);
        _en = code == "en";
    }

    public static void FromArgs(string[] args)
    {
        int i = Array.IndexOf(args, "--lang");
        if (i < 0 || i + 1 >= args.Length) return;
        string v = args[i + 1].Trim().ToLowerInvariant();
        if (v == "en" || v == "he") Set(v);
    }
}
