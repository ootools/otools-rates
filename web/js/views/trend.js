/* 视图：走势。历史汇率折线图 + 区间统计。欧央行币种支持全区间，
 * 其余币种用每日快照拼装（7 天 / 1 月 / 3 月）。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  FX.views = FX.views || {};
  FX.views.trend = {
    render: function (el, params) {
      var s = FX.store.settings();
      var from = String(params.from || s.lastFrom || s.base).toUpperCase();
      var to = String(params.to || s.lastTo || 'USD').toUpperCase();
      if (!FX.CUR.isFiat(from)) from = s.base;
      if (!FX.CUR.isFiat(to)) to = 'USD';
      if (from === to) to = from === 'USD' ? 'CNY' : 'USD';
      var range = params.range || '1m';
      var token = 0;

      function rangeOptions() {
        var all = [
          { k: '7d', label: FX.t('trend.7d') }, { k: '1m', label: FX.t('trend.1m') }, { k: '3m', label: FX.t('trend.3m') },
          { k: '1y', label: FX.t('trend.1y') }, { k: '5y', label: FX.t('trend.5y') }, { k: 'max', label: FX.t('trend.max') },
        ];
        if (FX.api.ECB[from] && FX.api.ECB[to]) return all;
        return all.filter(function (o) { return o.k === '7d' || o.k === '1m' || o.k === '3m'; });
      }

      el.innerHTML =
        '<div class="trend">' +
        '  <div class="trend-bar">' +
        '    <span id="trend-from"></span>' +
        '    <span class="trend-arrow">' + FX.icon('convert', 16) + '</span>' +
        '    <span id="trend-to"></span>' +
        '    <span class="flex1"></span>' +
        '    <span id="trend-ranges"></span>' +
        '  </div>' +
        '  <div class="trend-stats" id="trend-stats"></div>' +
        '  <div class="trend-chart" id="trend-chart"></div>' +
        '  <div class="trend-src dim" id="trend-src"></div>' +
        '</div>';

      var statsEl = el.querySelector('#trend-stats');
      var chartEl = el.querySelector('#trend-chart');
      var srcEl = el.querySelector('#trend-src');
      var rangesEl = el.querySelector('#trend-ranges');

      function renderRanges() {
        rangesEl.innerHTML = '';
        var avail = rangeOptions();
        if (!avail.some(function (o) { return o.k === range; })) range = '1m';
        rangesEl.appendChild(FX.ui.seg(avail, range, function (k) {
          range = k;
          load();
        }));
      }

      var fieldFrom = FX.ui.currencyField({ value: from, onChange: function (c) { from = c; if (from === to) to = from === 'USD' ? 'CNY' : 'USD'; fieldTo.set(to); renderRanges(); load(); } });
      var fieldTo = FX.ui.currencyField({ value: to, onChange: function (c) { to = c; renderRanges(); load(); } });
      el.querySelector('#trend-from').appendChild(fieldFrom.el);
      el.querySelector('#trend-to').appendChild(fieldTo.el);

      function fmtStat(v) { return U.fmtRate(v); }

      function load() {
        var my = ++token;
        FX.store.patchSettings({ lastFrom: from, lastTo: to });
        if (from === to) {
          statsEl.innerHTML = '';
          chartEl.innerHTML = '<div class="trend-msg">' + esc(FX.t('trend.same')) + '</div>';
          srcEl.textContent = '';
          return;
        }
        chartEl.innerHTML = '<div class="trend-msg dim">' + esc(FX.t('trend.loading')) + '</div>';
        statsEl.innerHTML = '';
        FX.api.getHistory(from, to, range).then(function (rec) {
          if (my !== token || !el.isConnected) return;
          var pts = rec.points;
          var vs = pts.map(function (p) { return p.v; });
          var hi = Math.max.apply(null, vs), lo = Math.min.apply(null, vs);
          var avg = vs.reduce(function (a, b) { return a + b; }, 0) / vs.length;
          var pct = (pts[pts.length - 1].v / pts[0].v - 1) * 100;
          statsEl.innerHTML =
            '<div class="tstat"><small>' + esc(FX.t('trend.high')) + '</small><b>' + fmtStat(hi) + '</b></div>' +
            '<div class="tstat"><small>' + esc(FX.t('trend.low')) + '</small><b>' + fmtStat(lo) + '</b></div>' +
            '<div class="tstat"><small>' + esc(FX.t('trend.avg')) + '</small><b>' + fmtStat(avg) + '</b></div>' +
            '<div class="tstat"><small>' + esc(FX.t('trend.change')) + '</b></small>' + FX.ui.changeBadge(pct) + '</div>';
          var color = pct >= 0 ? 'var(--chg-up)' : 'var(--chg-down)';
          FX.chart.line(chartEl, pts, { height: 340, color: color, lang: FX.lang() });
          srcEl.innerHTML = esc(rec.source === 'ecb' ? FX.t('trend.sourceECB') : FX.t('trend.sourceSnap')) +
            '<span class="dim">&nbsp;·&nbsp;</span>' + esc(pts[0].d) + ' → ' + esc(pts[pts.length - 1].d) +
            '<span class="dim">&nbsp;·&nbsp;</span>' + pts.length + ' ' + (FX.lang() === 'en' ? 'points' : '个数据点');
        }).catch(function (err) {
          if (my !== token || !el.isConnected) return;
          var code = err && err.code;
          if (code === 'same') chartEl.innerHTML = '<div class="trend-msg">' + esc(FX.t('trend.same')) + '</div>';
          else if (code === 'unsupported') chartEl.innerHTML = '<div class="trend-msg">' + esc(FX.t('trend.unsupported')) + '</div>';
          else chartEl.innerHTML = '<div class="trend-msg">' + esc(FX.t('trend.failed')) + '</div>';
          statsEl.innerHTML = '';
          srcEl.textContent = '';
        });
      }

      renderRanges();
      load();
      return function () { token += 1; };
    },
  };
})();
