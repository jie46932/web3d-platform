/**
 * LangSwitch — 中英语言切换系统
 * 通过 data-zh/data-en 属性自动翻译 DOM 元素文本，支持自定义字典和标题翻译。
 * 注入接口：(app, v3d, config, instanceId)  → window.__w3dComps[instanceId]
 */
(function(app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var enabled = config.visible !== false;
  var lang    = config.initialLang || 'zh';

  // 内置默认字典
  var DEFAULT_DICT = {
    '川和智能造桥机': 'ChuanHe Bridge Builder',
    '零事故更安全':   'Zero Accident · Safer',
    '动画': 'Anim',  '播放': 'Play',
    '速度': 'Speed',
    '旋转': 'Rotate', '停转': 'Stop',
    '重置': 'Reset',
    '喷水': 'Water',
    '视角': 'View',
    '全屏': 'Full',
    '语言': 'Lang',
    '场景控制': 'Scene Control',
  };

  // 合并用户自定义字典
  var extDict = {};
  try {
    if (config.dictJson) extDict = JSON.parse(config.dictJson);
  } catch(e) {}
  var DICT = {};
  Object.keys(DEFAULT_DICT).forEach(function(k) { DICT[k] = DEFAULT_DICT[k]; });
  Object.keys(extDict).forEach(function(k) { DICT[k] = extDict[k]; });
  var DICT_R = {};
  Object.keys(DICT).forEach(function(k) { DICT_R[DICT[k]] = k; });

  // ── 创建语言切换按钮 ──
  var btn = document.createElement('button');
  btn.id = instanceId + '_lang';
  btn.title = '\u4e2d/\u82f1\u6587\u5207\u6362';
  btn.style.cssText = [
    'position:fixed;right:16px;bottom:20px;z-index:1000',
    'background:rgba(20,20,30,0.82);backdrop-filter:blur(10px)',
    'border:1px solid rgba(255,255,255,0.15);border-radius:10px',
    'color:#e8eaf0;font:700 13px monospace;padding:8px 14px',
    'cursor:pointer;letter-spacing:.5px;transition:background 0.15s',
    'display:' + (enabled ? 'block' : 'none'),
  ].join(';');
  btn.textContent = 'ZH';
  btn.addEventListener('mouseenter', function() { this.style.background = 'rgba(40,40,55,0.9)'; });
  btn.addEventListener('mouseleave', function() { this.style.background = 'rgba(20,20,30,0.82)'; });
  document.body.appendChild(btn);

  // ── 翻译核心 ──
  function translate(text, toLang) {
    if (toLang === 'en') return DICT[text] || text;
    return DICT_R[text] || text;
  }

  function applyLang(toLang) {
    lang = toLang;

    // 1. data-zh / data-en 属性
    document.querySelectorAll('[data-zh][data-en]').forEach(function(el) {
      el.textContent = toLang === 'en' ? el.dataset.en : el.dataset.zh;
    });

    // 2. 通用文本标签（附带前缀防误伤）
    document.querySelectorAll('[class$="_label"]').forEach(function(el) {
      if (el.dataset.zh || el.dataset.en) return;
      var zh = el.textContent.trim();
      if (toLang === 'en' && DICT[zh]) el.textContent = DICT[zh];
      else if (toLang === 'zh' && DICT_R[zh]) el.textContent = DICT_R[zh];
    });

    // 3. 语言按钮自身
    btn.textContent = toLang === 'en' ? 'EN' : 'ZH';
    btn.classList.toggle(instanceId + '_en', toLang === 'en');

    // 4. 标题元素 — 特殊处理已知 ID
    var t1 = document.getElementById('title-line1');
    var t2 = document.getElementById('title-line2');
    if (t1) t1.textContent = toLang === 'en' ? (DICT['川和智能造桥机'] || 'ChuanHe Bridge Builder') : '川和智能造桥机';
    if (t2) t2.textContent = toLang === 'en' ? (DICT['零事故更安全'] || 'Zero Accident · Safer') : '零事故更安全';
  }

  // ── 绑定事件 ──
  btn.addEventListener('click', function() {
    applyLang(lang === 'zh' ? 'en' : 'zh');
  });

  // ── 注册组件 ──
  window.__w3dComps[instanceId] = {
    getLang: function() { return lang; },
    setLang: applyLang,
    update: function(cfg) {
      if (cfg.visible !== undefined) {
        enabled = cfg.visible;
        btn.style.display = enabled ? 'block' : 'none';
      }
      if (cfg.initialLang && cfg.initialLang !== lang) applyLang(cfg.initialLang);
    },
    destroy: function() {
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    },
  };
})(app, v3d, config, instanceId);
