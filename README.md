# 汇澜 · 实时汇率换算（Ripple Rates）

OTools 独立插件，`panel` 模式默认打开（980 × 700）。纯前端、无框架、无 bundler；
汇率数据来自公开免费源，缓存只写入本机 `localStorage`，无账号、无埋点。

## 功能

### 换算器
- **双向实时换算**：166 种法币任意交叉（USD 基准价模型，交叉价 = usd[to]/usd[from]）。
- 金额实时重算、一键互换方向、点击复制结果。
- 汇率行同时给出正反向报价（1 CNY = x USD · 1 USD = y CNY）。
- **当日涨跌徽标**（对比昨日公开快照；中文语境红涨绿跌，英文语境自动反转）。
- **近 30 天迷你走势**（欧央行对直连时间序列）。
- 币种选择器：代码/中文名搜索、收藏置顶、行内点星收藏。
- 换算记忆：币种对与金额持久化，重开面板接着用。

### 牌价
- 以任一基准货币计价的一揽子汇率（默认跟随设置的基准币）。
- 收藏分区置顶 + 全部币种；按热度 / 涨跌 / 代码排序；搜索过滤。
- 每行带当日涨跌幅；点击行直接跳转换算器并带入币种对。

### 走势
- 7 天 / 1 月 / 3 月 / 1 年 / 5 年 / 全部（1999 起）区间。
- **欧央行 31 币种**（USD EUR CNY JPY GBP HKD 等）：frankfurter.dev 时间序列，一次请求全区间。
- **非欧央行币种**：jsDelivr 每日快照拼装（7 天 / 1 月 / 3 月），并发拉取 + 本机缓存。
- 手绘 SVG 折线图：渐变面积、悬停十字线与浮层、最高 / 最低 / 均值 / 区间涨跌统计。

### 设置与数据
- 主题：跟随系统 / 浅色 / 深色；主色：靛蓝 / 松石 / 绛红。
- 默认基准货币、收藏币种管理、自动刷新策略（打开时 / 5 / 15 / 30 / 60 分钟 / 关闭）。
- 金额小数位：跟随货币（ISO 4217）或固定 2 / 4 位。
- 设置导出 / 导入（OTools 宿主文件对话框；浏览器回退为下载与 `input[type=file]`）。
- 清除汇率缓存（设置保留）。

### 离线与降级
- 打开面板先用缓存即时渲染，再后台刷新；断网时展示缓存数据并标注「离线 · 缓存于」。
- 实时汇率降级链：**jsDelivr currency-api → open.er-api.com → 本机缓存**。
- 未联网冒烟路径有专门断言（结构性检查不依赖网络）。

## 数据来源与免责

| 项目 | 来源 |
| --- | --- |
| 实时汇率 | `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api`（200+ 币，按法币白名单过滤）、`open.er-api.com`（166 币） |
| 昨日对比 | jsDelivr 按日期快照（自算前一日期，最多回溯 7 天） |
| 历史序列 | `api.frankfurter.dev`（欧洲央行参考汇率）、jsDelivr 每日快照 |

> 汇率数据可能存在延迟或误差，仅供个人参考，不构成任何交易或投资建议；
> 实际兑换请以银行及官方牌价为准。

## 工程结构

```
plugin.json            # 清单：openMode=panel, panelWidth=980, panelHeight=700
logo.svg
web/                   # 源码（原生 HTML/CSS/JS，无框架、无 bundler）
  index.html           # 入口，含 OTools 宿主桥标记
  css/app.css
  js/{util,bridge,icons,currencies,store,api,chart,ui}.js
  js/views/{convert,rates,trend,settings}.js
  js/app.js            # 路由 / 主题 / i18n / 数据引导
dist/                  # 由 build-web.mjs 从 web/ 拷贝（entry 指向这里）
scripts/
  build-web.mjs           # web/ → dist/（模板同款）
  pack-plugin.mjs         # 产出 .oplg + SHA256SUMS + meta.json
  verify-plugin.mjs       # 校验 ZIP / CRC / SHA256 / 入口桥
  serve-dist.mjs          # 本地静态预览 dist/
  smoke.mjs               # CDP 真实点击冒烟 + 截图
  publish-market.mjs      # 上架市场（模板同款）
  release-policy.mjs      # tag 与构建一致性核验（模板同款）
  deploy-to-otools.ps1    # 可选：同步到 OTools 主仓库做本地试跑
```

## 构建 / 打包 / 校验

```bash
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"

"$NODE" scripts/build-web.mjs                    # web/ → dist/
"$NODE" scripts/pack-plugin.mjs --out dist-pack  # 生成 .oplg
"$NODE" scripts/verify-plugin.mjs dist-pack      # 校验
```

`verify-plugin.mjs` 对纯前端插件会提示缺少 `.wasm`，属预期（无 native 模块），可忽略。

## 浏览器冒烟

覆盖：骨架与换算器结构、在线数据入库（163 币）、金额联动、当日涨跌、30 天迷你走势、
币种选择器（搜索 / 收藏 / 收起）、互换方向、牌价（150+ 行、收藏置顶、搜索、点击跳转）、
走势（欧央行 6 档区间 + 非欧央行 3 档快照序列）、设置（六卡片、收藏增删、主题 / 主色）、
导出解析、重载持久化、无横向溢出与无 JS 运行时异常。

本机的坑（与岁纪相同）：**服务 + Chrome + 冒烟必须在同一条 shell 命令里执行**，且每次换
**新端口 + 新 Chrome profile 目录**；Git Bash 的 `kill` 杀不掉 Windows 进程树，收尾用
`taskkill //F //T` 或 PowerShell 按命令行匹配清理；`curl` 本机地址需 `--noproxy '*'`。

```bash
cd "D:/Repos/xyito/otools/otools-rates"
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"

rm -rf _shots/profile-<新名字>
"$NODE" scripts/serve-dist.mjs <新端口A> > _shots/serve.log 2>&1 &
sleep 2; curl -s --noproxy '*' -o /dev/null http://127.0.0.1:<新端口A>/ && echo ready
"$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --remote-allow-origins='*' --remote-debugging-port=<新端口B> \
  --user-data-dir="D:/Repos/xyito/otools/otools-rates/_shots/profile-<新名字>" \
  --window-size=980,700 about:blank > _shots/chrome.log 2>&1 &
sleep 5
CDP_PORT=<新端口B> BASE_URL=http://127.0.0.1:<新端口A>/ "$NODE" scripts/smoke.mjs
# 收尾：按 profile 名匹配强杀 Chrome；服务按端口查 PID 后 taskkill
```

截图落在 `_shots/`，尺寸为 panel 的 980 × 700。

### 验证记录（v1.0.0）

- `scripts/smoke.mjs` 45/45 通过（在线链路：163 币入库、CNY→USD 交叉价、当日涨跌徽标、
  30 天迷你走势、欧央行 1 月/1 年序列、CNY→AED 快照序列）。
- 打包校验：`otools-rates-1.0.0.oplg` 17 个条目，CRC / SHA256 / 入口桥全部通过；
  纯前端无 `.wasm` 属预期。
