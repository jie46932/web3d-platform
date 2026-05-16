/**
 * SprayGizmo — 喷水粒子调试面板
 * 控制位置偏移、喷射方向（仰角/偏航）、散射角、速度。支持写入 patch-server。
 * 依赖 window._sprayState（由 Verge3D Puzzles 设置）。
 * 注入接口：(app, v3d, config, instanceId)  → window.__w3dComps[instanceId]
 */
(function(app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible        = config.visible !== false;
  var stateKey       = config.sprayStateKey || '_sprayState';
  var patchUrl       = config.patchUrl || 'http://127.0.0.1:3791/patch-spray';
  var enableWrite    = config.enableWrite !== false;
  var idleTimeoutMs  = config.idleTimeoutMs || 200;

  var uid = '_w3d_sg_' + instanceId;

  // ── 等待 state 就绪 ──
  function waitForState(cb) {
    var state = window[stateKey];
    if (state) { cb(state); return; }
    var timer = setTimeout(function tick() {
      state = window[stateKey];
      if (state) { cb(state); return; }
      timer = setTimeout(tick, idleTimeoutMs);
    }, idleTimeoutMs);
  }

  waitForState(function(state) {
    // ── 创建面板 ──
    var panel = document.createElement('div');
    panel.id = uid + '_panel';
    panel.style.cssText = [
      'position:fixed;top:16px;right:16px;z-index:999',
      'background:rgba(20,20,30,0.82);backdrop-filter:blur(10px)',
      'border:1px solid rgba(255,255,255,0.15);border-radius:12px',
      'padding:14px 16px;color:#e8eaf0;font:13px/1.6 monospace',
      'width:230px;user-select:none;box-shadow:0 4px 20px rgba(0,0,0,0.5)',
      'display:' + (visible ? 'block' : 'none'),
    ].join(';');

    panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">',
        '<span style="font-weight:700;font-size:14px;letter-spacing:.5px;">\U0001f4a7 \u55b7\u6c34 Gizmo</span>',
        '<button id="' + uid + '_toggle" style="background:rgba(100,180,255,0.2);border:1px solid rgba(100,180,255,0.4);color:#8ecfff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px;">\u9690\u85cf</button>',
      '</div>',
      // 位置偏移
      '<div style="margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">',
        '<div style="color:#8ecfff;font-size:11px;margin-bottom:4px;">\u25b6 \u4f4d\u7f6e\u504f\u79fb\uff08\u4e09\u8def\u540c\u6b65\uff09</div>',
        '<label>\u0394X <input id="' + uid + '_sx" type="range" min="-5" max="5" step="0.1" value="0" style="width:116px;vertical-align:middle;"> <span id="' + uid + '_sx_v">0.0</span></label><br>',
        '<label>\u0394Y <input id="' + uid + '_sy" type="range" min="-5" max="5" step="0.1" value="0" style="width:116px;vertical-align:middle;"> <span id="' + uid + '_sy_v">0.0</span></label><br>',
        '<label>\u0394Z <input id="' + uid + '_sz" type="range" min="-5" max="5" step="0.1" value="0" style="width:116px;vertical-align:middle;"> <span id="' + uid + '_sz_v">0.0</span></label>',
      '</div>',
      // 喷射方向
      '<div style="margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">',
        '<div style="color:#a8e6a3;font-size:11px;margin-bottom:4px;">\u25b6 \u55b7\u5c04\u65b9\u5411\uff08\u00b0\uff09</div>',
        '<label>\u4ef0\u89d2 <input id="' + uid + '_pitch" type="range" min="-90" max="90" step="1" value="-80" style="width:108px;vertical-align:middle;"> <span id="' + uid + '_pitch_v">-80\u00b0</span></label><br>',
        '<label>\u504f\u822a <input id="' + uid + '_yaw" type="range" min="-180" max="180" step="1" value="-32" style="width:108px;vertical-align:middle;"> <span id="' + uid + '_yaw_v">-32\u00b0</span></label>',
      '</div>',
      // 粒子参数
      '<div style="margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">',
        '<div style="color:#ffd580;font-size:11px;margin-bottom:4px;">\u25b6 \u7c92\u5b50\u53c2\u6570</div>',
        '<label>\u6563\u5c04\u89d2 <input id="' + uid + '_spread" type="range" min="1" max="60" step="1" value="18" style="width:100px;vertical-align:middle;"> <span id="' + uid + '_spread_v">18\u00b0</span></label><br>',
        '<label>\u901f&nbsp;\u5ea6 <input id="' + uid + '_speed" type="range" min="0.5" max="10" step="0.1" value="2.76" style="width:100px;vertical-align:middle;"> <span id="' + uid + '_speed_v">2.8</span></label>',
      '</div>',
      // 确认写入
      (enableWrite ? '<div style="text-align:center;">' +
        '<button id="' + uid + '_save" style="width:100%;padding:6px 0;cursor:pointer;border-radius:7px;border:none;background:linear-gradient(135deg,rgba(80,200,120,0.35),rgba(40,160,90,0.25));color:#7fe8a2;font:700 12px monospace;letter-spacing:.5px;border:1px solid rgba(100,220,140,0.35);transition:opacity .15s;">\u2705 \u786e\u8ba4\u5199\u5165\u4ee3\u7801</button>' +
        '<div id="' + uid + '_msg" style="font-size:11px;margin-top:5px;min-height:16px;"></div>' +
      '</div>' : ''),
    ].join('');
    document.body.appendChild(panel);

    // ── 绑定滑块 ──
    function bindSlider(id, valId, fmt, cb) {
      var el = document.getElementById(id);
      var vl = document.getElementById(valId);
      if (!el || !vl) return;
      el.addEventListener('input', function() {
        vl.textContent = fmt(el.value);
        cb(parseFloat(el.value));
      });
    }

    bindSlider(uid + '_sx', uid + '_sx_v', function(v) { return parseFloat(v).toFixed(1); }, function(v) { state.offsetX = v; state.dirty = true; });
    bindSlider(uid + '_sy', uid + '_sy_v', function(v) { return parseFloat(v).toFixed(1); }, function(v) { state.offsetY = v; state.dirty = true; });
    bindSlider(uid + '_sz', uid + '_sz_v', function(v) { return parseFloat(v).toFixed(1); }, function(v) { state.offsetZ = v; state.dirty = true; });
    bindSlider(uid + '_pitch', uid + '_pitch_v', function(v) { return v + '\u00b0'; }, function(v) { state.pitch = v; state.dirDirty = true; });
    bindSlider(uid + '_yaw', uid + '_yaw_v', function(v) { return v + '\u00b0'; }, function(v) { state.yaw = v; state.dirDirty = true; });
    bindSlider(uid + '_spread', uid + '_spread_v', function(v) { return v + '\u00b0'; }, function(v) { state.spread = v; state.dirDirty = true; });
    bindSlider(uid + '_speed', uid + '_speed_v', function(v) { return parseFloat(v).toFixed(1); }, function(v) { state.speedBase = v; state.dirty = true; });

    // 显示/隐藏
    document.getElementById(uid + '_toggle').addEventListener('click', function() {
      var appV3d = window.v3d && window.v3d.apps && window.v3d.apps[0];
      if (!appV3d || !appV3d.scene) return;
      var names = ['SprayParticles001','SprayParticles002','SprayParticles003','SprayParticles004',
                   'SprayParticles005','SprayParticles006','SprayParticles007','SprayParticles008'];
      var sprays = names.map(function(n) { return appV3d.scene.getObjectByName(n); }).filter(Boolean);
      if (!sprays.length) return;
      var nextVisible = !sprays[0].visible;
      sprays.forEach(function(s) { s.visible = nextVisible; });
      this.textContent = nextVisible ? '\u9690\u85cf' : '\u663e\u793a';
    });

    // 确认写入
    if (enableWrite) {
      document.getElementById(uid + '_save').addEventListener('click', function() {
        var btn = this;
        var msg = document.getElementById(uid + '_msg');
        btn.disabled = true;
        btn.textContent = '\u5199\u5165\u4e2d\u2026';
        msg.style.color = '#aaa';
        msg.textContent = '';

        fetch(patchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offsetX:   state.offsetX,
            offsetY:   state.offsetY,
            offsetZ:   state.offsetZ,
            pitch:     state.pitch,
            yaw:       state.yaw,
            spread:    state.spread,
            speedBase: state.speedBase,
          })
        })
        .then(function(r) { return r.json(); })
        .then(function() {
          btn.disabled = false;
          btn.textContent = '\u2705 \u786e\u8ba4\u5199\u5165\u4ee3\u7801';
          msg.style.color = '#7fe8a2';
          msg.textContent = '\u5df2\u5199\u5165\uff01\u5237\u65b0\u9875\u9762\u751f\u6548';
        })
        .catch(function() {
          btn.disabled = false;
          btn.textContent = '\u2705 \u786e\u8ba4\u5199\u5165\u4ee3\u7801';
          msg.style.color = '#ff8080';
          msg.textContent = '\u5931\u8d25\uff1apatch-server \u672a\u8fd0\u884c\uff1f';
        });
      });
    }
  });

  // ── 注册组件 ──
  window.__w3dComps[instanceId] = {
    update: function(cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        var p = document.getElementById(uid + '_panel');
        if (p) p.style.display = visible ? 'block' : 'none';
      }
    },
    destroy: function() {
      var p = document.getElementById(uid + '_panel');
      if (p && p.parentNode) p.parentNode.removeChild(p);
    },
  };
})(app, v3d, config, instanceId);
