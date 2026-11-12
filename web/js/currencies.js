/* 币种元数据：法币白名单、小数位、热度排序、中英文名。
 * 名称优先用运行时 Intl.DisplayNames（WebView2 / Chrome 均内置），
 * 少数冷门代码用内嵌覆盖表兜底；旗帜在 icons.js 的 FLAGS 中。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});

  /* 法币白名单 = er-api 全量 166 币种（jsDelivr 含大量加密币，按此过滤） */
  var CODES = ('USD AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD ' +
    'CAD CDF CHF CLF CLP CNH CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP FOK GBP GEL GGP GHS GIP ' +
    'GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS IMP INR IQD IRR ISK JEP JMD JOD JPY KES KGS KHR KID KMF KRW KWD KYD ' +
    'KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR ' +
    'PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SYP SZL THB ' +
    'TJS TMT TND TOP TRY TTD TVD TWD TZS UAH UGX UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF YER ZAR ZMW ZWG ZWL').split(' ');

  var CODESET = {};
  CODES.forEach(function (c) { CODESET[c] = 1; });

  /* 例外：d 小数位（0 / 3 / 4），pop 热度排序（小者靠前） */
  var EX = {
    USD: { pop: 1 }, EUR: { pop: 2 }, JPY: { d: 0, pop: 3 }, GBP: { pop: 4 }, HKD: { pop: 5 }, CNY: { pop: 6 },
    KRW: { d: 0, pop: 7 }, SGD: { pop: 8 }, AUD: { pop: 9 }, CAD: { pop: 10 }, CHF: { pop: 11 }, TWD: { d: 0, pop: 12 },
    NZD: { pop: 13 }, THB: { pop: 14 }, MYR: { pop: 15 }, VND: { d: 0, pop: 16 }, PHP: { pop: 17 }, IDR: { d: 0, pop: 18 },
    INR: { pop: 19 }, RUB: { pop: 20 }, TRY: { pop: 21 }, BRL: { pop: 22 }, MXN: { pop: 23 }, AED: { pop: 24 },
    SAR: { pop: 25 }, SEK: { pop: 26 }, NOK: { pop: 27 }, DKK: { pop: 28 }, PLN: { pop: 29 }, CZK: { pop: 30 },
    HUF: { d: 0, pop: 31 }, ILS: { pop: 32 }, KZT: { pop: 33 }, UAH: { pop: 34 }, ZAR: { pop: 35 }, QAR: { pop: 36 },
    KWD: { d: 3, pop: 37 }, BHD: { d: 3, pop: 38 }, NGN: { pop: 39 }, EGP: { pop: 40 }, ARS: { pop: 41 },
    CLP: { d: 0, pop: 42 }, COP: { d: 0, pop: 43 }, PEN: { pop: 44 }, XDR: { d: 4, pop: 45 }, JOD: { d: 3, pop: 46 },
    OMR: { d: 3 }, IQD: { d: 3 }, LYD: { d: 3 }, TND: { d: 3 }, BIF: { d: 0 }, DJF: { d: 0 }, GNF: { d: 0 },
    KMF: { d: 0 }, PYG: { d: 0 }, RWF: { d: 0 }, UGX: { d: 0 }, VUV: { d: 0 }, XAF: { d: 0 }, XOF: { d: 0 },
    XPF: { d: 0 }, MGA: { d: 0 }, KHR: { d: 0 }, LAK: { d: 0 }, MMK: { d: 0 }, MNT: { d: 0 }, CLF: { d: 4 },
  };

  /* 冷门币种名称覆盖（Intl 不可靠或缺失时兜底） */
  var NAME_ZH = {
    CNH: '离岸人民币', XDR: '特别提款权', CLF: '智利发展单位', XCG: '加勒比盾', ANG: '荷属安的列斯盾',
    FOK: '法罗群岛克朗', GGP: '根西岛镑', IMP: '马恩岛镑', JEP: '泽西岛镑', TVD: '图瓦卢元', KID: '基里巴斯元',
    SLE: '塞拉利昂新利昂', ZWG: '津巴布韦金', VES: '委内瑞拉玻瓦尔', MRU: '毛里塔尼亚乌吉亚',
    STN: '圣多美多布拉', SSD: '南苏丹镑', ZWG: '津巴布韦金',
  };
  var NAME_EN = {
    CNH: 'Offshore Renminbi', XDR: 'SDR (IMF)', CLF: 'Chilean Unit of Account', XCG: 'Caribbean Guilder',
    ANG: 'Neth. Antillean Guilder', FOK: 'Faroese Króna', GGP: 'Guernsey Pound', IMP: 'Manx Pound',
    JEP: 'Jersey Pound', TVD: 'Tuvaluan Dollar', KID: 'Kiribati Dollar', SLE: 'Sierra Leonean Leone',
    ZWG: 'Zimbabwe Gold', VES: 'Venezuelan Bolívar', MRU: 'Mauritanian Ouguiya', STN: 'São Tomé Dobra',
    SSD: 'South Sudanese Pound',
  };

  var dnCache = {};
  function displayNames(lang) {
    var key = lang === 'en' ? 'en' : 'zh-Hans';
    if (!dnCache[key]) {
      try { dnCache[key] = new Intl.DisplayNames([key], { type: 'currency' }); }
      catch (e) { dnCache[key] = null; }
    }
    return dnCache[key];
  }

  function name(code, lang) {
    code = String(code || '').toUpperCase();
    var ov = (lang === 'en' ? NAME_EN : NAME_ZH)[code];
    if (ov) return ov;
    var dn = displayNames(lang);
    if (dn) {
      try {
        var n = dn.of(code);
        if (n && n !== code) return n;
      } catch (e) {}
    }
    return code;
  }

  function isFiat(code) { return !!CODESET[String(code || '').toUpperCase()]; }

  function digits(code) {
    var e = EX[String(code || '').toUpperCase()];
    return e && e.d != null ? e.d : 2;
  }

  function pop(code) {
    var e = EX[String(code || '').toUpperCase()];
    return e && e.pop != null ? e.pop : 999;
  }

  function flag(code) { return FX.FLAGS[String(code || '').toUpperCase()] || ''; }

  /** 全部币种，按热度 + 字母序 */
  function sorted() {
    return CODES.slice().sort(function (a, b) {
      var pa = pop(a), pb = pop(b);
      if (pa !== pb) return pa - pb;
      return a < b ? -1 : 1;
    });
  }

  FX.CUR = { CODES: CODES, name: name, isFiat: isFiat, digits: digits, pop: pop, flag: flag, sorted: sorted };
})();
