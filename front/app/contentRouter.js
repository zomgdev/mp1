const INFRA_LAYER_LABEL = "Infra layer"
const INFRA_LAYER_SRC = "tools/scheme_editor/index.html"

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

function renderInfraEditor(contentRoot) {
  contentRoot.innerHTML = `
    <div class="content-toolbar">
      <h1>Infra layer</h1>
      <span class="content-badge">Embedded tool</span>
    </div>
    <div class="content-frame-wrap">
      <iframe
        class="content-frame"
        src="${INFRA_LAYER_SRC}"
        title="Infra layer editor"
        loading="lazy"
      ></iframe>
    </div>
  `
}

export function createContentRouter(contentRoot) {
  renderDefault(contentRoot)

  return {
    showNode(node) {
      if (!node || !node.label) {
        renderDefault(contentRoot)
        return
      }

      if (node.label === INFRA_LAYER_LABEL) {
        renderInfraEditor(contentRoot)
        return
      }

      renderTextContent(contentRoot, node)
    }
  }
}
