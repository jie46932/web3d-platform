/**
 * CtrlPanel — 可拖拽浮动场景控制面板
 * 功能：动画播放/暂停/速度/重置、自动旋转(含空闲触发)、喷水粒子开关、视角重置、全屏
 * 注入接口：(app, v3d, config, instanceId)  → window.__w3dComps[instanceId]
 */
(function(app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible       = config.visible !== false;
  var autoPlayAnim  = config.autoPlayAnim !== false;
  var idleTimeoutMs = config.idleRotateTimeout || 20000;
  var rotateSpeed   = config.rotateSpeed || 2;
  var maxDist       = config.maxDistance || 80;
  var sprayNames    = (config.sprayNames || 'SprayParticles001,SprayParticles002,SprayParticles003,SprayParticles004,SprayParticles005,SprayParticles006,SprayParticles007,SprayParticles008').split(',').map(function(s) { return s.trim(); });

  var uid = '_w3d_cp_' + instanceId;
  var animPaused = false;
  var currentSpeed = 1;
  var sprayVisible = true;
  var autoRotating = !!(app && app.controls && app.controls.autoRotate);
  var rotateDirSign = -1;
  var idleTimer = null;
  var initCamPos = null;
  var initCamTarget = null;

  // ── 创建面板 ──
  var panel = document.createElement('div');
  panel.id = uid + '_panel';
  panel.style.cssText = [
    'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999',
    'background:rgba(14,16,26,0.82);backdrop-filter:blur(16px) saturate(1.3)',
    'border:1px solid rgba(255,255,255,0.13);border-radius:16px',
    'box-shadow:0 6px 32px rgba(0,0,0,0.6)',
    'user-select:none;min-width:360px',
    'display:' + (visible ? 'block' : 'none'),
  ].join(';');

  panel.innerHTML = [
    // 拖拽把手
    '<div id="' + uid + '_handle" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 18px 5px;cursor:grab;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);font:700 11px monospace;letter-spacing:1px;">',
      '<span style="letter-spacing:3px;">⋮⋮</span> \u573a\u666f\u63a7\u5236 <span style="letter-spacing:3px;">⋮⋮</span>',
    '</div>',
    // 按钮行
    '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;flex-wrap:wrap;">',
      // 动画播放/暂停
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn" id="' + uid + '_anim" title="\u64ad\u653e/\u6682\u505c\u52a8\u753b">',
          '<span class="' + uid + '_icon">\u23f8</span>',
          '<span class="' + uid + '_label">\u52a8\u753b</span>',
        '</button>',
      '</div>',
      // 重置动画到第0帧
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn" id="' + uid + '_resetAnim" title="\u91cd\u7f6e\u52a8\u753b\u5230\u7b2c0\u5e27">',
          '<span class="' + uid + '_icon">\u23ee</span>',
          '<span class="' + uid + '_label">\u91cd\u7f6e</span>',
        '</button>',
      '</div>',
      '<div class="' + uid + '_sep"></div>',
      // 动画速度
      '<div class="' + uid + '_group" style="flex-direction:row;gap:4px;">',
        '<span style="color:#8ecfff;font:700 10px monospace;align-self:center;">\u901f\u5ea6</span>',
        '<button class="' + uid + '_speed" data-speed="0.25">\u00d7\u00bc</button>',
        '<button class="' + uid + '_speed" data-speed="0.5">\u00d7\u00bd</button>',
        '<button class="' + uid + '_speed" data-speed="1" id="' + uid + '_speed1x">\u00d71</button>',
        '<button class="' + uid + '_speed" data-speed="2">\u00d72</button>',
      '</div>',
      '<div class="' + uid + '_sep"></div>',
      // 自动旋转
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn" id="' + uid + '_rotate" title="\u81ea\u52a8\u65cb\u8f6c">',
          '<span class="' + uid + '_icon">\u21bb</span>',
          '<span class="' + uid + '_label">\u65cb\u8f6c</span>',
        '</button>',
      '</div>',
      // 旋转方向切换
      '<div class="' + uid + '_group" style="gap:3px;">',
        '<button class="' + uid + '_dirBtn" id="' + uid + '_dirCW" title="\u987a\u65f6\u9488">\u987a\u21bb</button>',
        '<button class="' + uid + '_dirBtn" id="' + uid + '_dirCCW" title="\u9006\u65f6\u9488">\u9006\u21ba</button>',
      '</div>',
      '<div class="' + uid + '_sep"></div>',
      // 喷水显示
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn ' + uid + '_btnOn" id="' + uid + '_spray" title="\u55b7\u6c34\u7c92\u5b50\u663e\u793a/\u9690\u85cf">',
          '<span class="' + uid + '_icon">\U0001f4a7</span>',
          '<span class="' + uid + '_label">\u55b7\u6c34</span>',
        '</button>',
      '</div>',
      '<div class="' + uid + '_sep"></div>',
      // 视角重置
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn" id="' + uid + '_resetCam" title="\u91cd\u7f6e\u89c6\u89d2">',
          '<span class="' + uid + '_icon">\U0001f3af</span>',
          '<span class="' + uid + '_label">\u89c6\u89d2</span>',
        '</button>',
      '</div>',
      '<div class="' + uid + '_sep"></div>',
      // 全屏
      '<div class="' + uid + '_group">',
        '<button class="' + uid + '_btn" id="' + uid + '_fs" title="\u5168\u5c4f">',
          '<span class="' + uid + '_icon">\u26f6</span>',
          '<span class="' + uid + '_label">\u5168\u5c4f</span>',
        '</button>',
      '</div>',
    '</div>',
  ].join('');

  // ── 样式 ──
  var styleEl = document.createElement('style');
  styleEl.id = uid + '_style';
  styleEl.textContent = [
    '.' + uid + '_group { display:flex; flex-direction:column; align-items:center; gap:3px; }',
    '.' + uid + '_btn { display:flex; flex-direction:column; align-items:center; gap:2px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); border-radius:10px; padding:7px 12px; cursor:pointer; transition:background 0.15s, border-color 0.15s, transform 0.1s; min-width:52px; }',
    '.' + uid + '_btn:hover { background:rgba(255,255,255,0.13); transform:translateY(-1px); }',
    '.' + uid + '_btn:active { transform:translateY(0); }',
    '.' + uid + '_btn.' + uid + '_btnOn { background:rgba(100,200,255,0.18); border-color:rgba(100,200,255,0.5); }',
    '.' + uid + '_icon { font-size:18px; line-height:1; }',
    '.' + uid + '_label { font:700 10px monospace; color:#c8cce0; letter-spacing:.4px; }',
    '.' + uid + '_btn.' + uid + '_btnOn .' + uid + '_label { color:#8ecfff; }',
    '.' + uid + '_sep { width:1px; height:36px; background:rgba(255,255,255,0.1); }',
    '.' + uid + '_speed { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#c8cce0; font:700 11px monospace; padding:4px 7px; cursor:pointer; transition:background 0.12s; }',
    '.' + uid + '_speed:hover { background:rgba(255,255,255,0.15); }',
    '.' + uid + '_speed.active { background:rgba(100,200,255,0.25); border-color:rgba(100,200,255,0.55); color:#8ecfff; }',
    '.' + uid + '_dirBtn { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); border-radius:6px; color:#c8cce0; font:700 10px monospace; padding:3px 7px; cursor:pointer; transition:background 0.12s; white-space:nowrap; }',
    '.' + uid + '_dirBtn:hover { background:rgba(255,255,255,0.14); }',
    '.' + uid + '_dirBtn.active { background:rgba(255,200,80,0.22); border-color:rgba(255,200,80,0.5); color:#ffd580; }',
  ].join('\n');
  document.head.appendChild(styleEl);
  document.body.appendChild(panel);

  // ── 拖拽逻辑 ──
  (function() {
    var handle = document.getElementById(uid + '_handle');
    if (!handle) return;
    var dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    handle.addEventListener('pointerdown', function(e) {
      if (panel.style.transform && panel.style.transform !== 'none') {
        var r = panel.getBoundingClientRect();
        panel.style.left = r.left + 'px';
        panel.style.top = r.top + 'px';
        panel.style.bottom = '';
        panel.style.transform = '';
      }
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseInt(panel.style.left) || 0;
      origTop = parseInt(panel.style.top) || 0;
      handle.style.cursor = 'grabbing';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      panel.style.left = (origLeft + e.clientX - startX) + 'px';
      panel.style.top = (origTop + e.clientY - startY) + 'px';
    });
    handle.addEventListener('pointerup', function() {
      dragging = false;
      handle.style.cursor = 'grab';
    });
  })();

  // ── 场景初始化 ──
  if (app && app.controls && app.scene) {
    var c = app.controls;

    // 保存初始相机状态
    initCamPos = app.camera ? app.camera.position.clone() : null;
    initCamTarget = c.target ? c.target.clone() : new v3d.Vector3();

    // 最远距离
    c.maxDistance = maxDist;
    var origMinDist = c.minDistance;

    // 自动播放动画
    if (autoPlayAnim && app.actions && app.actions.length) {
      app.actions.forEach(function(a) { a.paused = false; a.play && a.play(); });
    }

    // 喷水默认显示
    sprayNames.forEach(function(n) {
      var obj = app.scene.getObjectByName(n);
      if (obj) obj.visible = true;
    });

    // 修复 opacity=0 材质
    app.scene.traverse(function(obj) {
      if (!obj.isMesh) return;
      var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(function(mat) {
        if (mat && mat.transparent && mat.opacity === 0) {
          mat.opacity = 1;
          mat.transparent = false;
          mat.needsUpdate = true;
        }
      });
    });

    // ── 绑定按钮 ──
    // 动画播放/暂停
    document.getElementById(uid + '_anim').addEventListener('click', function() {
      animPaused = !animPaused;
      app.actions.forEach(function(a) { a.paused = animPaused; });
      var icon = this.querySelector('.' + uid + '_icon');
      var lbl = this.querySelector('.' + uid + '_label');
      icon.textContent = animPaused ? '\u25b6' : '\u23f8';
      lbl.textContent = animPaused ? '\u64ad\u653e' : '\u52a8\u753b';
      this.classList.toggle(uid + '_btnOn', !animPaused);
    });

    // 重置动画到第0帧
    document.getElementById(uid + '_resetAnim').addEventListener('click', function() {
      var wasPaused = animPaused;
      app.actions.forEach(function(a) { a.paused = false; });
      if (app.mixer) {
        app.mixer.setTime(0);
      } else {
        app.actions.forEach(function(a) { a.time = 0; });
      }
      app.actions.forEach(function(a) { a.paused = wasPaused; });
    });

    // 动画速度
    document.querySelectorAll('.' + uid + '_speed').forEach(function(btn) {
      btn.addEventListener('click', function() {
        currentSpeed = parseFloat(this.dataset.speed);
        app.actions.forEach(function(a) { a.timeScale = currentSpeed; });
        document.querySelectorAll('.' + uid + '_speed').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
      });
    });
    var speed1x = document.getElementById(uid + '_speed1x');
    if (speed1x) speed1x.classList.add('active');

    // 自动旋转
    autoRotating = !!c.autoRotate;
    if (!autoRotating) {
      // 默认停转
    }

    function applyRotate(on) {
      c.autoRotate = on;
      c.autoRotateSpeed = on ? rotateDirSign * rotateSpeed : rotateSpeed;
    }

    function setRotateBtn(on) {
      var btn = document.getElementById(uid + '_rotate');
      btn.classList.toggle(uid + '_btnOn', on);
      btn.querySelector('.' + uid + '_label').textContent = on ? '\u505c\u8f6c' : '\u65cb\u8f6c';
      btn.querySelector('.' + uid + '_icon').textContent = on ? '\u23f9' : '\u21bb';
    }

    function startAutoRotate() {
      if (autoRotating) return;
      autoRotating = true;
      applyRotate(true);
      setRotateBtn(true);
    }

    function stopAutoRotate() {
      if (!autoRotating) return;
      autoRotating = false;
      applyRotate(false);
      setRotateBtn(false);
    }

    function resetIdleTimer() {
      if (idleTimeoutMs <= 0) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startAutoRotate, idleTimeoutMs);
    }

    // 空闲检测
    if (idleTimeoutMs > 0) {
      ['pointerdown','wheel','keydown'].forEach(function(evt) {
        document.addEventListener(evt, function() {
          stopAutoRotate();
          resetIdleTimer();
        }, { passive: true });
      });
      resetIdleTimer();
    }

    document.getElementById(uid + '_rotate').addEventListener('click', function() {
      autoRotating = !autoRotating;
      applyRotate(autoRotating);
      setRotateBtn(autoRotating);
      resetIdleTimer();
    });

    // 旋转方向
    document.getElementById(uid + '_dirCW').classList.add('active');
    document.getElementById(uid + '_dirCW').addEventListener('click', function() {
      rotateDirSign = -1;
      if (autoRotating) c.autoRotateSpeed = -rotateSpeed;
      document.getElementById(uid + '_dirCW').classList.add('active');
      document.getElementById(uid + '_dirCCW').classList.remove('active');
    });
    document.getElementById(uid + '_dirCCW').addEventListener('click', function() {
      rotateDirSign = 1;
      if (autoRotating) c.autoRotateSpeed = rotateSpeed;
      document.getElementById(uid + '_dirCCW').classList.add('active');
      document.getElementById(uid + '_dirCW').classList.remove('active');
    });

    // 喷水粒子开关
    document.getElementById(uid + '_spray').addEventListener('click', function() {
      sprayVisible = !sprayVisible;
      sprayNames.forEach(function(n) {
        var obj = app.scene.getObjectByName(n);
        if (obj) obj.visible = sprayVisible;
      });
      this.classList.toggle(uid + '_btnOn', sprayVisible);
    });

    // 视角重置
    document.getElementById(uid + '_resetCam').addEventListener('click', function() {
      if (!initCamPos || !initCamTarget) return;
      app.camera.position.copy(initCamPos);
      if (c.target) c.target.copy(initCamTarget);
      c.update && c.update();
    });

    // 全屏
    document.getElementById(uid + '_fs').addEventListener('click', function() {
      var el = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen && document.exitFullscreen();
      } else {
        el.requestFullscreen && el.requestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', function() {
      var btn = document.getElementById(uid + '_fs');
      if (!btn) return;
      btn.querySelector('.' + uid + '_icon').textContent = document.fullscreenElement ? '\u22a1' : '\u26f6';
      btn.classList.toggle(uid + '_btnOn', !!document.fullscreenElement);
    });
  }

  // ── 注册组件 ──
  window.__w3dComps[instanceId] = {
    update: function(cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        panel.style.display = visible ? 'block' : 'none';
      }
    },
    destroy: function() {
      clearTimeout(idleTimer);
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      var s = document.getElementById(uid + '_style');
      if (s && s.parentNode) s.parentNode.removeChild(s);
    },
  };
})(app, v3d, config, instanceId);
