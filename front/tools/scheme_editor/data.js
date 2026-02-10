const STORAGE_KEY = 'schemeData'
window.schemeStorageKey = STORAGE_KEY

function loadSchemeData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) return null
    return {
      nodes: parsed.nodes,
      links: parsed.links,
      nextEntityId: Number.isFinite(parsed.nextEntityId) ? parsed.nextEntityId : 1,
      nextLinkNo: Number.isFinite(parsed.nextLinkNo) ? parsed.nextLinkNo : 1
    }
  } catch {
    return null
  }
}

window.schemeData = loadSchemeData() || {
  nodes: [],
  links: [],
  nextEntityId: 1,
  nextLinkNo: 1
}
