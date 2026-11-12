/* 视图：牌价。以基准货币计价的汇率列表，收藏置顶、搜索、涨跌幅、点击换算。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  FX.views = FX.views || {};
  FX.views.rates = {
    render: function (el, params) {
      var s = FX.store.settings();
      var base = String(params.base || s.ratesBase || s.base).toUpperCase();
      if (!FX.CUR.isFiat(base)) base = s.base;
      var query = '';
      var sortMode = s.ratesSort || 'pop';
      var snap = FX.store.getLatest();

      el.innerHTML =
        '<div class="rates">' +
        '  <div class="rates-bar">' +
        '    <div class="rates-base"><span class="dim">' + esc(FX.t('rates.base')) + '</span><span id="rates-base-field"></span></div>' +
        '    <div class="rates-search">' + FX.icon('search', 13) + '<input id="rates-q" type="text" placeholder="' + esc(FX.t('rates.search')) + '" spellcheck="false"></div>' +
        '    <div id="rates-sort"></div>' +
        '  </div>' +
        '  <div class="rates-cols"><span></span><span></span><span>1 ' + esc(base) + ' →</span><span>' + esc(FX.t('trend.change')) + '</span></div>' +
        '  <div class="rates-list" id="rates-list"></div>' +
        '</div>';

      var listEl = el.querySelector('#rates-list');
      var qEl = el.querySelector('#rates-q');

      var baseField = FX.ui.currencyField({
        value: base,
        onChange: function (c) {
          base = c;
          FX.store.patchSettings({ ratesBase: c });
          el.querySelector('.rates-cols').children[2].textContent = '1 ' + base + ' →';
          renderList();
        },
      });
      el.querySelector('#rates-base-field').appendChild(baseField.el);

      var sortSeg = FX.ui.seg([
        { k: 'pop', label: FX.lang() === 'en' ? 'Popular' : '热度' },
        { k: 'chg', label: FX.lang() === 'en' ? 'Movers' : '涨跌' },
        { k: 'code', label: FX.lang() === 'en' ? 'A-Z' : '代码' },
      ], sortMode, function (k) {
        sortMode = k;
        FX.store.patchSettings({ ratesSort: k });
        renderList();
      });
      el.querySelector('#rates-sort').appendChild(sortSeg);

      function rowHtml(code) {
        if (!snap || !snap.usd[code]) return '';
        var r = snap.usd[code] / snap.usd[base];
        if (!isFinite(r)) return '';
        var chg = FX.api.changePct(base, code);
        return '<button type="button" class="rates-row" data-code="' + code + '">' +
          FX.ui.flagBadge(code) +
          '<span class="rates-name"><b>' + code + '</b><small>' + esc(FX.CUR.name(code, FX.lang())) + '</small></span>' +
          '<span class="rates-val">' + U.fmtRate(r) + '</span>' +
          '<span class="rates-chg">' + FX.ui.changeBadge(chg ? chg.pct : null) + '</span>' +
          '</button>';
      }

      function renderList() {
        var q = qEl.value.trim().toLowerCase();
        var codes = FX.CUR.sorted().filter(function (c) {
          if (!snap || !snap.usd[base] || !snap.usd[c]) return false;
          if (c === base) return false;
          if (q) return c.toLowerCase().indexOf(q) >= 0 || FX.CUR.name(c, FX.lang()).toLowerCase().indexOf(q) >= 0;
          return true;
        });

        if (!codes.length) {
          listEl.innerHTML = '<div class="rates-empty">' + esc(snap ? FX.t('rates.none') : FX.t('convert.noRate')) + '</div>';
          return;
        }

        var favs = FX.store.settings().favorites;
        var html = '';
        if (!q) {
          var favRows = codes.filter(function (c) { return favs.indexOf(c) >= 0 && c !== base; });
          var rest = codes.filter(function (c) { return favs.indexOf(c) < 0; });
          if (favRows.length) html += '<div class="rates-sec">' + esc(FX.t('rates.favorites')) + '</div>' + favRows.map(rowHtml).join('');
          html += '<div class="rates-sec">' + esc(FX.t('rates.others')) + '</div>';
          html += rest.map(rowHtml).join('');
        } else {
          html = codes.map(rowHtml).join('');
        }
        listEl.innerHTML = html;
      }

      function sortedByChange(codes) {
        return codes.slice().sort(function (a, b) {
          var ca = FX.api.changePct(base, a), cb = FX.api.changePct(base, b);
          var va = ca ? ca.pct : -Infinity, vb = cb ? cb.pct : -Infinity;
          if (va !== vb) return vb - va;
          return FX.CUR.pop(a) - FX.CUR.pop(b);
        });
      }

      // 按涨跌排序时改写顺序
      var _renderList = renderList;
      renderList = function () {
        if (sortMode === 'chg' || sortMode === 'code') {
          var q = qEl.value.trim().toLowerCase();
          var codes = FX.CUR.sorted().filter(function (c) {
            if (!snap || !snap.usd[base] || !snap.usd[c] || c === base) return false;
            if (q) return c.toLowerCase().indexOf(q) >= 0 || FX.CUR.name(c, FX.lang()).toLowerCase().indexOf(q) >= 0;
            return true;
          });
          if (sortMode === 'code') codes.sort();
          else codes = sortedByChange(codes);
          var favs = FX.store.settings().favorites;
          if (!q) {
            var favRows = codes.filter(function (c) { return favs.indexOf(c) >= 0 && c !== base; });
            var rest = codes.filter(function (c) { return favs.indexOf(c) < 0; });
            var html2 = '';
            if (favRows.length) html2 += '<div class="rates-sec">' + esc(FX.t('rates.favorites')) + '</div>' + favRows.map(rowHtml).join('');
            html2 += '<div class="rates-sec">' + esc(FX.t('rates.others')) + '</div>' + rest.map(rowHtml).join('');
            listEl.innerHTML = html2;
            return;
          }
          listEl.innerHTML = codes.map(rowHtml).join('');
          return;
        }
        _renderList();
      };

      listEl.addEventListener('click', function (e) {
        var row = e.target.closest('.rates-row');
        if (!row) return;
        FX.nav('convert', { from: base, to: row.getAttribute('data-code') });
      });

      qEl.addEventListener('input', U.debounce(renderList, 120));

      // 昨日快照异步到达后补画涨跌徽标
      var onPrev = function () { if (el.isConnected) renderList(); };
      document.addEventListener('fx-prev', onPrev);

      renderList();
      return function () { document.removeEventListener('fx-prev', onPrev); };
    },
  };
})();
