(function () {
  function renderFallbackTree(treeContainer, contentRoot) {
    var treeData = {
      "Architecture": ["Infra layer", "Management layer", "Data layer", "Process layer"],
      "Resources/Assets": ["Hardware", "Software", "Misc"],
      "Infra": ["Servers", "VMs", "Services", "Environments"],
      "Manage": ["Projects", "Groups"],
      "Processes": {
        "Workflow": ["install", "update", "uninstall"],
        "Actions": ["start", "stop", "restart"]
      }
    }

    function buildTree(data, parent) {
      Object.keys(data).forEach(function (key) {
        var value = data[key]
        var li = document.createElement("li")
        var span = document.createElement("span")
        span.textContent = key

        if (Array.isArray(value) || (value && typeof value === "object")) {
          li.className = "folder collapsed"
          var ul = document.createElement("ul")
          ul.style.display = "none"
          li.appendChild(span)
          li.appendChild(ul)

          if (Array.isArray(value)) {
            value.forEach(function (item) {
              var child = document.createElement("li")
              var childSpan = document.createElement("span")
              child.className = "file"
              childSpan.textContent = String(item)
              child.appendChild(childSpan)
              ul.appendChild(child)
            })
          } else {
            buildTree(value, ul)
          }
        } else {
          li.className = "file"
          li.appendChild(span)
        }

        parent.appendChild(li)
      })
    }

    function showContent(label) {
      if (label === "Infra layer") {
        contentRoot.innerHTML = [
          '<div class="content-toolbar"><h1>Infra layer</h1><span class="content-badge">Embedded tool</span></div>',
          '<div class="content-frame-wrap"><iframe class="content-frame" src="tools/scheme_editor/index.html" title="Infra layer editor"></iframe></div>'
        ].join("")
        return
      }

      contentRoot.innerHTML = "<h1>" + label + "</h1><p>Selected node: <code>" + label + "</code></p>"
    }

    treeContainer.innerHTML = ""
    buildTree(treeData, treeContainer)

    treeContainer.addEventListener("click", function (e) {
      var target = e.target
      if (!target || target.tagName !== "SPAN") return
      var li = target.parentElement
      if (!li) return

      if (li.classList.contains("folder")) {
        var ul = li.querySelector("ul")
        var collapsed = li.classList.contains("collapsed")
        li.classList.toggle("collapsed", !collapsed)
        li.classList.toggle("expanded", collapsed)
        if (ul) ul.style.display = collapsed ? "block" : "none"
        return
      }

      if (li.classList.contains("file")) {
        treeContainer.querySelectorAll("li.file.selected").forEach(function (el) {
          el.classList.remove("selected")
        })
        li.classList.add("selected")
        showContent(target.textContent || "")
      }
    })
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.__FRONT_APP_BOOTSTRAPPED) return

    var treeContainer = document.getElementById("tree")
    var contentRoot = document.getElementById("content")
    if (!treeContainer || !contentRoot) return
    renderFallbackTree(treeContainer, contentRoot)
  })
})()
