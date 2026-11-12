/* 视图：换算器。双向输入、币种选择、涨跌徽标、30 天迷你走势。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  function digitsFor(code) {
    var s = FX.store.settings();
    return s.digits === 'auto' ? FX.CUR.digits(code) : s.digits;
  }

  function cross(snapshot, from, to) {
    if (!snapshot || !snapshot.usd[from] || !snapshot.usd[to]) return NaN;
    if (from === to) return 1;
    return snapshot.usd[to] / snapshot.usd[from];
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  }

  FX.views = FX.views || {};
  FX.views.convert = {
    render: function (el, params) {
      var s = FX.store.settings();
      var from = String(params.from || s.lastFrom || s.base).toUpperCase();
      var to = String(params.to || s.lastTo || 'USD').toUpperCase();
      if (from === to && params.from && params.to) { to = from === 'USD' ? 'CNY' : 'USD'; }
      if (!FX.CUR.isFiat(from)) from = s.base;
      if (!FX.CUR.isFiat(to) || to === from) to = from === 'USD' ? 'CNY' : 'USD';
      var amountStr = String(params.amount != null ? params.amount : s.lastAmount != null ? s.lastAmount : '100');

      var snap = FX.store.getLatest();
      var sparkToken = 0;

      el.innerHTML =
        '<div class="conv">' +
        '  <div class="conv-cards">' +
        '    <div class="conv-card">' +
        '      <label class="conv-label">' + esc(FX.t('convert.amountFrom')) + '</label>' +
        '      <input class="conv-amount" id="conv-from-amount" type="text" inputmode="decimal" value="' + esc(amountStr) + '" spellcheck="false">' +
        '      <div class="conv-cur" id="conv-from-cur"></div>' +
        '    </div>' +
        '    <button class="conv-swap" id="conv-swap" title="' + esc(FX.t('convert.swap')) + '" aria-label="' + esc(FX.t('convert.swap')) + '">' + FX.icon('swap', 18) + '</button>' +
        '    <div class="conv-card conv-card-to">' +
        '      <label class="conv-label">' + esc(FX.t('convert.to')) + '</label>' +
        '      <div class="conv-result-row">' +
        '        <span class="conv-result" id="conv-result">—</span>' +
        '        <button class="icon-btn icon-btn-sm" id="conv-copy" title="Copy">' + FX.icon('export', 14) + '</button>' +
        '      </div>' +
        '      <div class="conv-cur" id="conv-to-cur"></div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="conv-meta">' +
        '    <span class="conv-rate" id="conv-rate"></span>' +
        '    <span class="conv-chg" id="conv-chg"></span>' +
        '  </div>' +
        '  <div class="conv-meta conv-meta-sub">' +
        '    <span id="conv-updated"></span>' +
        '  </div>' +
        '  <div class="conv-spark" id="conv-spark"></div>' +
        '</div>';

      var amountInput = el.querySelector('#conv-from-amount');
      var resultEl = el.querySelector('#conv-result');
      var rateEl = el.querySelector('#conv-rate');
      var chgEl = el.querySelector('#conv-chg');
      var updEl = el.querySelector('#conv-updated');
      var sparkEl = el.querySelector('#conv-spark');

      var fieldFrom = FX.ui.currencyField({ value: from, onChange: function (c) { from = c; persist(); updateAll(); } });
      var fieldTo = FX.ui.currencyField({ value: to, onChange: function (c) { to = c; persist(); updateAll(); } });
      el.querySelector('#conv-from-cur').appendChild(fieldFrom.el);
      el.querySelector('#conv-to-cur').appendChild(fieldTo.el);

      function persist() {
        FX.store.patchSettings({ lastFrom: from, lastTo: to, lastAmount: amountInput.value });
      }

      function renderMeta(snapshot) {
        if (!snapshot) {
          rateEl.textContent = '';
          updEl.innerHTML = '<span class="dim">' + esc(FX.t('convert.noRate')) + '</span>';
          return;
        }
        var r = cross(snapshot, from, to);
        if (!isFinite(r)) {
          rateEl.innerHTML = '<span class="dim">' + esc(FX.t('convert.noData')) + '</span>';
        } else {
          rateEl.innerHTML = '1 ' + from + ' = <b>' + U.fmtRate(r) + '</b> ' + to +
            '<span class="dim">&nbsp;·&nbsp;</span>1 ' + to + ' = ' + U.fmtRate(1 / r) + ' ' + from;
          var chg = FX.api.changePct(from, to);
          chgEl.innerHTML = chg ? FX.ui.changeBadge(chg.pct) + '<small class="dim"> ' + U.fmtDate(chg.prevDate, FX.lang()) + '</small>' : '';
        }
        var lang = FX.lang();
        updEl.innerHTML =
          esc(FX.t('convert.updatePrefix')) + ' ' + esc(U.fmtTime(snapshot.fetchedAt, lang)) +
          '<span class="dim">&nbsp;·&nbsp;</span>' + esc(FX.api.srcLabel(snapshot.source, lang)) +
          (snapshot.offline ? '<span class="offline-tag">' + esc(FX.t('app.offlineStale')) + '</span>' : '');
      }

      function compute() {
        var raw = parseFloat(String(amountInput.value).replace(/,/g, ''));
        if (!snap || !isFinite(raw)) { resultEl.textContent = '—'; return; }
        var r = cross(snap, from, to);
        if (!isFinite(r)) { resultEl.textContent = '—'; return; }
        resultEl.textContent = U.fmtAmount(raw * r, digitsFor(to));
      }

      function updateAll() {
        renderMeta(snap);
        compute();
        renderSpark();
        FX.store.patchSettings({ lastFrom: from, lastTo: to });
      }

      var cleanups = [];
      function renderSpark() {
        var token = ++sparkToken;
        FX.api.getHistory(from, to, '1m').then(function (rec) {
          if (token !== sparkToken || !el.isConnected) return;
          var pts = rec.points;
          var first = pts[0].v, last = pts[pts.length - 1].v;
          var pct = (last / first - 1) * 100;
          sparkEl.innerHTML =
            '<div class="conv-spark-head"><span class="dim">' + esc(FX.t('convert.spark30')) + ' · ' + from + ' → ' + to + '</span>' +
            FX.ui.changeBadge(pct) + '</div>' +
            '<div class="conv-spark-chart" id="conv-spark-chart"></div>';
          FX.chart.line(sparkEl.querySelector('#conv-spark-chart'), pts, {
            spark: true, height: 64,
            color: pct >= 0 ? 'var(--chg-up)' : 'var(--chg-down)',
          });
        }).catch(function () {
          if (token !== sparkToken) return;
          sparkEl.innerHTML = '';
        });
      }

      amountInput.addEventListener('input', function () {
        compute();
        FX.store.patchSettings({ lastAmount: amountInput.value });
      });
      amountInput.addEventListener('focus', function () { amountInput.select(); });
      el.querySelector('#conv-swap').addEventListener('click', function () {
        var f = from; from = to; to = f;
        fieldFrom.set(from); fieldTo.set(to);
        persist(); updateAll();
      });
      el.querySelector('#conv-copy').addEventListener('click', function () {
        var v = resultEl.textContent;
        if (v && v !== '—') copyText(v).then(function () { FX.ui.toast(v); });
      });

      updateAll();
      // 昨日快照异步到达后补画涨跌徽标
      var onPrev = function () { if (el.isConnected) renderMeta(snap); };
      document.addEventListener('fx-prev', onPrev);
      cleanups.push(function () { document.removeEventListener('fx-prev', onPrev); });
      return function () { cleanups.forEach(function (c) { c(); }); };
    },
  };
})();
