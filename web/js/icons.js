/* 内联 SVG 图标集（线性风格，跟随 currentColor）。 */
(function () {
  'use strict';
  var FX = (window.FX = window.FX || {});

  var ICONS = {
    swap: '<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z"/>',
    starFill: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" fill="currentColor" stroke="none"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    convert: '<path d="M4 8h13m0 0l-3.5-3.5M17 8l-3.5 3.5M20 16H7m0 0l3.5-3.5M7 16l3.5 3.5"/>',
    rates: '<path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    up: '<path d="M12 19V5m0 0l-6 6m6-6l6 6"/>',
    down: '<path d="M12 5v14m0 0l6-6m-6 6l-6-6"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    wifiOff: '<path d="M5 12.5a10 10 0 0 1 7-3m5 1.5a10 10 0 0 1 2 1.5M8.5 16a5 5 0 0 1 4-1.3M12 19h.01M3 3l18 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8.5v.5"/>',
    export: '<path d="M12 15V3m0 0L8 7m4-4l4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    import: '<path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2zm13 5.5h.01"/>',
  };

  function icon(name, size, cls) {
    var body = ICONS[name] || ICONS.info;
    var s = size || 16;
    return '<svg class="icon ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /** 旗帜 emoji（币种 → 发行地旗帜）；无旗帜币种返回空，由 UI 回退为字母徽标 */
  var FLAGS = {
    USD: '🇺🇸', EUR: '🇪🇺', JPY: '🇯🇵', GBP: '🇬🇧', CNY: '🇨🇳', CNH: '🇨🇳', HKD: '🇭🇰', TWD: '🇹🇼',
    KRW: '🇰🇷', SGD: '🇸🇬', AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', THB: '🇹🇭', MYR: '🇲🇾',
    VND: '🇻🇳', PHP: '🇵🇭', IDR: '🇮🇩', INR: '🇮🇳', RUB: '🇷🇺', TRY: '🇹🇷', BRL: '🇧🇷', MXN: '🇲🇽',
    AED: '🇦🇪', SAR: '🇸🇦', QAR: '🇶🇦', KWD: '🇰🇼', BHD: '🇧🇭', OMR: '🇴🇲', JOD: '🇯🇴', ILS: '🇮🇱',
    SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱', CZK: '🇨🇿', HUF: '🇭🇺', RON: '🇷🇴', BGN: '🇧🇬',
    UAH: '🇺🇦', ZAR: '🇿🇦', NGN: '🇳🇬', EGP: '🇪🇬', MAD: '🇲🇦', DZD: '🇩🇿', TND: '🇹🇳', LYD: '🇱🇾',
    KES: '🇰🇪', TZS: '🇹🇿', UGX: '🇺🇬', GHS: '🇬🇭', ETB: '🇪🇹', XOF: '🇸🇳', XAF: '🇨🇲', XPF: '🇵🇫',
    ARS: '🇦🇷', CLP: '🇨🇱', COP: '🇨🇴', PEN: '🇵🇪', UYU: '🇺🇾', BOB: '🇧🇴', PYG: '🇵🇾', VES: '🇻🇪',
    GTQ: '🇬🇹', HNL: '🇭🇳', NIO: '🇳🇮', CRC: '🇨🇷', PAB: '🇵🇦', DOP: '🇩🇴', JMD: '🇯🇲', TTD: '🇹🇹',
    BSD: '🇧🇸', BBD: '🇧🇧', KYD: '🇰🇾', XCD: '🇦🇬', XCG: '🇨🇼', ANG: '🇨🇼', BZD: '🇧🇿', GYD: '🇬🇾',
    SRD: '🇸🇷', CUP: '🇨🇺', HTG: '🇭🇹', AWG: '🇦🇼', FJD: '🇫🇯', PGK: '🇵🇬', WST: '🇼🇸', VUV: '🇻🇺',
    SBD: '🇸🇧', TOP: '🇹🇴', MNT: '🇲🇳', KZT: '🇰🇿', UZS: '🇺🇿', KGS: '🇰🇬', TJS: '🇹🇯', TMT: '🇹🇲',
    AZN: '🇦🇿', AMD: '🇦🇲', GEL: '🇬🇪', BYN: '🇧🇾', MDL: '🇲🇩', RSD: '🇷🇸', MKD: '🇲🇰', ALL: '🇦🇱',
    BAM: '🇧🇦', HRK: '🇭🇷', ISK: '🇮🇸', AFN: '🇦🇫', PKR: '🇵🇰', BDT: '🇧🇩', LKR: '🇱🇰', NPR: '🇳🇵',
    BTN: '🇧🇹', MVR: '🇲🇻', MMK: '🇲🇲', KHR: '🇰🇭', LAK: '🇱🇦', BND: '🇧🇳', MOP: '🇲🇴', KPW: '🇰🇵',
    MZN: '🇲🇿', ZMW: '🇿🇲', ZWG: '🇿🇼', ZWL: '🇿🇼', BWP: '🇧🇼', NAD: '🇳🇦', LSL: '🇱🇸', SZL: '🇸🇿',
    MWK: '🇲🇼', RWF: '🇷🇼', BIF: '🇧🇮', DJF: '🇩🇯', SOS: '🇸🇴', SDG: '🇸🇩', SSP: '🇸🇸', CDF: '🇨🇩',
    GNF: '🇬🇳', LRD: '🇱🇷', SLE: '🇸🇱', SLL: '🇸🇱', GMD: '🇬🇲', CVE: '🇨🇻', STN: '🇸🇹', MGA: '🇲🇬',
    MUR: '🇲🇺', SCR: '🇸🇨', KMF: '🇰🇲', MRU: '🇲🇷', IRR: '🇮🇷', IQD: '🇮🇶', SYP: '🇸🇾', YER: '🇾🇪',
    LBP: '🇱🇧', ERN: '🇪🇷', AOA: '🇦🇴', FKP: '🇫🇰', GIP: '🇬🇮', SHP: '🇸🇭', FOK: '🇫🇴',
    GGP: '🇬🇬', IMP: '🇮🇲', JEP: '🇯🇪', TVD: '🇹🇻', KID: '🇰🇮', XDR: '🌐', CLF: '🇨🇱',
    BMD: '🇧🇲',
  };

  FX.icon = icon;
  FX.FLAGS = FLAGS;
})();
