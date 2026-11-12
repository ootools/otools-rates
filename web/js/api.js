/* 数据层：实时汇率（降级链）→ 昨日对比 → 历史时间序列。
 * - 实时：jsDelivr currency-api（200+ 币，CDN 稳定）→ open.er-api.com（166 币）→ 本机缓存
 * - 昨日：jsDelivr 按日期快照（自算前一日期，最多回溯 7 天），用于涨跌幅
 * - 历史：欧央行 ECB（frankfurter.dev，31 币种全区间）/ 非欧央行币种用
 *   jsDelivr 每日快照拼装（仅 7 天 / 1 月 / 3 月）
 * 统一模型：USD 基准价表 { usd: {CODE: 每美元本币价} }，任意交叉价 = usd[to]/usd[from]。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;

  /* 欧央行参考汇率覆盖的币种（frankfurter 可提供全区间历史） */
  var ECB = {};
  ('AUD BGN BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR ISK JPY KRW MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY USD ZAR').split(' ').forEach(function (c) { ECB[c] = 1; });

  var RANGES = { '7d': 7, '1m': 31, '3m': 92, '1y': 366, '5y': 1827, max: 9900 };
  var SRC_LABEL = {
    jsdelivr: { zh: 'jsDelivr · currency-api', en: 'jsDelivr · currency-api' },
    'er-api': { zh: 'ExchangeRate-API', en: 'ExchangeRate-API' },
    ecb: { zh: '欧洲央行（ECB）', en: 'European Central Bank' },
    snap: { zh: '公开每日快照', en: 'public daily snapshots' },
  };

  function srcLabel(key, lang) {
    var s = SRC_LABEL[key];
    return s ? (s[lang === 'en' ? 'en' : 'zh'] || s.zh) : key;
  }

  function fetchJson(url, timeoutMs) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, timeoutMs || 15000);
    return fetch(url, { mode: 'cors', cache: 'no-store', signal: ctl.signal })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  /* 过滤到法币白名单并归一为大写键 */
  function normalizeUsd(raw) {
    var out = {};
    var keys = Object.keys(raw || {});
    for (var i = 0; i < keys.length; i += 1) {
      var code = keys[i].toUpperCase();
      var v = raw[keys[i]];
      if (FX.CUR.isFiat(code) && isFinite(v) && v > 0) out[code] = v;
    }
    if (!isFinite(out.USD) || out.USD <= 0) out.USD = 1;
    return out;
  }

  function fromUnixDate(unix) {
    var d = new Date(unix * 1000);
    return d.getUTCFullYear() + '-' + U.pad2(d.getUTCMonth() + 1) + '-' + U.pad2(d.getUTCDate());
  }

  function fromJsDelivr() {
    return fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json').then(function (j) {
      if (!j || !j.usd) throw new Error('bad payload');
      return { usd: normalizeUsd(j.usd), date: j.date || U.today(), source: 'jsdelivr' };
    });
  }

  function fromErApi() {
    return fetchJson('https://open.er-api.com/v6/latest/USD').then(function (j) {
      if (!j || j.result !== 'success' || !j.rates) throw new Error('bad payload');
      var date = j.time_last_update_unix ? fromUnixDate(j.time_last_update_unix) : U.today();
      return { usd: normalizeUsd(j.rates), date: date, source: 'er-api' };
    });
  }

  /* ---------- 快照级 API ---------- */

  function autoRefreshMs() {
    var s = FX.store.settings();
    if (s.autoRefresh === 'off') return Infinity;
    if (s.autoRefresh === 'open') return 10 * 60 * 1000;
    return s.autoRefresh * 60 * 1000;
  }

  /** 实时汇率（带缓存与降级）。resolve(snapshot)，snapshot.offline=true 表示来自缓存 */
  function getLatest(force) {
    var cached = FX.store.getLatest();
    if (!force && cached && (Date.now() - cached.fetchedAt) < autoRefreshMs()) {
      return Promise.resolve(cached);
    }
    return fromJsDelivr()
      .catch(function () { return fromErApi(); })
      .then(function (fresh) {
        fresh.fetchedAt = Date.now();
        FX.store.saveLatest(fresh);
        ensurePrevDay(fresh.date);
        return fresh;
      })
      .catch(function (err) {
        if (cached) return Object.assign({}, cached, { offline: true, staleErr: String(err && err.message || err) });
        throw err;
      });
  }

  /** 手动刷新：强制拉取 */
  function refresh() { return getLatest(true); }

  /** 拉取前一交易日快照（用于涨跌幅），后台静默执行 */
  function ensurePrevDay(latestDate) {
    var have = FX.store.getPrevDay();
    var target = U.addDays(latestDate, -1);
    if (have && have.date <= target) return;
    var tries = 0, d = target;
    function attempt() {
      if (tries >= 7) return;
      return fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@' + d + '/v1/currencies/usd.min.json', 12000)
        .then(function (j) {
          if (!j || !j.usd) throw new Error('bad payload');
          FX.store.savePrevDay({ date: d, usd: normalizeUsd(j.usd), fetchedAt: Date.now() });
          try { document.dispatchEvent(new CustomEvent('fx-prev')); } catch (e) {}
        })
        .catch(function () { tries += 1; d = U.addDays(d, -1); return attempt(); });
    }
    attempt();
  }

  /** 当日涨跌幅（基准 from 对 to 的汇率变化 %）→ { pct, prevDate } / null */
  function changePct(from, to) {
    var latest = FX.store.getLatest();
    var prev = FX.store.getPrevDay();
    if (!latest || !prev || !latest.usd[from] || !latest.usd[to] || !prev.usd[from] || !prev.usd[to]) return null;
    var now = latest.usd[to] / latest.usd[from];
    var before = prev.usd[to] / prev.usd[from];
    if (!isFinite(now) || !isFinite(before) || before <= 0) return null;
    return { pct: (now / before - 1) * 100, prevDate: prev.date };
  }

  /* ---------- 历史序列 ---------- */

  function pool(items, n, fn) {
    var results = new Array(items.length);
    var idx = 0;
    function worker() {
      if (idx >= items.length) return Promise.resolve();
      var my = idx++;
      return fn(items[my], my).then(function (r) { results[my] = r; }).catch(function () { results[my] = null; }).then(worker);
    }
    var workers = [];
    for (var i = 0; i < Math.min(n, items.length); i += 1) workers.push(worker());
    return Promise.all(workers).then(function () { return results; });
  }

  function ecbSeries(from, to, range, end) {
    var start = range === 'max' ? '1999-01-04' : U.addDays(end, -(RANGES[range] - 1));
    return fetchJson('https://api.frankfurter.dev/v1/' + start + '..' + end + '?base=' + from + '&symbols=' + to, 20000)
      .then(function (j) {
        if (!j || !j.rates) throw new Error('bad payload');
        var points = Object.keys(j.rates).sort().map(function (d) {
          var v = j.rates[d] && j.rates[d][to];
          return v ? { d: d, v: v } : null;
        }).filter(Boolean);
        if (points.length < 2) throw new Error('empty series');
        return { points: points, source: 'ecb' };
      });
  }

  function snapSeries(from, to, range, end) {
    var n = RANGES[range];
    var dates = [];
    for (var i = n - 1; i >= 0; i -= 1) dates.push(U.addDays(end, -i));
    return pool(dates, 6, function (d) {
      return fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@' + d + '/v1/currencies/usd.min.json', 12000)
        .then(function (j) {
          if (!j || !j.usd) return null;
          var uf = j.usd[String(from).toLowerCase()], ut = j.usd[String(to).toLowerCase()];
          if (!isFinite(uf) || !isFinite(ut) || uf <= 0) return null;
          return { d: d, v: ut / uf };
        });
    }).then(function (arr) {
      var points = arr.filter(Boolean);
      if (points.length < Math.max(5, dates.length * 0.5)) throw new Error('insufficient snapshots');
      return { points: points, source: 'snap' };
    });
  }

  /** 历史序列：resolve({points:[{d,v}], source, range, endDate, fetchedAt}) */
  function getHistory(from, to, range) {
    from = String(from || '').toUpperCase();
    to = String(to || '').toUpperCase();
    if (!RANGES[range]) return Promise.reject(new Error('bad range'));
    if (from === to) return Promise.reject({ code: 'same' });
    var end = U.today();
    var cached = FX.store.getHist(from, to, range);
    if (cached && cached.endDate === end && (Date.now() - cached.fetchedAt) < 6 * 3600 * 1000) {
      return Promise.resolve(cached);
    }
    var run;
    if (ECB[from] && ECB[to]) {
      run = ecbSeries(from, to, range, end);
    } else if (range === '7d' || range === '1m' || range === '3m') {
      run = snapSeries(from, to, range, end);
    } else {
      return Promise.reject({ code: 'unsupported' });
    }
    return run.then(function (r) {
      var rec = { points: r.points, source: r.source, range: range, endDate: end, fetchedAt: Date.now(), from: from, to: to };
      FX.store.saveHist(rec);
      return rec;
    });
  }

  FX.api = {
    ECB: ECB,
    RANGES: RANGES,
    srcLabel: srcLabel,
    getLatest: getLatest,
    refresh: refresh,
    changePct: changePct,
    getHistory: getHistory,
  };
})();
