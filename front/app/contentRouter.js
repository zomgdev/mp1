const INFRA_LAYER_LABEL = "Infra layer"
const INFRA_LAYER_SRC = "tools/scheme_editor/index.html"
const DISCOVERY_LABEL = "Discovery"
const DISCOVERY_SRC = "tools/discovery/index.html"

function renderDefault(contentRoot) {
  contentRoot.innerHTML = `
    <h1>Content Area</h1>
    <p>Click on the navigation items to view content.</p>
  `
}

function renderTextContent(contentRoot, { label, path }) {
  const pathValue = path.length ? path.join(" / ") : label
  contentRoot.innerHTML = `
    <h1>${label}</h1>
    <p>Selected node: <code>${pathValue}</code></p>
  `
}

function renderEmbeddedTool(contentRoot, { title, src, frameTitle }) {
  contentRoot.innerHTML = `
    <div class="content-toolbar">
      <h1>${title}</h1>
      <span class="content-badge">Embedded tool</span>
    </div>
    <div class="content-frame-wrap">
      <iframe
        class="content-frame"
        src="${src}"
        title="${frameTitle}"
        loading="lazy"
      ></iframe>
    </div>
  `
}

function normalizeLabel(label) {
  return String(label || "").trim().toLowerCase()
}

export function createContentRouter(contentRoot) {
  renderDefault(contentRoot)

  return {
    showNode(node) {
      if (!node || !node.label) {
        renderDefault(contentRoot)
        return
      }

      const normalizedLabel = normalizeLabel(node.label)

      if (normalizedLabel === normalizeLabel(INFRA_LAYER_LABEL)) {
        renderEmbeddedTool(contentRoot, {
          title: INFRA_LAYER_LABEL,
          src: INFRA_LAYER_SRC,
          frameTitle: "Infra layer editor"
        })
        return
      }

      if (normalizedLabel === normalizeLabel(DISCOVERY_LABEL)) {
        renderEmbeddedTool(contentRoot, {
          title: DISCOVERY_LABEL,
          src: DISCOVERY_SRC,
          frameTitle: "Discovery tool"
        })
        return
      }

      renderTextContent(contentRoot, node)
    }
  }
}
