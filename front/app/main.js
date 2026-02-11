import { loadTreeData } from "./treeData.js"
import { renderTree } from "./treeView.js"
import { createContentRouter } from "./contentRouter.js"

async function bootstrap() {
  window.__FRONT_APP_BOOTSTRAPPED = true
  const treeContainer = document.getElementById("tree")
  const contentRoot = document.getElementById("content")
  if (!treeContainer || !contentRoot) return

  try {
    const treeData = await loadTreeData()
    const router = createContentRouter(contentRoot)

    renderTree(treeContainer, treeData, {
      onFileClick(node) {
        router.showNode(node)
      }
    })
  } catch (error) {
    console.error("Bootstrap failed:", error)
    treeContainer.innerHTML = "<li class=\"file\"><span>Navigation unavailable</span></li>"
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap)
} else {
  bootstrap()
}
