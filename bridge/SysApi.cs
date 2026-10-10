using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using System.Security;
using System.Text.Json;
using System.Text.RegularExpressions;
using Windows.Devices.Bluetooth;
using Windows.Devices.Enumeration;
using Windows.Devices.Radios;

namespace OtzariaBridge;

/// <summary>נקודות הקצה /sys/* — מה שלא נתמך מחזיר unsupported</summary>
public static class SysApi
{
    public static void Register()
    {
        Server.Route("/sys/info", _ => Info());
        Server.Route("/sys/audio/get", _ => Audio.Get());
        Server.Route("/sys/audio/set", AudioSet);
        Server.Route("/sys/audio/devices", _ => new { devices = Audio.Devices() });
        Server.Route("/sys/audio/set-default", b =>
        {
            Audio.SetDefault(b.Req("id"));
            return new { ok = true };
        });
        Server.Route("/sys/display/get", _ => DisplayGet());
        Server.Route("/sys/display/set", DisplaySet);
        Server.Route("/sys/radios/get", async _ => new { radios = await RadiosGet() });
        Server.Route("/sys/radios/set", RadiosSet);
        Server.Route("/sys/bluetooth/devices", BtDevices);
        Server.Route("/sys/bluetooth/pair", BtPair);
        Server.Route("/sys/bluetooth/unpair", BtUnpair);
        Server.Route("/sys/wifi/networks", _ => Wifi.Networks());
        Server.Route("/sys/wifi/connect", b => Wifi.Connect(b.Req("ssid"), b.Str("password")));
        Server.Route("/sys/wifi/disconnect", _ =>
        {
            Config.Run("netsh", "wlan disconnect");
            return new { ok = true };
        });
        Server.Route("/sys/power", Power);
    }

    // ---------- מידע ----------

    private static object Info()
    {
        object battery = null;
        var ps = SystemInformation.PowerStatus;
        if (ps.BatteryChargeStatus != BatteryChargeStatus.NoSystemBattery && ps.BatteryChargeStatus != BatteryChargeStatus.Unknown)
            battery = new { percent = (int)Math.Round(ps.BatteryLifePercent * 100), charging = ps.PowerLineStatus == PowerLineStatus.Online };
        return new
        {
            computerName = Environment.MachineName,
            userName = Environment.UserName,
            os = RuntimeInformation.OSDescription,
            battery,
            time = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ssK"),
        };
    }

    private static object AudioSet(JsonElement b)
    {
        double? v = b.Num("volume");
        bool? m = b.BoolOpt("muted");
        Audio.Set(v.HasValue ? (int)Math.Clamp(Math.Round(v.Value), 0, 100) : null, m);
        return Audio.Get();
    }

    // ---------- בהירות (WMI) ----------

    private static object DisplayGet()
    {
        try
        {
            using var s = new ManagementObjectSearcher(@"root\WMI", "SELECT CurrentBrightness FROM WmiMonitorBrightness");
            foreach (ManagementObject o in s.Get())
                return new { brightness = (int?)Convert.ToInt32(o["CurrentBrightness"]), supported = true };
        }
        catch { }
        return new { brightness = (int?)null, supported = false };
    }

    private static object DisplaySet(JsonElement b)
    {
        double? v = b.Num("brightness");
        if (!v.HasValue) throw BridgeException.BadRequest("חסר brightness");
        byte level = (byte)Math.Clamp(Math.Round(v.Value), 0, 100);
        bool done = false;
        try
        {
            using var s = new ManagementObjectSearcher(@"root\WMI", "SELECT * FROM WmiMonitorBrightnessMethods");
            foreach (ManagementObject o in s.Get())
            {
                o.InvokeMethod("WmiSetBrightness", new object[] { (uint)1, level });
                done = true;
            }
        }
        catch { }
        if (!done) throw BridgeException.Unsupported("שינוי בהירות אינו נתמך במסך זה");
        return DisplayGet();
    }

    // ---------- רדיו ----------

    private static string KindName(RadioKind k) => k switch
    {
        RadioKind.Bluetooth => "bluetooth",
        RadioKind.WiFi => "wifi",
        _ => "other",
    };

    private static string StateName(RadioState s) => s switch
    {
        RadioState.On => "on",
        RadioState.Off => "off",
        RadioState.Disabled => "disabled",
        _ => "unknown",
    };

    private static async Task<List<object>> RadiosGet()
    {
        var list = new List<object>();
        foreach (var r in await Radio.GetRadiosAsync())
            list.Add(new { kind = KindName(r.Kind), name = r.Name, state = StateName(r.State) });
        return list;
    }

    private static async Task<object> RadiosSet(JsonElement b)
    {
        string kind = b.Req("kind");
        bool on = b.Bool("on");
        var access = await Radio.RequestAccessAsync();
        if (access != RadioAccessStatus.Allowed) throw BridgeException.Unsupported("אין גישה לשליטה ברדיו");
        bool found = false;
        foreach (var r in await Radio.GetRadiosAsync())
        {
            if (KindName(r.Kind) != kind) continue;
            found = true;
            var res = await r.SetStateAsync(on ? RadioState.On : RadioState.Off);
            if (res != RadioAccessStatus.Allowed) throw BridgeException.Unsupported("שינוי מצב הרדיו נדחה");
        }
        if (!found) throw BridgeException.NotFound("לא נמצא רדיו מסוג " + kind);
        return new { radios = await RadiosGet() };
    }

    // ---------- בלוטות׳ ----------

    private static async Task<object> BtDevices(JsonElement b)
    {
        bool scan = b.Bool("scan");
        var result = new List<object>();
        var seen = new HashSet<string>();

        async Task Collect(string selector, string kind)
        {
            var found = await DeviceInformation.FindAllAsync(selector).AsTask().WaitAsync(TimeSpan.FromSeconds(12));
            foreach (var d in found)
            {
                if (!seen.Add(d.Id) || string.IsNullOrWhiteSpace(d.Name)) continue;
                bool connected = false;
                if (d.Pairing.IsPaired && kind == "classic")
                {
                    try
                    {
                        using var dev = await BluetoothDevice.FromIdAsync(d.Id);
                        connected = dev?.ConnectionStatus == BluetoothConnectionStatus.Connected;
                    }
                    catch { }
                }
                result.Add(new { id = d.Id, name = d.Name, paired = d.Pairing.IsPaired, connected, kind });
            }
        }

        await Collect(BluetoothDevice.GetDeviceSelectorFromPairingState(true), "classic");
        await Collect(Windows.Devices.Bluetooth.BluetoothLEDevice.GetDeviceSelectorFromPairingState(true), "le");
        if (scan)
        {
            await Collect(BluetoothDevice.GetDeviceSelectorFromPairingState(false), "classic");
            await Collect(Windows.Devices.Bluetooth.BluetoothLEDevice.GetDeviceSelectorFromPairingState(false), "le");
        }
        return new { devices = result };
    }

    private static async Task<object> BtPair(JsonElement b)
    {
        var d = await DeviceInformation.CreateFromIdAsync(b.Req("id"));
        if (d.Pairing.IsPaired) return new { paired = true };
        if (!d.Pairing.CanPair) throw BridgeException.Unsupported("לא ניתן להצמיד מכשיר זה");
        var r = await d.Pairing.PairAsync();
        bool ok = r.Status is DevicePairingResultStatus.Paired or DevicePairingResultStatus.AlreadyPaired;
        if (!ok) throw new BridgeException("internal", "ההצמדה נכשלה: " + r.Status, 500);
        return new { paired = true };
    }

    private static async Task<object> BtUnpair(JsonElement b)
    {
        var d = await DeviceInformation.CreateFromIdAsync(b.Req("id"));
        if (!d.Pairing.IsPaired) return new { unpaired = true };
        var r = await d.Pairing.UnpairAsync();
        bool ok = r.Status is DeviceUnpairingResultStatus.Unpaired or DeviceUnpairingResultStatus.AlreadyUnpaired;
        if (!ok) throw new BridgeException("internal", "ביטול ההצמדה נכשל: " + r.Status, 500);
        return new { unpaired = true };
    }

    // ---------- הפעלה ----------

    [DllImport("user32.dll")] private static extern bool LockWorkStation();

    private static object Power(JsonElement b)
    {
        string action = b.Req("action");
        // מותר גם במצב נעילה; הנעילה חוזרת בהפעלה הבאה של הגשר
        switch (action)
        {
            case "sleep":
                Task.Run(async () => { await Task.Delay(500); Application.SetSuspendState(PowerState.Suspend, false, false); });
                break;
            case "restart":
                Process.Start(new ProcessStartInfo("shutdown", "/r /t 0") { CreateNoWindow = true, UseShellExecute = false });
                break;
            case "shutdown":
                Process.Start(new ProcessStartInfo("shutdown", "/s /t 0") { CreateNoWindow = true, UseShellExecute = false });
                break;
            case "lock":
                if (!LockWorkStation()) throw BridgeException.Unsupported("נעילת המחשב נכשלה");
                break;
            default:
                throw BridgeException.BadRequest("action לא מוכר: " + action);
        }
        return new { ok = true };
    }
}

/// <summary>Wi-Fi דרך netsh wlan, עם פענוח שאינו תלוי בשפת המערכת</summary>
public static class Wifi
{
    private static string Netsh(string args) => Config.Run("cmd.exe", "/c chcp 65001 >nul & netsh " + args, 20000);

    public static string Connected()
    {
        foreach (string line in Netsh("wlan show interfaces").Split('\n'))
        {
            var m = Regex.Match(line, @"^\s+SSID\s+:\s(.*)$");
            if (m.Success) return m.Groups[1].Value.Trim();
        }
        return null;
    }

    private static HashSet<string> Profiles()
    {
        var set = new HashSet<string>();
        string output = Netsh("wlan show profiles");
        int sep = output.LastIndexOf("-----", StringComparison.Ordinal);
        string tail = sep >= 0 ? output[sep..] : output;
        foreach (string line in tail.Split('\n'))
        {
            int i = line.IndexOf(" : ", StringComparison.Ordinal);
            if (i > 0) set.Add(line[(i + 3)..].Trim());
        }
        return set;
    }

    public static object Networks()
    {
        string output = Netsh("wlan show networks mode=bssid");
        if (output.Contains("wlansvc", StringComparison.OrdinalIgnoreCase))
            throw BridgeException.Unsupported("שירות ה-Wi-Fi אינו פעיל במחשב זה");

        string connected = Connected();
        var known = Profiles();
        var nets = new Dictionary<string, (int signal, bool secured)>();
        string current = null;
        int lineInBlock = 0;
        foreach (string raw in output.Split('\n'))
        {
            string line = raw.TrimEnd('\r');
            var m = Regex.Match(line, @"^SSID \d+\s*:\s?(.*)$");
            if (m.Success)
            {
                current = m.Groups[1].Value.Trim();
                lineInBlock = 0;
                if (current.Length > 0 && !nets.ContainsKey(current)) nets[current] = (0, true);
                continue;
            }
            if (string.IsNullOrEmpty(current)) continue;
            lineInBlock++;
            int colon = line.IndexOf(':');
            string value = colon >= 0 ? line[(colon + 1)..].Trim() : "";
            // השורה השנייה בגוש היא סוג האימות; הערכים באנגלית בכל שפה
            if (lineInBlock == 2)
                nets[current] = (nets[current].signal, !value.Equals("Open", StringComparison.OrdinalIgnoreCase));
            var pct = Regex.Match(line, @":\s*(\d{1,3})%");
            if (pct.Success)
            {
                int s = int.Parse(pct.Groups[1].Value);
                if (s > nets[current].signal) nets[current] = (s, nets[current].secured);
            }
        }

        var list = nets.Select(kv => new
        {
            ssid = kv.Key,
            signal = kv.Value.signal,
            secured = kv.Value.secured,
            connected = kv.Key == connected,
            known = known.Contains(kv.Key),
        }).OrderByDescending(n => n.connected).ThenByDescending(n => n.signal).ToList();
        return new { connected, networks = list };
    }

    public static object Connect(string ssid, string password)
    {
        if (ssid.Contains('"')) throw BridgeException.BadRequest("שם רשת לא חוקי");
        if (!Profiles().Contains(ssid) || !string.IsNullOrEmpty(password))
        {
            string xml = ProfileXml(ssid, password);
            string tmp = Path.Combine(Path.GetTempPath(), "otzaria-wifi-" + Guid.NewGuid().ToString("N") + ".xml");
            File.WriteAllText(tmp, xml);
            try { Netsh("wlan add profile filename=\"" + tmp + "\" user=current"); }
            finally { try { File.Delete(tmp); } catch { } }
        }
        Netsh("wlan connect name=\"" + ssid + "\" ssid=\"" + ssid + "\"");
        for (int i = 0; i < 20; i++)
        {
            Thread.Sleep(500);
            if (Connected() == ssid) return new { connected = true };
        }
        return new { connected = false };
    }

    private static string ProfileXml(string ssid, string password)
    {
        string name = SecurityElement.Escape(ssid);
        string hex = Convert.ToHexString(System.Text.Encoding.UTF8.GetBytes(ssid));
        string security = string.IsNullOrEmpty(password)
            ? "<authEncryption><authentication>open</authentication><encryption>none</encryption><useOneX>false</useOneX></authEncryption>"
            : "<authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption>" +
              "<sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>" +
              SecurityElement.Escape(password) + "</keyMaterial></sharedKey>";
        return "<?xml version=\"1.0\"?><WLANProfile xmlns=\"http://www.microsoft.com/networking/WLAN/profile/v1\">" +
               "<name>" + name + "</name><SSIDConfig><SSID><hex>" + hex + "</hex><name>" + name + "</name></SSID></SSIDConfig>" +
               "<connectionType>ESS</connectionType><connectionMode>auto</connectionMode>" +
               "<MSM><security>" + security + "</security></MSM></WLANProfile>";
    }
}

/// <summary>שמע דרך Core Audio COM</summary>
public static class Audio
{
    private enum EDataFlow { eRender, eCapture, eAll }
    private enum ERole { eConsole, eMultimedia, eCommunications }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROPERTYKEY { public Guid fmtid; public int pid; }

    [StructLayout(LayoutKind.Explicit, Size = 24)]
    private struct PROPVARIANT
    {
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr ptr;
    }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator
    {
        void EnumAudioEndpoints(EDataFlow flow, uint stateMask, out IMMDeviceCollection devices);
        void GetDefaultAudioEndpoint(EDataFlow flow, ERole role, out IMMDevice device);
        void GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    }

    [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceCollection
    {
        void GetCount(out uint count);
        void Item(uint index, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice
    {
        void Activate(ref Guid iid, uint clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
        void OpenPropertyStore(uint access, out IPropertyStore store);
        void GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        void GetState(out uint state);
    }

    [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {
        void GetCount(out uint count);
        void GetAt(uint index, out PROPERTYKEY key);
        void GetValue(ref PROPERTYKEY key, out PROPVARIANT value);
    }

    [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioEndpointVolume
    {
        void RegisterControlChangeNotify(IntPtr notify);
        void UnregisterControlChangeNotify(IntPtr notify);
        void GetChannelCount(out uint count);
        void SetMasterVolumeLevel(float levelDb, ref Guid ctx);
        void SetMasterVolumeLevelScalar(float level, ref Guid ctx);
        void GetMasterVolumeLevel(out float levelDb);
        void GetMasterVolumeLevelScalar(out float level);
        void SetChannelVolumeLevel(uint channel, float levelDb, ref Guid ctx);
        void SetChannelVolumeLevelScalar(uint channel, float level, ref Guid ctx);
        void GetChannelVolumeLevel(uint channel, out float levelDb);
        void GetChannelVolumeLevelScalar(uint channel, out float level);
        void SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
        void GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
    }

    // ממשק לא מתועד להחלפת התקן ברירת מחדל (Windows 7 ואילך)
    [ComImport, Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPolicyConfig
    {
        void GetMixFormat();
        void GetDeviceFormat();
        void ResetDeviceFormat();
        void SetDeviceFormat();
        void GetProcessingPeriod();
        void SetProcessingPeriod();
        void GetShareMode();
        void SetShareMode();
        void GetPropertyValue();
        void SetPropertyValue();
        void SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, ERole role);
    }

    [DllImport("ole32.dll")] private static extern int PropVariantClear(ref PROPVARIANT pv);

    private static readonly Guid EnumeratorClsid = new("BCDE0395-E52F-467C-8E3D-C4579291692E");
    private static readonly Guid PolicyClsid = new("870af99c-171d-4f9e-af0d-e63df40c2bc9");
    private static readonly object Gate = new();

    private static IMMDeviceEnumerator Enumerator() =>
        (IMMDeviceEnumerator)Activator.CreateInstance(Type.GetTypeFromCLSID(EnumeratorClsid)!)!;

    private static IMMDevice DefaultDevice()
    {
        try
        {
            Enumerator().GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out var d);
            return d;
        }
        catch (COMException) { throw BridgeException.Unsupported("לא נמצא התקן שמע"); }
    }

    private static IAudioEndpointVolume Volume(IMMDevice d)
    {
        var iid = typeof(IAudioEndpointVolume).GUID;
        d.Activate(ref iid, 23 /* CLSCTX_ALL */, IntPtr.Zero, out object o);
        return (IAudioEndpointVolume)o;
    }

    private static string Name(IMMDevice d)
    {
        try
        {
            d.OpenPropertyStore(0, out var store);
            var key = new PROPERTYKEY { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
            store.GetValue(ref key, out var pv);
            string s = pv.vt == 31 ? Marshal.PtrToStringUni(pv.ptr) : null;
            PropVariantClear(ref pv);
            return s ?? "";
        }
        catch { return ""; }
    }

    public static object Get()
    {
        lock (Gate)
        {
            var d = DefaultDevice();
            var v = Volume(d);
            v.GetMasterVolumeLevelScalar(out float level);
            v.GetMute(out bool muted);
            return new { volume = (int)Math.Round(level * 100), muted, deviceName = Name(d) };
        }
    }

    public static void Set(int? volume, bool? muted)
    {
        lock (Gate)
        {
            var v = Volume(DefaultDevice());
            var ctx = Guid.Empty;
            if (volume.HasValue) v.SetMasterVolumeLevelScalar(volume.Value / 100f, ref ctx);
            if (muted.HasValue) v.SetMute(muted.Value, ref ctx);
        }
    }

    public static List<object> Devices()
    {
        lock (Gate)
        {
            var e = Enumerator();
            string defId = "";
            try
            {
                e.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out var def);
                def.GetId(out defId);
            }
            catch { }
            e.EnumAudioEndpoints(EDataFlow.eRender, 1 /* ACTIVE */, out var col);
            col.GetCount(out uint n);
            var list = new List<object>();
            for (uint i = 0; i < n; i++)
            {
                col.Item(i, out var d);
                d.GetId(out string id);
                list.Add(new { id, name = Name(d), isDefault = id == defId });
            }
            return list;
        }
    }

    public static void SetDefault(string id)
    {
        try
        {
            var p = (IPolicyConfig)Activator.CreateInstance(Type.GetTypeFromCLSID(PolicyClsid)!)!;
            p.SetDefaultEndpoint(id, ERole.eConsole);
            p.SetDefaultEndpoint(id, ERole.eMultimedia);
            p.SetDefaultEndpoint(id, ERole.eCommunications);
        }
        catch (Exception ex) when (ex is not BridgeException)
        {
            throw BridgeException.Unsupported("החלפת התקן שמע אינה נתמכת: " + ex.Message);
        }
    }
}
