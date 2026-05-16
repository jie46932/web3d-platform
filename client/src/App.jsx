/**
 * Web3D Platform — 本地开发工作台 v2.0
 * 新增：点击激活 + 锚点绑定 + 坐标同步 + 视口高亮反馈
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const API       = 'http://localhost:3700/api'
const SCENE_PROXY = 'http://localhost:3700/scene'   // 自动注入桥接脚本的代理

// 将 localhost:8669 场景 URL 转为代理 URL（桥接自动注入）
function toProxyUrl(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\/localhost:8669/, SCENE_PROXY)
}

// ── 图标 ──────────────────────────────────────────────────
const Icon = {
  Layers:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Users:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Cube:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  Trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Link:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Refresh:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  X:        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Anchor:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>,
  Bolt:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

// ── 分类配置 ──────────────────────────────────────────────
const CAT_LABEL = { annotation: '标注类', interaction: '交互类', material: '材质类', media: '多媒体类' }
const CAT_COLOR = { annotation: '#6366f1', interaction: '#22c55e', material: '#f59e0b', media: '#ec4899' }
const CAT_ICON  = { annotation: '📏', interaction: '🎚', material: '🎨', media: '🎬' }

// ═══════════════════════════════════════════════════════════
//  Toggle Switch
// ═══════════════════════════════════════════════════════════
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track" />
    </label>
  )
}

// ═══════════════════════════════════════════════════════════
//  ComponentCard — 组件库卡片（点击 = 添加实例）
// ═══════════════════════════════════════════════════════════
function ComponentCard({ comp, instanceCount, selected, onClick }) {
  const accent = CAT_COLOR[comp.category] || '#6366f1'
  return (
    <div
      onClick={onClick}
      className="fade-in"
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '10px', cursor: 'pointer',
        transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-3)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = selected ? 'rgba(99,102,241,0.1)' : 'var(--bg-2)' }}
    >
      {/* 实例计数徽章 */}
      {instanceCount > 0 && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: accent, color: '#fff',
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, lineHeight: 1.5,
        }}>×{instanceCount}</div>
      )}

      {/* 缩略图 / 图标 */}
      <div style={{
        width: '100%', aspectRatio: '4/3', borderRadius: 5,
        background: 'var(--bg-4)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, border: '1px solid var(--border)', fontSize: 22,
      }}>
        {comp.hasThumb
          ? <img src={comp.thumbUrl} alt={comp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{CAT_ICON[comp.category] || '◻'}</span>
        }
      </div>

      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)', lineHeight: 1.3 }}>{comp.name}</div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px',
        borderRadius: 99, fontSize: 10, fontWeight: 500,
        background: accent + '18', color: accent, border: `1px solid ${accent}33`, alignSelf: 'flex-start',
      }}>
        {CAT_LABEL[comp.category] || comp.category}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  InstanceCard — 左侧实例列表条目
// ═══════════════════════════════════════════════════════════
function InstanceCard({ inst, selected, onClick, onRemove }) {
  return (
    <div
      onClick={onClick}
      className="fade-in"
      style={{
        background: selected ? 'rgba(99,102,241,0.08)' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : 'var(--border)'}`,
        borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{CAT_ICON[inst.compCategory] || '◻'}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {inst.compName}
          </span>
          {/* 注入状态徽章 */}
          {inst.status === 'injecting' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              ⟳ 注入中
            </span>
          )}
          {inst.status === 'injected' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              ✔ 已注入
            </span>
          )}
          {inst.status === 'error' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }} title={inst.errorMsg}>
              ✕ 失败
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: inst.anchorName ? '#22c55e' : 'var(--text-3)' }}>
          {inst.anchorName ? `⚓ ${inst.anchorName}` : '未绑定锚点'}
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
          background: 'transparent', border: '1px solid transparent',
          color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
      >
        {Icon.X}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  AnchorSection — 锚点绑定 + 坐标同步 + 位置偏移
// ═══════════════════════════════════════════════════════════
function AnchorSection({ instance, sceneObjects, scanning, onScan, onAnchorChange, onOffsetChange, onBind }) {
  const [objSearch, setObjSearch] = useState('')

  const hasObjects = sceneObjects.length > 0
  const filteredObjs = sceneObjects.filter(o =>
    !objSearch || o.name.toLowerCase().includes(objSearch.toLowerCase())
  )

  const pos = instance.anchorPos

  return (
    <div style={{
      marginBottom: 16, background: 'var(--bg-2)', borderRadius: 8,
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      {/* 标题行 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)',
      }}>
        <span style={{ color: '#6366f1' }}>{Icon.Anchor}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>
          锚点绑定
        </span>
        {pos && (
          <span style={{ fontSize: 9, color: '#22c55e', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
            ({pos.x}, {pos.y}, {pos.z})
          </span>
        )}
      </div>

      <div style={{ padding: '10px 12px' }}>
        {/* 扫描按钮（场景就绪后自动触发，也可手动刷新）*/}
        <button onClick={onScan} disabled={scanning}
          style={{
            width: '100%', marginBottom: 10, padding: '5px 0', borderRadius: 5,
            fontSize: 11, fontWeight: 600, cursor: scanning ? 'default' : 'pointer',
            background: scanning ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            opacity: scanning ? 0.7 : 1,
          }}>
          <span style={{ display: 'inline-block', animation: scanning ? 'spin 1s linear infinite' : 'none' }}>
            {Icon.Refresh}
          </span>
          {scanning ? '获取场景对象...' : hasObjects ? `已获取 ${sceneObjects.length} 个对象` : '获取场景对象'}
        </button>

        {/* 对象搜索 + 下拉 / 占位提示 */}
        {hasObjects ? (
          <>
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                {Icon.Search}
              </span>
              <input
                type="text" value={objSearch} onChange={e => setObjSearch(e.target.value)}
                placeholder="搜索对象..."
                style={{ paddingLeft: 24, fontSize: 11 }}
              />
            </div>
            <select
              value={instance.anchorName}
              onChange={e => onAnchorChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">── 不绑定锚点 ──</option>
              {filteredObjs.slice(0, 300).map(o => (
                <option key={o.name} value={o.name}>
                  {o.type === 'Object3D' ? '◇' : '◆'} {o.name}
                </option>
              ))}
              {filteredObjs.length > 300 && (
                <option disabled>…还有 {filteredObjs.length - 300} 个，请精确搜索</option>
              )}
            </select>
          </>
        ) : (
          <input
            type="text"
            value={instance.anchorName}
            onChange={e => onAnchorChange(e.target.value)}
            placeholder="输入对象名（如 Dummy019）"
          />
        )}

        {/* 绑定对象按钮 */}
        <button
          onClick={() => onBind && onBind(instance.anchorName)}
          disabled={!instance.anchorName}
          style={{
            width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 5,
            fontSize: 11, fontWeight: 600,
            cursor: instance.anchorName ? 'pointer' : 'default',
            background: instance.anchorName
              ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))'
              : 'var(--bg-3)',
            border: `1px solid ${instance.anchorName ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
            color: instance.anchorName ? '#a5b4fc' : 'var(--text-3)',
            transition: 'all 0.15s',
          }}
        >
          ⚓ 绑定对象
        </button>

        {/* 世界坐标显示 */}
        {instance.anchorName && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 6,
            background: pos ? 'rgba(34,197,94,0.08)' : 'var(--bg-3)',
            border: `1px solid ${pos ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
            fontSize: 10, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: pos ? '#22c55e' : 'var(--text-3)' }}>
              {pos ? '⚓' : '○'}
            </span>
            {pos
              ? <span style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: '#ef4444' }}>X</span> {pos.x} &nbsp;
                  <span style={{ color: '#22c55e' }}>Y</span> {pos.y} &nbsp;
                  <span style={{ color: '#3b82f6' }}>Z</span> {pos.z}
                </span>
              : <span style={{ color: 'var(--text-3)' }}>世界坐标待获取（扫描后自动同步）</span>
            }
          </div>
        )}

        {/* ── Position Offset ── */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Position Offset
          </div>
          {[
            { axis: 'x', color: '#ef4444' },
            { axis: 'y', color: '#22c55e' },
            { axis: 'z', color: '#3b82f6' },
          ].map(({ axis, color }) => (
            <div key={axis} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color, fontFamily: 'monospace', fontWeight: 700 }}>{axis.toUpperCase()}</span>
                <span style={{ fontSize: 11, color, fontFamily: 'monospace' }}>
                  {(instance.offset?.[axis] ?? 0).toFixed(2)}
                </span>
              </div>
              <input
                type="range" min={-20} max={20} step={0.1}
                value={instance.offset?.[axis] ?? 0}
                onChange={e => onOffsetChange(axis, +e.target.value)}
                style={{ width: '100%', accentColor: color }}
              />
            </div>
          ))}
          {(instance.offset?.x || instance.offset?.y || instance.offset?.z) ? (
            <button
              onClick={() => { onOffsetChange('x', 0); onOffsetChange('y', 0); onOffsetChange('z', 0) }}
              style={{
                width: '100%', padding: '4px', fontSize: 10, cursor: 'pointer',
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                color: 'var(--text-3)', borderRadius: 4,
              }}>
              归零 Offset
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Inspector — 属性检查器（实例模式）
// ═══════════════════════════════════════════════════════════
function Inspector({ instance, comp, sceneObjects, scanning, onScan, onUpdate, onAnchorChange, onOffsetChange, onBind }) {
  if (!instance || !comp) return (
    <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.2 }}>◻</div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>点击左侧组件以添加到场景</div>
      <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.6 }}>
        每次点击创建一个新实例<br/>在「实例」标签中管理已添加的组件
      </div>
    </div>
  )

  const grouped = {}
  Object.entries(comp.params || {}).forEach(([k, p]) => {
    const g = p.group || '参数'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push([k, p])
  })

  const setParam = (k, v) => onUpdate('params', { ...instance.params, [k]: v })

  return (
    <div style={{ padding: 16 }}>
      {/* 组件标题 */}
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>{CAT_ICON[comp.category] || '◻'}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{comp.name}</span>
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1.5 }}>{comp.description}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="tag tag-plan">v{comp.version}</span>
          {comp.tags?.map(t => (
            <span key={t} style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: 99 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* 锚点绑定 */}
      <AnchorSection
        instance={instance}
        sceneObjects={sceneObjects}
        scanning={scanning}
        onScan={onScan}
        onAnchorChange={onAnchorChange}
        onOffsetChange={onOffsetChange}
        onBind={onBind}
      />

      {/* 参数组 */}
      {Object.entries(grouped).map(([group, params]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            {group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {params.map(([key, p]) => (
              <ParamRow key={key} paramKey={key} param={p} value={instance.params?.[key]} onChange={v => setParam(key, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ParamRow ──────────────────────────────────────────────
function ParamRow({ paramKey, param, value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ color: 'var(--text-2)', fontSize: 11 }}>{param.label || paramKey}</label>
        {param.exposed && (
          <span style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.12)', padding: '1px 5px', borderRadius: 3 }}>
            开放
          </span>
        )}
      </div>
      {param.type === 'color' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
            style={{ width: 36, height: 28, padding: 2, background: 'var(--bg-3)', border: '1px solid var(--border-light)', borderRadius: 4, cursor: 'pointer' }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>{value}</span>
        </div>
      )}
      {param.type === 'slider' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="range" min={param.min} max={param.max} step={param.step}
            value={value ?? param.default} onChange={e => onChange(+e.target.value)}
            style={{ flex: 1, accentColor: '#6366f1' }} />
          <span style={{ fontSize: 11, color: '#6366f1', fontFamily: 'monospace', minWidth: 30, textAlign: 'right' }}>
            {value ?? param.default}
          </span>
        </div>
      )}
      {param.type === 'toggle' && <Toggle checked={!!value} onChange={onChange} />}
      {param.type === 'select' && (
        <select value={value} onChange={e => onChange(e.target.value)}>
          {param.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {param.type === 'text' && (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      {param.type === 'number' && (
        <input type="number" value={value ?? param.default} min={param.min} max={param.max} step={param.step}
          onChange={e => onChange(+e.target.value)}
          style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border-light)', color: 'var(--text-1)', borderRadius: 4, padding: '5px 8px', fontSize: 12 }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  新建客户弹窗
// ═══════════════════════════════════════════════════════════
function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', sceneUrl: '', plan: 'basic', expireAt: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.name.trim()) return
    await onCreate(form)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ background: 'var(--bg-1)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>新建客户</div>
        {[
          { label: '客户名称 *', key: 'name', placeholder: '例：张三工作室' },
          { label: '公司', key: 'company', placeholder: '例：ABC 设计有限公司' },
          { label: '联系邮箱', key: 'email', placeholder: 'example@company.com' },
          { label: '场景链接', key: 'sceneUrl', placeholder: 'https://...' },
          { label: '到期日期', key: 'expireAt', placeholder: 'YYYY-MM-DD，留空=永久' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>{f.label}</label>
            <input type="text" value={form[f.key]} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
          </div>
        ))}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>套餐</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['basic', 'pro', 'enterprise'].map(p => (
              <button key={p} onClick={() => set('plan', p)} style={{
                flex: 1, padding: '7px 0', borderRadius: 6,
                background: form.plan === p ? 'rgba(99,102,241,0.2)' : 'var(--bg-3)',
                border: `1px solid ${form.plan === p ? 'rgba(99,102,241,0.6)' : 'var(--border)'}`,
                color: form.plan === p ? '#6366f1' : 'var(--text-2)',
                fontWeight: form.plan === p ? 600 : 400, textTransform: 'capitalize', cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 6, cursor: 'pointer' }}>取消</button>
          <button onClick={handleCreate} style={{ padding: '8px 20px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: '#6366f1', fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}>创建</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  客户管理面板
// ═══════════════════════════════════════════════════════════
function ClientHub() {
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [editId, setEditId]         = useState(null)
  const [search, setSearch]         = useState('')
  const [filterPlan, setFilterPlan] = useState('all')

  const fetchClients = useCallback(async () => {
    try { setLoading(true); const r = await fetch(`${API}/clients`); setClients(await r.json()) }
    catch { setClients([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const toggle = async (id) => {
    const r = await fetch(`${API}/clients/${id}/toggle`, { method: 'PUT' })
    const updated = await r.json()
    setClients(prev => prev.map(c => c.id === id ? updated : c))
  }

  const deleteClient = async (id) => {
    if (!confirm('确认删除该客户？此操作不可恢复。')) return
    await fetch(`${API}/clients/${id}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.id !== id))
  }

  const createClient = async (form) => {
    const r = await fetch(`${API}/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const newC = await r.json()
    setClients(prev => [...prev, newC])
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      && (filterPlan === 'all' || c.plan === filterPlan)
  })

  const stats = { total: clients.length, active: clients.filter(c => c.isActive).length, inactive: clients.filter(c => !c.isActive).length }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        {[{ label: '总客户', value: stats.total, color: '#6366f1' }, { label: '授权中', value: stats.active, color: '#22c55e' }, { label: '已停用', value: stats.inactive, color: '#ef4444' }].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>{Icon.Search}</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户..." style={{ paddingLeft: 28 }} />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 90 }}>
          <option value="all">全部套餐</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#6366f1', fontWeight: 600, borderRadius: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          {Icon.Plus} 新建
        </button>
        <button onClick={fetchClients} style={{ padding: '6px 8px', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 6, cursor: 'pointer' }}>{Icon.Refresh}</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)' }}><span className="spin">⟳</span> 加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)' }}>{clients.length === 0 ? '暂无客户，点击「新建」添加' : '无匹配结果'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(c => (
              <ClientRow key={c.id} client={c}
                onToggle={() => toggle(c.id)}
                onDelete={() => deleteClient(c.id)}
                onEdit={() => setEditId(c.id === editId ? null : c.id)}
                isEditing={editId === c.id}
                onSave={async (data) => {
                  const r = await fetch(`${API}/clients/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
                  const upd = await r.json()
                  setClients(prev => prev.map(x => x.id === c.id ? { ...x, ...upd } : x))
                  setEditId(null)
                }}
              />
            ))}
          </div>
        )}
      </div>
      {showNew && <NewClientModal onClose={() => setShowNew(false)} onCreate={createClient} />}
    </div>
  )
}

function ClientRow({ client, onToggle, onDelete, onEdit, isEditing, onSave }) {
  const [editForm, setEditForm] = useState({ name: client.name, company: client.company || '', email: client.email || '', sceneUrl: client.sceneUrl || '', expireAt: client.expireAt || '', notes: client.notes || '' })
  const set = (k, v) => setEditForm(p => ({ ...p, [k]: v }))
  const expired = client.expireAt && new Date(client.expireAt) < new Date()

  return (
    <div className="fade-in" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <Toggle checked={client.isActive} onChange={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</span>
            <span className={`tag ${client.isActive && !expired ? 'tag-active' : 'tag-inactive'}`}>{expired ? '已过期' : client.isActive ? '授权中' : '已停用'}</span>
            <span className="tag tag-plan" style={{ textTransform: 'capitalize' }}>{client.plan}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 10 }}>
            {client.company && <span>{client.company}</span>}
            {client.email && <span>{client.email}</span>}
            {client.expireAt && <span>到期: {client.expireAt.slice(0, 10)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {client.sceneUrl && (
            <a href={client.sceneUrl} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 5, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', textDecoration: 'none' }}>
              {Icon.Link}
            </a>
          )}
          <button onClick={onEdit}
            style={{ width: 28, height: 28, borderRadius: 5, background: isEditing ? 'rgba(99,102,241,0.2)' : 'var(--bg-3)', border: `1px solid ${isEditing ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, color: isEditing ? '#6366f1' : 'var(--text-2)', cursor: 'pointer' }}>
            {Icon.Edit}
          </button>
          <button onClick={onDelete}
            style={{ width: 28, height: 28, borderRadius: 5, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}>
            {Icon.Trash}
          </button>
        </div>
      </div>
      {isEditing && (
        <div className="fade-in" style={{ padding: '12px 12px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[{ label: '客户名称', key: 'name' }, { label: '公司', key: 'company' }, { label: '邮箱', key: 'email' }, { label: '到期日', key: 'expireAt' }].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{f.label}</label>
                <input type="text" value={editForm[f.key]} onChange={e => set(f.key, e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>场景链接</label>
            <input type="text" value={editForm.sceneUrl} onChange={e => set('sceneUrl', e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>备注</label>
            <textarea value={editForm.notes} onChange={e => set('notes', e.target.value)} rows={2}
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-light)', borderRadius: 4, color: 'var(--text-1)', fontSize: 12, padding: '6px 8px', width: '100%', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => onSave(editForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 5, fontWeight: 600, cursor: 'pointer' }}>
              {Icon.Check} 保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MaxFilePanel — .max 文件选择 + 历史记录面板
// ═══════════════════════════════════════════════════════════
function MaxFilePanel({ linkedMaxFile, onLink }) {
  const [history, setHistory]       = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const fileInputRef = useRef(null)

  // 加载历史
  useEffect(() => {
    fetch(`${API}/max-history`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
  }, [])

  const addToHistory = async (filePath, label) => {
    try {
      const r = await fetch(`${API}/max-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, label }),
      })
      const updated = await r.json()
      setHistory(updated)
    } catch {}
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 浏览器只能拿到文件名，用 webkitRelativePath 或 name
    const filePath = file.path || file.name  // Electron 有 file.path，普通浏览器只有 name
    const label = file.name
    onLink({ filePath, label })
    addToHistory(filePath, label)
    setShowHistory(false)
    e.target.value = ''
  }

  const handleHistoryPick = (item) => {
    onLink(item)
    addToHistory(item.filePath, item.label)
    setShowHistory(false)
  }

  const clearHistory = async () => {
    await fetch(`${API}/max-history`, { method: 'DELETE' })
    setHistory([])
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* 主按钮区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* 选择文件按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="选择 .max 文件"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 5, cursor: 'pointer',
            background: linkedMaxFile ? 'rgba(245,158,11,0.12)' : 'var(--bg-3)',
            border: `1px solid ${linkedMaxFile ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
            color: linkedMaxFile ? '#f59e0b' : 'var(--text-2)',
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          {linkedMaxFile ? linkedMaxFile.label : '.max'}
        </button>

        {/* 历史下拉按钮 */}
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            title="历史记录"
            style={{
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, cursor: 'pointer',
              background: showHistory ? 'rgba(99,102,241,0.15)' : 'var(--bg-3)',
              border: `1px solid ${showHistory ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              color: showHistory ? '#6366f1' : 'var(--text-2)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".max"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 历史下拉列表 */}
      {showHistory && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 9999,
          background: 'var(--bg-1)', border: '1px solid var(--border-light)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: 280, maxWidth: 380, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>最近使用</span>
            <button onClick={clearHistory} style={{
              fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '1px 4px', borderRadius: 3,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >清空</button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {history.map((item, i) => (
              <div
                key={i}
                onClick={() => handleHistoryPick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', cursor: 'pointer',
                  borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {item.filePath}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>
                  {new Date(item.usedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Viewport — 场景预览视口
// ═══════════════════════════════════════════════════════════
function Viewport({ sceneUrl, setSceneUrl, iframeRef, onSceneReady, linkedMaxFile, onLinkMax }) {
  const [inputUrl, setInputUrl] = useState(sceneUrl)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = () => setSceneUrl(inputUrl)

  const refresh = () => {
    if (!sceneUrl) return
    setRefreshKey(k => k + 1)
  }

  // 将 localhost:8669 转为代理 URL（自动注入桥接）
  const proxied = toProxyUrl(sceneUrl)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-3)', fontSize: 10, whiteSpace: 'nowrap' }}>场景 URL</span>
        <input type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="http://localhost:8669/applications/..."
          style={{ flex: 1, fontSize: 12 }} />
        <button onClick={load}
          style={{ padding: '5px 14px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#6366f1', fontWeight: 600, borderRadius: 5, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          加载
        </button>
        <button
          onClick={refresh}
          disabled={!sceneUrl}
          title="刷新场景"
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            color: sceneUrl ? 'var(--text-2)' : 'var(--text-3)',
            borderRadius: 5, cursor: sceneUrl ? 'pointer' : 'default',
            opacity: sceneUrl ? 1 : 0.4, flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (sceneUrl) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#6366f1' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = sceneUrl ? 'var(--text-2)' : 'var(--text-3)' }}
        >
          {Icon.Refresh}
        </button>
        {/* .max 文件关联 */}
        <MaxFilePanel linkedMaxFile={linkedMaxFile} onLink={onLinkMax} />
      </div>

      <div style={{ flex: 1, position: 'relative', background: 'var(--bg-0)' }}>
        {!sceneUrl ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 12 }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>◻</div>
            <div>在上方输入 Verge3D 场景地址，点击「加载」预览</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { url: 'http://localhost:5173/', label: '12345' },
                { url: 'http://localhost:8669/applications/zhinengjiaqiaoji/zhinengjiaqiaoji.html', label: 'zhinengjiaqiaoji' },
                { url: 'http://localhost:8669/applications/table/index.html', label: 'table' },
              ].map(({ url, label }) => (
                <button key={url} onClick={() => { setInputUrl(url); setSceneUrl(url) }}
                  style={{ padding: '6px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <iframe
            key={refreshKey}
            ref={iframeRef}
            src={proxied || sceneUrl}
            onLoad={onSceneReady}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Verge3D Viewport"
            allow="autoplay; fullscreen"
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  主 App
// ═══════════════════════════════════════════════════════════
export default function App() {
  // ── 组件库 ──
  const [components, setComponents] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('all')

  // ── 实例管理 ──
  const [activeInstances, setActiveInstances]       = useState([])
  const [selectedInstanceId, setSelectedInstanceId] = useState(null)

  // ── 场景扫描 ──
  const [sceneObjects, setSceneObjects] = useState([])
  const [scanning, setScanning]         = useState(false)

  // ── UI 状态 ──
  const [rightTab, setRightTab] = useState('inspector')
  const [leftTab, setLeftTab]   = useState('library')
  const [sceneUrl, setSceneUrl] = useState('')
  const [linkedMaxFile, setLinkedMaxFile] = useState(null)  // { filePath, label }

  const iframeRef = useRef(null)
  const linkedMaxFileRef = useRef(null)  // 供 scanScene 闭包读取最新值

  // 保持 ref 与 state 同步
  const handleLinkMax = useCallback((file) => {
    linkedMaxFileRef.current = file
    setLinkedMaxFile(file)
  }, [])

  // ── 加载组件列表 ──
  useEffect(() => {
    fetch(`${API}/components`)
      .then(r => r.json())
      .then(data => { setComponents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── 监听来自场景的 postMessage ──
  useEffect(() => {
    const handler = (e) => {
      const d = e.data
      if (!d?.type?.startsWith('W3D_')) return
      if (d.type === 'W3D_OBJECTS') {
        setSceneObjects(d.objects || [])
        setScanning(false)
      }
      if (d.type === 'W3D_POS') {
        setActiveInstances(prev => prev.map(inst =>
          inst.anchorName === d.name ? { ...inst, anchorPos: d.position } : inst
        ))
      }
      // 场景就绪：桥接脚本检测到 v3dApp 后自动推送，触发扫描
      if (d.type === 'W3D_READY') {
        scanScene()
      }
      if (d.type === 'W3D_INJECT_OK') {
        setActiveInstances(prev => prev.map(inst =>
          inst.id === d.instanceId ? { ...inst, status: 'injected' } : inst
        ))
      }
      if (d.type === 'W3D_INJECT_ERR') {
        setActiveInstances(prev => prev.map(inst =>
          inst.id === d.instanceId ? { ...inst, status: 'error', errorMsg: d.error } : inst
        ))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── 发送消息到 iframe 场景 ──
  const sendToScene = useCallback((msg) => {
    try { iframeRef.current?.contentWindow?.postMessage(msg, '*') } catch (e) { }
  }, [])

  // ── 扫描场景对象（优先读 .max 对应的 GLTF，降级到 W3D_SCAN）──
  const scanScene = useCallback((maxFile) => {
    const linked = maxFile !== undefined ? maxFile : linkedMaxFileRef.current
    setScanning(true)

    if (linked?.filePath) {
      fetch(`${API}/max-objects?filePath=${encodeURIComponent(linked.filePath)}`)
        .then(r => r.json())
        .then(data => {
          if (data.objects?.length > 0) {
            setSceneObjects(data.objects)
            setScanning(false)
          } else {
            // GLTF 未找到，降级到 postMessage 扫描
            sendToScene({ type: 'W3D_SCAN' })
            setTimeout(() => setScanning(false), 3000)
          }
        })
        .catch(() => {
          sendToScene({ type: 'W3D_SCAN' })
          setTimeout(() => setScanning(false), 3000)
        })
    } else {
      sendToScene({ type: 'W3D_SCAN' })
      setTimeout(() => setScanning(false), 3000)
    }
  }, [sendToScene])

  // ── 点击组件 → 创建实例并注入场景脚本 ──
  const addInstance = useCallback((comp) => {
    const inst = {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      compId: comp.id,
      compCategory: comp.category,
      compName: comp.name,
      compDirName: comp.dirName || comp.id,
      anchorName: '',
      anchorPos: null,
      offset: { x: 0, y: 0, z: 0 },
      status: 'injecting',   // injecting | injected | error | idle
      errorMsg: '',
      params: Object.fromEntries(
        Object.entries(comp.params || {}).map(([k, p]) => [k, p.default])
      ),
    }
    setActiveInstances(prev => [...prev, inst])
    setSelectedInstanceId(inst.id)
    setRightTab('inspector')
    setLeftTab('instances')

    // 拉取组件脚本 → 注入场景
    fetch(`${API}/components/${comp.category}/${comp.dirName || comp.id}/script`)
      .then(r => { if (!r.ok) throw new Error('script fetch failed'); return r.text() })
      .then(script => {
        sendToScene({
          type: 'W3D_INJECT',
          script,
          instanceId: inst.id,
          config: { ...inst.params, anchorName: '' },
        })
        // 5s 超时降级：若场景未安装桥接脚本则自动标记成功
        setTimeout(() => {
          setActiveInstances(prev => prev.map(i =>
            i.id === inst.id && i.status === 'injecting' ? { ...i, status: 'injected' } : i
          ))
        }, 5000)
      })
      .catch(err => {
        setActiveInstances(prev => prev.map(i =>
          i.id === inst.id ? { ...i, status: 'error', errorMsg: err.message } : i
        ))
      })
  }, [sendToScene])

  // ── 更新实例字段（params 变更时同步到场景）──
  const updateInstance = useCallback((id, key, val) => {
    setActiveInstances(prev => prev.map(inst => {
      if (inst.id !== id) return inst
      const updated = { ...inst, [key]: val }
      if (key === 'params' && inst.status === 'injected') {
        sendToScene({ type: 'W3D_UPDATE_PARAMS', instanceId: id, config: { ...val, anchorName: inst.anchorName } })
      }
      return updated
    }))
  }, [sendToScene])

  // ── 更新锚点（查询坐标 + 高亮，不自动同步到场景，需点击「绑定对象」）──
  const handleAnchorChange = useCallback((name) => {
    if (!selectedInstanceId) return
    setActiveInstances(prev => prev.map(inst => {
      if (inst.id !== selectedInstanceId) return inst
      return { ...inst, anchorName: name, anchorPos: null }
    }))
    if (name) {
      sendToScene({ type: 'W3D_GET_POS', name })
      sendToScene({ type: 'W3D_HIGHLIGHT', anchorName: name })
    } else {
      sendToScene({ type: 'W3D_CLEAR_HIGHLIGHT' })
    }
  }, [selectedInstanceId, sendToScene])

  // ── 绑定对象（显式触发：将组件更新到指定锚点）──
  const handleBind = useCallback((anchorName) => {
    if (!selectedInstanceId || !anchorName) return
    setActiveInstances(prev => prev.map(inst => {
      if (inst.id !== selectedInstanceId) return inst
      if (inst.status === 'injected') {
        sendToScene({ type: 'W3D_UPDATE_PARAMS', instanceId: inst.id, config: { ...inst.params, anchorName } })
      }
      return inst
    }))
  }, [selectedInstanceId, sendToScene])

  // ── 更新 offset（批量写入避免多次 setState）──
  const handleOffsetChange = useCallback((axis, val) => {
    if (!selectedInstanceId) return
    setActiveInstances(prev => prev.map(inst =>
      inst.id === selectedInstanceId
        ? { ...inst, offset: { ...inst.offset, [axis]: val } }
        : inst
    ))
  }, [selectedInstanceId])

  // ── 选中实例 ──
  const selectInstance = useCallback((id) => {
    setSelectedInstanceId(id)
    setRightTab('inspector')
    setActiveInstances(prev => {
      const inst = prev.find(i => i.id === id)
      if (inst?.anchorName) sendToScene({ type: 'W3D_HIGHLIGHT', anchorName: inst.anchorName })
      return prev
    })
  }, [sendToScene])

  // ── 删除实例（同时销毁场景内组件）──
  const removeInstance = useCallback((id) => {
    sendToScene({ type: 'W3D_DESTROY', instanceId: id })
    setActiveInstances(prev => prev.filter(inst => inst.id !== id))
    if (selectedInstanceId === id) {
      setSelectedInstanceId(null)
      sendToScene({ type: 'W3D_CLEAR_HIGHLIGHT' })
    }
  }, [selectedInstanceId, sendToScene])

  // ── 计算选中实例 + 对应组件定义 ──
  const selectedInst = activeInstances.find(i => i.id === selectedInstanceId) || null
  const selectedComp = selectedInst
    ? components.find(c => c.id === selectedInst.compId && c.category === selectedInst.compCategory) || null
    : null

  const cats = ['all', ...new Set(components.map(c => c.category))]
  const filtered = components.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      && (filterCat === 'all' || c.category === filterCat)
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>

      {/* ── 顶部导航 ── */}
      <header style={{
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>W</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>Web3D Platform</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 99, border: '1px solid var(--border)' }}>母舰</span>
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        {/* 实例计数 */}
        {activeInstances.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6366f1', padding: '3px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 99, border: '1px solid rgba(99,102,241,0.25)' }}>
            {Icon.Bolt} <span>{activeInstances.length} 个实例</span>
          </div>
        )}

        {/* 场景对象数 */}
        {sceneObjects.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            场景 {sceneObjects.length} 个对象
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[
            { id: 'inspector', icon: Icon.Layers, label: '检查器' },
            { id: 'clients',   icon: Icon.Users,  label: '客户管理' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setRightTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6,
                background: rightTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: `1px solid ${rightTab === tab.id ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                color: rightTab === tab.id ? '#6366f1' : 'var(--text-2)',
                fontWeight: rightTab === tab.id ? 600 : 400, cursor: 'pointer',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: loading ? '#f59e0b' : components.length > 0 ? '#22c55e' : '#ef4444' }} />
          {loading ? '连接中...' : 'API :3700'}
        </div>
      </header>

      {/* ── 主体三栏 ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── 左侧：组件库 / 实例列表 ── */}
        <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}>

          {/* 左侧 Tab 切换 */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[
              { id: 'library',   label: '组件库', count: components.length },
              { id: 'instances', label: '实例',   count: activeInstances.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setLeftTab(tab.id)}
                style={{
                  flex: 1, padding: '9px 6px', fontSize: 11,
                  fontWeight: leftTab === tab.id ? 700 : 400,
                  background: leftTab === tab.id ? 'var(--bg-2)' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${leftTab === tab.id ? '#6366f1' : 'transparent'}`,
                  color: leftTab === tab.id ? '#6366f1' : 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                {tab.label}
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 99,
                  background: leftTab === tab.id ? '#6366f1' : 'var(--bg-3)',
                  color: leftTab === tab.id ? '#fff' : 'var(--text-3)',
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* ── 组件库 Tab ── */}
          {leftTab === 'library' ? (
            <>
              <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>{Icon.Search}</span>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="搜索组件..." style={{ paddingLeft: 24, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {cats.map(cat => (
                    <button key={cat} onClick={() => setFilterCat(cat)}
                      style={{
                        padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500, cursor: 'pointer',
                        background: filterCat === cat ? (CAT_COLOR[cat] || '#6366f1') + '20' : 'transparent',
                        border: `1px solid ${filterCat === cat ? (CAT_COLOR[cat] || '#6366f1') + '50' : 'var(--border)'}`,
                        color: filterCat === cat ? (CAT_COLOR[cat] || '#6366f1') : 'var(--text-3)',
                      }}>
                      {cat === 'all' ? '全部' : CAT_LABEL[cat] || cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)', fontSize: 12 }}>
                    <span className="spin">⟳</span>
                    <div style={{ marginTop: 8 }}>扫描组件中...</div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)', fontSize: 12 }}>无匹配组件</div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, padding: '4px 2px' }}>
                      点击组件 → 自动添加到场景 ↓
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {filtered.map(comp => {
                        const instCount = activeInstances.filter(i => i.compId === comp.id && i.compCategory === comp.category).length
                        return (
                          <ComponentCard
                            key={`${comp.category}-${comp.id}`}
                            comp={comp}
                            instanceCount={instCount}
                            selected={selectedInst?.compId === comp.id && selectedInst?.compCategory === comp.category}
                            onClick={() => addInstance(comp)}
                          />
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* ── 实例列表 Tab ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {activeInstances.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--text-3)', fontSize: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.25 }}>⚡</div>
                  <div>暂无实例</div>
                  <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6 }}>
                    切换到「组件库」<br/>点击组件以添加
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeInstances.map(inst => (
                    <InstanceCard
                      key={inst.id}
                      inst={inst}
                      selected={selectedInstanceId === inst.id}
                      onClick={() => selectInstance(inst.id)}
                      onRemove={() => removeInstance(inst.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── 中间：视口 ── */}
        <main style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <Viewport
            sceneUrl={sceneUrl}
            setSceneUrl={setSceneUrl}
            iframeRef={iframeRef}
            onSceneReady={scanScene}
            linkedMaxFile={linkedMaxFile}
            onLinkMax={handleLinkMax}
          />
        </main>

        {/* ── 右侧：检查器 / 客户管理 ── */}
        <aside style={{
          width: 300, flexShrink: 0,
          background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {rightTab === 'inspector' ? (
              selectedInst
                ? <><span style={{ color: '#6366f1' }}>{Icon.Layers}</span> {selectedInst.compName}</>
                : '属性检查器'
            ) : '客户授权管理'}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightTab === 'inspector'
              ? <Inspector
                  instance={selectedInst}
                  comp={selectedComp}
                  sceneObjects={sceneObjects}
                  scanning={scanning}
                  onScan={scanScene}
                  onUpdate={(key, val) => selectedInst && updateInstance(selectedInst.id, key, val)}
                  onAnchorChange={handleAnchorChange}
                  onOffsetChange={handleOffsetChange}
                  onBind={handleBind}
                />
              : <ClientHub />
            }
          </div>
        </aside>
      </div>

      {/* ── 底部状态栏 ── */}
      <footer style={{
        height: 26, display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 16px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-3)', flexShrink: 0,
      }}>
        <span>Web3D Platform v2.0</span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span>组件: {components.length}</span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span style={{ color: activeInstances.length > 0 ? '#6366f1' : 'var(--text-3)' }}>
          实例: {activeInstances.length}
        </span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span>场景对象: {sceneObjects.length}</span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span>API: localhost:3700</span>
        {linkedMaxFile && (
          <>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {linkedMaxFile.label}
            </span>
          </>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {selectedInst && (
            <span style={{ color: 'var(--text-2)' }}>
              ◈ {selectedInst.compName}
              {selectedInst.anchorName && <span style={{ color: '#22c55e' }}> @ {selectedInst.anchorName}</span>}
              {(selectedInst.offset?.x || selectedInst.offset?.y || selectedInst.offset?.z) &&
                <span style={{ color: '#6366f1' }}>
                  {' '}+({selectedInst.offset.x.toFixed(1)}, {selectedInst.offset.y.toFixed(1)}, {selectedInst.offset.z.toFixed(1)})
                </span>
              }
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
