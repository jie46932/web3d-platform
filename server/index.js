/**
 * Web3D Platform — API Server
 * 负责：组件库扫描 / 客户授权管理 / 配置文件读写
 * 端口：3700
 */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const cors     = require('cors');
const multer   = require('multer');
const http     = require('http');
const qs       = require('querystring');

// ── 自动注入桥接脚本（代理时插入到 HTML <head> 末尾）──
const BRIDGE_JS = `(function(){
if(window.__w3dBridge)return;window.__w3dBridge=true;
if(!window.__w3dComps)window.__w3dComps={};
function _getApp(){return window.v3dApp||(window.v3d&&window.v3d.apps&&window.v3d.apps[0])||null;}
var _poll=setInterval(function(){
  var a=_getApp();
  if(a&&a.scene){
    clearInterval(_poll);
    try{window.parent.postMessage({type:'W3D_READY'},'*')}catch(x){}
  }
},400);
window.addEventListener('message',function(e){
  var app=_getApp();
  if(!e.data||!e.data.type||!e.data.type.startsWith('W3D_'))return;
  var d=e.data;
  var reply=function(m){try{window.parent.postMessage(m,'*')}catch(x){}};
  if(d.type==='W3D_SCAN'){
    if(!app)return reply({type:'W3D_OBJECTS',objects:[]});
    var o=[];app.scene.traverse(function(n){if(n.name)o.push({name:n.name,type:n.type})});
    reply({type:'W3D_OBJECTS',objects:o});
  }
  if(d.type==='W3D_GET_POS'&&d.name&&app){
    var obj=app.scene.getObjectByName(d.name);
    if(obj){var p=new window.v3d.Vector3();obj.getWorldPosition(p);reply({type:'W3D_POS',name:d.name,position:{x:+p.x.toFixed(3),y:+p.y.toFixed(3),z:+p.z.toFixed(3)}});}
  }
  if(d.type==='W3D_INJECT'&&d.script){
    try{(new Function('app','v3d','config','instanceId',d.script))(app,window.v3d,d.config||{},d.instanceId||'x');reply({type:'W3D_INJECT_OK',instanceId:d.instanceId});}
    catch(err){reply({type:'W3D_INJECT_ERR',instanceId:d.instanceId,error:err.message});}
  }
  if(d.type==='W3D_UPDATE_PARAMS'&&d.instanceId){var c=window.__w3dComps[d.instanceId];if(c&&c.update)try{c.update(d.config||{})}catch(e){}}
  if(d.type==='W3D_DESTROY'&&d.instanceId){var c=window.__w3dComps[d.instanceId];if(c&&c.destroy)try{c.destroy();delete window.__w3dComps[d.instanceId]}catch(e){}reply({type:'W3D_DESTROYED',instanceId:d.instanceId});}
});
})();`;

const app  = express();
const PORT = 3700;

const ROOT           = path.resolve(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'components');
const DATA_DIR       = path.join(ROOT, 'data');
const CLIENTS_FILE   = path.join(DATA_DIR, 'clients.json');
const MAX_HISTORY_FILE = path.join(DATA_DIR, 'max-history.json');

// ── 中间件 ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// 静态资源：组件缩略图
app.use('/static/components', express.static(COMPONENTS_DIR));

// 文件上传（客户素材）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(DATA_DIR, 'uploads', req.params.clientId || 'default');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ── 工具函数 ─────────────────────────────────────────────
function readMaxHistory() {
  if (!fs.existsSync(MAX_HISTORY_FILE)) return { history: [] };
  try { return JSON.parse(fs.readFileSync(MAX_HISTORY_FILE, 'utf-8')); } catch { return { history: [] }; }
}
function writeMaxHistory(data) {
  fs.writeFileSync(MAX_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readClients() {
  if (!fs.existsSync(CLIENTS_FILE)) return { clients: [] };
  return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf-8'));
}
function writeClients(data) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 组件库 API ─────────────────────────────────────────────

// GET /api/components — 扫描 /components 目录，返回所有组件元数据
app.get('/api/components', (req, res) => {
  try {
    const result = [];
    if (!fs.existsSync(COMPONENTS_DIR)) return res.json([]);

    const categories = fs.readdirSync(COMPONENTS_DIR).filter(f =>
      fs.statSync(path.join(COMPONENTS_DIR, f)).isDirectory()
    );

    for (const cat of categories) {
      const catPath = path.join(COMPONENTS_DIR, cat);
      const comps   = fs.readdirSync(catPath).filter(f =>
        fs.statSync(path.join(catPath, f)).isDirectory()
      );
      for (const comp of comps) {
        const compPath   = path.join(catPath, comp);
        const configPath = path.join(compPath, 'config.json');
        if (!fs.existsSync(configPath)) continue;

        const config   = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const hasThumb = fs.existsSync(path.join(compPath, 'thumb.png'));
        result.push({
          ...config,
          category: cat,
          dirName:  comp,
          hasThumb,
          thumbUrl: hasThumb
            ? `/static/components/${cat}/${comp}/thumb.png`
            : null,
        });
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/components/:category/:name/config — 获取单个组件完整 config
app.get('/api/components/:category/:name/config', (req, res) => {
  const configPath = path.join(COMPONENTS_DIR, req.params.category, req.params.name, 'config.json');
  if (!fs.existsSync(configPath)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(configPath, 'utf-8')));
});

// GET /api/components/:category/:name/script — 返回可注入的 JS 脚本
app.get('/api/components/:category/:name/script', (req, res) => {
  const scriptPath = path.join(COMPONENTS_DIR, req.params.category, req.params.name, 'index.js');
  if (!fs.existsSync(scriptPath)) return res.status(404).json({ error: 'Script not found' });
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(fs.readFileSync(scriptPath, 'utf-8'));
});

// ── 客户管理 API ─────────────────────────────────────────────

// GET /api/clients
app.get('/api/clients', (req, res) => {
  res.json(readClients().clients);
});

// POST /api/clients — 新建客户
app.post('/api/clients', (req, res) => {
  const data = readClients();
  const newClient = {
    id:        'client_' + Date.now(),
    name:      req.body.name  || '新客户',
    company:   req.body.company || '',
    email:     req.body.email   || '',
    sceneUrl:  req.body.sceneUrl || '',
    isActive:  true,
    plan:      req.body.plan || 'basic',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expireAt:  req.body.expireAt || null,
    settings:  {},
    notes:     '',
  };
  data.clients.push(newClient);
  writeClients(data);
  res.json(newClient);
});

// PUT /api/clients/:id — 更新客户信息
app.put('/api/clients/:id', (req, res) => {
  const data   = readClients();
  const client = data.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  Object.assign(client, req.body, { updatedAt: new Date().toISOString() });
  writeClients(data);
  res.json(client);
});

// PUT /api/clients/:id/toggle — 一键切换授权状态
app.put('/api/clients/:id/toggle', (req, res) => {
  const data   = readClients();
  const client = data.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.isActive  = !client.isActive;
  client.updatedAt = new Date().toISOString();
  writeClients(data);
  res.json(client);
});

// DELETE /api/clients/:id
app.delete('/api/clients/:id', (req, res) => {
  const data = readClients();
  data.clients = data.clients.filter(c => c.id !== req.params.id);
  writeClients(data);
  res.json({ success: true });
});

// PUT /api/clients/:id/settings — 更新客户开放参数
app.put('/api/clients/:id/settings', (req, res) => {
  const data   = readClients();
  const client = data.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.settings  = { ...client.settings, ...req.body };
  client.updatedAt = new Date().toISOString();
  writeClients(data);
  res.json(client);
});

// GET /api/clients/:id/auth — 子舰查询授权状态（公开接口）
app.get('/api/clients/:id/auth', (req, res) => {
  const data   = readClients();
  const client = data.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ isActive: false, reason: '客户不存在' });

  const expired = client.expireAt && new Date(client.expireAt) < new Date();
  const active  = client.isActive && !expired;
  res.json({
    isActive: active,
    reason:   expired ? '服务已过期' : active ? 'OK' : '服务已停用',
    expireAt: client.expireAt,
  });
});

// POST /api/clients/:id/assets — 上传素材
app.post('/api/clients/:id/assets', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.params.id}/${req.file.filename}`, name: req.file.originalname });
});

// 健康检查
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── .max 文件对象扫描 API ─────────────────────────────────────────────
// GET /api/max-objects?filePath=... — 读取对应 GLTF 文件，返回场景对象列表
app.get('/api/max-objects', (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  const dir  = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath))
    .replace(/_recover(_recover)?$/i, '');   // 去掉 _recover_recover 后缀

  // 候选 GLTF 路径：同目录 → media/ 子目录
  const candidates = [
    path.join(dir, base + '.gltf'),
    path.join(dir, base + '.glb'),
    path.join(dir, 'media', base + '.gltf'),
    path.join(dir, 'media', base + '.glb'),
  ];

  let gltfPath = candidates.find(p => fs.existsSync(p));

  // 兜底：扫描目录和 media/ 子目录找第一个 .gltf
  if (!gltfPath) {
    for (const searchDir of [dir, path.join(dir, 'media')]) {
      if (!fs.existsSync(searchDir)) continue;
      const found = fs.readdirSync(searchDir).find(f => f.endsWith('.gltf') || f.endsWith('.glb'));
      if (found) { gltfPath = path.join(searchDir, found); break; }
    }
  }

  if (!gltfPath) {
    return res.json({ objects: [], source: null, error: '未找到对应 GLTF 文件' });
  }

  try {
    const gltf    = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));
    const objects = (gltf.nodes || [])
      .filter(n => n.name)
      .map(n => ({
        name: n.name,
        type: n.mesh !== undefined ? 'Mesh' : 'Object3D',
        position: n.translation ? {
          x: +n.translation[0].toFixed(3),
          y: +n.translation[1].toFixed(3),
          z: +n.translation[2].toFixed(3),
        } : null,
      }));
    res.json({ objects, source: 'gltf', gltfPath });
  } catch (e) {
    res.status(500).json({ error: 'GLTF 解析失败: ' + e.message });
  }
});

// ── .max 文件历史 API ─────────────────────────────────────────────

// GET /api/max-history — 返回历史列表（最新在前）
app.get('/api/max-history', (req, res) => {
  res.json(readMaxHistory().history);
});

// POST /api/max-history — 添加/更新一条记录（自动去重，最新置顶）
app.post('/api/max-history', (req, res) => {
  const { filePath, label } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  const data = readMaxHistory();
  // 去重：移除已有的同路径记录
  data.history = data.history.filter(h => h.filePath !== filePath);
  // 置顶插入
  data.history.unshift({
    filePath,
    label: label || path.basename(filePath),
    usedAt: new Date().toISOString(),
  });
  // 最多保留 20 条
  data.history = data.history.slice(0, 20);
  writeMaxHistory(data);
  res.json(data.history);
});

// DELETE /api/max-history — 清空历史
app.delete('/api/max-history', (req, res) => {
  writeMaxHistory({ history: [] });
  res.json({ ok: true });
});

// ── 场景代理：/scene/* → http://localhost:8669/* ──────────────────
// 自动向 HTML 注入桥接脚本，无需手动操作
app.get('/scene/*', (req, res) => {
  const subPath = req.path.slice('/scene'.length) || '/';
  const query   = Object.keys(req.query).length ? '?' + qs.stringify(req.query) : '';
  const target  = `http://localhost:8669${subPath}${query}`;

  const proxyReq = http.get(target, (pr) => {
    const ct = pr.headers['content-type'] || '';
    res.status(pr.statusCode);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 透传常用头
    ['content-type', 'cache-control', 'last-modified', 'etag'].forEach(h => {
      if (pr.headers[h]) res.setHeader(h, pr.headers[h]);
    });

    if (ct.includes('text/html')) {
      // HTML：注入桥接脚本
      let html = '';
      pr.setEncoding('utf8');
      pr.on('data', c => { html += c; });
      pr.on('end', () => {
        const tag = `<script data-w3d-bridge="1">\n${BRIDGE_JS}\n</script>`;
        const out = html.includes('</head>')
          ? html.replace('</head>', tag + '\n</head>')
          : tag + html;
        res.send(out);
      });
    } else {
      // 二进制 / JS / 其他：直接管道
      pr.pipe(res);
    }
  });

  proxyReq.on('error', err => {
    if (!res.headersSent) res.status(502).json({ error: '代理失败: ' + err.message + '（请确认 Verge3D App Manager 运行在 8669 端口）' });
  });
});

app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   Web3D Platform  —  API Server      ║');
  console.log(`  ║   http://localhost:${PORT}/api           ║`);
  console.log('  ╚══════════════════════════════════════╝\n');
});
