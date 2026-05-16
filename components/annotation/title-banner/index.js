// Title Banner 组件 — 金属光泽双行标题
// 注入到场景后直接创建 HTML 元素，无需 3D 锚点
(function(app, v3d, config, instanceId) {
  var id = '__w3d_title_' + instanceId;

  // 移除旧实例
  var old = document.getElementById(id);
  if (old) old.parentNode.removeChild(old);

  var wrap = document.createElement('div');
  wrap.id = id;
  wrap.style.cssText = [
    'position:fixed',
    'top:' + (config.posY || 20) + 'px',
    'left:' + (config.posX || 20) + 'px',
    'z-index:999',
    'pointer-events:none',
    'display:' + ((config.visible === false) ? 'none' : 'block'),
  ].join(';');

  var speed = (config.animSpeed || 8) + 's';
  var gradStyle = [
    'background:linear-gradient(175deg,#ffffff 0%,#f2f2f2 18%,#cacaca 30%,#f9f9f9 42%,#dedede 54%,#b8b8b8 68%,#ebebeb 80%,#a3a3a3 100%)',
    '-webkit-background-clip:text',
    'background-clip:text',
    '-webkit-text-fill-color:transparent',
  ].join(';');

  var shadowStyle = 'drop-shadow(-1px -1px 0 rgba(255,255,255,0.9)) drop-shadow(1px 1px 0 #2a2a2a) drop-shadow(2px 2px 0 #1e1e1e) drop-shadow(3px 3px 0 #181818)';

  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '@keyframes w3d_titleShine_' + instanceId + ' {',
    '  0%,100%{filter:' + shadowStyle + '}',
    '  50%{filter:drop-shadow(-1px -1px 0 rgba(255,255,255,1)) drop-shadow(1px 1px 0 #3a3a3a) drop-shadow(2px 2px 1px #111) brightness(1.08)}',
    '}',
  ].join('');
  document.head.appendChild(styleEl);

  wrap.innerHTML = [
    '<div style="',
      'font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;',
      'font-weight:800;',
      'font-size:' + (config.size1 || 38) + 'px;',
      'line-height:1.2;',
      'letter-spacing:0.08em;',
      gradStyle + ';',
      'filter:' + shadowStyle + ';',
      'animation:w3d_titleShine_' + instanceId + ' ' + speed + ' ease-in-out infinite;',
    '">' + (config.line1 || '川和智能造桥机') + '</div>',
    '<div style="',
      'margin-top:8px;',
      'font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;',
      'font-weight:600;',
      'font-size:' + (config.size2 || 18) + 'px;',
      'line-height:1;',
      'letter-spacing:0.25em;',
      gradStyle + ';',
      'filter:' + shadowStyle + ';',
      'animation:w3d_titleShine_' + instanceId + ' ' + speed + ' 0.3s ease-in-out infinite;',
    '">' + (config.line2 || '零事故更安全') + '</div>',
  ].join('');

  document.body.appendChild(wrap);

  // 注册到组件池
  window.__w3dComps[instanceId] = {
    update: function(cfg) {
      if (cfg.visible !== undefined) wrap.style.display = cfg.visible ? 'block' : 'none';
      if (cfg.posX !== undefined) wrap.style.left = cfg.posX + 'px';
      if (cfg.posY !== undefined) wrap.style.top = cfg.posY + 'px';
      var lines = wrap.querySelectorAll('div');
      if (lines[0] && cfg.line1 !== undefined) lines[0].textContent = cfg.line1;
      if (lines[0] && cfg.size1 !== undefined) lines[0].style.fontSize = cfg.size1 + 'px';
      if (lines[1] && cfg.line2 !== undefined) lines[1].textContent = cfg.line2;
      if (lines[1] && cfg.size2 !== undefined) lines[1].style.fontSize = cfg.size2 + 'px';
    },
    destroy: function() {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    },
  };
})(app, v3d, config, instanceId);
