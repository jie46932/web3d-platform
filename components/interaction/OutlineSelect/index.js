/**
 * OutlineSelect — 点击选中3D物体白色描边高亮（OutlinePass）
 * 再次点击取消选中，自动过滤 Spray 粒子对象。
 * 注入接口：(app, v3d, config, instanceId)  → window.__w3dComps[instanceId]
 */
(function(app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var enabled        = config.enabled !== false;
  var visEdgeColor   = config.visibleEdgeColor || 0xffffff;
  var hidEdgeColor   = config.hiddenEdgeColor || 0x000000;
  var edgeStrength   = config.edgeStrength || 3;
  var edgeThickness  = config.edgeThickness || 1;
  var edgeGlow       = config.edgeGlow || 0;
  var pulsePeriod    = config.pulsePeriod || 0;
  var excludePrefix  = config.excludePrefix || 'Spray';

  var uid = '_w3d_ol_' + instanceId;
  var outlinePass = null;
  var selectedMesh = null;
  var pointerMoved = false;

  function bind() {
    if (!app || !app.scene || !app.camera || !app.renderer) {
      setTimeout(bind, 400);
      return;
    }

    var composer = app.postprocessing && app.postprocessing.composer;
    if (!composer) {
      setTimeout(bind, 400);
      return;
    }

    // 创建 OutlinePass
    outlinePass = new v3d.OutlinePass(
      new v3d.Vector2(app.renderer.domElement.width, app.renderer.domElement.height),
      app.scene, app.camera
    );

    // 解析颜色
    function parseColor(c) {
      if (typeof c === 'number') return c;
      if (typeof c === 'string') {
        var val = parseInt(c.replace('#',''), 16);
        return isNaN(val) ? 0xffffff : val;
      }
      return 0xffffff;
    }

    outlinePass.visibleEdgeColor.set(parseColor(visEdgeColor));
    outlinePass.hiddenEdgeColor.set(parseColor(hidEdgeColor));
    outlinePass.edgeGlow      = edgeGlow;
    outlinePass.edgeStrength  = edgeStrength;
    outlinePass.edgeThickness = edgeThickness;
    outlinePass.pulsePeriod   = pulsePeriod;
    outlinePass.selectedObjects = [];
    composer.addPass(outlinePass);

    // 射线检测
    var raycaster = new v3d.Raycaster();
    var mouse     = new v3d.Vector2();
    var canvas    = app.renderer.domElement;

    canvas.addEventListener('pointerdown', function() { pointerMoved = false; });
    canvas.addEventListener('pointermove', function() { pointerMoved = true; });

    canvas.addEventListener('pointerup', function(e) {
      if (!enabled || !outlinePass) return;
      if (pointerMoved) return;

      var rect = canvas.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, app.camera);

      var hits = raycaster.intersectObject(app.scene, true);
      var validHits = hits.filter(function(h) {
        return h.object.isMesh && h.object.name.indexOf(excludePrefix) !== 0;
      });

      if (validHits.length === 0) {
        selectedMesh = null;
        outlinePass.selectedObjects = [];
        return;
      }

      var hit = validHits[0].object;
      if (hit === selectedMesh) {
        selectedMesh = null;
        outlinePass.selectedObjects = [];
      } else {
        selectedMesh = hit;
        outlinePass.selectedObjects = [hit];
      }
    });
  }
  bind();

  // ── 注册组件 ──
  window.__w3dComps[instanceId] = {
    update: function(cfg) {
      if (cfg.enabled !== undefined) enabled = cfg.enabled;
      if (outlinePass) {
        if (cfg.visibleEdgeColor !== undefined) outlinePass.visibleEdgeColor.set(parseInt(String(cfg.visibleEdgeColor).replace('#',''), 16) || 0xffffff);
        if (cfg.edgeStrength !== undefined) outlinePass.edgeStrength = +cfg.edgeStrength;
        if (cfg.edgeThickness !== undefined) outlinePass.edgeThickness = +cfg.edgeThickness;
        if (cfg.edgeGlow !== undefined) outlinePass.edgeGlow = +cfg.edgeGlow;
        if (cfg.pulsePeriod !== undefined) outlinePass.pulsePeriod = +cfg.pulsePeriod;
      }
    },
    destroy: function() {
      if (outlinePass && app && app.postprocessing && app.postprocessing.composer) {
        var passes = app.postprocessing.composer.passes;
        var idx = passes.indexOf(outlinePass);
        if (idx >= 0) passes.splice(idx, 1);
      }
      selectedMesh = null;
      outlinePass = null;
    },
  };
})(app, v3d, config, instanceId);
