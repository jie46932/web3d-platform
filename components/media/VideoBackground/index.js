/**
 * VideoBackground — 视频背景组件（可注入场景脚本）
 * 在场景背后叠加一个全屏视频层
 */
(function (app, v3d, config, instanceId) {
  if (!window.__w3dComps) window.__w3dComps = {};
  if (window.__w3dComps[instanceId]) {
    try { window.__w3dComps[instanceId].destroy(); } catch (e) {}
  }

  var visible  = config.visible !== false;
  var videoSrc = config.videoSrc || '';
  var opacity  = config.opacity  !== undefined ? config.opacity  : 0.5;
  var loop     = config.loop     !== false;
  var muted    = config.muted    !== false;

  var wrap = document.createElement('div');
  wrap.id  = '__w3d_vbg_' + instanceId;
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;' +
    'display:' + (visible ? 'block' : 'none');

  var video = document.createElement('video');
  video.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);min-width:100%;min-height:100%;width:auto;height:auto;opacity:' + opacity;
  video.autoplay = true;
  video.loop     = loop;
  video.muted    = muted;
  video.playsInline = true;
  if (videoSrc) video.src = videoSrc;

  wrap.appendChild(video);
  document.body.appendChild(wrap);

  // 若无视频源，显示占位提示
  if (!videoSrc) {
    var hint = document.createElement('div');
    hint.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.5);color:#666;font-size:13px;font-family:sans-serif;' +
      'padding:12px 20px;border-radius:8px;border:1px dashed #444;';
    hint.textContent = '请在属性面板中设置视频链接 (videoSrc)';
    wrap.appendChild(hint);
  }

  window.__w3dComps[instanceId] = {
    update: function (cfg) {
      if (cfg.visible !== undefined) {
        visible = cfg.visible;
        wrap.style.display = visible ? 'block' : 'none';
      }
      if (cfg.videoSrc !== undefined && cfg.videoSrc !== videoSrc) {
        videoSrc = cfg.videoSrc;
        video.src = videoSrc;
        video.load();
        video.play().catch(function () {});
      }
      if (cfg.opacity !== undefined) video.style.opacity = cfg.opacity;
      if (cfg.loop !== undefined) video.loop = cfg.loop;
    },
    destroy: function () {
      video.pause();
      video.src = '';
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };

  if (videoSrc) video.play().catch(function () {});
})(app, v3d, config, instanceId);
