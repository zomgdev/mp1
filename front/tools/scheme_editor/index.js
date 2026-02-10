/* ================= SETUP ================= */
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let bgPattern = null
const data = window.schemeData || (window.schemeData = {
  nodes: [],
  links: [],
  nextEntityId: 1,
  nextLinkNo: 1
})
const STORAGE_KEY_LOCAL = window.schemeStorageKey || 'schemeData'
let lastSaved = ''

function saveSchemeData() {
  try {
    const json = JSON.stringify(data)
    if (json !== lastSaved) {
      localStorage.setItem(STORAGE_KEY_LOCAL, json)
      lastSaved = json
    }
  } catch {}
}

setInterval(saveSchemeData, 1000)
addEventListener('beforeunload', saveSchemeData)

/* ================= STATE ================= */
const state = {
  nodes: data.nodes,
  links: data.links,
  tool: 'select',
  selected: null,            // выбранная entity для drag
  selectedLinkIds: new Set(),// выбранные связи (подсветка)
  hoveredLinkId: null,       // связь под курсором
  dragging: false,
  panning: false,
  panStart: { x: 0, y: 0 },
  camStart: { x: 0, y: 0 },
  dragOffset: { x: 0, y: 0 },
  linkDraft: null,           // { from: Node, toPoint:{x,y} }
  editingNode: null,         // редактируемая entity
  refsCache: new Map(),      // Map<nodeId, string[]>
  hoveredRef: null           // { nodeId, targetTitle }
}

const view = { x: 0, y: 0, scale: 1 }
const MIN_SCALE = 0.3
const MAX_SCALE = 3

function toWorld(x, y) {
  return {
    x: (x - view.x) / view.scale,
    y: (y - view.y) / view.scale
  }
}

function toScreen(x, y) {
  return {
    x: x * view.scale + view.x,
    y: y * view.scale + view.y
  }
}

function clampScale(v) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, v))
}

/* Функция: подгоняет размеры canvas под окно браузера */
function resize() {
  canvas.width = innerWidth
  canvas.height = innerHeight
  bgPattern = null
}
addEventListener('resize', resize)
resize()

/* ================= TOOL PANEL ================= */
const toolStatusEl = document.getElementById('toolstatusValue')

/* Функция: подсветка активной кнопки */
function setActiveToolButton(tool) {
  document.querySelectorAll('.toolbtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool)
  })
}

/* Функция: переключение инструмента */
function setTool(tool) {
  state.tool = tool
  if (tool !== 'link') state.linkDraft = null
  setActiveToolButton(tool)
  toolStatusEl.textContent = tool
}

/* Функция: подписка на клики по панели */
function initToolPanel() {
  document.querySelectorAll('.toolbtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      setTool(btn.dataset.tool)
    })
  })
}
initToolPanel()
setTool('select')

/* ================= HELP ================= */
const helpBtn = document.getElementById('help-btn')
const helpModal = document.getElementById('help-modal')
const helpClose = document.getElementById('help-close')

function openHelp() {
  if (!helpModal) return
  helpModal.classList.remove('hidden')
}

function closeHelp() {
  if (!helpModal) return
  helpModal.classList.add('hidden')
}

if (helpBtn) helpBtn.addEventListener('click', openHelp)
if (helpClose) helpClose.addEventListener('click', closeHelp)
if (helpModal) {
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelp()
  })
}

/* ================= BACKGROUND DOT GRID ================= */
const CM_PX = 37.8
const GRID_SPACING = Math.round(CM_PX) // ~1см
const DOT_RADIUS = 1

/* Функция: создаёт паттерн точек */
function makeDotPattern() {
  const p = document.createElement('canvas')
  p.width = GRID_SPACING
  p.height = GRID_SPACING
  const pctx = p.getContext('2d')
  pctx.clearRect(0, 0, p.width, p.height)
  pctx.beginPath()
  pctx.arc(GRID_SPACING / 2, GRID_SPACING / 2, DOT_RADIUS, 0, Math.PI * 2)
  pctx.fillStyle = 'rgba(0,0,0,0.18)'
  pctx.fill()
  return ctx.createPattern(p, 'repeat')
}

/* Функция: рисует фон точками */
function drawBackgroundDots() {
  if (!bgPattern) bgPattern = makeDotPattern()
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = bgPattern
  ctx.translate(view.x, view.y)
  ctx.scale(view.scale, view.scale)
  ctx.fillRect(
    -view.x / view.scale,
    -view.y / view.scale,
    canvas.width / view.scale,
    canvas.height / view.scale
  )
  ctx.restore()
}

/* ================= HELPERS ================= */
/* Функция: находит entity под курсором */
function hitNode(x, y) {
  for (let i = state.nodes.length - 1; i >= 0; i--) {
    const n = state.nodes[i]
    if (x >= n.x && x <= n.x + n.width &&
        y >= n.y && y <= n.y + n.height) return n
  }
  return null
}

/* Функция: центр entity */
function center(n) {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 }
}

/* Функция: высота entity по строкам (поля + refs) */
function calcNodeHeight(n) {
  const line = 14
  const refLine = line * 2
  const header = 24
  const padding = 16

  const fieldsLines = n.fields.length
  const refs = state.refsCache.get(n.id) || []
  const refsHeaderLines = refs.length > 0 ? 1 : 0
  const refsLines = refs.length

  return header + padding + (fieldsLines + refsHeaderLines) * line + refsLines * refLine
}

/* Функция: точка пересечения направления с прямоугольником entity */
function intersection(rect, target) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const dx = target.x - cx
  const dy = target.y - cy
  const adx = Math.abs(dx) || 0.00001
  const ady = Math.abs(dy) || 0.00001
  const scale = Math.min(rect.width / 2 / adx, rect.height / 2 / ady)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

/* Функция: расстояние от точки до отрезка */
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1
  const vy = y2 - y1
  const wx = px - x1
  const wy = py - y1

  const c1 = wx * vx + wy * vy
  if (c1 <= 0) return Math.hypot(px - x1, py - y1)

  const c2 = vx * vx + vy * vy
  if (c2 <= c1) return Math.hypot(px - x2, py - y2)

  const t = c1 / c2
  const projx = x1 + t * vx
  const projy = y1 + t * vy
  return Math.hypot(px - projx, py - projy)
}

/* ================= CARDINALITY ================= */
function drawCrowFoot(x, y, angle) {
  const s = 10 * view.scale
  const sp = Math.PI / 6
  for (let i of [-1, 0, 1]) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
      x + Math.cos(angle + sp * i) * s,
      y + Math.sin(angle + sp * i) * s
    )
    ctx.stroke()
  }
}
function drawOne(x, y, angle) {
  const s = 8 * view.scale
  const a = angle + Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s)
  ctx.lineTo(x - Math.cos(a) * s, y - Math.sin(a) * s)
  ctx.stroke()
}
function drawZero(x, y) {
  ctx.beginPath()
  ctx.arc(x, y, 4 * view.scale, 0, Math.PI * 2)
  ctx.stroke()
}
function drawCardinality(type, x, y, angle) {
  if (type === 'one') drawOne(x, y, angle)
  if (type === 'many') drawCrowFoot(x, y, angle)
  if (type === 'zero-one') { drawZero(x, y); drawOne(x, y, angle) }
}

/* ================= REFERENCES (TRANSITIVE) ================= */
/* Функция: строит граф ссылок from->to */
function buildAdjacency() {
  const adj = new Map()
  for (const l of state.links) {
    if (!adj.has(l.from)) adj.set(l.from, new Set())
    adj.get(l.from).add(l.to)
  }
  return adj
}

/* Функция: собирает все достижимые вершины (вложенные ссылки) */
function collectReachable(adj, startId) {
  const visited = new Set([startId])
  const stack = [startId]
  while (stack.length) {
    const v = stack.pop()
    const next = adj.get(v)
    if (!next) continue
    for (const u of next) {
      if (visited.has(u)) continue
      visited.add(u)
      stack.push(u)
    }
  }
  visited.delete(startId)
  return visited
}

/* Функция: обновляет кэш refsCache: entity -> список заголовков достижимых entity */
function updateRefsCache() {
  const adj = buildAdjacency()
  const titleById = new Map()
  for (const n of state.nodes) titleById.set(n.id, n.title)

  const cache = new Map()
  for (const n of state.nodes) {
    const reachable = collectReachable(adj, n.id)
    const titles = []
    for (const id of reachable) {
      const t = titleById.get(id)
      if (t) titles.push(t)
    }
    titles.sort((a, b) => a.localeCompare(b, 'ru'))
    cache.set(n.id, titles)
  }
  state.refsCache = cache
}

/* ================= ENTITY IDS ================= */
function ensureEntityIds() {
  let maxId = 0
  for (const n of state.nodes) {
    if (typeof n.id === 'number' && Number.isFinite(n.id)) {
      if (n.id > maxId) maxId = n.id
    }
  }
  let next = Math.max(data.nextEntityId || 1, maxId + 1)
  for (const n of state.nodes) {
    if (n.id === null || n.id === undefined || n.id === '') {
      n.id = next
      next++
    }
  }
  data.nextEntityId = next
}

/* ================= LINK NUMBERS ================= */
function ensureLinkNumbers() {
  let maxNum = 0
  for (const l of state.links) {
    if (typeof l.num === 'number' && Number.isFinite(l.num)) {
      if (l.num > maxNum) maxNum = l.num
    }
  }
  let next = maxNum + 1
  for (const l of state.links) {
    if (typeof l.num !== 'number' || !Number.isFinite(l.num)) {
      l.num = next
      next++
    }
  }
  data.nextLinkNo = next
}

/* ================= REFERENCES HIT TEST ================= */
function hitReference(x, y) {
  const lineH = 14
  const refLineH = lineH * 2
  for (let i = state.nodes.length - 1; i >= 0; i--) {
    const n = state.nodes[i]
    const nodeH = calcNodeHeight(n)
    if (x < n.x || x > n.x + n.width || y < n.y || y > n.y + nodeH) continue

    const refs = state.refsCache.get(n.id) || []
    if (refs.length === 0) continue

    const refsStartY = n.y + 40 + n.fields.length * lineH + 2 * lineH
    for (let r = 0; r < refs.length; r++) {
      const baseY = refsStartY + r * refLineH
      if (y >= baseY - lineH + 2 && y <= baseY + 2) {
        return { nodeId: n.id, targetTitle: refs[r] }
      }
    }
  }
  return null
}

function findNodeByTitle(title) {
  const t = normalizeTitle(title)
  if (!t) return null
  return state.nodes.find(n => normalizeTitle(n.title) === t) || null
}

function findFirstLinkIdOnPath(fromId, toId) {
  const path = findPathLinkIds(fromId, toId)
  return path.length ? path[0] : null
}

function findPathLinkIds(fromId, toId) {
  if (fromId === toId) return []
  const queue = [fromId]
  const prev = new Map()
  prev.set(fromId, null)

  while (queue.length) {
    const v = queue.shift()
    if (v === toId) break
    for (const l of state.links) {
      if (l.from !== v) continue
      const next = l.to
      if (prev.has(next)) continue
      prev.set(next, { prevId: v, linkId: l.id })
      queue.push(next)
    }
  }

  if (!prev.has(toId)) return []
  const ids = []
  let cur = toId
  let step = prev.get(cur)
  while (step) {
    ids.push(step.linkId)
    if (step.prevId === fromId) break
    cur = step.prevId
    step = prev.get(cur)
  }
  ids.reverse()
  return ids
}

function findLinkIdFromNodeToTitle(fromNode, title) {
  const target = findNodeByTitle(title)
  if (!target) return null
  const direct = state.links.find(l => l.from === fromNode.id && l.to === target.id)
  if (direct) return direct.id
  return findFirstLinkIdOnPath(fromNode.id, target.id)
}

/* ================= EXTERNAL LINK SELECTION ================= */
function normalizeTitle(v) {
  return String(v || '').trim().toLowerCase()
}

function getLinkLabel(link) {
  const a = state.nodes.find(n => n.id === link.from)
  const b = state.nodes.find(n => n.id === link.to)
  if (!a || !b) return ''
  return `${a.title} -> ${b.title}`
}

function normalizeLabel(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[\u2192\u2014\u2013]/g, '->')
    .replace(/\s*->\s*/g, '->')
    .replace(/\s+/g, ' ')
    .trim()
}

function findLinkById(id) {
  return state.links.find(l => l.id === id) || null
}

function findLinkByTitles(fromTitle, toTitle) {
  const fromN = normalizeTitle(fromTitle)
  const toN = normalizeTitle(toTitle)
  if (!fromN || !toN) return null
  for (const l of state.links) {
    const a = state.nodes.find(n => n.id === l.from)
    const b = state.nodes.find(n => n.id === l.to)
    if (!a || !b) continue
    if (normalizeTitle(a.title) === fromN && normalizeTitle(b.title) === toN) return l
  }
  return null
}

function findLinkByLabel(label) {
  const target = normalizeLabel(label)
  if (!target) return null
  for (const l of state.links) {
    const lbl = normalizeLabel(getLinkLabel(l))
    if (lbl === target) return l
  }
  return null
}

function selectLink(link) {
  state.selectedLinkIds = link ? new Set([link.id]) : new Set()
}

function clearLinkSelection() {
  state.selectedLinkIds = new Set()
}

function selectLinkIds(ids) {
  state.selectedLinkIds = new Set(ids || [])
}

function handleExternalLinkSelect(data) {
  if (!data || typeof data !== 'object') return
  const type = data.type || data.action
  if (type === 'clear-link-selection') {
    clearLinkSelection()
    return
  }
  if (type !== 'select-link' && type !== 'link-select') return

  let link = null
  if (data.id) link = findLinkById(data.id)
  if (!link && data.from && data.to) link = findLinkByTitles(data.from, data.to)
  if (!link && data.label) link = findLinkByLabel(data.label)
  selectLink(link)
}

function isMessageFromParent(e) {
  if (window.parent === window) return true
  return e.source === window.parent
}

addEventListener('message', (e) => {
  if (!isMessageFromParent(e)) return
  handleExternalLinkSelect(e.data)
})

window.schemeEditor = {
  selectLinkById: (id) => selectLink(findLinkById(id)),
  selectLinkByTitles: (fromTitle, toTitle) => selectLink(findLinkByTitles(fromTitle, toTitle)),
  selectLinkByLabel: (label) => selectLink(findLinkByLabel(label)),
  clearLinkSelection
}

/* ================= LINKS (STRAIGHT) ================= */
/*
  Прямая связь:
  - считаем 2 точки на границах entity (p1 и p2)
  - рисуем одну прямую
*/
function linkEndpoints(link) {
  const a = state.nodes.find(n => n.id === link.from)
  const b = state.nodes.find(n => n.id === link.to)
  if (!a || !b) return null

  const cA = center(a)
  const cB = center(b)
  const p1 = intersection(a, cB)
  const p2 = intersection(b, cA)

  const startDir = { x: p2.x - p1.x, y: p2.y - p1.y }
  const endDir   = { x: p1.x - p2.x, y: p1.y - p2.y }

  return { a, b, p1, p2, startDir, endDir }
}

/* Функция: hit-test по прямой связи */
function hitLink(x, y) {
  const TH = 7 / view.scale
  for (let i = state.links.length - 1; i >= 0; i--) {
    const l = state.links[i]
    const ep = linkEndpoints(l)
    if (!ep) continue
    if (distPointToSegment(x, y, ep.p1.x, ep.p1.y, ep.p2.x, ep.p2.y) <= TH) return l
  }
  return null
}

/* ================= DRAW ================= */
const ENTITY_RADIUS = 6

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function roundTopRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/* Функция: рисует entity */
function drawNode(n) {
  const newH = calcNodeHeight(n)
  n.height = newH

  const pos = toScreen(n.x, n.y)
  const x = pos.x
  const y = pos.y
  const w = n.width * view.scale
  const h = n.height * view.scale

  ctx.fillStyle = '#ffffff'
  roundRectPath(ctx, x, y, w, h, ENTITY_RADIUS)
  ctx.fill()

  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  roundRectPath(ctx, x, y, w, h, ENTITY_RADIUS)
  ctx.stroke()

  ctx.fillStyle = '#eeeeee'
  const headerH = 24 * view.scale
  roundTopRectPath(ctx, x, y, w, headerH, ENTITY_RADIUS)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.moveTo(x + 1, y + headerH)
  ctx.lineTo(x + w - 1, y + headerH)
  ctx.stroke()

  ctx.fillStyle = '#000'
  const titleFont = Math.max(6, 12 * view.scale)
  ctx.font = `bold ${titleFont}px sans-serif`
  ctx.fillText(n.title, x + 6 * view.scale, y + 16 * view.scale)

  const bodyFont = Math.max(6, 12 * view.scale)
  ctx.font = `${bodyFont}px monospace`
  const lineH = 14
  const refLineH = lineH * 2
  let yCursor = y + 40 * view.scale

  n.fields.forEach((f) => {
    ctx.fillText(
      `${f.name}: ${f.type}${f.meta ? ' [' + f.meta + ']' : ''}`,
      x + 6 * view.scale,
      yCursor
    )
    yCursor += lineH * view.scale
  })

  const refs = state.refsCache.get(n.id) || []
  if (refs.length > 0) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.moveTo(x + 4 * view.scale, yCursor + 4 * view.scale)
    ctx.lineTo(x + w - 4 * view.scale, yCursor + 4 * view.scale)
    ctx.stroke()

    yCursor += lineH * view.scale

    ctx.fillStyle = '#000'
    ctx.font = `bold ${titleFont}px sans-serif`
    ctx.fillText('References:', x + 6 * view.scale, yCursor)
    yCursor += lineH * view.scale

    ctx.font = `${bodyFont}px monospace`
    refs.forEach((t) => {
      const linkId = findLinkIdFromNodeToTitle(n, t)
      const link = linkId ? state.links.find(l => l.id === linkId) : null
      const num = (link && typeof link.num === 'number' && Number.isFinite(link.num)) ? link.num : null
      const text = num ? `#${num} → ${t}` : `→ ${t}`
      const textX = x + 6 * view.scale
      if (state.hoveredRef &&
          state.hoveredRef.nodeId === n.id &&
          state.hoveredRef.targetTitle === t) {
        ctx.fillStyle = 'rgba(255, 241, 150, 0.7)'
        ctx.fillRect(
          x + 4 * view.scale,
          yCursor - lineH * view.scale + 2 * view.scale,
          w - 8 * view.scale,
          lineH * view.scale
        )
        ctx.fillStyle = '#000'
      }
      ctx.fillText(text, textX, yCursor)
      yCursor += refLineH * view.scale
    })
  }
}

/* Функция: рисует прямую связь + кардинальности */
function drawLink(l) {
  const ep = linkEndpoints(l)
  if (!ep) return

  const selected = state.selectedLinkIds.has(l.id)
  const hovered  = (state.hoveredLinkId === l.id)

  if (selected) {
    ctx.strokeStyle = '#1e88e5'
    ctx.lineWidth = 2
  } else if (hovered) {
    ctx.strokeStyle = 'rgba(30,136,229,0.85)'
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
  }

  ctx.setLineDash([])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  const p1s = toScreen(ep.p1.x, ep.p1.y)
  const p2s = toScreen(ep.p2.x, ep.p2.y)
  ctx.moveTo(p1s.x, p1s.y)
  ctx.lineTo(p2s.x, p2s.y)
  ctx.stroke()

  const startAngle = Math.atan2(ep.startDir.y, ep.startDir.x)
  const endAngle   = Math.atan2(ep.endDir.y, ep.endDir.x)

  drawCardinality(l.fromCardinality, p1s.x, p1s.y, startAngle)
  drawCardinality(l.toCardinality, p2s.x, p2s.y, endAngle)

  // Label (link number)
  if (typeof l.num === 'number' && Number.isFinite(l.num)) {
    const midX = (ep.p1.x + ep.p2.x) / 2
    const midY = (ep.p1.y + ep.p2.y) / 2
    const nx = ep.p2.y - ep.p1.y
    const ny = -(ep.p2.x - ep.p1.x)
    const nlen = Math.hypot(nx, ny) || 1
    const offset = 10
    const lx = (midX + (nx / nlen) * offset) * view.scale + view.x
    const ly = (midY + (ny / nlen) * offset) * view.scale + view.y

    const label = `#${l.num}`
    const labelFont = Math.max(6, 11 * view.scale)
    ctx.font = `${labelFont}px sans-serif`
    const textW = ctx.measureText(label).width
    const textH = 12 * view.scale
    const pad = 3 * view.scale
    const rx = lx - textW / 2 - pad
    const ry = ly - textH / 2 - pad + 1
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(rx, ry, textW + pad * 2, textH + pad * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(rx, ry, textW + pad * 2, textH + pad * 2)
    ctx.fillStyle = '#000'
    ctx.fillText(label, lx - textW / 2, ly + textH / 2 - 2)
  }

  ctx.lineWidth = 1
}

/* ================= ENTITY EDITOR ================= */
const editorEl = document.getElementById('entity-editor')
const editorHeaderEl = document.getElementById('entity-editor-header')
const editorTitleInput = document.getElementById('entity-title-input')
const editorFieldsText = document.getElementById('entity-fields-text')
const editorErrorEl = document.getElementById('entity-editor-error')

let editorDragging = false
let editorDragOffset = { x: 0, y: 0 }

function startEditorDrag(e) {
  if (e.button !== 0) return
  if (editorEl.style.display !== 'block') return
  e.preventDefault()
  e.stopPropagation()
  const rect = editorEl.getBoundingClientRect()
  editorDragging = true
  editorDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onEditorDrag(e) {
  if (!editorDragging) return
  const x = e.clientX - editorDragOffset.x
  const y = e.clientY - editorDragOffset.y
  editorEl.style.left = `${x}px`
  editorEl.style.top = `${y}px`
}

function stopEditorDrag() {
  editorDragging = false
}

if (editorHeaderEl) {
  editorHeaderEl.addEventListener('mousedown', startEditorDrag)
}
addEventListener('mousemove', onEditorDrag)
addEventListener('mouseup', stopEditorDrag)

/* Функция: открыть редактор entity */
function openEntityEditor(node) {
  state.editingNode = node
  editorTitleInput.value = node.title
  editorFieldsText.value = stringifyFields(node.fields)
  editorErrorEl.style.display = 'none'
  editorErrorEl.textContent = ''
  editorEl.style.display = 'block'
  editorTitleInput.focus()
}

/* Функция: закрыть редактор entity */
function closeEntityEditor() {
  state.editingNode = null
  editorEl.style.display = 'none'
  editorErrorEl.style.display = 'none'
  editorErrorEl.textContent = ''
}

/* Функция: применить изменения из редактора entity */
function applyEntityEditor() {
  const node = state.editingNode
  if (!node) return

  const newTitle = editorTitleInput.value.trim()
  if (newTitle) node.title = newTitle

  const parsed = parseFieldsText(editorFieldsText.value)
  if (!parsed.ok) {
    editorErrorEl.style.display = 'block'
    editorErrorEl.textContent = parsed.error
    return
  }

  node.fields = parsed.fields
  closeEntityEditor()
}

/* Функция: сериализация полей в текст */
function stringifyFields(fields) {
  return fields.map(f => `${f.name}:${f.type}${f.meta ? ' [' + f.meta + ']' : ''}`).join('\n')
}

/* Функция: парсер текста полей */
function parseFieldsText(text) {
  const lines = text.split(/\r?\n/)
  const fields = []
  const errors = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    const m = raw.match(/^(\w+)\s*:\s*([A-Za-z0-9_]+)(?:\s*\[(.+)\])?$/)
    if (!m) { errors.push(`Строка ${i + 1}: неверный формат -> "${lines[i]}"`); continue }
    fields.push({ name: m[1], type: m[2], meta: m[3] ? m[3].trim() : null })
  }

  if (errors.length) return { ok: false, error: errors.join('\n') }
  if (fields.length === 0) fields.push({ name: 'id', type: 'int', meta: 'PK' })
  return { ok: true, fields }
}

/* Функция: редактирование одного поля по двойному клику */
function editSingleField(node, index) {
  const f = node.fields[index]
  const current = `${f.name}:${f.type}${f.meta ? ' [' + f.meta + ']' : ''}`
  const value = prompt('Поле (name:type [meta]):', current)
  if (value === null) return
  const v = value.trim()
  if (!v) return
  const m = v.match(/^(\w+)\s*:\s*([A-Za-z0-9_]+)(?:\s*\[(.+)\])?$/)
  if (!m) { alert('Неверный формат. Пример: user_id:int [FK]'); return }
  f.name = m[1]; f.type = m[2]; f.meta = m[3] ? m[3].trim() : null
}

/* ================= EVENTS ================= */
canvas.onmousedown = e => {
  const x = e.offsetX
  const y = e.offsetY
  const world = toWorld(x, y)
  const wx = world.x
  const wy = world.y

  // Right mouse: pan
  if (e.button === 2) {
    state.panning = true
    state.panStart = { x, y }
    state.camStart = { x: view.x, y: view.y }
    state.dragging = false
    state.selected = null
    return
  }

  // Click по списку references — подсветка связи
  const refHit = hitReference(wx, wy)
  if (refHit) {
    const fromNode = state.nodes.find(n => n.id === refHit.nodeId)
    if (fromNode) {
      const linkIds = findPathLinkIds(fromNode.id, findNodeByTitle(refHit.targetTitle)?.id || '')
      selectLinkIds(linkIds)
    } else {
      clearLinkSelection()
    }
    state.dragging = false
    state.selected = null
    state.linkDraft = null
    return
  }

  // Select: сначала пробуем попадание по связи
  if (state.tool === 'select') {
    const link = hitLink(wx, wy)
    if (link) {
      selectLink(link)
      state.dragging = false
      state.selected = null
      return
    }
  }

  const hit = hitNode(wx, wy)

  // Добавить entity
  if (state.tool === 'node') {
    const newId = data.nextEntityId++
    state.nodes.push({
      id: newId,
      x: wx, y: wy,
      width: 220,
      title: `Entity ${newId}`,
      fields: [{ name: 'id', type: 'int', meta: 'PK' }]
    })
    return
  }

  // Создать связь (2 клика)
  if (state.tool === 'link') {
    if (hit) {
      if (!state.linkDraft) {
        state.linkDraft = { from: hit, toPoint: { x: wx, y: wy } }
      } else if (state.linkDraft.from !== hit) {
        state.links.push({
          id: crypto.randomUUID(),
          from: state.linkDraft.from.id,
          to: hit.id,
          num: data.nextLinkNo++,
          fromCardinality: 'one',
          toCardinality: 'many'
        })
        state.linkDraft = null
      }
      return
    }
    state.linkDraft = null
    return
  }

  // Drag entity
  if (state.tool === 'select') {
    if (hit) {
      state.selected = hit
      state.dragging = true
      state.dragOffset = { x: wx - hit.x, y: wy - hit.y }
      clearLinkSelection()
      return
    }
    clearLinkSelection()
    state.selected = null
  }
}

canvas.onmousemove = e => {
  const x = e.offsetX
  const y = e.offsetY
  const world = toWorld(x, y)
  const wx = world.x
  const wy = world.y

  if (state.panning) {
    view.x = state.camStart.x + (x - state.panStart.x)
    view.y = state.camStart.y + (y - state.panStart.y)
    return
  }

  if (state.linkDraft) state.linkDraft.toPoint = { x: wx, y: wy }

  const refHit = hitReference(wx, wy)
  state.hoveredRef = refHit ? { nodeId: refHit.nodeId, targetTitle: refHit.targetTitle } : null

  // hover по связи
  if (state.tool === 'select' && !state.dragging && !state.linkDraft) {
    const link = hitLink(wx, wy)
    state.hoveredLinkId = link ? link.id : null
    canvas.style.cursor = (link || refHit) ? 'pointer' : 'default'
  } else {
    state.hoveredLinkId = null
    canvas.style.cursor = refHit ? 'pointer' : 'default'
  }

  if (state.dragging && state.selected) {
    state.selected.x = wx - state.dragOffset.x
    state.selected.y = wy - state.dragOffset.y
  }
}

canvas.onmouseup = () => {
  state.dragging = false
  state.selected = null
  state.panning = false
}

canvas.onmouseleave = () => {
  state.hoveredRef = null
  state.hoveredLinkId = null
  state.panning = false
}

canvas.ondblclick = e => {
  const x = e.offsetX
  const y = e.offsetY
  const world = toWorld(x, y)
  const wx = world.x
  const wy = world.y

  // dblclick по связи — удалить
  const link = hitLink(wx, wy)
  if (link) {
    state.links = state.links.filter(l => l.id !== link.id)
    if (state.selectedLinkIds.has(link.id)) clearLinkSelection()
    if (state.hoveredLinkId === link.id) state.hoveredLinkId = null
    return
  }

  // dblclick по entity — редактирование
  const node = hitNode(wx, wy)
  if (!node) return

  if (wy <= node.y + 24) {
    openEntityEditor(node)
    return
  }

  const idx = Math.floor((wy - (node.y + 40)) / 14)
  if (idx >= 0 && idx < node.fields.length) {
    editSingleField(node, idx)
    return
  }

  openEntityEditor(node)
}

canvas.oncontextmenu = e => {
  e.preventDefault()
  state.linkDraft = null
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  const x = e.offsetX
  const y = e.offsetY
  const prev = view.scale
  const factor = Math.exp(-e.deltaY * 0.0015)
  const next = clampScale(prev * factor)
  if (next === prev) return

  const world = toWorld(x, y)
  view.scale = next
  view.x = x - world.x * view.scale
  view.y = y - world.y * view.scale
}, { passive: false })

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    state.linkDraft = null
    if (editorEl.style.display === 'block') closeEntityEditor()
    if (helpModal && !helpModal.classList.contains('hidden')) closeHelp()
    clearLinkSelection()
  }
  if (e.key === '1') setTool('select')
  if (e.key === '2') setTool('node')
  if (e.key === '3') setTool('link')
})

/* ================= LOOP ================= */
function loop() {
  updateRefsCache()
  ensureEntityIds()
  ensureLinkNumbers()

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawBackgroundDots()

  state.links.forEach(drawLink)
  state.nodes.forEach(drawNode)

  // Пунктир при создании связи (прямая)
  if (state.linkDraft && state.linkDraft.toPoint) {
    const a = state.linkDraft.from
    const p1 = intersection(a, state.linkDraft.toPoint)
    const p2 = state.linkDraft.toPoint

    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    const p1s = toScreen(p1.x, p1.y)
    const p2s = toScreen(p2.x, p2.y)
    ctx.moveTo(p1s.x, p1s.y)
    ctx.lineTo(p2s.x, p2s.y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  requestAnimationFrame(loop)
}
loop()
