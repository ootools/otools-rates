/* 应用外壳：导航路由 / 主题 / 语言 / 数据引导与刷新 / 顶栏状态。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  var state = { route: 'convert', params: {}, cleanup: null };

  var NAVS = [
    { k: 'convert', icon: 'convert' },
    { k: 'rates', icon: 'rates' },
    { k: 'trend', icon: 'trend' },
    { k: 'settings', icon: 'settings' },
  ];

  var TITLES = {
    convert: { t: 'convert.title', s: 'convert.sub' },
    rates: { t: 'rates.title', s: 'rates.sub' },
    trend: { t: 'trend.title', s: 'trend.sub' },
    settings: { t: 'settings.title', s: 'settings.sub' },
  };

  /* ---------- 主题 ---------- */

  function systemDark() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }

  function applyTheme() {
    var s = FX.store.settings();
    var theme = s.theme === 'system' ? (systemDark() ? 'dark' : 'light') : s.theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', s.accent || 'azure');
    var iconEl = document.getElementById('theme-icon');
    if (iconEl) iconEl.innerHTML = FX.icon(theme === 'dark' ? 'sun' : 'moon', 15);
  }

  function watchSystemTheme() {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (FX.store.settings().theme === 'system') applyTheme();
      });
    } catch (e) {}
  }

  /* ---------- 导航 ---------- */

  function renderNav() {
    var nav = document.getElementById('nav');
    nav.innerHTML = '';
    NAVS.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-item' + (state.route === n.k ? ' nav-on' : '');
      b.setAttribute('data-route', n.k);
      b.innerHTML = FX.icon(n.icon, 17) + '<span>' + esc(FX.t('nav.' + n.k)) + '</span>';
      b.addEventListener('click', function () { FX.nav(n.k, {}); });
      nav.appendChild(b);
    });
  }

  function parseHash() {
    var h = String(location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('?');
    var route = parts[0] || 'convert';
    if (!FX.views[route]) route = 'convert';
    var params = {};
    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      if (i > 0) params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    return { route: route, params: params };
  }

  FX.nav = function (route, params) {
    params = params || {};
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var target = '#/' + route + (q ? '?' + q : '');
    if (location.hash === target) render();
    else location.hash = target;
  };

  function render() {
    var parsed = parseHash();
    state.route = parsed.route;
    state.params = parsed.params;

    renderNav();
    var meta = TITLES[state.route];
    document.getElementById('page-title').textContent = FX.t(meta.t);
    document.getElementById('page-sub').textContent = FX.t(meta.s);

    var view = document.getElementById('view');
    if (state.cleanup) { try { state.cleanup(); } catch (e) {} }
    view.innerHTML = '';
    FX.ui.closeDrop();
    state.cleanup = FX.views[state.route].render(view, state.params);
  }

  window.addEventListener('hashchange', render);

  /* ---------- 数据引导 ---------- */

  function renderNetBadge() {
    var snap = FX.store.getLatest();
    var dot = document.getElementById('net-dot');
    var text = document.getElementById('net-text');
    if (!dot || !text) return;
    if (!snap) { text.textContent = FX.t('app.refreshing'); dot.className = 'net-dot net-wait'; return; }
    var lang = FX.lang();
    if (snap.offline) {
      dot.className = 'net-dot net-off';
      text.textContent = FX.t('app.netCached') + ' ' + U.fmtTime(snap.fetchedAt, lang);
    } else {
      dot.className = 'net-dot net-ok';
      text.textContent = FX.t('app.netOnline') + ' ' + U.fmtTime(snap.fetchedAt, lang);
    }
  }

  function renderBanner() {
    var slot = document.getElementById('banner-slot');
    var snap = FX.store.getLatest();
    if (snap && snap.offline) {
      slot.innerHTML = '<div class="banner banner-warn">' + FX.icon('wifiOff', 14) + esc(FX.t('app.offline')) + '</div>';
    } else {
      slot.innerHTML = '';
    }
  }

  function setRefreshing(on) {
    var btn = document.getElementById('refresh-btn');
    if (btn) btn.classList.toggle('btn-busy', on);
  }

  function bootstrap() {
    renderNetBadge();
    return FX.api.getLatest(false)
      .then(function () {
        renderNetBadge();
        renderBanner();
        render();
      })
      .catch(function () {
        renderNetBadge();
        renderBanner();
        render();
      });
  }

  FX.app = {
    applyTheme: applyTheme,
    bootstrap: bootstrap,

    refreshAll: function () {
      setRefreshing(true);
      renderNetBadge();
      FX.api.refresh()
        .then(function () {
          setRefreshing(false);
          FX.ui.toast(FX.t('app.updated'));
          renderNetBadge();
          renderBanner();
          render();
        })
        .catch(function () {
          setRefreshing(false);
          FX.ui.toast(FX.t('app.refreshFail'), 'warn');
          renderNetBadge();
          renderBanner();
          render();
        });
    },
  };

  /* ---------- 启动 ---------- */

  function init() {
    FX.setLang(FX.detectLang());
    applyTheme();
    watchSystemTheme();

    document.getElementById('top-date').textContent =
      FX.lang() === 'en' ? U.today() : (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日';

    document.querySelector('[data-action="refresh"]').addEventListener('click', FX.app.refreshAll);
    document.querySelector('[data-action="theme-quick"]').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      FX.store.patchSettings({ theme: cur === 'dark' ? 'light' : 'dark' });
      applyTheme();
    });

    document.addEventListener('otools-locale-changed', function () {
      FX.setLang(FX.detectLang());
      applyTheme();
      renderNav();
      render();
    });

    render();
    bootstrap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
