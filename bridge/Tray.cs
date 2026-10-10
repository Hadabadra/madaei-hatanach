namespace OtzariaBridge;

/// <summary>אייקון במגש. רץ על החוט הראשי (STA) עם לולאת הודעות, שנדרשת גם ל-hook המקלדת</summary>
public static class Tray
{
    private static NotifyIcon _icon;
    private static ToolStripMenuItem _status, _exit, _plugins, _lang;
    private static ContextMenuStrip _menu;
    private static Control _invoker;

    public static void Init()
    {
        _invoker = new Control();
        _invoker.CreateControl();
        _ = _invoker.Handle;

        var menu = _menu = new ContextMenuStrip();
        _status = new ToolStripMenuItem("") { Enabled = false };
        _plugins = new ToolStripMenuItem("", null, (_, _) => Installer.OpenPluginsFolder());
        _lang = new ToolStripMenuItem("", null, (_, _) => { Lang.Set(Lang.En ? "he" : "en"); ApplyTexts(); });
        _exit = new ToolStripMenuItem("", null, (_, _) => Application.ExitThread());
        menu.Items.AddRange(new ToolStripItem[] { _status, _plugins, _lang, new ToolStripSeparator(), _exit });

        _icon = new NotifyIcon
        {
            Icon = LoadIcon(),
            Text = Lang.T("גשר אוצריא", "Otzaria Bridge"),
            ContextMenuStrip = menu,
            Visible = true,
        };
        Application.ApplicationExit += (_, _) =>
        {
            _icon.Visible = false;
            _icon.Dispose();
        };
    }

    private static void ApplyTexts()
    {
        if (_menu == null) return;
        _menu.RightToLeft = Lang.En ? RightToLeft.No : RightToLeft.Yes;
        _plugins.Text = Lang.T("פתח את תיקיית התוספים", "Open the plugins folder");
        _lang.Text = Lang.T("English", "עברית");
        _exit.Text = Lang.T("יציאה", "Exit");
        UpdateStatus();
    }

    private static Icon LoadIcon()
    {
        try { return Icon.ExtractAssociatedIcon(Environment.ProcessPath!) ?? SystemIcons.Application; }
        catch { return SystemIcons.Application; }
    }

    public static void Run()
    {
        ApplyTexts();
        Application.Run();
    }

    public static void Invoke(Action a)
    {
        if (_invoker == null || !_invoker.IsHandleCreated) { a(); return; }
        if (_invoker.InvokeRequired) _invoker.Invoke(a);
        else a();
    }

    public static void SetKioskState(bool active) => Invoke(() =>
    {
        if (_exit != null) _exit.Enabled = !active; // במצב נעילה אין יציאה מהמגש
        UpdateStatus();
    });

    private static void UpdateStatus()
    {
        if (_status == null) return;
        string text = Lang.T("גשר אוצריא ", "Otzaria Bridge ") + Program.Version + Lang.T(" — פורט ", " — port ") + Program.Port;
        if (Kiosk.IsActive) text += Lang.T(" (נעילה פעילה)", " (lock mode on)");
        _status.Text = text;
        if (_icon != null) _icon.Text = text.Length > 63 ? text[..63] : text;
    }
}
