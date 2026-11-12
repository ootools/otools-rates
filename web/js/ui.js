/* 共享 UI 组件：toast / 确认框 / 可搜索币种选择器 / 分段控件 / 涨跌徽标。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;
  var esc = U.esc;

  /* ---------- toast ---------- */

  function toast(msg, kind) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'ok');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.classList.add('toast-out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
  }

  /* ---------- 确认框 ---------- */

  function confirm(opts) {
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      var back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title || '') + '</h3>' +
        '<div class="modal-body">' + esc(opts.body || '') + '</div>' +
        '<div class="modal-actions">' +
        '<button class="btn" data-act="no">' + esc(FX.t('common.cancel')) + '</button>' +
        '<button class="btn btn-primary" data-act="yes">' + esc(opts.okText || FX.t('common.confirm')) + '</button>' +
        '</div></div>';
      root.appendChild(back);
      function done(v) { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') done(false); }
      back.addEventListener('click', function (e) {
        if (e.target === back) done(false);
        var act = e.target.closest('[data-act]');
        if (act) done(act.getAttribute('data-act') === 'yes');
      });
      document.addEventListener('keydown', onKey);
      back.querySelector('[data-act="yes"]').focus();
    });
  }

  /* ---------- 旗帜徽标 ---------- */

  function flagBadge(code, cls) {
    code = String(code || '').toUpperCase();
    var f = FX.CUR.flag(code);
    if (f) return '<span class="flag ' + (cls || '') + '">' + f + '</span>';
    return '<span class="flag flag-t ' + (cls || '') + '">' + esc(code.slice(0, 2)) + '</span>';
  }

  /* ---------- 涨跌徽标（中文语境红涨绿跌，英文语境绿涨红跌） ---------- */

  function changeBadge(pct) {
    if (pct == null || !isFinite(pct)) return '';
    var cls = pct >= 0 ? 'chg-up' : 'chg-down';
    var arrow = pct >= 0 ? 'up' : 'down';
    return '<span class="chg ' + cls + '">' + FX.icon(arrow, 11) + '<i>' + esc(U.fmtPct(pct)) + '</i></span>';
  }

  /* ---------- 分段控件 ---------- */

  function seg(options, activeKey, onPick) {
    var el = document.createElement('div');
    el.className = 'seg';
    options.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (o.k === activeKey ? ' seg-on' : '');
      b.textContent = o.label;
      b.setAttribute('data-k', o.k);
      b.addEventListener('click', function () {
        if (o.k === activeKey) return;
        el.querySelectorAll('.seg-btn').forEach(function (x) { x.classList.remove('seg-on'); });
        b.classList.add('seg-on');
        activeKey = o.k;
        onPick(o.k);
      });
      el.appendChild(b);
    });
    return el;
  }

  /* ---------- 币种选择器（可搜索、可收藏） ---------- */

  var CURSOR = null; // 当前展开的下拉

  function closeDrop() {
    if (CURSOR) { CURSOR.drop.hidden = true; CURSOR.wrap.classList.remove('cur-open'); CURSOR = null; }
  }
  document.addEventListener('click', function (e) {
    if (CURSOR && !CURSOR.wrap.contains(e.target)) closeDrop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && CURSOR) closeDrop();
  });

  function favList() { return FX.store.settings().favorites; }

  function buildList(state) {
    var q = state.input.value.trim().toLowerCase();
    var codes = FX.CUR.sorted().filter(function (c) {
      if (!q) return true;
      return c.toLowerCase().indexOf(q) >= 0 || FX.CUR.name(c, FX.lang()).toLowerCase().indexOf(q) >= 0;
    });
    var favs = favList();
    var favCodes = codes.filter(function (c) { return favs.indexOf(c) >= 0; });
    var rest = codes.filter(function (c) { return favs.indexOf(c) < 0; });

    var html = '';
    function row(c) {
      var starred = favs.indexOf(c) >= 0;
      return '<button type="button" class="cur-row' + (c === state.value ? ' cur-row-on' : '') + '" data-code="' + c + '">' +
        flagBadge(c) +
        '<span class="cur-row-main"><b>' + c + '</b><small>' + esc(FX.CUR.name(c, FX.lang())) + '</small></span>' +
        '<span class="cur-star' + (starred ? ' cur-star-on' : '') + '" data-star="' + c + '" title="' + esc(FX.t('convert.fav')) + '">' + FX.icon(starred ? 'starFill' : 'star', 14) + '</span>' +
        '</button>';
    }
    if (favCodes.length) {
      html += '<div class="cur-sec">' + esc(FX.t('convert.fav')) + '</div>' + favCodes.map(row).join('');
    }
    html += '<div class="cur-sec">' + esc(FX.t('convert.all')) + '</div>' + (rest.length ? rest.map(row).join('') : '');
    if (!codes.length) html = '<div class="cur-sec cur-none">' + esc(FX.t('rates.none')) + '</div>';
    state.list.innerHTML = html;
  }

  /**
   * 币种选择字段。opts: {value, onChange(code), label}
   * 返回 { el, set(code) }
   */
  function currencyField(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'cur-wrap';

    var value = String(opts.value || 'USD').toUpperCase();
    wrap.innerHTML =
      '<button type="button" class="cur-field"' + (opts.id ? ' id="' + esc(opts.id) + '"' : '') + '>' +
      flagBadge(value, 'flag-lg') +
      '<span class="cur-main"><b class="cur-code">' + value + '</b><small class="cur-name">' + esc(FX.CUR.name(value, FX.lang())) + '</small></span>' +
      FX.icon('chevron', 14) +
      '</button>' +
      '<div class="cur-drop" hidden>' +
      '<div class="cur-search">' + FX.icon('search', 13) + '<input type="text" placeholder="' + esc(FX.t('convert.search')) + '"></div>' +
      '<div class="cur-list"></div>' +
      '</div>';

    var field = wrap.querySelector('.cur-field');
    var drop = wrap.querySelector('.cur-drop');
    var input = wrap.querySelector('input');
    var list = wrap.querySelector('.cur-list');
    var state = { wrap: wrap, drop: drop, input: input, list: list, value: value };

    function renderField() {
      var old = field.querySelector('.flag');
      if (old) old.remove();
      field.querySelector('.cur-main').outerHTML =
        '<span class="cur-main"><b class="cur-code">' + value + '</b><small class="cur-name">' + esc(FX.CUR.name(value, FX.lang())) + '</small></span>';
      field.insertAdjacentHTML('afterbegin', flagBadge(value, 'flag-lg'));
    }

    field.addEventListener('click', function () {
      if (!drop.hidden) { closeDrop(); return; }
      closeDrop();
      CURSOR = state;
      drop.hidden = false;
      wrap.classList.add('cur-open');
      input.value = '';
      buildList(state);
      input.focus();
    });

    input.addEventListener('input', function () { buildList(state); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = list.querySelector('.cur-row');
        if (first) first.click();
      }
    });

    list.addEventListener('click', function (e) {
      var star = e.target.closest('[data-star]');
      if (star) {
        e.stopPropagation();
        var c = star.getAttribute('data-star');
        var favs = favList().slice();
        var i = favs.indexOf(c);
        if (i >= 0) { favs.splice(i, 1); FX.store.patchSettings({ favorites: favs }); FX.ui.toast(FX.t('convert.favRemoved', { c: c }), 'warn'); }
        else { favs.push(c); FX.store.patchSettings({ favorites: favs }); FX.ui.toast(FX.t('convert.favAdded', { c: c })); }
        buildList(state);
        document.dispatchEvent(new CustomEvent('fx-favs-changed'));
        return;
      }
      var rowEl = e.target.closest('.cur-row');
      if (!rowEl) return;
      value = rowEl.getAttribute('data-code');
      state.value = value;
      renderField();
      closeDrop();
      if (opts.onChange) opts.onChange(value);
    });

    return {
      el: wrap,
      get: function () { return value; },
      set: function (c) { value = String(c).toUpperCase(); state.value = value; renderField(); },
    };
  }

  FX.ui = {
    toast: toast,
    confirm: confirm,
    flagBadge: flagBadge,
    changeBadge: changeBadge,
    seg: seg,
    currencyField: currencyField,
    closeDrop: closeDrop,
  };
})();
