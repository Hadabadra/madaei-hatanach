// 5.6.0 — מטבעות: משקל הכסף/הזהב ושווי לפי מחיר עדכני (כשמקוון; אחרת המשקל בלבד).
// היחידות מחושבות מהדינר לפי שתי שיטות מקובלות (בקירוב): ר׳ חיים נאה — 4.8 גרם
// כסף טהור לדינר (חמש סלעים ≈ 96 גרם), החזון איש — 5.85 גרם (חמש סלעים ≈ 117 גרם).
// היחסים: סלע = 4 דינר (וכן שקל התורה), דינר = 6 מעות, מעה = 2 פונדיונים,
// פונדיון = 2 איסרים, איסר = 8 פרוטות. אין כאן הוראה למעשה — לשאלה מעשית יש לשאול רב.
const COIN_SHITOT = [
  { id: 'naeh', label: 'לשיטת ר׳ חיים נאה', dinar: 4.8 },
  { id: 'chazon', label: 'לשיטת החזון איש', dinar: 5.85 }
];
// d = ביחידות דינר; metal: silver/gold/copper; note — הערה קצרה
const COIN_UNITS = {
  'גרה':        { d: 4/20, metal: 'silver', note: 'עשרים גרה השקל' },
  'בקע':        { d: 2, metal: 'silver', note: 'מחצית השקל' },
  'שקל':        { d: 4, metal: 'silver', note: 'שקל הקודש = סלע של חז״ל' },
  'מנה':        { d: 100, metal: 'silver', note: 'מנה של חז״ל = מאה דינר' },
  'ככר':        { d: 4 * 3000, metal: 'silver', note: 'שלושת אלפים שקל, לפי חשבון כסף פקודי העדה (שמות לח)' },
  'פרוטה':      { d: 1/192, metal: 'silver', note: 'שווי בכסף; המטבע עצמו של נחושת' },
  'איסר':       { d: 1/24, metal: 'silver', note: 'שווי בכסף' },
  'מעה (חז״ל)': { d: 1/6, metal: 'silver' },
  'דינר (חז״ל)':{ d: 1, metal: 'silver', note: 'זוז' },
  'סלע (חז״ל)': { d: 4, metal: 'silver' },
  'פונדיון':    { d: 1/12, metal: 'silver', note: 'שווי בכסף' },
  'דרכמון':     { g: 8.4, metal: 'gold', approx: true, note: 'משקל משוער של מטבע הזהב הפרסי — לא אומת' },
  'ליטרא':      { g: 327, metal: 'none', approx: true, note: 'יחידת משקל; משקל משוער של הליברה הרומית — לא אומת' },
  'קשיטה':      { unknown: true },
  'פונדיון האיטלקי': { metal: 'copper', unknown: true, note: 'מטבע נחושת — משמש בחז״ל כמידת גודל, לא כשווי' },
  'סלע נירונית':{ unknown: true, note: 'משמש בחז״ל כמידת גודל' }
};
const TROY_OZ = 31.1035;
let coinPrices = null, coinPricesAt = 0, coinPricesP = null;

function coinGrams(u){
  if (u.g) return [{ label: u.approx ? 'בקירוב' : '', g: u.g }];
  if (u.d) return COIN_SHITOT.map(s => ({ label: s.label, g: u.d * s.dinar }));
  return [];
}
function fmtG(g){
  if (g >= 1000) return (g / 1000).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ק״ג';
  return g.toLocaleString('he-IL', { maximumFractionDigits: g < 1 ? 3 : 1 }) + ' גרם';
}
function fmtMoney(v, cur){
  return v.toLocaleString('he-IL', { maximumFractionDigits: v < 10 ? 2 : 0 }) + ' ' + cur;
}

async function coinFetchJson(url){
  if (window.Otzaria && Otzaria.call){
    let ch = Otzaria.call('network.fetchStream', { url, timeoutMs: 15000 });
    if (ch && typeof ch.then === 'function' && !ch[Symbol.asyncIterator]) ch = await ch;
    if (ch && ch.data && ch.data[Symbol.asyncIterator]) ch = ch.data;
    if (ch && ch[Symbol.asyncIterator]){
      let body = '', ok = false;
      for await (const c of ch){
        if (!c) continue;
        if (c.type === 'response') ok = !!c.ok;
        if (c.type === 'data' && typeof c.body === 'string') body += c.body;
      }
      if (!ok) throw new Error('http');
      return JSON.parse(body);
    }
  }
  const r = await fetch(url); if (!r.ok) throw new Error('http'); return r.json();
}
// מחירי כסף וזהב (דולר לאונקיית טרוי) ושער הדולר; נשמר לחצי שעה
function getCoinPrices(){
  if (coinPrices && Date.now() - coinPricesAt < 30 * 60 * 1000) return Promise.resolve(coinPrices);
  if (coinPricesP) return coinPricesP;
  coinPricesP = Promise.all([
    coinFetchJson('https://api.gold-api.com/price/XAG'),
    coinFetchJson('https://api.gold-api.com/price/XAU'),
    coinFetchJson('https://open.er-api.com/v6/latest/USD').catch(() => null)
  ]).then(([ag, au, fx]) => {
    coinPrices = {
      silver: +ag.price / TROY_OZ, gold: +au.price / TROY_OZ,
      ils: fx && fx.rates && +fx.rates.ILS || null,
      at: ag.updatedAt || new Date().toISOString()
    };
    coinPricesAt = Date.now();
    return coinPrices;
  }).finally(() => { coinPricesP = null; });
  return coinPricesP;
}

function coinBoxHTML(entry){
  const u = COIN_UNITS[entry.name];
  if (!u) return '';
  const metalName = { silver: 'כסף טהור', gold: 'זהב', copper: 'נחושת', none: '' }[u.metal || 'silver'];
  let h = '<div class="coin-box"><h3>⚖️ משקל ושווי</h3>';
  if (u.unknown){
    h += '<p>המשקל המדויק אינו ידוע בוודאות' + (metalName ? ' (' + metalName + ')' : '') + '.</p>';
  } else {
    h += '<table class="coin-table"><tr><th>שיטה</th><th>משקל' + (metalName ? ' ' + metalName : '') + '</th>'
      + (u.metal === 'silver' || u.metal === 'gold' ? '<th>שווי היום</th>' : '') + '</tr>';
    coinGrams(u).forEach(r => {
      h += '<tr><td>' + esc(r.label || '—') + '</td><td>' + fmtG(r.g) + '</td>'
        + (u.metal === 'silver' || u.metal === 'gold'
          ? '<td class="coin-val" data-coin-g="' + r.g + '" data-coin-metal="' + u.metal + '">…</td>' : '') + '</tr>';
    });
    h += '</table>';
  }
  if (u.note) h += '<p class="coin-note">' + esc(u.note) + '</p>';
  h += '<p class="coin-note coin-src"></p>'
    + '<p class="coin-note">השיעורים בקירוב ולפי שיטות מקובלות; לשאלה למעשה (פדיון הבן, מחצית השקל וכו׳) — יש לשאול רב.</p></div>';
  setTimeout(fillCoinValues, 0);
  return h;
}

async function fillCoinValues(){
  const cells = document.querySelectorAll('.coin-val:not(.done)');
  if (!cells.length) return;
  const online = (typeof isOnline === 'undefined') ? navigator.onLine : isOnline;
  const offline = () => cells.forEach(c => { c.textContent = 'אין חיבור — משקל בלבד'; c.classList.add('done'); });
  if (!online) return offline();
  let p;
  try { p = await getCoinPrices(); } catch(e){ return offline(); }
  cells.forEach(c => {
    const g = +c.dataset.coinG, per = p[c.dataset.coinMetal];
    const usd = g * per;
    c.textContent = p.ils ? fmtMoney(usd * p.ils, '₪') + ' (' + fmtMoney(usd, '$') + ')' : fmtMoney(usd, '$');
    c.classList.add('done');
  });
  const d = new Date(p.at);
  document.querySelectorAll('.coin-src').forEach(s => {
    s.textContent = 'מחיר ' + (cells[0].dataset.coinMetal === 'gold' ? 'הזהב' : 'הכסף') + ' העולמי, עודכן ' + d.toLocaleString('he-IL')
      + ' (gold-api.com; שער: exchangerate-api.com). לא כולל עמלות ומע״מ.';
  });
}

(function(){
  if (typeof renderEntryDetailHTML !== 'function') return;
  const orig = renderEntryDetailHTML;
  window.renderEntryDetailHTML = renderEntryDetailHTML = function(entry, catIdOverride){
    const html = orig.apply(this, arguments);
    if (!entry || entry.cat !== 'coins' || !COIN_UNITS[entry.name]) return html;
    return html + coinBoxHTML(entry);
  };
})();
