const SCHEME_API_URL = '/api/scheme/current'

window.schemeApiUrl = SCHEME_API_URL
window.schemeData = {
  nodes: [],
  links: [],
  nextEntityId: 1,
  nextLinkNo: 1
}

function isValidSchemeData(parsed) {
  return !!parsed &&
    typeof parsed === 'object' &&
    Array.isArray(parsed.nodes) &&
    Array.isArray(parsed.links)
}

function mergeSchemeData(target, source) {
  target.nodes.splice(0, target.nodes.length, ...source.nodes)
  target.links.splice(0, target.links.length, ...source.links)
  target.nextEntityId = Number.isFinite(source.nextEntityId) ? source.nextEntityId : 1
  target.nextLinkNo = Number.isFinite(source.nextLinkNo) ? source.nextLinkNo : 1
}

async function loadSchemeDataFromServer() {
  try {
    const response = await fetch(SCHEME_API_URL, { method: 'GET' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const parsed = await response.json()
    if (!isValidSchemeData(parsed)) throw new Error('Invalid scheme payload')
    mergeSchemeData(window.schemeData, parsed)
  } catch (error) {
    console.error('Failed to load scheme from server:', error)
  }
}

window.schemeDataReady = loadSchemeDataFromServer()
