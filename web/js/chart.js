/* 手绘 SVG 折线图：坐标轴 / 渐变面积 / 悬停十字线与浮层；spark 迷你模式。
 * FX.chart.line(el, points, opts)
 *   points: [{d:'YYYY-MM-DD', v:number}]（已按日期升序）
 *   opts: { spark:false, accent:cssVarColor, lang, height }
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});
  var U = FX.util;

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function niceTicks(lo, hi) {
    if (!(hi > lo)) { hi = lo + 1; }
    var span = hi - lo;
    var step = Math.pow(10, Math.floor(Math.log10(span / 4)));
    var err = span / 4 / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var start = Math.ceil(lo / step) * step;
    var out = [];
    for (var v = start; v <= hi + step * 0.01; v += step) out.push(v);
    return out;
  }

  function fmtV(v) {
    if (v >= 10000) return Math.round(v).toLocaleString('en-US');
    if (v >= 100) return v.toFixed(1);
    if (v >= 1) return v.toFixed(4);
    return v.toPrecision(4);
  }

  /**
   * 渲染到 el（清空原有内容）。返回 cleanup 函数（移除监听）。
   * 自适应宽度：使用 ResizeObserver，svg viewBox 按 1000×H 归一。
   */
  function line(el, points, opts) {
    opts = opts || {};
    var lang = opts.lang || FX.lang();
    var H = opts.height || (opts.spark ? 60 : 320);
    var W = 1000;
    el.innerHTML = '';
    if (!points || points.length < 2) return function () {};

    el.classList.add('chart-box');

    var vs = points.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    var padY = (hi - lo) * 0.12 || hi * 0.02 || 1;
    var yLo = lo - padY, yHi = hi + padY;
    var padL = opts.spark ? 0 : 8, padR = opts.spark ? 0 : 8, padT = opts.spark ? 6 : 14, padB = opts.spark ? 4 : 26;
    var iw = W - padL - padR, ih = H - padT - padB;

    function xAt(i) { return padL + (points.length === 1 ? iw / 2 : (iw * i) / (points.length - 1)); }
    function yAt(v) { return padT + ih - ((v - yLo) / (yHi - yLo)) * ih; }

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'class': 'chart-svg' });
    var g = svgEl('g', {});
    svg.appendChild(g);

    var d0 = points[0].d, dN = points[points.length - 1].d;
    var up = points[points.length - 1].v >= points[0].v;
    var stroke = opts.color || 'var(--accent)';

    if (!opts.spark) {
      niceTicks(lo, hi).forEach(function (v) {
        var y = yAt(v);
        g.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, 'class': 'chart-grid' }));
        var lbl = svgEl('text', { x: W - padR - 2, y: y - 4, 'class': 'chart-tick', 'text-anchor': 'end' });
        lbl.textContent = fmtV(v);
        g.appendChild(lbl);
      });
      var xs = [d0, points[Math.floor((points.length - 1) / 2)].d, dN];
      [0, Math.floor((points.length - 1) / 2), points.length - 1].forEach(function (i, k) {
        var t = svgEl('text', { x: U.clamp(xAt(i), 30, W - 30), y: H - 6, 'class': 'chart-tick', 'text-anchor': k === 0 ? 'start' : (k === 2 ? 'end' : 'middle') });
        t.textContent = U.fmtDate(points[i].d, lang);
        g.appendChild(t);
      });
    }

    var linePath = '';
    points.forEach(function (p, i) {
      linePath += (i === 0 ? 'M' : 'L') + xAt(i).toFixed(2) + ' ' + yAt(p.v).toFixed(2);
    });
    var areaPath = linePath + 'L' + xAt(points.length - 1).toFixed(2) + ' ' + (padT + ih) + 'L' + xAt(0).toFixed(2) + ' ' + (padT + ih) + 'Z';

    var gid = 'cg' + Math.random().toString(36).slice(2, 8);
    var defs = svgEl('defs', {});
    var grad = svgEl('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    var s1 = svgEl('stop', { offset: '0', 'stop-color': stroke, 'stop-opacity': '.22' });
    var s2 = svgEl('stop', { offset: '1', 'stop-color': stroke, 'stop-opacity': '0' });
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
    svg.appendChild(defs);
    g.appendChild(svgEl('path', { d: areaPath, fill: 'url(#' + gid + ')', stroke: 'none' }));
    g.appendChild(svgEl('path', { d: linePath, fill: 'none', stroke: stroke, 'stroke-width': opts.spark ? 2 : 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }));

    // 末点圆点
    var lastX = xAt(points.length - 1), lastY = yAt(points[points.length - 1].v);
    g.appendChild(svgEl('circle', { cx: lastX, cy: lastY, r: opts.spark ? 2.6 : 3.4, fill: stroke }));

    var hoverLine = null, hoverDot = null;
    if (!opts.spark) {
      hoverLine = svgEl('line', { x1: 0, y1: padT, x2: 0, y2: padT + ih, 'class': 'chart-cross', visibility: 'hidden' });
      hoverDot = svgEl('circle', { r: 4, 'class': 'chart-dot', visibility: 'hidden' });
      g.appendChild(hoverLine); g.appendChild(hoverDot);
    }

    el.appendChild(svg);

    var tip = null;
    function cleanup() {
      if (ro) ro.disconnect();
      if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
      svg.removeEventListener('mousemove', onMove);
      svg.removeEventListener('mouseleave', onLeave);
    }

    if (!opts.spark) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.style.display = 'none';
      el.appendChild(tip);

      var ro = new ResizeObserver(function () { layoutTip(); });
      ro.observe(el);

      function layoutTip() { /* tip 用绝对定位，无需重排 svg */ }

      function onMove(ev) {
        var rect = svg.getBoundingClientRect();
        var px = ((ev.clientX - rect.left) / rect.width) * W;
        var frac = U.clamp((px - padL) / iw, 0, 1);
        var i = Math.round(frac * (points.length - 1));
        var p = points[i];
        var sx = xAt(i);
        hoverLine.setAttribute('x1', sx); hoverLine.setAttribute('x2', sx);
        hoverLine.setAttribute('visibility', 'visible');
        hoverDot.setAttribute('cx', sx); hoverDot.setAttribute('cy', yAt(p.v));
        hoverDot.setAttribute('visibility', 'visible');
        tip.style.display = 'block';
        tip.innerHTML = '<b>' + U.fmtRate(p.v) + '</b><span>' + U.fmtDate(p.d, lang) + '</span>';
        var elRect = el.getBoundingClientRect();
        var lx = ((sx / W) * elRect.width);
        tip.style.left = U.clamp(lx - 60, 4, elRect.width - 124) + 'px';
      }
      function onLeave() {
        hoverLine.setAttribute('visibility', 'hidden');
        hoverDot.setAttribute('visibility', 'hidden');
        tip.style.display = 'none';
      }
      svg.addEventListener('mousemove', onMove);
      svg.addEventListener('mouseleave', onLeave);
    }

    return cleanup;
  }

  FX.chart = { line: line };
})();
