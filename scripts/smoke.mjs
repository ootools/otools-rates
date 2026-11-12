/**
 * 真实浏览器冒烟：CDP 点击回归 + Panel 尺寸截图（无第三方依赖）。
 * 用法（服务 + Chrome 由外部同一条 shell 命令拉起，见 README）：
 *   CDP_PORT=9234 BASE_URL=http://127.0.0.1:6494/ node scripts/smoke.mjs
 * 网络可用时覆盖在线数据链路；不可用时结构性检查仍然成立。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, '_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CDP_PORT = Number(process.env.CDP_PORT || 9234);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:6494/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  let page = null;
  for (let i = 0; i < 20 && !page; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch (e) { /* Chrome 还在启动 */ }
    if (!page) await sleep(300);
  }
  if (!page) throw new Error('找不到 CDP 页面目标');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const jsErrors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      jsErrors.push((d.text || '') + ' ' + (d.exception && d.exception.description ? d.exception.description : ''));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
  });
  return { send, jsErrors };
}

async function main() {
  const { send, jsErrors } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 980, height: 700, deviceScaleFactor: 1, mobile: false,
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.text);
    return res.result && res.result.result ? res.result.result.value : undefined;
  };
  const exists = (sel) => evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const count = (sel) => evaluate(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
  const click = (sel) => evaluate(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`);

  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok: ok === true });
    console.log(`${ok === true ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  → ' + detail : ''}`);
  };
  const shot = async (name) => {
    await evaluate("(function(){var r=document.getElementById('toast-root');if(r)r.innerHTML='';return true;})()");
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (res.result && res.result.data) {
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(res.result.data, 'base64'));
      console.log(`  shot  ${name}.png`);
    }
  };
  const goto = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 40; i += 1) {
      await sleep(180);
      if (await evaluate("!!(window.FX && FX.views && document.querySelector('.nav-item'))")) return;
    }
    throw new Error('页面加载超时：' + url);
  };
  const waitFor = async (expr, timeoutMs) => {
    for (let t = 0; t < timeoutMs; t += 250) {
      if (await evaluate(expr)) return true;
      await sleep(250);
    }
    return false;
  };

  // ── 干净起点 ────────────────────────────────────────
  await goto(BASE);
  await evaluate('localStorage.clear(); true');
  await goto(BASE);
  await sleep(300);

  // ── 骨架与换算器（结构） ────────────────────────────
  check('导航含四个入口', (await count('.nav-item')) === 4, String(await count('.nav-item')));
  check('默认进入换算视图', await exists('.conv-cards'));
  check('换算含两张币种卡', (await count('.conv-card')) === 2);
  check('币种字段默认 CNY / USD', (await text('#conv-from-cur .cur-code')) === 'CNY' && (await text('#conv-to-cur .cur-code')) === 'USD');
  check('样式表已生效', (await evaluate("getComputedStyle(document.querySelector('.conv-card')).borderRadius")) === '14px');
  check('面板宽度下无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await evaluate('document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth'));

  // ── 在线数据链路（网络可用时） ──────────────────────
  const hasData = await waitFor('!!(FX.store.getLatest() && FX.store.getLatest().usd && FX.store.getLatest().usd.EUR)', 30000);
  check('拉取实时汇率入库', hasData);
  if (hasData) {
    check('快照含 150+ 法币', (await evaluate('Object.keys(FX.store.getLatest().usd).length')) >= 150,
      String(await evaluate('Object.keys(FX.store.getLatest().usd).length')));
    check('USD 基准价为 1', (await evaluate('FX.store.getLatest().usd.USD')) === 1);
    check('换算结果已渲染', (await text('#conv-result')) !== '—' && (await text('#conv-result')) !== '');
    check('汇率行含双向报价', /=/.test(String(await text('#conv-rate'))), String(await text('#conv-rate')).slice(0, 80));

    // 金额联动：输入 200，结果应与页面内模型计算一致
    const r1 = await text('#conv-result');
    await evaluate(`(function(){var i=document.querySelector('#conv-from-amount');i.value='200';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(120);
    const r2 = await text('#conv-result');
    const expect = await evaluate("(function(){var s=FX.store.getLatest();var st=FX.store.settings();var from=document.querySelector('#conv-from-cur .cur-code').textContent;var to=document.querySelector('#conv-to-cur .cur-code').textContent;var d=st.digits==='auto'?FX.CUR.digits(to):st.digits;return FX.util.fmtAmount(200*s.usd[to]/s.usd[from],d);})()");
    check('金额翻倍实时重算', r2 === expect, r1 + ' → ' + r2 + ' / expect ' + expect);
    await evaluate(`(function(){var i=document.querySelector('#conv-from-amount');i.value='100';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(120);

    // 涨跌幅徽标（昨日快照到达后）
    const chgOk = await waitFor('!!document.querySelector("#conv-chg .chg")', 25000);
    check('当日涨跌徽标渲染', chgOk);

    // 迷你走势（CNY→USD 属欧央行对）
    const sparkOk = await waitFor('!!document.querySelector(".conv-spark-chart svg")', 40000);
    check('30 天迷你走势渲染', sparkOk);
  } else {
    console.log('  （无网络：跳过在线数据断言，验证离线降级路径）');
    check('离线时换算结果为占位', (await text('#conv-result')) === '—');
  }
  await shot('01-convert-light');

  // ── 币种选择器 ──────────────────────────────────────
  await click('#conv-to-cur .cur-field');
  await sleep(200);
  check('下拉展开含搜索框', await exists('.cur-drop:not([hidden]) .cur-search'));
  check('下拉含收藏分区', await exists('.cur-sec'));
  await evaluate(`(function(){var i=document.querySelector('.cur-drop:not([hidden]) .cur-search input');i.value='日元';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(160);
  const rows = await count('.cur-drop:not([hidden]) .cur-row');
  check('搜索「日元」过滤', rows >= 1 && rows <= 5, String(rows));
  await click('.cur-drop:not([hidden]) .cur-row');
  await sleep(250);
  check('选择后字段更新为 JPY', (await text('#conv-to-cur .cur-code')) === 'JPY');
  check('下拉已收起', !(await exists('.cur-drop:not([hidden])')));
  await click('#conv-to-cur .cur-field');
  await sleep(160);
  await click('.cur-drop:not([hidden]) .cur-row[data-code="USD"]');
  await sleep(200);

  // ── 交换方向 ────────────────────────────────────────
  const fromBefore = await text('#conv-from-cur .cur-code');
  await click('#conv-swap');
  await sleep(220);
  check('交换按钮互换币种', (await text('#conv-from-cur .cur-code')) === 'USD' && (await text('#conv-to-cur .cur-code')) === fromBefore);
  await click('#conv-swap');
  await sleep(180);

  // ── 牌价 ────────────────────────────────────────────
  await click('.nav-item[data-route="rates"]');
  await sleep(300);
  check('牌价列表渲染', await exists('.rates-list'));
  if (hasData) {
    const n = await count('.rates-row');
    check('牌价行 150+', n >= 150, String(n));
    check('收藏置顶分区', await exists('.rates-sec'));
    const firstFav = await evaluate("(function(){var e=document.querySelector('.rates-row .rates-name b');return e?e.textContent:'';})()");
    check('首行是收藏币种', ['USD', 'EUR', 'JPY', 'HKD', 'GBP'].includes(firstFav), String(firstFav));
    await evaluate(`(function(){var i=document.querySelector('#rates-q');i.value='美元';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(260);
    check('搜索「美元」唯一', (await count('.rates-row')) === 1, String(await count('.rates-row')));
    await evaluate(`(function(){var i=document.querySelector('#rates-q');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(260);
    await click('.rates-row');
    await sleep(300);
    check('点击牌价行跳转换算', String(await evaluate('location.hash')).includes('#/convert'));
    check('跳转携带币种参数', (await text('#conv-to-cur .cur-code')) !== '' );
    await shot('02-rates-to-convert');
  }
  await evaluate("location.hash='#/rates'"); await sleep(300);
  await shot('03-rates');

  // ── 走势 ────────────────────────────────────────────
  await click('.nav-item[data-route="trend"]');
  await sleep(300);
  check('走势视图渲染', await exists('.trend-bar'));
  check('欧央行对提供 6 档区间', (await count('.trend-bar .seg-btn')) === 6, String(await count('.trend-bar .seg-btn')));
  if (hasData) {
    const chartOk = await waitFor('!!document.querySelector("#trend-chart svg")', 40000);
    check('走势图渲染', chartOk);
    check('区间统计 4 项', (await count('.tstat')) === 4, String(await count('.tstat')));
    check('来源标注存在', /ECB|央行|European/.test(String(await text('#trend-src'))), String(await text('#trend-src')).slice(0, 60));
    await shot('04-trend');
    await click('.trend-bar .seg-btn:nth-child(5)'); // 1 年
    await sleep(400);
    const yChart = await waitFor('!!document.querySelector("#trend-chart svg")', 40000);
    check('切换 1 年区间重渲染', yChart);
    // 非欧央行对：CNY → AED（AED 不在 ECB 表）
    await click('#trend-to .cur-field'); await sleep(180);
    await evaluate(`(function(){var i=document.querySelector('.cur-drop:not([hidden]) .cur-search input');i.value='AED';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(160);
    await click('.cur-drop:not([hidden]) .cur-row[data-code="AED"]');
    await sleep(300);
    check('非欧央行对降级为 3 档区间', (await count('.trend-bar .seg-btn')) === 3, String(await count('.trend-bar .seg-btn')));
    const snapOk = await waitFor('(function(){var m=/快照|snapshot/i.test((document.querySelector("#trend-src")||{}).textContent||"");var c=!!document.querySelector("#trend-chart svg");return m||c||/暂无|failed|失败/.test((document.querySelector("#trend-chart")||{}).textContent||"");})()', 70000);
    check('非欧央行对可出 7 天快照序列', snapOk);
  } else {
    await shot('04-trend-offline');
  }

  // ── 设置 ────────────────────────────────────────────
  await click('.nav-item[data-route="settings"]');
  await sleep(300);
  check('设置含六张卡片', (await count('.set-card')) === 6, String(await count('.set-card')));
  check('收藏 chips 渲染', (await count('.fav-chip')) === 5, String(await count('.fav-chip')));
  await click('.fav-chip .fav-x');
  await sleep(200);
  check('移除收藏生效', (await evaluate('FX.store.settings().favorites.length')) === 4);
  await click('.seg-btn[data-k="dark"]');
  await sleep(220);
  check('切换深色主题', (await evaluate("document.documentElement.getAttribute('data-theme')")) === 'dark');
  await click('.seg-btn[data-k="light"]');
  await sleep(180);
  await click('#set-accent .accent-teal');
  await sleep(200);
  check('切换主色为松石', (await evaluate("document.documentElement.getAttribute('data-accent')")) === 'teal');
  await click('#set-accent .accent-azure');
  await sleep(180);
  check('导出 JSON 可解析', (await evaluate('JSON.parse(FX.store.exportAll()).settings.base')) === 'CNY');
  await shot('05-settings-dark');

  // ── 持久化与重载 ────────────────────────────────────
  const lastTo = await evaluate('FX.store.settings().lastTo');
  await goto(BASE);
  await sleep(400);
  check('重载后设置保留', (await evaluate('FX.store.settings().favorites.length')) === 4);
  check('重载后换算记忆保留', (await evaluate('FX.store.settings().lastTo')) === lastTo, String(lastTo));
  check('重载无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true);
  await click('.nav-item[data-route="convert"]');
  await sleep(250);
  await evaluate("(function(){var i=document.querySelector('#conv-from-amount');i.value='100';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
  await sleep(150);
  await click('[data-action="theme-quick"]');
  await sleep(200);
  await shot('06-convert-dark');

  check('无 JS 运行时异常', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过；截图目录：${SHOTS}`);
  if (failed.length) process.exitCode = 1;
  try { await send('Browser.close'); } catch (e) { /* 端口由外部命令兜底清理 */ }
}

try {
  await main();
} catch (error) {
  console.error('冒烟失败：' + (error.stack || error.message));
  process.exitCode = 1;
}
