/**
 * PBRPreset — PBR 材质预设组件（可注入场景脚本）
 * 为指定对象批量应用材质参数（颜色/金属度/粗糙度）
 */
(function (app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var targetName  = config.anchorName || config.targetName || null;
  var baseColor   = config.baseColor   || '#cccccc';
  var metalness   = config.metalness   !== undefined ? config.metalness   : 0.1;
  var roughness   = config.roughness   !== undefined ? config.roughness   : 0.5;
  var emissive    = config.emissive    || '#000000';
  var emissiveInt = config.emissiveIntensity !== undefined ? config.emissiveIntensity : 1.0;

  var originalMaterials = [];

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16)/255;
    var g = parseInt(hex.slice(3,5),16)/255;
    var b = parseInt(hex.slice(5,7),16)/255;
    return { r: r, g: g, b: b };
  }

  function applyToObject(name) {
    if (!name || !app.scene) return;
    var obj = app.scene.getObjectByName(name);
    if (!obj) { console.warn('[PBRPreset] object not found:', name); return; }
    var rgb  = hexToRgb(baseColor);
    var ergb = hexToRgb(emissive);
    obj.traverse(function (o) {
      if (!o.isMesh) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        if (!m) return;
        originalMaterials.push({ mat: m, color: m.color ? m.color.clone() : null, metalness: m.metalness, roughness: m.roughness });
        if (m.color) m.color.setRGB(rgb.r, rgb.g, rgb.b);
        if ('metalness'  in m) m.metalness  = metalness;
        if ('roughness'  in m) m.roughness  = roughness;
        if (m.emissive)        m.emissive.setRGB(ergb.r, ergb.g, ergb.b);
        if ('emissiveIntensity' in m) m.emissiveIntensity = emissiveInt;
        m.needsUpdate = true;
      });
    });
  }

  applyToObject(targetName);

  // 注入后弹出小型状态提示
  var toast = document.createElement('div');
  toast.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:9999;' +
    'background:rgba(10,12,20,0.9);border:1px solid rgba(99,102,241,0.4);' +
    'color:#6366f1;border-radius:8px;padding:8px 14px;font-size:12px;' +
    'font-family:sans-serif;pointer-events:none;transition:opacity 0.3s;';
  toast.textContent = '✔ PBR 材质已应用' + (targetName ? '：' + targetName : '');
  document.body.appendChild(toast);
  setTimeout(function () { toast.style.opacity = '0'; setTimeout(function () { toast.parentNode && toast.parentNode.removeChild(toast); }, 400); }, 2500);

  window.__w3dComps[instanceId] = {
    update: function (cfg) {
      if (cfg.anchorName !== undefined) targetName = cfg.anchorName;
      if (cfg.baseColor  !== undefined) baseColor  = cfg.baseColor;
      if (cfg.metalness  !== undefined) metalness  = cfg.metalness;
      if (cfg.roughness  !== undefined) roughness  = cfg.roughness;
      // 重新应用
      originalMaterials.forEach(function (s) {
        if (s.color) s.mat.color.copy(s.color);
        if (s.metalness !== undefined) s.mat.metalness = s.metalness;
        if (s.roughness !== undefined) s.mat.roughness = s.roughness;
        s.mat.needsUpdate = true;
      });
      originalMaterials = [];
      applyToObject(targetName);
    },
    destroy: function () {
      // 还原材质
      originalMaterials.forEach(function (s) {
        if (s.color) s.mat.color.copy(s.color);
        if (s.metalness !== undefined) s.mat.metalness = s.metalness;
        if (s.roughness !== undefined) s.mat.roughness = s.roughness;
        s.mat.needsUpdate = true;
      });
      originalMaterials = [];
    },
  };
})(app, v3d, config, instanceId);
