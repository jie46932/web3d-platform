/**
 * DimensionAnnotation — 可注入场景脚本
 * 由 Web3D Platform 通过 W3D_INJECT postMessage 注入到 Verge3D 场景
 * 函数签名：(app, v3d, config, instanceId)
 */
(function (app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible  = config.visible !== false;
  var fontSize = config.fontSize || 14;
  var unit     = config.unit || 'cm';

  var ANNOTATIONS = [
    { dummyA: 'Dummy019', dummyB: 'Dummy020', label: '140cm' },
    { dummyA: 'Dummy021', dummyB: 'Dummy022', label: '2.5cm' },
    { dummyA: 'Dummy023', dummyB: 'Dummy024', label: '70cm'  },
    { dummyA: 'Dummy025', dummyB: 'Dummy026', label: '桌高'  },
    { dummyA: 'Dummy027', dummyB: 'Dummy028', label: '1.5cm' },
    { dummyA: 'Dummy029', dummyB: 'Dummy030', label: '110cm' },
    { dummyA: 'Dummy031', dummyB: 'Dummy032', label: '21cm'  },
  ];

  // ── 创建 HTML 覆盖层 ──
  var container = document.createElement('div');
  container.id = '__w3d_dim_' + instanceId;
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;display:' + (visible ? 'block' : 'none');
  document.body.appendChild(container);

  var labels = ANNOTATIONS.map(function (cfg) {
    var div = document.createElement('div');
    div.textContent = cfg.label;
    div.style.cssText =
      'position:absolute;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.6);color:#fff;border-radius:6px;' +
      'padding:3px 10px;font-size:' + fontSize + 'px;font-weight:700;' +
      'white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.2s;';
    container.appendChild(div);
    return div;
  });

  var la = new v3d.Vector3(), lb = new v3d.Vector3(), mid = new v3d.Vector3();
  var rafId;

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!visible || !app.camera) return;
    var cam    = app.camera;
    var canvas = app.renderer && app.renderer.domElement;
    var cw = canvas ? canvas.clientWidth  : window.innerWidth;
    var ch = canvas ? canvas.clientHeight : window.innerHeight;

    ANNOTATIONS.forEach(function (cfg, i) {
      var dA  = app.scene.getObjectByName(cfg.dummyA);
      var dB  = app.scene.getObjectByName(cfg.dummyB);
      var lbl = labels[i];
      if (!dA || !dB) { lbl.style.opacity = '0'; return; }
      dA.getWorldPosition(la);
      dB.getWorldPosition(lb);
      mid.addVectors(la, lb).multiplyScalar(0.5);
      var mv = mid.clone();
      mv.project(cam);
      if (mv.z > 1) { lbl.style.opacity = '0'; return; }
      lbl.style.left    = ((mv.x *  0.5 + 0.5) * cw) + 'px';
      lbl.style.top     = ((mv.y * -0.5 + 0.5) * ch) + 'px';
      lbl.style.opacity = '1';
    });
  }
  tick();

  window.__w3dComps[instanceId] = {
    update: function (cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        container.style.display = visible ? 'block' : 'none';
      }
      if (cfg.fontSize) labels.forEach(function (l) { l.style.fontSize = cfg.fontSize + 'px'; });
    },
    destroy: function () {
      cancelAnimationFrame(rafId);
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
})(app, v3d, config, instanceId);
