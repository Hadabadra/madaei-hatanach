/* סייר קבצים - אייקוני SVG פנימיים (קו 24px בסגנון Fluent) */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {};

  var P = {
    back: '<path d="M9 5l7 7-7 7"/>',
    forward: '<path d="M15 5l-7 7 7 7"/>',
    up: '<path d="M12 19V6M6 11l6-6 6 6"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M14 6l-6 6 6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    folder: '<path class="fill" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2h8.6A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>',
    folderOpen: '<path d="M3 17V7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2h7.6A1.5 1.5 0 0 1 20 9.5V11"/><path class="fill" d="M3.2 17.6l2.3-6.1a1 1 0 0 1 .9-.6H21a.7.7 0 0 1 .7.9l-2.2 6.4a1.2 1.2 0 0 1-1.1.8H4.1a.9.9 0 0 1-.9-1.4z"/>',
    file: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
    fileText: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 12h6M9 15h6M9 18h4"/>',
    code: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M10.5 12l-2 2.5 2 2.5M13.5 12l2 2.5-2 2.5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
    pdf: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8.5 17.5c2-1 4.5-4.5 4-7-.4-1.8-2.3-.6-1 2 .9 1.9 2.6 3.6 4.5 3.8 1.4.1 1.2-1.3-.7-1.2-2.2.1-5 1.2-6.8 2.4z"/>',
    word: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8.5 11.5l1.3 5.5 1.7-4 1.7 4 1.3-5.5"/>',
    sheet: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8.5 11.5h7v6h-7zM8.5 14.5h7M12 11.5v6"/>',
    slides: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><circle cx="12" cy="14.5" r="3"/><path d="M12 11.5v3h3"/>',
    audio: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="16" r="2.2"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
    archive: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M11 3v2h2v2h-2v2h2v2h-2v2.5"/><rect x="10" y="14" width="3" height="3.5" rx=".8"/>',
    app: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 8.5h17M6.5 6.5h.01M9 6.5h.01"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
    drive: '<rect x="3" y="12" width="18" height="7" rx="2"/><path d="M5 12l2.2-6.2A1.2 1.2 0 0 1 8.3 5h7.4a1.2 1.2 0 0 1 1.1.8L19 12"/><path d="M16.5 15.5h.01M14 15.5h.01"/>',
    usb: '<path d="M9 3h6v6H9zM7 9h10v9a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/><path d="M11 5.5h.01M13 5.5h.01"/>',
    network: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><path d="M12 10v5M5 18h14M12 15v6"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M3 13h18"/>',
    documents: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 16.5h6"/>',
    downloads: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    pictures: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="16" r="2.2"/>',
    videos: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
    home: '<path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6L12 16.6l-5 2.6 1-5.6-4.1-3.9 5.6-.8z"/>',
    starFilled: '<path class="fill-solid" d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6L12 16.6l-5 2.6 1-5.6-4.1-3.9 5.6-.8z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    cut: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9 15L18 4M15 15L6 4"/>',
    paste: '<path d="M9 4.5H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2"/><rect x="9" y="3" width="6" height="3.5" rx="1"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6"/>',
    rename: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14 8l3 3"/>',
    newFolder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2h8.6A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M12 11v5M9.5 13.5h5"/>',
    newFile: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M12.5 11.5v6M9.5 14.5h6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
    preview: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M9 4.5v15"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    sort: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5"/>',
    hidden: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    reveal: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2h8.6A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M10 13.5h6M13.5 11l2.5 2.5-2.5 2.5"/>',
    more: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>',
    warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2h.01"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3a5.5 5.5 0 0 1-11 0zM12 16.5V21"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    selectAll: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M2.8 12h2.6M18.6 12h2.6M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>'
  };

  FX.icon = function (name, cls) {
    var body = P[name] || P.file;
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
  };
  FX.hasIcon = function (name) { return !!P[name]; };
})();
