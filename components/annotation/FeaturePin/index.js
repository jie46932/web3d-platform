/**
 * FeaturePin — 特性图钉组件（可注入场景脚本）
 * 在指定 3D 坐标处显示圆形图钉，点击展开说明弹窗
 */
(function (app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible   = config.visible !== false;
  var pinColor  = config.pinColor  || '#ffffff';
  var pinSize   = config.pinSize   || 28;

  // 默认图钉锚点（从 anchorName 获取，或使用配置坐标）
  var pins = config.pins || [
    { label: '核心特性', desc: '点击查看详情', anchor: config.anchorName || null },
  ];

  var container = document.createElement('div');
  container.id  = '__w3d_pin_' + instanceId;
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:200;display:' + (visible ? 'block' : 'none');
  document.body.appendChild(container);

  var pinEls = pins.map(function (pin, i) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:auto;';

    var dot = document.createElement('div');
    dot.style.cssText =
      'width:' + pinSize + 'px;height:' + pinSize + 'px;border-radius:50%;' +
      'background:' + pinColor + ';border:2px solid rgba(255,255,255,0.6);' +
      'box-shadow:0 0 12px rgba(0,0,0,0.4);cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:14px;font-weight:700;color:#333;transition:transform 0.15s;';
    dot.textContent = i + 1;
    dot.onmouseenter = function () { dot.style.transform = 'scale(1.2)'; };
    dot.onmouseleave = function () { dot.style.transform = 'scale(1)'; };

    var popup = document.createElement('div');
    popup.style.cssText =
      'position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);' +
      'background:rgba(10,12,20,0.92);border:1px solid rgba(255,255,255,0.15);' +
      'border-radius:8px;padding:10px 14px;min-width:140px;pointer-events:none;' +
      'font-family:sans-serif;opacity:0;transition:opacity 0.2s;white-space:nowrap;';
    popup.innerHTML =
      '<div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;">' + pin.label + '</div>' +
      '<div style="font-size:11px;color:#aaa;">' + pin.desc + '</div>';

    var open = false;
    dot.onclick = function () {
      open = !open;
      popup.style.opacity   = open ? '1' : '0';
      popup.style.pointerEvents = open ? 'auto' : 'none';
    };

    wrap.appendChild(dot);
    wrap.appendChild(popup);
    container.appendChild(wrap);
    return { wrap: wrap, anchor: pin.anchor };
  });

  var _wp = new v3d.Vector3();
  var rafId;

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!visible || !app.camera) return;
    var cam    = app.camera;
    var canvas = app.renderer && app.renderer.domElement;
    var cw = canvas ? canvas.clientWidth  : window.innerWidth;
    var ch = canvas ? canvas.clientHeight : window.innerHeight;

    pinEls.forEach(function (p) {
      if (!p.anchor) { p.wrap.style.opacity = '0.4'; return; }
      var obj = app.scene.getObjectByName(p.anchor);
      if (!obj) { p.wrap.style.opacity = '0'; return; }
      obj.getWorldPosition(_wp);
      var proj = _wp.clone().project(cam);
      if (proj.z > 1) { p.wrap.style.display = 'none'; return; }
      p.wrap.style.display = 'block';
      p.wrap.style.opacity = '1';
      p.wrap.style.left = ((proj.x *  0.5 + 0.5) * cw) + 'px';
      p.wrap.style.top  = ((proj.y * -0.5 + 0.5) * ch) + 'px';
    });
  }

  // 若有 anchorName，自动绑定第一个图钉
  if (config.anchorName) pinEls[0] && (pinEls[0].anchor = config.anchorName);
  tick();

  window.__w3dComps[instanceId] = {
    update: function (cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        container.style.display = visible ? 'block' : 'none';
      }
      if (cfg.anchorName && pinEls[0]) pinEls[0].anchor = cfg.anchorName;
    },
    destroy: function () {
      cancelAnimationFrame(rafId);
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
})(app, v3d, config, instanceId);
