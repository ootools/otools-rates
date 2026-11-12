/* 视图：设置。外观 / 基准货币 / 收藏管理 / 刷新策略 / 数据管理 / 关于。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  FX.views = FX.views || {};
  FX.views.settings = {
    render: function (el) {
      var s = FX.store.settings();

      el.innerHTML =
        '<div class="settings">' +
        '  <div class="set-card"><h3>' + esc(FX.t('settings.appearance')) + '</h3>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('settings.theme')) + '</span><span id="set-theme"></span></div>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('settings.accent')) + '</span><span class="accent-row" id="set-accent"></span></div>' +
        '  </div>' +
        '  <div class="set-card"><h3>' + esc(FX.t('rates.base')) + '</h3>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('settings.defaultBase')) + '</span><span id="set-base"></span></div>' +
        '    <p class="set-hint dim">' + esc(FX.t('rates.clickConvert')) + '</p>' +
        '  </div>' +
        '  <div class="set-card"><h3>' + esc(FX.t('settings.favorites')) + '</h3>' +
        '    <div class="fav-chips" id="set-favs"></div>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('convert.fav')) + ' +</span><span id="set-fav-add"></span></div>' +
        '    <p class="set-hint dim">' + esc(FX.t('settings.favHint')) + '</p>' +
        '  </div>' +
        '  <div class="set-card"><h3>' + esc(FX.t('settings.refresh')) + '</h3>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('settings.refresh')) + '</span><span id="set-refresh"></span></div>' +
        '    <div class="set-row"><span class="set-label">' + esc(FX.t('settings.digits')) + '</span><span id="set-digits"></span></div>' +
        '  </div>' +
        '  <div class="set-card"><h3>' + esc(FX.t('settings.data')) + '</h3>' +
        '    <div class="set-btns">' +
        '      <button class="btn" id="set-export">' + FX.icon('export', 14) + esc(FX.t('settings.export')) + '</button>' +
        '      <button class="btn" id="set-import">' + FX.icon('import', 14) + esc(FX.t('settings.import')) + '</button>' +
        '      <button class="btn btn-danger" id="set-clear">' + FX.icon('trash', 14) + esc(FX.t('settings.clear')) + '</button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="set-card"><h3>' + esc(FX.t('settings.about')) + '</h3>' +
        '    <p class="set-hint"><b>' + esc(FX.t('settings.sources')) + '</b><br>' +
        '      <span class="dim">jsDelivr · fawazahmed0/currency-api（实时 + 每日快照）<br>' +
        '      ExchangeRate-API open endpoint（实时）<br>' +
        '      frankfurter.dev · 欧洲央行参考汇率（历史）</span></p>' +
        '    <p class="set-hint"><b>' + esc(FX.t('settings.disclaimer')) + '</b><br><span class="dim">' + esc(FX.t('settings.disclaimerText')) + '</span></p>' +
        '    <p class="set-hint dim">' + esc(FX.t('settings.aboutLine')) + '</p>' +
        '  </div>' +
        '</div>';

      /* 主题 */
      el.querySelector('#set-theme').appendChild(FX.ui.seg([
        { k: 'system', label: FX.t('settings.themeSys') },
        { k: 'light', label: FX.t('settings.themeLight') },
        { k: 'dark', label: FX.t('settings.themeDark') },
      ], s.theme, function (k) { FX.store.patchSettings({ theme: k }); FX.app.applyTheme(); }));

      /* 主色 */
      var accentRow = el.querySelector('#set-accent');
      ['azure', 'teal', 'vermilion'].forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'accent-dot accent-' + a + (s.accent === a ? ' accent-on' : '');
        b.setAttribute('aria-label', FX.t('settings.accent' + a.charAt(0).toUpperCase() + a.slice(1)));
        b.addEventListener('click', function () {
          FX.store.patchSettings({ accent: a });
          FX.app.applyTheme();
          accentRow.querySelectorAll('.accent-dot').forEach(function (x) { x.classList.remove('accent-on'); });
          b.classList.add('accent-on');
        });
        accentRow.appendChild(b);
      });

      /* 基准货币 */
      el.querySelector('#set-base').appendChild(FX.ui.currencyField({
        value: s.base,
        onChange: function (c) { FX.store.patchSettings({ base: c }); },
      }).el);

      /* 收藏管理 */
      var favsEl = el.querySelector('#set-favs');
      function renderFavs() {
        var favs = FX.store.settings().favorites;
        favsEl.innerHTML = '';
        if (!favs.length) favsEl.innerHTML = '<span class="dim set-hint">—</span>';
        favs.forEach(function (c) {
          var chip = document.createElement('span');
          chip.className = 'fav-chip';
          chip.innerHTML = FX.ui.flagBadge(c) + c + '<button class="fav-x" data-c="' + c + '" aria-label="remove">' + FX.icon('x', 11) + '</button>';
          favsEl.appendChild(chip);
        });
      }
      favsEl.addEventListener('click', function (e) {
        var x = e.target.closest('.fav-x');
        if (!x) return;
        var c = x.getAttribute('data-c');
        FX.store.patchSettings({ favorites: FX.store.settings().favorites.filter(function (f) { return f !== c; }) });
        renderFavs();
      });
      renderFavs();
      el.querySelector('#set-fav-add').appendChild(FX.ui.currencyField({
        value: 'USD',
        onChange: function (c) {
          var favs = FX.store.settings().favorites;
          if (favs.indexOf(c) >= 0) { FX.ui.toast(FX.t('convert.favAdded', { c: c })); return; }
          FX.store.patchSettings({ favorites: favs.concat([c]) });
          renderFavs();
          FX.ui.toast(FX.t('convert.favAdded', { c: c }));
        },
      }).el);

      /* 刷新与小数位 */
      el.querySelector('#set-refresh').appendChild(FX.ui.seg([
        { k: 'open', label: FX.t('settings.refreshOpen') },
        { k: 5, label: FX.t('settings.refreshMin', { n: 5 }) },
        { k: 15, label: FX.t('settings.refreshMin', { n: 15 }) },
        { k: 30, label: FX.t('settings.refreshMin', { n: 30 }) },
        { k: 60, label: FX.t('settings.refreshMin', { n: 60 }) },
        { k: 'off', label: FX.t('settings.refreshOff') },
      ], s.autoRefresh, function (k) {
        var v = (k === 'open' || k === 'off') ? k : +k;
        FX.store.patchSettings({ autoRefresh: v });
      }));

      el.querySelector('#set-digits').appendChild(FX.ui.seg([
        { k: 'auto', label: FX.t('settings.digitsAuto') },
        { k: 2, label: '2' }, { k: 4, label: '4' },
      ], String(s.digits), function (k) {
        FX.store.patchSettings({ digits: k === 'auto' ? 'auto' : +k });
      }));

      /* 数据管理 */
      el.querySelector('#set-export').addEventListener('click', function () {
        FX.host.saveJson('otools-rates-settings.json', FX.store.exportAll())
          .then(function (p) { if (p) FX.ui.toast(FX.t('app.exported') + (p === 'browser' ? '' : ' · ' + p.split(/[\\/]/).pop())); })
          .catch(function () { FX.ui.toast(FX.t('app.refreshFail'), 'warn'); });
      });
      el.querySelector('#set-import').addEventListener('click', function () {
        FX.host.openJson().then(function (f) {
          if (!f) return;
          try {
            FX.store.importAll(f.text);
            FX.ui.toast(FX.t('settings.imported'));
            FX.app.applyTheme();
            FX.nav('settings', {});
          } catch (e) {
            FX.ui.toast(FX.t('settings.importFailed'), 'warn');
          }
        }).catch(function () { FX.ui.toast(FX.t('settings.importFailed'), 'warn'); });
      });
      el.querySelector('#set-clear').addEventListener('click', function () {
        FX.ui.confirm({
          title: FX.t('settings.clear'),
          body: FX.lang() === 'en' ? 'Cached rates and history will be removed. Settings are kept.' : '将清除缓存的实时汇率与历史序列，设置保留。',
        }).then(function (ok) {
          if (!ok) return;
          FX.store.clearRateCache();
          FX.ui.toast(FX.t('settings.cleared'));
          FX.app.bootstrap();
        });
      });

      return function () {};
    },
  };
})();
