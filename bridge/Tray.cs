namespace OtzariaBridge;

/// <summary>אייקון במגש. רץ על החוט הראשי (STA) עם לולאת הודעות, שנדרשת גם ל-hook המקלדת</summary>
public static class Tray
{
    private static NotifyIcon _icon;
    private static ToolStripMenuItem _status, _exit;
    private static Control _invoker;

    public static void Init()
    {
        _invoker = new Control();
        _invoker.CreateControl();
        _ = _invoker.Handle;

        var menu = new ContextMenuStrip { RightToLeft = RightToLeft.Yes };
        _status = new ToolStripMenuItem("גשר אוצריא") { Enabled = false };
        var plugins = new ToolStripMenuItem("פתח את תיקיית התוספים", null, (_, _) => Installer.OpenPluginsFolder());
        _exit = new ToolStripMenuItem("יציאה", null, (_, _) => Application.ExitThread());
        menu.Items.AddRange(new ToolStripItem[] { _status, plugins, new ToolStripSeparator(), _exit });

        _icon = new NotifyIcon
        {
            Icon = LoadIcon(),
            Text = "גשר אוצריא",
            ContextMenuStrip = menu,
            Visible = true,
        };
        Application.ApplicationExit += (_, _) =>
        {
            _icon.Visible = false;
            _icon.Dispose();
        };
    }

    private static Icon LoadIcon()
    {
        try { return Icon.ExtractAssociatedIcon(Environment.ProcessPath!) ?? SystemIcons.Application; }
        catch { return SystemIcons.Application; }
    }

    public static void Run()
    {
        UpdateStatus();
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
        string text = "גשר אוצריא " + Program.Version + " — פורט " + Program.Port;
        if (Kiosk.IsActive) text += " (נעילה פעילה)";
        _status.Text = text;
        if (_icon != null) _icon.Text = text.Length > 63 ? text[..63] : text;
    }
}
