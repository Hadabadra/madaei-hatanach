using System.Net;
using System.Net.Sockets;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace OtzariaBridge;

/// <summary>שגיאה עם קוד מהחוזה (bad_request, not_found, forbidden, exists, locked, wrong_password, unsupported, internal)</summary>
public class BridgeException : Exception
{
    public string Code { get; }
    public int Status { get; }
    public BridgeException(string code, string message, int status = 400) : base(message)
    {
        Code = code;
        Status = status;
    }

    public static BridgeException BadRequest(string m) => new("bad_request", m, 400);
    public static BridgeException NotFound(string m) => new("not_found", m, 404);
    public static BridgeException Forbidden(string m) => new("forbidden", m, 403);
    public static BridgeException Exists(string m) => new("exists", m, 409);
    public static BridgeException Locked(string m = "הפעולה חסומה במצב נעילה") => new("locked", m, 423);
    public static BridgeException Unsupported(string m = "לא נתמך במחשב זה") => new("unsupported", m, 501);
}

public static class Server
{
    public const int FirstPort = 47917;
    public const int LastPort = 47921;

    public static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };

    private static readonly Dictionary<string, Func<JsonElement, Task<object>>> Routes = new(StringComparer.OrdinalIgnoreCase);
    private static WebApplication _app;

    public static void Route(string path, Func<JsonElement, Task<object>> handler) => Routes[path] = handler;
    public static void Route(string path, Func<JsonElement, object> handler) => Routes[path] = b => Task.FromResult(handler(b));

    public static int Start()
    {
        FsApi.Register();
        SysApi.Register();
        Kiosk.Register();

        int port = FindPort();
        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(o =>
        {
            o.Listen(IPAddress.Loopback, port);
            o.Limits.MaxRequestBodySize = 64L * 1024 * 1024;
        });
        _app = builder.Build();
        _app.Run(Handle);
        _app.StartAsync().GetAwaiter().GetResult();
        Config.Log("listening on " + port);
        return port;
    }

    public static void Stop()
    {
        try { _app?.StopAsync().Wait(2000); } catch { }
    }

    private static int FindPort()
    {
        for (int p = FirstPort; p <= LastPort; p++)
        {
            try
            {
                var l = new TcpListener(IPAddress.Loopback, p);
                l.Start();
                l.Stop();
                return p;
            }
            catch (SocketException) { }
        }
        throw new InvalidOperationException("כל הפורטים 47917-47921 תפוסים");
    }

    private static async Task Handle(HttpContext ctx)
    {
        var req = ctx.Request;
        try
        {
            // הגנה מפני אתרי אינטרנט שפונים ל-localhost
            if (HttpMethods.IsOptions(req.Method))
                throw BridgeException.Forbidden("בקשות OPTIONS אינן נתמכות");
            string origin = req.Headers.Origin.ToString();
            if (origin.Length > 0 && origin != "null")
                throw BridgeException.Forbidden("מקור הבקשה אינו מורשה");
            if (req.Headers["X-Otzaria-Bridge"].ToString() != "1")
                throw BridgeException.Forbidden("חסרה הכותרת X-Otzaria-Bridge");

            string path = (req.Path.Value ?? "/").TrimEnd('/');
            if (path.Length == 0) path = "/";

            if (path.Equals("/health", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsGet(req.Method))
            {
                await WriteOk(ctx, new
                {
                    name = "otzaria-bridge",
                    version = Program.Version,
                    port = Program.Port,
                    kioskActive = Kiosk.IsActive,
                    platform = "windows",
                });
                return;
            }

            if (!HttpMethods.IsPost(req.Method))
                throw new BridgeException("bad_request", "יש להשתמש ב-POST", 405);

            using var doc = await ReadBody(req);
            var body = doc.RootElement;

            if (path.Equals("/fs/search", StringComparison.OrdinalIgnoreCase))
            {
                await FsApi.Search(ctx, body);
                return;
            }

            if (!Routes.TryGetValue(path, out var handler))
                throw BridgeException.NotFound("נקודת קצה לא קיימת: " + path);

            object data = await handler(body);
            await WriteOk(ctx, data);
        }
        catch (Exception ex)
        {
            if (ctx.Response.HasStarted) return;
            var (code, status, message) = Map(ex);
            if (code == "internal") Config.Log(req.Path + ": " + ex);
            ctx.Response.StatusCode = status;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                new { ok = false, error = new { code, message } }, Json));
        }
    }

    private static (string code, int status, string message) Map(Exception ex) => ex switch
    {
        BridgeException b => (b.Code, b.Status, b.Message),
        JsonException => ("bad_request", 400, "גוף הבקשה אינו JSON תקין"),
        UnauthorizedAccessException => ("forbidden", 403, "אין הרשאת גישה: " + ex.Message),
        FileNotFoundException or DirectoryNotFoundException => ("not_found", 404, "לא נמצא: " + ex.Message),
        PlatformNotSupportedException => ("unsupported", 501, ex.Message),
        PathTooLongException or ArgumentException or NotSupportedException => ("bad_request", 400, ex.Message),
        System.Runtime.InteropServices.COMException => ("unsupported", 501, "לא נתמך במחשב זה: " + ex.Message),
        _ => ("internal", 500, "שגיאה פנימית: " + ex.Message),
    };

    private static async Task<JsonDocument> ReadBody(HttpRequest req)
    {
        using var ms = new MemoryStream();
        await req.Body.CopyToAsync(ms);
        if (ms.Length == 0) return JsonDocument.Parse("{}");
        ms.Position = 0;
        var doc = await JsonDocument.ParseAsync(ms);
        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            throw BridgeException.BadRequest("גוף הבקשה חייב להיות אובייקט JSON");
        return doc;
    }

    private static Task WriteOk(HttpContext ctx, object data)
    {
        ctx.Response.StatusCode = 200;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { ok = true, data }, Json));
    }
}

/// <summary>עזרי קריאה מגוף JSON</summary>
public static class J
{
    public static string Str(this JsonElement e, string name, string fallback = null) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : fallback;

    public static string Req(this JsonElement e, string name)
    {
        string s = e.Str(name);
        if (string.IsNullOrWhiteSpace(s)) throw BridgeException.BadRequest("חסר השדה " + name);
        return s;
    }

    public static bool Bool(this JsonElement e, string name, bool fallback = false) =>
        e.TryGetProperty(name, out var v) && (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False)
            ? v.GetBoolean() : fallback;

    public static bool? BoolOpt(this JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False)
            ? v.GetBoolean() : null;

    public static long Long(this JsonElement e, string name, long fallback) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out long n) ? n : fallback;

    public static double? Num(this JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : null;

    public static string[] StrArray(this JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
        return v.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString()).Where(s => !string.IsNullOrEmpty(s)).ToArray();
    }

    public static bool Has(this JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null && v.ValueKind != JsonValueKind.Undefined;
}
