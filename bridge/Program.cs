using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace OtzariaBridge;

public static class Program
{
    public const string Version = "0.0.1";
    public static int Port { get; set; }

    [DllImport("kernel32.dll")] private static extern bool AttachConsole(int pid);

    [STAThread]
    public static int Main(string[] args)
    {
        string Arg(string name)
        {
            int i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
        bool Has(string name) => Array.IndexOf(args, name) >= 0;

        try
        {
            Lang.FromArgs(args);
            if (Has("--unlock"))
            {
                AttachConsole(-1);
                bool ok = Kiosk.EmergencyUnlock(Arg("--unlock") ?? "");
                Console.WriteLine(ok ? Lang.T("הנעילה בוטלה.", "Lock mode turned off.") : Lang.T("קוד שחזור שגוי.", "Wrong recovery code."));
                return ok ? 0 : 2;
            }
            if (Has("--uninstall"))
            {
                AttachConsole(-1);
                string err = Installer.Uninstall(Arg("--password"));
                Console.WriteLine(err ?? Lang.T("הגשר הוסר.", "The bridge was removed."));
                return err == null ? 0 : 2;
            }
            if (Has("--install") || (!Installer.IsRunningFromInstallDir() && !Has("--portable")))
            {
                Installer.Install(showMessage: !Has("--quiet"));
                return 0;
            }

            using var mutex = new Mutex(true, @"Local\OtzariaBridge", out bool first);
            if (!first) return 0;

            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Tray.Init();
            Port = Server.Start();
            Kiosk.RestoreOnStartup();
            Tray.Run();
            Server.Stop();
            return 0;
        }
        catch (Exception ex)
        {
            Config.Log("fatal: " + ex);
            return 1;
        }
    }
}

/// <summary>קובץ הגדרות ב-%LOCALAPPDATA%\OtzariaBridge\config.json</summary>
public static class Config
{
    private static readonly object Gate = new();
    private static JsonObject _data;

    public static string Dir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OtzariaBridge");
    public static string FilePath => Path.Combine(Dir, "config.json");

    private static JsonObject Data
    {
        get
        {
            if (_data != null) return _data;
            try
            {
                if (File.Exists(FilePath))
                    _data = JsonNode.Parse(File.ReadAllText(FilePath)) as JsonObject;
            }
            catch { }
            return _data ??= new JsonObject();
        }
    }

    public static T Get<T>(string key, T fallback)
    {
        lock (Gate)
        {
            try
            {
                var n = Data[key];
                return n == null ? fallback : n.GetValue<T>();
            }
            catch { return fallback; }
        }
    }

    public static string[] GetList(string key)
    {
        lock (Gate)
        {
            if (Data[key] is JsonArray a)
                return a.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0).ToArray();
            return Array.Empty<string>();
        }
    }

    public static void Set(string key, JsonNode value)
    {
        lock (Gate) { Data[key] = value; }
    }

    public static void Remove(string key)
    {
        lock (Gate) { Data.Remove(key); }
    }

    public static void Reload()
    {
        lock (Gate) { _data = null; }
    }

    public static void Save()
    {
        lock (Gate)
        {
            Directory.CreateDirectory(Dir);
            string tmp = FilePath + ".tmp";
            File.WriteAllText(tmp, Data.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
            File.Move(tmp, FilePath, true);
        }
    }

    public static void Log(string line)
    {
        try
        {
            Directory.CreateDirectory(Dir);
            File.AppendAllText(Path.Combine(Dir, "bridge.log"), DateTime.Now.ToString("s") + " " + line + Environment.NewLine);
        }
        catch { }
    }

    public static string Run(string file, string arguments, int timeoutMs = 15000)
    {
        var psi = new ProcessStartInfo(file, arguments)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = System.Text.Encoding.UTF8,
        };
        using var p = Process.Start(psi);
        string output = p.StandardOutput.ReadToEnd();
        p.WaitForExit(timeoutMs);
        return output;
    }
}
