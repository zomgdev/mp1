function createFileNode(label, path) {
  const li = document.createElement("li")
  li.className = "file"
  li.dataset.path = path.join("/")

  const span = document.createElement("span")
  span.textContent = label

  li.appendChild(span)
  return li
}

function createFolderNode(label, path) {
  const li = document.createElement("li")
  li.className = "folder collapsed"
  li.dataset.path = path.join("/")

  const span = document.createElement("span")
  span.textContent = label

  const ul = document.createElement("ul")
  ul.style.display = "none"

  li.appendChild(span)
  li.appendChild(ul)
  return { li, ul }
}

function buildTree(data, parentElement, path = []) {
  if (!data || typeof data !== "object") return
  for (const key of Object.keys(data)) {
    const value = data[key]
    const nextPath = [...path, key]

    if (Array.isArray(value) || (value && typeof value === "object")) {
      const folder = createFolderNode(key, nextPath)
      parentElement.appendChild(folder.li)

      if (Array.isArray(value)) {
        value.forEach((item) => {
          folder.ul.appendChild(createFileNode(String(item), [...nextPath, String(item)]))
        })
      } else {
        buildTree(value, folder.ul, nextPath)
      }
      continue
    }

    parentElement.appendChild(createFileNode(String(value), [...nextPath, String(value)]))
  }
}

function setSelectedFile(treeContainer, fileElement) {
  treeContainer.querySelectorAll("li.file.selected").forEach((el) => el.classList.remove("selected"))
  if (fileElement) fileElement.classList.add("selected")
}

function toggleFolder(folderElement) {
  const ul = folderElement.querySelector(":scope > ul")
  if (!ul) return

  if (folderElement.classList.contains("collapsed")) {
    folderElement.classList.remove("collapsed")
    folderElement.classList.add("expanded")
    ul.style.display = "block"
    return
  }

  folderElement.classList.remove("expanded")
  folderElement.classList.add("collapsed")
  ul.style.display = "none"
}

export function renderTree(treeContainer, data, { onFileClick } = {}) {
  treeContainer.innerHTML = ""
  buildTree(data, treeContainer)

  treeContainer.addEventListener("click", (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement) || target.tagName !== "SPAN") return

    const li = target.parentElement
    if (!li) return

    if (li.classList.contains("folder")) {
      toggleFolder(li)
      return
    }

    if (li.classList.contains("file")) {
      setSelectedFile(treeContainer, li)
      if (typeof onFileClick === "function") {
        const fullPath = (li.dataset.path || "").split("/").filter(Boolean)
        onFileClick({ label: target.textContent || "", path: fullPath })
      }
    }
  })
}
