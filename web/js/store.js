/* 本机存储：设置、汇率缓存、历史序列缓存。全部写入 localStorage，不上传。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});

  var P = 'otools-rates/';
  var K = {
    settings: P + 'settings',
    latest: P + 'latest',
    prev: P + 'prev',
    hist: P + 'hist',
  };

  var DEFAULTS = {
    theme: 'system',            // system | light | dark
    accent: 'azure',            // azure | teal | vermilion
    base: 'CNY',                // 默认基准货币
    favorites: ['USD', 'EUR', 'JPY', 'HKD', 'GBP'],
    autoRefresh: 'open',        // 'off' | 'open' | 分钟数(5/15/30/60)
    digits: 'auto',             // 'auto' | 2 | 4
  };

  var mem = { settings: null, latest: null, prev: null, hist: null };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- settings ---------- */

  function settings() {
    if (!mem.settings) {
      var s = read(K.settings, {});
      mem.settings = Object.assign({}, DEFAULTS, s);
      // 校验收藏列表
      if (!Array.isArray(mem.settings.favorites)) mem.settings.favorites = DEFAULTS.favorites.slice();
      mem.settings.favorites = mem.settings.favorites.filter(function (c) { return FX.CUR.isFiat(c); });
      if (!FX.CUR.isFiat(mem.settings.base)) mem.settings.base = DEFAULTS.base;
    }
    return mem.settings;
  }

  function patchSettings(part) {
    mem.settings = Object.assign({}, settings(), part);
    write(K.settings, mem.settings);
    return mem.settings;
  }

  /* ---------- 汇率缓存 ---------- */

  function getLatest() { if (mem.latest === null) mem.latest = read(K.latest, null); return mem.latest; }
  function saveLatest(snap) { mem.latest = snap; write(K.latest, snap); }

  function getPrevDay() { if (mem.prev === null) mem.prev = read(K.prev, null); return mem.prev; }
  function savePrevDay(p) { mem.prev = p; write(K.prev, p); }

  /* ---------- 历史缓存（上限 40 条，按时间淘汰） ---------- */

  var HIST_MAX = 40;

  function histMap() {
    if (mem.hist === null) mem.hist = read(K.hist, {});
    return mem.hist;
  }

  function histKey(from, to, range) { return from + '/' + to + '/' + range; }

  function getHist(from, to, range) {
    return histMap()[histKey(from, to, range)] || null;
  }

  function saveHist(rec) {
    var m = histMap();
    m[histKey(rec.from, rec.to, rec.range)] = rec;
    var keys = Object.keys(m);
    if (keys.length > HIST_MAX) {
      keys.sort(function (a, b) { return (m[a].fetchedAt || 0) - (m[b].fetchedAt || 0); });
      keys.slice(0, keys.length - HIST_MAX).forEach(function (k) { delete m[k]; });
    }
    write(K.hist, m);
  }

  /* ---------- 导入 / 导出 / 清理 ---------- */

  function exportAll() {
    return JSON.stringify({
      app: 'otools-rates', version: 1, exportedAt: new Date().toISOString(),
      settings: settings(),
    }, null, 2);
  }

  function importAll(text) {
    var data = JSON.parse(text);
    if (!data || data.app !== 'otools-rates' || !data.settings) throw new Error('format');
    var s = data.settings;
    var ok = {};
    if (s.theme === 'system' || s.theme === 'light' || s.theme === 'dark') ok.theme = s.theme;
    if (s.accent === 'azure' || s.accent === 'teal' || s.accent === 'vermilion') ok.accent = s.accent;
    if (FX.CUR.isFiat(s.base)) ok.base = s.base;
    if (Array.isArray(s.favorites)) ok.favorites = s.favorites.filter(function (c) { return FX.CUR.isFiat(c); });
    if (s.autoRefresh === 'off' || s.autoRefresh === 'open' || [5, 15, 30, 60].indexOf(s.autoRefresh) >= 0) ok.autoRefresh = s.autoRefresh;
    if (s.digits === 'auto' || s.digits === 2 || s.digits === 4) ok.digits = s.digits;
    patchSettings(ok);
    return ok;
  }

  function clearRateCache() {
    mem.latest = null; mem.prev = null; mem.hist = null;
    try { localStorage.removeItem(K.latest); localStorage.removeItem(K.prev); localStorage.removeItem(K.hist); } catch (e) {}
  }

  FX.store = {
    DEFAULTS: DEFAULTS,
    settings: settings,
    patchSettings: patchSettings,
    getLatest: getLatest,
    saveLatest: saveLatest,
    getPrevDay: getPrevDay,
    savePrevDay: savePrevDay,
    getHist: getHist,
    saveHist: saveHist,
    exportAll: exportAll,
    importAll: importAll,
    clearRateCache: clearRateCache,
  };
})();
