/* feedback.js - שליחת הערות דרך ממשק הדיווח הרשמי של אוצריא (feedback.report).
   הקריאה אינה דורשת הצהרת הרשאה; אוצריא מציגה למשתמש דיאלוג אישור משלה */
(function () {
  'use strict';
  var FB = window.Feedback = window.Feedback || {};
  var TYPES = [['bug', 'תקלה'], ['other', 'הצעה לשיפור'], ['other', 'משוב כללי']];
  var t = function (s) { return window.I18N ? window.I18N.t(s) : s; };

  FB.ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5V16.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/></svg>';

  /* opts: { ui, plugin, version, extra: function () { return 'שורות סביבה' } } */
  FB.open = async function (opts) {
    var ui = opts.ui;
    if (!window.Otzaria) { ui.toast('שליחת הערות זמינה רק בתוך אוצריא', 'info'); return; }
    var form = null;
    var body = '<div class="fb-form">' +
      '<p class="muted small">ההערה נשלחת לצוות אוצריא ולמפתח התוסף דרך מערכת הדיווח של אוצריא. לפני השליחה תוצג בקשת אישור.</p>' +
      '<label class="field"><span class="field-label">סוג</span><select class="input fb-type" name="type">' +
      TYPES.map(function (x, i) { return '<option value="' + i + '">' + x[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span class="field-label">מה תרצו לספר?</span><textarea class="input fb-text" name="text" rows="6" maxlength="4000" dir="auto"></textarea></label>' +
      '</div>';
    var r = await ui.dialog({
      title: 'שליחת הערה', icon: 'info', body: body,
      actions: [{ label: 'ביטול', value: false }, { label: 'שליחה', value: true, kind: 'primary' }],
      onOpen: function (f) { form = f; setTimeout(function () { var x = f.querySelector('textarea'); if (x) x.focus(); }, 80); }
    });
    if (!r || !form) return;
    var text = String(form.querySelector('textarea').value || '').trim();
    if (!text) { ui.toast('לא נכתב תוכן — ההערה לא נשלחה', 'info'); return; }
    var type = TYPES[+form.querySelector('select').value] || TYPES[0];
    var env = ['תוסף: ' + opts.plugin + ' ' + (opts.version || ''), 'סוג: ' + type[1], 'שפה: ' + (window.I18N ? window.I18N.lang() : 'he')];
    try { if (opts.extra) env = env.concat(opts.extra() || []); } catch (e) { /* כלום */ }
    var details = (text + '\n\n---\n' + env.join('\n')).slice(0, 5000);
    var res = null;
    try { res = await window.Otzaria.call('feedback.report', { details: details, reportType: type[0] }); }
    catch (e) { res = { success: false }; }
    var val = res && (res.data !== undefined ? res.data : res);
    if (val === 'sent' || val === 'queued') ui.toast(val === 'sent' ? 'ההערה נשלחה. תודה!' : 'ההערה תישלח כשיהיה חיבור. תודה!', 'success');
    else if (val === 'cancelled') ui.toast('השליחה בוטלה', 'info');
    else ui.toast('השליחה נכשלה. אפשר לנסות שוב מאוחר יותר.', 'error');
  };
  FB.t = t;
})();
