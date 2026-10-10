using System.Collections.Specialized;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;

namespace OtzariaBridge;

/// <summary>נקודות הקצה /fs/* לפי docs/BRIDGE_API.md</summary>
public static class FsApi
{
    private static readonly HashSet<string> TextExt = new(StringComparer.OrdinalIgnoreCase)
        { ".txt", ".md", ".json", ".csv", ".xml", ".html", ".htm", ".js", ".css", ".log", ".ini" };

    private static readonly Dictionary<string, string> Mime = new(StringComparer.OrdinalIgnoreCase)
    {
        [".txt"] = "text/plain", [".md"] = "text/markdown", [".json"] = "application/json",
        [".csv"] = "text/csv", [".xml"] = "application/xml", [".html"] = "text/html", [".htm"] = "text/html",
        [".js"] = "text/javascript", [".css"] = "text/css", [".log"] = "text/plain", [".ini"] = "text/plain",
        [".pdf"] = "application/pdf", [".png"] = "image/png", [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif", [".bmp"] = "image/bmp", [".webp"] = "image/webp", [".svg"] = "image/svg+xml",
        [".tif"] = "image/tiff", [".tiff"] = "image/tiff", [".ico"] = "image/x-icon",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".zip"] = "application/zip",
    };

    public static void Register()
    {
        Server.Route("/fs/roots", _ => Roots());
        Server.Route("/fs/list", List);
        Server.Route("/fs/stat", b => Stat(FullPath(b.Req("path"))));
        Server.Route("/fs/mkdir", Mkdir);
        Server.Route("/fs/rename", Rename);
        Server.Route("/fs/copy", b => Transfer(b, move: false));
        Server.Route("/fs/move", b => Transfer(b, move: true));
        Server.Route("/fs/delete", Delete);
        Server.Route("/fs/read", Read);
        Server.Route("/fs/write-text", WriteText);
        Server.Route("/fs/open", Open);
        Server.Route("/fs/reveal", Reveal);
        Server.Route("/fs/clipboard-get", _ => ClipboardGet());
        Server.Route("/fs/clipboard-set", ClipboardSet);
    }

    // ---------- עזרים ----------

    private static string FullPath(string p)
    {
        if (string.IsNullOrWhiteSpace(p)) throw BridgeException.BadRequest("נתיב ריק");
        p = Environment.ExpandEnvironmentVariables(p.Trim());
        if (!Path.IsPathFullyQualified(p)) throw BridgeException.BadRequest("נדרש נתיב מלא: " + p);
        return Path.GetFullPath(p);
    }

    private static string Iso(DateTime t) => t.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

    private static bool IsHidden(FileSystemInfo i) =>
        (i.Attributes & (FileAttributes.Hidden | FileAttributes.System)) != 0;

    private static bool Exists(string p) => File.Exists(p) || Directory.Exists(p);

    /// <summary>אזורים מוגנים: מחיקה, העברה ושינוי שם אסורים</summary>
    private static void EnsureNotProtected(string p)
    {
        string full = Path.GetFullPath(p).TrimEnd('\\');
        string root = Path.GetPathRoot(full)?.TrimEnd('\\') ?? "";
        if (full.Length == 0 || full.Equals(root, StringComparison.OrdinalIgnoreCase))
            throw BridgeException.Forbidden("לא ניתן לשנות שורש כונן");

        var guarded = new List<string>
        {
            Environment.GetFolderPath(Environment.SpecialFolder.Windows),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            Config.Dir,
        };
        foreach (string g in guarded.Where(x => !string.IsNullOrEmpty(x)))
        {
            string gg = g.TrimEnd('\\');
            if (full.Equals(gg, StringComparison.OrdinalIgnoreCase) ||
                full.StartsWith(gg + "\\", StringComparison.OrdinalIgnoreCase))
                throw BridgeException.Forbidden("אזור מוגן: " + gg);
        }
        // Program Files* בכל כונן
        string rest = full.Substring(root.Length).TrimStart('\\');
        if (rest.StartsWith("Program Files", StringComparison.OrdinalIgnoreCase) &&
            rest.Split('\\').Length >= 1 && rest.Split('\\')[0].StartsWith("Program Files", StringComparison.OrdinalIgnoreCase))
            throw BridgeException.Forbidden("אזור מוגן: Program Files");
    }

    private static string UniqueName(string dir, string name)
    {
        string baseName = Path.GetFileNameWithoutExtension(name);
        string ext = Path.GetExtension(name);
        if (Directory.Exists(Path.Combine(dir, name)) && ext.Length > 0 && !File.Exists(Path.Combine(dir, name)))
        {
            baseName = name;
            ext = "";
        }
        for (int i = 2; i < 10000; i++)
        {
            string candidate = Path.Combine(dir, $"{baseName} ({i}){ext}");
            if (!Exists(candidate)) return candidate;
        }
        throw new BridgeException("internal", "לא נמצא שם פנוי", 500);
    }

    // ---------- נקודות קצה ----------

    private static object Roots()
    {
        var drives = new List<object>();
        foreach (var d in DriveInfo.GetDrives())
        {
            string label = "", type = d.DriveType.ToString().ToLowerInvariant();
            long total = 0, free = 0;
            try
            {
                if (d.IsReady)
                {
                    label = d.VolumeLabel;
                    total = d.TotalSize;
                    free = d.AvailableFreeSpace;
                }
            }
            catch { }
            drives.Add(new { path = d.RootDirectory.FullName, label, type, totalBytes = total, freeBytes = free });
        }

        string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var known = new List<object>();
        void Add(string id, string name, string path)
        {
            if (!string.IsNullOrEmpty(path) && Directory.Exists(path)) known.Add(new { id, name, path });
        }
        Add("desktop", "שולחן העבודה", Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory));
        Add("documents", "מסמכים", Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments));
        Add("downloads", "הורדות", KnownDownloads() ?? Path.Combine(home, "Downloads"));
        Add("pictures", "תמונות", Environment.GetFolderPath(Environment.SpecialFolder.MyPictures));
        Add("music", "מוזיקה", Environment.GetFolderPath(Environment.SpecialFolder.MyMusic));
        Add("videos", "סרטונים", Environment.GetFolderPath(Environment.SpecialFolder.MyVideos));
        Add("home", "תיקיית הבית", home);
        return new { drives, known };
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHGetKnownFolderPath([MarshalAs(UnmanagedType.LPStruct)] Guid rfid, uint flags, IntPtr token, out IntPtr path);

    private static string KnownDownloads()
    {
        try
        {
            if (SHGetKnownFolderPath(new Guid("374DE290-123F-4565-9164-39C4925E467B"), 0, IntPtr.Zero, out IntPtr p) == 0)
            {
                string s = Marshal.PtrToStringUni(p);
                Marshal.FreeCoTaskMem(p);
                return s;
            }
        }
        catch { }
        return null;
    }

    private static object List(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        bool showHidden = b.Bool("showHidden");
        var dir = new DirectoryInfo(path);
        if (!dir.Exists) throw BridgeException.NotFound("התיקייה לא נמצאה: " + path);

        var dirs = new List<object>();
        var files = new List<object>();
        foreach (var i in dir.EnumerateFileSystemInfos("*", new EnumerationOptions { IgnoreInaccessible = true, AttributesToSkip = 0 })
                     .OrderBy(x => x.Name, StringComparer.CurrentCultureIgnoreCase))
        {
            bool hidden = IsHidden(i);
            if (hidden && !showHidden) continue;
            if (i is DirectoryInfo)
                dirs.Add(new { name = i.Name, path = i.FullName, type = "dir", size = 0L, modified = Iso(i.LastWriteTime), ext = "", hidden });
            else if (i is FileInfo f)
                files.Add(new { name = f.Name, path = f.FullName, type = "file", size = f.Length, modified = Iso(f.LastWriteTime), ext = f.Extension.TrimStart('.').ToLowerInvariant(), hidden });
        }
        return new { path = dir.FullName, parent = dir.Parent?.FullName, entries = dirs.Concat(files) };
    }

    private static object Stat(string path)
    {
        if (File.Exists(path))
        {
            var f = new FileInfo(path);
            return new { name = f.Name, path = f.FullName, type = "file", size = f.Length, created = Iso(f.CreationTime), modified = Iso(f.LastWriteTime), readOnly = f.IsReadOnly, hidden = IsHidden(f), itemCount = (int?)null };
        }
        if (Directory.Exists(path))
        {
            var d = new DirectoryInfo(path);
            int? count = null;
            try { count = d.EnumerateFileSystemInfos().Count(); } catch { }
            return new { name = d.Name, path = d.FullName, type = "dir", size = 0L, created = Iso(d.CreationTime), modified = Iso(d.LastWriteTime), readOnly = (d.Attributes & FileAttributes.ReadOnly) != 0, hidden = IsHidden(d), itemCount = count };
        }
        throw BridgeException.NotFound("לא נמצא: " + path);
    }

    private static object Mkdir(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        if (Exists(path)) throw BridgeException.Exists("כבר קיים: " + path);
        Directory.CreateDirectory(path);
        return new { path };
    }

    private static object Rename(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        string newName = b.Req("newName").Trim();
        if (newName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || newName is "." or "..")
            throw BridgeException.BadRequest("שם לא חוקי: " + newName);
        if (!Exists(path)) throw BridgeException.NotFound("לא נמצא: " + path);
        EnsureNotProtected(path);

        string dest = Path.Combine(Path.GetDirectoryName(path)!, newName);
        bool caseOnly = string.Equals(dest, path, StringComparison.OrdinalIgnoreCase);
        if (!caseOnly && Exists(dest)) throw BridgeException.Exists("כבר קיים: " + dest);

        if (Directory.Exists(path))
        {
            if (caseOnly)
            {
                string tmp = path + ".~rn" + Guid.NewGuid().ToString("N")[..6];
                Directory.Move(path, tmp);
                Directory.Move(tmp, dest);
            }
            else Directory.Move(path, dest);
        }
        else File.Move(path, dest);
        return new { path = dest };
    }

    private static object Transfer(JsonElement b, bool move)
    {
        string destDir = FullPath(b.Req("destDir"));
        if (!Directory.Exists(destDir)) throw BridgeException.NotFound("תיקיית היעד לא נמצאה: " + destDir);
        string conflict = b.Str("conflict", "rename");
        if (conflict is not ("skip" or "overwrite" or "rename"))
            throw BridgeException.BadRequest("conflict חייב להיות skip, overwrite או rename");

        int done = 0, skipped = 0;
        var failed = new List<object>();
        foreach (string raw in b.StrArray("sources"))
        {
            string src = raw;
            try
            {
                src = FullPath(raw);
                if (!Exists(src)) throw BridgeException.NotFound("לא נמצא");
                if (move) EnsureNotProtected(src);

                string dest = Path.Combine(destDir, Path.GetFileName(src.TrimEnd('\\')));
                if (Directory.Exists(src) &&
                    (destDir + "\\").StartsWith(src.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase))
                    throw BridgeException.BadRequest("לא ניתן להעתיק תיקייה לתוך עצמה");

                if (string.Equals(dest, src, StringComparison.OrdinalIgnoreCase))
                {
                    if (move) { skipped++; continue; }
                    dest = UniqueName(destDir, Path.GetFileName(src));
                }
                else if (Exists(dest))
                {
                    if (conflict == "skip") { skipped++; continue; }
                    if (conflict == "rename") dest = UniqueName(destDir, Path.GetFileName(src));
                    else
                    {
                        EnsureNotProtected(dest);
                        if (Directory.Exists(dest) && File.Exists(src) || File.Exists(dest) && Directory.Exists(src))
                            throw BridgeException.Exists("קיים פריט מסוג אחר באותו שם");
                        if (File.Exists(dest) && !Directory.Exists(src)) File.Delete(dest);
                    }
                }

                if (Directory.Exists(src))
                {
                    bool sameVolume = string.Equals(Path.GetPathRoot(src), Path.GetPathRoot(dest), StringComparison.OrdinalIgnoreCase);
                    if (move && sameVolume && !Directory.Exists(dest)) Directory.Move(src, dest);
                    else
                    {
                        CopyDir(src, dest, overwrite: conflict == "overwrite");
                        if (move) Directory.Delete(src, true);
                    }
                }
                else
                {
                    if (move) File.Move(src, dest, overwrite: true);
                    else File.Copy(src, dest, overwrite: true);
                }
                done++;
            }
            catch (Exception ex)
            {
                failed.Add(new { path = src, message = ex.Message });
            }
        }
        return move ? new { moved = done, skipped, failed } : new { copied = done, skipped, failed };
    }

    private static void CopyDir(string src, string dest, bool overwrite)
    {
        Directory.CreateDirectory(dest);
        foreach (string f in Directory.GetFiles(src))
            File.Copy(f, Path.Combine(dest, Path.GetFileName(f)), overwrite);
        foreach (string d in Directory.GetDirectories(src))
            CopyDir(d, Path.Combine(dest, Path.GetFileName(d)), overwrite);
    }

    // מחיקה לסל המיחזור דרך SHFileOperation
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct SHFILEOPSTRUCT
    {
        public IntPtr hwnd;
        public uint wFunc;
        public string pFrom;
        public string pTo;
        public ushort fFlags;
        public bool fAnyOperationsAborted;
        public IntPtr hNameMappings;
        public string lpszProgressTitle;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHFileOperation(ref SHFILEOPSTRUCT op);

    private static void Recycle(string path)
    {
        const uint FO_DELETE = 3;
        const ushort FOF_SILENT = 0x4, FOF_NOCONFIRMATION = 0x10, FOF_ALLOWUNDO = 0x40, FOF_NOERRORUI = 0x400;
        var op = new SHFILEOPSTRUCT
        {
            wFunc = FO_DELETE,
            pFrom = path + "\0\0",
            fFlags = FOF_SILENT | FOF_NOCONFIRMATION | FOF_ALLOWUNDO | FOF_NOERRORUI,
        };
        int r = SHFileOperation(ref op);
        if (r != 0 || op.fAnyOperationsAborted)
            throw new IOException("המחיקה לסל המיחזור נכשלה (קוד " + r + ")");
    }

    private static object Delete(JsonElement b)
    {
        bool permanent = b.Bool("permanent");
        int deleted = 0;
        var failed = new List<object>();
        foreach (string raw in b.StrArray("paths"))
        {
            string p = raw;
            try
            {
                p = FullPath(raw);
                if (!Exists(p)) throw BridgeException.NotFound("לא נמצא");
                EnsureNotProtected(p);
                if (!permanent) Recycle(p);
                else if (Directory.Exists(p)) Directory.Delete(p, true);
                else
                {
                    File.SetAttributes(p, FileAttributes.Normal);
                    File.Delete(p);
                }
                deleted++;
            }
            catch (Exception ex)
            {
                failed.Add(new { path = p, message = ex.Message });
            }
        }
        return new { deleted, failed };
    }

    private static object Read(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        if (!File.Exists(path)) throw BridgeException.NotFound("הקובץ לא נמצא: " + path);
        long max = Math.Clamp(b.Long("maxBytes", 5L * 1024 * 1024), 1, 50L * 1024 * 1024);
        var fi = new FileInfo(path);
        string ext = fi.Extension;
        bool truncated = fi.Length > max;
        int len = (int)Math.Min(fi.Length, max);

        byte[] buf = new byte[len];
        using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
        {
            int read = 0;
            while (read < len)
            {
                int n = fs.Read(buf, read, len - read);
                if (n == 0) break;
                read += n;
            }
            if (read < len) Array.Resize(ref buf, read);
        }

        string mime = Mime.TryGetValue(ext, out var m) ? m : "application/octet-stream";
        if (TextExt.Contains(ext))
        {
            string content = DecodeText(buf);
            return new { name = fi.Name, size = fi.Length, mime, encoding = "utf8", content, truncated };
        }
        return new { name = fi.Name, size = fi.Length, mime, encoding = "base64", content = Convert.ToBase64String(buf), truncated };
    }

    private static string DecodeText(byte[] buf)
    {
        if (buf.Length >= 3 && buf[0] == 0xEF && buf[1] == 0xBB && buf[2] == 0xBF) return Encoding.UTF8.GetString(buf, 3, buf.Length - 3);
        if (buf.Length >= 2 && buf[0] == 0xFF && buf[1] == 0xFE) return Encoding.Unicode.GetString(buf, 2, buf.Length - 2);
        if (buf.Length >= 2 && buf[0] == 0xFE && buf[1] == 0xFF) return Encoding.BigEndianUnicode.GetString(buf, 2, buf.Length - 2);
        try
        {
            return new UTF8Encoding(false, true).GetString(buf);
        }
        catch (DecoderFallbackException)
        {
            // קבצי טקסט ישנים בעברית (Windows-1255)
            try
            {
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
                return Encoding.GetEncoding(1255).GetString(buf);
            }
            catch { return Encoding.UTF8.GetString(buf); }
        }
    }

    private static object WriteText(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        string content = b.Str("content", "");
        bool overwrite = b.Bool("overwrite");
        if (Directory.Exists(path)) throw BridgeException.Exists("קיימת תיקייה בשם זה");
        if (File.Exists(path) && !overwrite) throw BridgeException.Exists("הקובץ כבר קיים: " + path);
        string dir = Path.GetDirectoryName(path);
        if (!Directory.Exists(dir)) throw BridgeException.NotFound("התיקייה לא נמצאה: " + dir);
        File.WriteAllText(path, content, new UTF8Encoding(false));
        return new { path, size = new FileInfo(path).Length };
    }

    private static object Open(JsonElement b)
    {
        string path = FullPath(b.Req("path"));
        if (!Exists(path)) throw BridgeException.NotFound("לא נמצא: " + path);
        if (Kiosk.IsActive)
        {
            string ext = Path.GetExtension(path).TrimStart('.').ToLowerInvariant();
            bool allowed = File.Exists(path) && Kiosk.AllowedExtensions.Any(x =>
                x.TrimStart('.').Equals(ext, StringComparison.OrdinalIgnoreCase));
            if (!allowed) throw BridgeException.Locked();
        }
        Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
        return new { opened = true };
    }

    private static object Reveal(JsonElement b)
    {
        if (Kiosk.IsActive) throw BridgeException.Locked();
        string path = FullPath(b.Req("path"));
        if (!Exists(path)) throw BridgeException.NotFound("לא נמצא: " + path);
        string args = File.Exists(path) ? "/select,\"" + path + "\"" : "\"" + path + "\"";
        Process.Start(new ProcessStartInfo("explorer.exe", args) { UseShellExecute = true });
        return new { ok = true };
    }

    // ---------- לוח ----------

    private static object ClipboardGet() => Sta.Run(() =>
    {
        var list = Clipboard.ContainsFileDropList() ? Clipboard.GetFileDropList().Cast<string>().ToArray() : Array.Empty<string>();
        bool cut = false;
        if (Clipboard.GetData("Preferred DropEffect") is MemoryStream ms && ms.Length >= 4)
        {
            var bytes = ms.ToArray();
            cut = (bytes[0] & 2) != 0;
        }
        return (object)new { paths = list, cut };
    });

    private static object ClipboardSet(JsonElement b)
    {
        string[] paths = b.StrArray("paths").Select(FullPath).ToArray();
        bool cut = b.Bool("cut");
        Sta.Run(() =>
        {
            if (paths.Length == 0)
            {
                Clipboard.Clear();
                return 0;
            }
            var col = new StringCollection();
            col.AddRange(paths);
            var data = new DataObject();
            data.SetFileDropList(col);
            data.SetData("Preferred DropEffect", new MemoryStream(BitConverter.GetBytes(cut ? 2 : 5)));
            Clipboard.SetDataObject(data, true);
            return 0;
        });
        return new { ok = true };
    }

    // ---------- חיפוש זורם (NDJSON) ----------

    private static readonly string[] SkipDirNames =
        { "$Recycle.Bin", "System Volume Information", "Windows", "WinSxS", "$WinREAgent", "Config.Msi", "node_modules", ".git" };

    public static async Task Search(HttpContext ctx, JsonElement b)
    {
        string root = FullPath(b.Req("root"));
        if (!Directory.Exists(root)) throw BridgeException.NotFound("תיקיית החיפוש לא נמצאה: " + root);
        string query = b.Str("query", "") ?? "";
        string contentQuery = b.Str("contentQuery");
        if (query.Length == 0 && string.IsNullOrEmpty(contentQuery))
            throw BridgeException.BadRequest("חסר query");
        var exts = new HashSet<string>(b.StrArray("extensions").Select(e => "." + e.TrimStart('.')), StringComparer.OrdinalIgnoreCase);
        int maxResults = (int)Math.Clamp(b.Long("maxResults", 500), 1, 10000);
        bool includeDirs = b.Bool("includeDirs", true);

        Func<string, bool> match;
        if (query.Length == 0) match = _ => true;
        else if (query.IndexOfAny(new[] { '*', '?' }) >= 0)
        {
            var rx = new Regex("^" + Regex.Escape(query).Replace("\\*", ".*").Replace("\\?", ".") + "$",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            match = n => rx.IsMatch(n);
        }
        else match = n => n.Contains(query, StringComparison.CurrentCultureIgnoreCase);

        var res = ctx.Response;
        res.StatusCode = 200;
        res.ContentType = "application/x-ndjson; charset=utf-8";
        res.Headers.CacheControl = "no-cache";
        var ct = ctx.RequestAborted;

        async Task Emit(object o)
        {
            await res.WriteAsync(JsonSerializer.Serialize(o, Server.Json) + "\n", ct);
            await res.Body.FlushAsync(ct);
        }

        long scanned = 0;
        int hits = 0;
        bool truncated = false, cancelled = false;
        var sw = Stopwatch.StartNew();
        long lastProgress = 0;
        var stack = new Stack<string>();
        stack.Push(root);
        var opts = new EnumerationOptions { IgnoreInaccessible = true, AttributesToSkip = FileAttributes.ReparsePoint };

        try
        {
            while (stack.Count > 0 && !truncated)
            {
                if (ct.IsCancellationRequested) { cancelled = true; break; }
                string dir = stack.Pop();
                IEnumerable<FileSystemInfo> items;
                try { items = new DirectoryInfo(dir).EnumerateFileSystemInfos("*", opts).ToList(); }
                catch { continue; }

                foreach (var i in items)
                {
                    scanned++;
                    bool isDir = i is DirectoryInfo;
                    if (isDir)
                    {
                        if (!SkipDirNames.Contains(i.Name, StringComparer.OrdinalIgnoreCase) &&
                            (i.Attributes & FileAttributes.System) == 0)
                            stack.Push(i.FullName);
                    }

                    bool ok;
                    if (isDir) ok = includeDirs && string.IsNullOrEmpty(contentQuery) && exts.Count == 0 && match(i.Name);
                    else
                    {
                        ok = (exts.Count == 0 || exts.Contains(i.Extension)) && match(i.Name);
                        if (ok && !string.IsNullOrEmpty(contentQuery))
                            ok = ContentContains((FileInfo)i, contentQuery);
                    }

                    if (ok)
                    {
                        hits++;
                        await Emit(new
                        {
                            type = "hit",
                            name = i.Name,
                            path = i.FullName,
                            entryType = isDir ? "dir" : "file",
                            size = isDir ? 0L : ((FileInfo)i).Length,
                            modified = Iso(i.LastWriteTime),
                        });
                        if (hits >= maxResults) { truncated = true; break; }
                    }

                    if (sw.ElapsedMilliseconds - lastProgress >= 300)
                    {
                        lastProgress = sw.ElapsedMilliseconds;
                        await Emit(new { type = "progress", scanned, current = dir });
                    }
                }
            }
            await Emit(new { type = "done", scanned, hits, truncated, cancelled });
        }
        catch (OperationCanceledException) { }
        catch (IOException) when (ct.IsCancellationRequested) { }
    }

    private static bool ContentContains(FileInfo f, string q)
    {
        if (!TextExt.Contains(f.Extension) || f.Length > 2L * 1024 * 1024) return false;
        try
        {
            string text = DecodeText(File.ReadAllBytes(f.FullName));
            return text.Contains(q, StringComparison.CurrentCultureIgnoreCase);
        }
        catch { return false; }
    }
}

/// <summary>הרצת פעולה על חוט STA (נדרש ללוח של Windows)</summary>
public static class Sta
{
    public static T Run<T>(Func<T> fn)
    {
        T result = default;
        Exception error = null;
        var t = new Thread(() =>
        {
            try { result = fn(); }
            catch (Exception ex) { error = ex; }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.IsBackground = true;
        t.Start();
        if (!t.Join(10000)) throw new TimeoutException("הלוח אינו מגיב");
        if (error != null) throw error;
        return result;
    }
}
