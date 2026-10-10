using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Win32;

namespace OtzariaBridge;

/// <summary>
/// מצב נעילה (קיוסק).
/// נעילה רכה: סגירת explorer, חסימת מקשים, מעקב שמחזיר את אוצריא לחזית, חסימת מנהל המשימות.
/// נעילה קפדנית: כבויה כברירת מחדל; מופעלת רק כאשר הבקשה כוללת strict:true במפורש.
/// </summary>
public static class Kiosk
{
    private const int Iterations = 200_000;
    private const string PoliciesKey = @"Software\Microsoft\Windows\CurrentVersion\Policies\System";
    private const string WinlogonKey = @"Software\Microsoft\Windows NT\CurrentVersion\Winlogon";

    private static readonly object Gate = new();
    private static int _failures;
    private static DateTime _lockoutUntil = DateTime.MinValue;
    private static System.Threading.Timer _watchdog;
    private static IntPtr _hook = IntPtr.Zero;
    private static LowLevelKeyboardProc _hookProc;

    public static bool IsActive => Config.Get("kiosk.active", false);
    private static bool HasPassword => !string.IsNullOrEmpty(Config.Get<string>("kiosk.passwordHash", null));

    public static string[] AllowedExtensions => Config.GetList("kiosk.allowOpenExtensions");

    public static void Register()
    {
        Server.Route("/kiosk/status", _ => Status());
        Server.Route("/kiosk/set-password", SetPassword);
        Server.Route("/kiosk/enable", Enable);
        Server.Route("/kiosk/disable", Disable);
        Server.Route("/kiosk/settings", Settings);
    }

    // ---------- סיסמה ----------

    private static string Hash(string secret, byte[] salt) =>
        Convert.ToBase64String(Rfc2898DeriveBytes.Pbkdf2(secret, salt, Iterations, HashAlgorithmName.SHA256, 32));

    private static bool Matches(string secret, string hashKey, string saltKey)
    {
        string hash = Config.Get<string>(hashKey, null);
        string salt = Config.Get<string>(saltKey, null);
        if (string.IsNullOrEmpty(hash) || string.IsNullOrEmpty(salt) || string.IsNullOrEmpty(secret)) return false;
        byte[] expected = Convert.FromBase64String(hash);
        byte[] actual = Convert.FromBase64String(Hash(secret, Convert.FromBase64String(salt)));
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private static void StoreSecret(string secret, string hashKey, string saltKey)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        Config.Set(saltKey, Convert.ToBase64String(salt));
        Config.Set(hashKey, Hash(secret, salt));
    }

    private static string NormalizeRecovery(string s) => (s ?? "").Replace("-", "").Replace(" ", "").ToUpperInvariant();

    /// <summary>בודק סיסמה או קוד שחזור, עם השהיה אחרי 5 ניסיונות שגויים</summary>
    private static void Verify(string password, bool allowRecovery)
    {
        lock (Gate)
        {
            if (DateTime.UtcNow < _lockoutUntil)
            {
                int secs = (int)Math.Ceiling((_lockoutUntil - DateTime.UtcNow).TotalSeconds);
                throw new BridgeException("wrong_password", $"יותר מדי ניסיונות שגויים. נסו שוב בעוד {secs} שניות", 429);
            }
            bool ok = Matches(password, "kiosk.passwordHash", "kiosk.salt") ||
                      (allowRecovery && Matches(NormalizeRecovery(password), "kiosk.recoveryHash", "kiosk.recoverySalt"));
            if (ok)
            {
                _failures = 0;
                return;
            }
            if (++_failures >= 5)
            {
                _failures = 0;
                _lockoutUntil = DateTime.UtcNow.AddSeconds(60);
            }
            throw new BridgeException("wrong_password", "סיסמה שגויה", 401);
        }
    }

    private static string NewRecoveryCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 12).Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]).ToArray());
    }

    // ---------- נקודות קצה ----------

    private static object Status() => new
    {
        active = IsActive,
        hasPassword = HasPassword,
        strict = Config.Get("kiosk.strict", false),
        autoStartBridge = Installer.HasAutoStart(),
        otzariaPath = OtzariaPath() ?? "",
        blockTaskManager = Config.Get("kiosk.blockTaskManager", true),
        allowOpenExtensions = AllowedExtensions,
    };

    private static object SetPassword(JsonElement b)
    {
        string newPassword = b.Str("newPassword") ?? "";
        if (newPassword.Length < 4) throw BridgeException.BadRequest("הסיסמה חייבת להכיל לפחות 4 תווים");
        string recovery = null;
        if (HasPassword) Verify(b.Str("oldPassword"), allowRecovery: true);
        else
        {
            recovery = NewRecoveryCode();
            StoreSecret(recovery, "kiosk.recoveryHash", "kiosk.recoverySalt");
        }
        StoreSecret(newPassword, "kiosk.passwordHash", "kiosk.salt");
        Config.Save();
        return recovery == null ? new { ok = true } : new { ok = true, recoveryCode = recovery };
    }

    private static object Enable(JsonElement b)
    {
        if (!HasPassword) throw BridgeException.BadRequest("יש להגדיר סיסמה לפני הפעלת הנעילה");
        Verify(b.Str("password"), allowRecovery: false);

        bool strict = b.Bool("strict", false); // כבוי כברירת מחדל
        bool blockTm = b.Bool("blockTaskManager", true);
        string otz = OtzariaPath();
        if (string.IsNullOrEmpty(otz) || !File.Exists(otz))
            throw BridgeException.BadRequest("לא נמצאה תוכנת אוצריא. יש להגדיר otzariaPath בהגדרות הנעילה");

        Config.Set("kiosk.strict", strict);
        Config.Set("kiosk.blockTaskManager", blockTm);
        Config.Set("kiosk.active", true);
        Config.Save();
        Apply();
        return new { active = true };
    }

    private static object Disable(JsonElement b)
    {
        Verify(b.Str("password"), allowRecovery: true);
        Release();
        return new { active = false };
    }

    private static object Settings(JsonElement b)
    {
        Verify(b.Str("password"), allowRecovery: false);
        if (b.Has("allowOpenExtensions"))
            Config.Set("kiosk.allowOpenExtensions",
                new JsonArray(b.StrArray("allowOpenExtensions").Select(x => (JsonNode)x.TrimStart('.').ToLowerInvariant()).ToArray()));
        if (b.Has("otzariaPath"))
        {
            string p = b.Str("otzariaPath", "");
            if (p.Length > 0 && !File.Exists(p)) throw BridgeException.NotFound("הקובץ לא נמצא: " + p);
            Config.Set("kiosk.otzariaPath", p);
        }
        Config.Save();
        if (IsActive) Apply();
        return Status();
    }

    // ---------- איתור אוצריא ----------

    public static string OtzariaPath()
    {
        string configured = Config.Get<string>("kiosk.otzariaPath", null);
        if (!string.IsNullOrEmpty(configured) && File.Exists(configured)) return configured;

        try
        {
            foreach (var p in Process.GetProcessesByName("otzaria"))
            {
                string path = p.MainModule?.FileName;
                if (!string.IsNullOrEmpty(path)) return path;
            }
        }
        catch { }

        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] candidates =
        {
            Path.Combine(local, "Programs", "otzaria", "otzaria.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "otzaria", "otzaria.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "otzaria", "otzaria.exe"),
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    // ---------- החלה ושחרור ----------

    public static void RestoreOnStartup()
    {
        if (IsActive) Apply();
    }

    private static void Apply()
    {
        lock (Gate)
        {
            using (var k = Registry.CurrentUser.CreateSubKey(PoliciesKey))
            {
                if (Config.Get("kiosk.blockTaskManager", true)) k.SetValue("DisableTaskMgr", 1, RegistryValueKind.DWord);
                else k.DeleteValue("DisableTaskMgr", false);
            }

            using (var k = Registry.CurrentUser.CreateSubKey(WinlogonKey))
            {
                // נעילה קפדנית: המעטפת היא הגשר, שמפעיל את אוצריא. ללא strict המעטפת לא משתנה
                if (Config.Get("kiosk.strict", false))
                    k.SetValue("Shell", "\"" + Installer.InstalledExe + "\" --background", RegistryValueKind.String);
                else k.DeleteValue("Shell", false);
            }

            Tray.Invoke(InstallHook);
            _watchdog ??= new System.Threading.Timer(_ => Watch(), null, 0, 2000);
            Tray.SetKioskState(true);
        }
    }

    private static void Release()
    {
        lock (Gate)
        {
            Config.Set("kiosk.active", false);
            Config.Set("kiosk.strict", false);
            Config.Save();
            _watchdog?.Dispose();
            _watchdog = null;
            Tray.Invoke(RemoveHook);
            ClearRegistry();
            StartExplorer();
            Tray.SetKioskState(false);
        }
    }

    private static void ClearRegistry()
    {
        try
        {
            using (var k = Registry.CurrentUser.OpenSubKey(PoliciesKey, true)) k?.DeleteValue("DisableTaskMgr", false);
            using (var k = Registry.CurrentUser.OpenSubKey(WinlogonKey, true)) k?.DeleteValue("Shell", false);
        }
        catch (Exception ex) { Config.Log("kiosk clear: " + ex.Message); }
    }

    private static void StartExplorer()
    {
        try
        {
            if (Process.GetProcessesByName("explorer").Length == 0)
                Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe"))
                    { UseShellExecute = true });
        }
        catch { }
    }

    /// <summary>קוד שחזור משורת הפקודה: OtzariaBridge.exe --unlock CODE</summary>
    public static bool EmergencyUnlock(string code)
    {
        if (!Matches(NormalizeRecovery(code), "kiosk.recoveryHash", "kiosk.recoverySalt")) return false;
        int self = Environment.ProcessId;
        foreach (var p in Process.GetProcessesByName("OtzariaBridge"))
        {
            if (p.Id == self) continue;
            try { p.Kill(); p.WaitForExit(3000); } catch { }
        }
        Config.Reload();
        Config.Set("kiosk.active", false);
        Config.Set("kiosk.strict", false);
        Config.Save();
        ClearRegistry();
        StartExplorer();
        return true;
    }

    /// <summary>ביטול נעילה בזמן הסרה</summary>
    public static string ReleaseForUninstall(string password)
    {
        if (HasPassword && !(Matches(password, "kiosk.passwordHash", "kiosk.salt") ||
                             Matches(NormalizeRecovery(password), "kiosk.recoveryHash", "kiosk.recoverySalt")))
            return "נדרשת סיסמת הנעילה: --password <סיסמה>";
        Config.Set("kiosk.active", false);
        Config.Set("kiosk.strict", false);
        ClearRegistry();
        StartExplorer();
        return null;
    }

    // ---------- מעקב ----------

    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr hWnd, int cmd);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] private static extern void SwitchToThisWindow(IntPtr hWnd, bool altTab);

    private static int _watchBusy;

    private static void Watch()
    {
        if (!IsActive || Interlocked.Exchange(ref _watchBusy, 1) == 1) return;
        try
        {
            int session = Process.GetCurrentProcess().SessionId;
            foreach (var p in Process.GetProcessesByName("explorer"))
            {
                try { if (p.SessionId == session) p.Kill(); } catch { }
            }

            string path = OtzariaPath();
            string name = string.IsNullOrEmpty(path) ? "otzaria" : Path.GetFileNameWithoutExtension(path);
            var otz = Process.GetProcessesByName(name).FirstOrDefault(p => p.SessionId == session);
            if (otz == null)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                    Process.Start(new ProcessStartInfo(path) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(path) });
                return;
            }

            IntPtr hwnd = otz.MainWindowHandle;
            if (hwnd == IntPtr.Zero) return;
            GetWindowThreadProcessId(GetForegroundWindow(), out uint fgPid);
            if (fgPid == otz.Id || fgPid == Environment.ProcessId) return;
            if (IsIconic(hwnd)) ShowWindow(hwnd, 9 /* SW_RESTORE */);
            if (!SetForegroundWindow(hwnd)) SwitchToThisWindow(hwnd, true);
        }
        catch (Exception ex) { Config.Log("watchdog: " + ex.Message); }
        finally { Interlocked.Exchange(ref _watchBusy, 0); }
    }

    // ---------- חסימת מקשים ----------

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT { public uint vkCode, scanCode, flags, time; public IntPtr extra; }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc fn, IntPtr hMod, uint threadId);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hhk);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int vKey);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string name);

    private static void InstallHook()
    {
        if (_hook != IntPtr.Zero) return;
        _hookProc = HookCallback;
        _hook = SetWindowsHookEx(13 /* WH_KEYBOARD_LL */, _hookProc, GetModuleHandle(null), 0);
        if (_hook == IntPtr.Zero) Config.Log("keyboard hook failed: " + Marshal.GetLastWin32Error());
    }

    private static void RemoveHook()
    {
        if (_hook == IntPtr.Zero) return;
        UnhookWindowsHookEx(_hook);
        _hook = IntPtr.Zero;
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            var k = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);
            bool alt = (k.flags & 0x20) != 0;
            bool ctrl = (GetAsyncKeyState(0x11) & 0x8000) != 0;
            uint vk = k.vkCode;
            bool block =
                vk is 0x5B or 0x5C ||                     // Win
                (alt && vk is 0x09 or 0x1B or 0x73) ||   // Alt+Tab, Alt+Esc, Alt+F4
                (ctrl && vk == 0x1B);                     // Ctrl+Esc
            if (block) return (IntPtr)1;
        }
        return CallNextHookEx(_hook, nCode, wParam, lParam);
    }
}
