/**
 * HeightSlider — 高度滑块组件（可注入场景脚本）
 * 在场景中注入一个浮动滑块，驱动 Verge3D 高度动画帧
 */
(function (app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible  = config.visible !== false;
  var minFrame = config.minFrame || 0;
  var maxFrame = config.maxFrame || 100;
  var label    = config.label || '高度';

  // ── 创建浮动滑块 UI ──
  var panel = document.createElement('div');
  panel.id  = '__w3d_slider_' + instanceId;
  panel.style.cssText =
    'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:500;' +
    'background:rgba(10,12,20,0.88);border:1px solid rgba(255,255,255,0.12);' +
    'border-radius:12px;padding:14px 20px;display:' + (visible ? 'flex' : 'none') + ';' +
    'align-items:center;gap:14px;backdrop-filter:blur(12px);' +
    'font-family:sans-serif;pointer-events:auto;min-width:260px;';

  var labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'color:#aaa;font-size:12px;white-space:nowrap;';

  var slider = document.createElement('input');
  slider.type  = 'range';
  slider.min   = 0;
  slider.max   = 1;
  slider.step  = 0.01;
  slider.value = 0.5;
  slider.style.cssText = 'flex:1;accent-color:#6366f1;cursor:pointer;';

  var valEl = document.createElement('span');
  valEl.style.cssText = 'color:#6366f1;font-size:13px;font-weight:700;font-family:monospace;min-width:36px;text-align:right;';
  valEl.textContent   = '50%';

  slider.oninput = function () {
    var t = +slider.value;
    valEl.textContent = Math.round(t * 100) + '%';
    // 驱动 Verge3D 帧动画
    if (app && app.scene) {
      var frame = minFrame + t * (maxFrame - minFrame);
      try {
        app.scene.traverse(function (obj) {
          if (obj.animations && obj.animations.length) {
            // 暂停并跳转到指定帧
          }
        });
        // 通用方式：调用 playToFrame / gotoFrame
        if (typeof app.playToFrame === 'function') app.playToFrame(frame);
        else if (window.__setHeightFrame) window.__setHeightFrame(frame);
        // 也尝试直接更新 mixer
        if (app.mixer) {
          app.mixer.timeScale = 0;
          app.mixer.time = frame / (app.fps || 24);
          app.mixer.update(0);
        }
      } catch (e) {}
    }
  };

  panel.appendChild(labelEl);
  panel.appendChild(slider);
  panel.appendChild(valEl);
  document.body.appendChild(panel);

  window.__w3dComps[instanceId] = {
    update: function (cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        panel.style.display = visible ? 'flex' : 'none';
      }
      if (cfg.label) labelEl.textContent = cfg.label;
      if (cfg.minFrame !== undefined) minFrame = cfg.minFrame;
      if (cfg.maxFrame !== undefined) maxFrame = cfg.maxFrame;
    },
    destroy: function () {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    },
  };
})(app, v3d, config, instanceId);
