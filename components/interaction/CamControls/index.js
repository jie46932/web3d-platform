/**
 * CamControls — 左下角相机控制按钮组
 * 功能：平移开/关、最近距离限制/解除
 * 注入接口：(app, v3d, config, instanceId)  → window.__w3dComps[instanceId]
 */
(function(app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible  = config.visible !== false;
  var enablePan = config.initialEnablePan !== false;
  var minDist  = config.minDistance || 2;
  var maxDist  = config.maxDistance || 80;
  var uid = '_w3d_cam_' + instanceId;

  // ── 创建按钮组 ──
  var container = document.createElement('div');
  container.id = uid + '_wrap';
  container.style.cssText = [
    'position:fixed;bottom:84px;left:16px;z-index:999',
    'display:' + (visible ? 'flex' : 'none') + ';flex-direction:column;gap:8px',
  ].join(';');

  container.innerHTML = [
    '<button id="' + uid + '_pan" style="background:rgba(20,20,30,0.82);backdrop-filter:blur(10px);border-radius:8px;font:700 12px monospace;padding:6px 14px;cursor:pointer;letter-spacing:.4px;white-space:nowrap;',
      enablePan ? 'border:1px solid rgba(100,180,255,0.4);color:#8ecfff;' : 'border:1px solid rgba(255,100,100,0.4);color:#ff9090;',
    '">' + (enablePan ? '\U0001f513 \u5e73\u79fb\uff1a\u5f00' : '\U0001f512 \u5e73\u79fb\uff1a\u5173') + '</button>',
    '<button id="' + uid + '_dist" style="background:rgba(20,20,30,0.82);backdrop-filter:blur(10px);border-radius:8px;font:700 12px monospace;padding:6px 14px;cursor:pointer;letter-spacing:.4px;white-space:nowrap;',
      'border:1px solid rgba(255,210,100,0.4);color:#ffd580;',
    '">\U0001f512 \u6700\u8fd1\u8ddd\u79bb\uff1a' + minDist + '</button>',
  ].join('');

  document.body.appendChild(container);

  // ── 等待 controls 就绪后绑定 ──
  function bind() {
    var c = app && app.controls;
    if (!c) { setTimeout(bind, 300); return; }

    c.maxDistance = maxDist;

    // 平移开关
    c.enablePan = enablePan;
    document.getElementById(uid + '_pan').addEventListener('click', function() {
      c.enablePan = !c.enablePan;
      var on = c.enablePan;
      this.textContent = on ? '\U0001f513 \u5e73\u79fb\uff1a\u5f00' : '\U0001f512 \u5e73\u79fb\uff1a\u5173';
      this.style.borderColor = on ? 'rgba(100,180,255,0.4)' : 'rgba(255,100,100,0.4)';
      this.style.color = on ? '#8ecfff' : '#ff9090';
    });

    // 距离限制
    var limited = true;
    document.getElementById(uid + '_dist').addEventListener('click', function() {
      limited = !limited;
      c.minDistance = limited ? minDist : 0;
      this.textContent = limited ? ('\U0001f512 \u6700\u8fd1\u8ddd\u79bb\uff1a' + minDist) : '\U0001f513 \u6700\u8fd1\u8ddd\u79bb\uff1a0';
      this.style.borderColor = limited ? 'rgba(255,210,100,0.4)' : 'rgba(150,255,150,0.4)';
      this.style.color = limited ? '#ffd580' : '#a8e6a3';
    });
  }
  bind();

  // ── 注册组件 ──
  window.__w3dComps[instanceId] = {
    update: function(cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        container.style.display = visible ? 'flex' : 'none';
      }
      if (cfg.minDistance !== undefined) minDist = cfg.minDistance;
      if (cfg.maxDistance !== undefined) {
        maxDist = cfg.maxDistance;
        if (app && app.controls) app.controls.maxDistance = maxDist;
      }
    },
    destroy: function() {
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
})(app, v3d, config, instanceId);
