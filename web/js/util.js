/* 工具函数与 i18n。
 * FX.util：格式化 / 日期 / 防抖等；FX.I18N：词典；FX.t：取词。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});

  var escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return escMap[c]; });
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function dateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDate(s) {
    var p = String(s || '').split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }

  function addDays(s, n) {
    var d = parseDate(s);
    d.setDate(d.getDate() + n);
    return dateStr(d);
  }

  function today() { return dateStr(new Date()); }

  function fmtTime(ts, lang) {
    if (!ts) return '—';
    var d = new Date(ts);
    var p = pad2;
    var hm = p(d.getHours()) + ':' + p(d.getMinutes());
    if (lang === 'en') {
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
    }
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
  }

  function fmtDate(s, lang) {
    if (lang === 'en') return s;
    var p = String(s).split('-');
    return (+p[1]) + '月' + (+p[2]) + '日';
  }

  /** 金额格式化：千分位 + 固定小数位 */
  function fmtAmount(v, digits) {
    if (!isFinite(v)) return '—';
    return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  /** 汇率格式化：按量级取有效位，短汇率保留更多精度 */
  function fmtRate(v) {
    if (!isFinite(v) || v <= 0) return '—';
    var d;
    if (v >= 1000) d = 2;
    else if (v >= 100) d = 3;
    else if (v >= 1) d = 4;
    else if (v >= 0.01) d = 6;
    else d = 8;
    return v.toLocaleString('en-US', { maximumFractionDigits: d });
  }

  function fmtPct(p) {
    if (p == null || !isFinite(p)) return null;
    var s = (p > 0 ? '+' : '') + p.toFixed(2) + '%';
    return s;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ---------------- i18n ---------------- */

  var I18N = {
    zh: {
      'app.tagline': '一栏活水，看尽汇率',
      'nav.convert': '换算', 'nav.rates': '牌价', 'nav.trend': '走势', 'nav.settings': '设置',
      'convert.title': '换算', 'convert.sub': '双向实时汇率换算',
      'convert.amountFrom': '金额', 'convert.swap': '交换币种', 'convert.to': '兑换为',
      'convert.rate': '汇率', 'convert.updatePrefix': '更新于', 'convert.noRate': '暂无汇率数据',
      'convert.search': '搜索币种（代码 / 名称）', 'convert.fav': '收藏', 'convert.all': '全部',
      'convert.favAdded': '已收藏 {c}', 'convert.favRemoved': '已取消 {c}',
      'convert.sameCurrency': '两种币种相同', 'convert.noData': '该币种暂无数据',
      'convert.spark30': '近 30 天',
      'rates.title': '牌价', 'rates.sub': '以基准货币计价的一揽子汇率',
      'rates.search': '搜索币种', 'rates.favorites': '收藏', 'rates.others': '全部币种',
      'rates.base': '基准货币', 'rates.clickConvert': '点击行可直接换算',
      'rates.none': '没有匹配的币种',
      'trend.title': '走势', 'trend.sub': '历史汇率走势与区间统计',
      'trend.7d': '7 天', 'trend.1m': '1 月', 'trend.3m': '3 月', 'trend.1y': '1 年', 'trend.5y': '5 年', 'trend.max': '全部',
      'trend.high': '最高', 'trend.low': '最低', 'trend.avg': '均值', 'trend.change': '区间涨跌',
      'trend.loading': '正在加载历史数据…', 'trend.unsupported': '该货币暂无长期历史数据源，可切换为 1 月 / 3 月查看',
      'trend.failed': '历史数据加载失败，请稍后重试', 'trend.same': '两种币种相同，无需比较',
      'trend.sourceECB': '来源：欧洲央行（ECB）', 'trend.sourceSnap': '来源：公开每日快照',
      'settings.title': '设置', 'settings.sub': '外观、基准与数据管理',
      'settings.appearance': '外观', 'settings.theme': '主题', 'settings.themeSys': '跟随系统',
      'settings.themeLight': '浅色', 'settings.themeDark': '深色',
      'settings.accent': '主色', 'settings.accentAzure': '靛蓝', 'settings.accentTeal': '松石', 'settings.accentVermilion': '绛红',
      'settings.defaultBase': '默认基准货币',
      'settings.favorites': '收藏币种', 'settings.favHint': '点击添加或移除，收藏会置顶显示',
      'settings.refresh': '自动刷新', 'settings.refreshOpen': '打开面板时',
      'settings.refreshOff': '关闭', 'settings.refreshMin': '{n} 分钟',
      'settings.digits': '金额小数位', 'settings.digitsAuto': '跟随货币',
      'settings.data': '数据', 'settings.export': '导出设置', 'settings.import': '导入设置',
      'settings.clear': '清除汇率缓存', 'settings.cleared': '缓存已清除',
      'settings.imported': '导入成功', 'settings.importFailed': '导入失败：文件格式不正确',
      'settings.about': '关于', 'settings.sources': '数据来源', 'settings.disclaimer': '免责声明',
      'settings.disclaimerText': '汇率数据来自公开免费接口（ExchangeRate-API / jsDelivr CDN / 欧洲央行），可能存在延迟或误差，仅供个人参考，不构成任何交易或投资建议；实际兑换请以银行及官方牌价为准。',
      'settings.aboutLine': '汇澜 Ripple Rates v1.0.0 · 数据缓存于本机 localStorage，不上传任何数据。',
      'app.refreshing': '正在刷新…', 'app.updated': '汇率已更新',
      'app.offline': '网络不可用，展示缓存数据', 'app.offlineStale': '离线 · 缓存于',
      'app.netOnline': '在线 · 更新于', 'app.netCached': '缓存 ·',
      'app.refreshFail': '刷新失败，已保留缓存数据', 'app.exported': '已导出',
      'common.cancel': '取消', 'common.confirm': '确定', 'common.close': '关闭',
    },
    en: {
      'app.tagline': 'Live FX at a glance',
      'nav.convert': 'Convert', 'nav.rates': 'Rates', 'nav.trend': 'Trend', 'nav.settings': 'Settings',
      'convert.title': 'Convert', 'convert.sub': 'Two-way live currency conversion',
      'convert.amountFrom': 'Amount', 'convert.swap': 'Swap currencies', 'convert.to': 'Convert to',
      'convert.rate': 'Rate', 'convert.updatePrefix': 'Updated', 'convert.noRate': 'No rate data yet',
      'convert.search': 'Search currency (code / name)', 'convert.fav': 'Favorites', 'convert.all': 'All',
      'convert.favAdded': 'Added {c}', 'convert.favRemoved': 'Removed {c}',
      'convert.sameCurrency': 'Same currency selected', 'convert.noData': 'No data for this currency',
      'convert.spark30': '30 days',
      'rates.title': 'Rates', 'rates.sub': 'A board of rates against your base currency',
      'rates.search': 'Search currency', 'rates.favorites': 'Favorites', 'rates.others': 'All currencies',
      'rates.base': 'Base currency', 'rates.clickConvert': 'Click a row to convert',
      'rates.none': 'No matching currency',
      'trend.title': 'Trend', 'trend.sub': 'Historical rates and range stats',
      'trend.7d': '7D', 'trend.1m': '1M', 'trend.3m': '3M', 'trend.1y': '1Y', 'trend.5y': '5Y', 'trend.max': 'MAX',
      'trend.high': 'High', 'trend.low': 'Low', 'trend.avg': 'Avg', 'trend.change': 'Change',
      'trend.loading': 'Loading history…', 'trend.unsupported': 'No long-range history for this currency — try 1M / 3M',
      'trend.failed': 'Failed to load history, try again later', 'trend.same': 'Same currency — nothing to compare',
      'trend.sourceECB': 'Source: European Central Bank (ECB)', 'trend.sourceSnap': 'Source: public daily snapshots',
      'settings.title': 'Settings', 'settings.sub': 'Appearance, base currency and data',
      'settings.appearance': 'Appearance', 'settings.theme': 'Theme', 'settings.themeSys': 'System',
      'settings.themeLight': 'Light', 'settings.themeDark': 'Dark',
      'settings.accent': 'Accent', 'settings.accentAzure': 'Azure', 'settings.accentTeal': 'Teal', 'settings.accentVermilion': 'Vermilion',
      'settings.defaultBase': 'Default base currency',
      'settings.favorites': 'Favorites', 'settings.favHint': 'Click to add or remove; favorites are pinned on top',
      'settings.refresh': 'Auto refresh', 'settings.refreshOpen': 'On panel open',
      'settings.refreshOff': 'Off', 'settings.refreshMin': '{n} min',
      'settings.digits': 'Amount decimals', 'settings.digitsAuto': 'Per currency',
      'settings.data': 'Data', 'settings.export': 'Export settings', 'settings.import': 'Import settings',
      'settings.clear': 'Clear rate cache', 'settings.cleared': 'Cache cleared',
      'settings.imported': 'Imported', 'settings.importFailed': 'Import failed: invalid file',
      'settings.about': 'About', 'settings.sources': 'Data sources', 'settings.disclaimer': 'Disclaimer',
      'settings.disclaimerText': 'Rates come from public free APIs (ExchangeRate-API / jsDelivr CDN / European Central Bank) and may be delayed or imprecise. For personal reference only — not investment advice. Actual exchange follows your bank\'s rates.',
      'settings.aboutLine': 'Ripple Rates v1.0.0 · Cache lives in localStorage; nothing is uploaded.',
      'app.refreshing': 'Refreshing…', 'app.updated': 'Rates updated',
      'app.offline': 'Network unavailable — showing cached rates', 'app.offlineStale': 'Offline · cached',
      'app.netOnline': 'Live · updated', 'app.netCached': 'Cached ·',
      'app.refreshFail': 'Refresh failed — cached rates kept', 'app.exported': 'Exported',
      'common.cancel': 'Cancel', 'common.confirm': 'OK', 'common.close': 'Close',
    },
  };

  var lang = 'zh';
  function detectLang() {
    var raw = FX.host && FX.host.language ? FX.host.language() : (navigator.language || 'zh-CN');
    return /^en/i.test(raw) ? 'en' : 'zh';
  }
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'zh';
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }
  function t(key, vars) {
    var dict = I18N[lang] || I18N.zh;
    var s = dict[key] != null ? dict[key] : (I18N.zh[key] != null ? I18N.zh[key] : key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  FX.util = { esc: esc, dateStr: dateStr, parseDate: parseDate, addDays: addDays, today: today, fmtTime: fmtTime, fmtDate: fmtDate, fmtAmount: fmtAmount, fmtRate: fmtRate, fmtPct: fmtPct, debounce: debounce, clamp: clamp, pad2: pad2 };
  FX.I18N = I18N;
  FX.t = t;
  FX.setLang = setLang;
  FX.detectLang = detectLang;
  FX.lang = function () { return lang; };
})();
