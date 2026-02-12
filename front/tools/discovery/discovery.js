(function () {
  const HOSTS_API_URL = "/api/discovery/hosts"
  const FACTS_API_URL = "/api/discovery/facts"
  const tableBody = document.getElementById("discovery-table-body")
  const factsPanel = document.getElementById("facts-panel")
  const factsMeta = document.getElementById("facts-meta")
  const factsContent = document.getElementById("facts-content")

  if (!tableBody || !factsPanel || !factsMeta || !factsContent) return

  function renderPlaceholder(message) {
    tableBody.innerHTML = ""
    const row = document.createElement("tr")
    row.className = "table-placeholder-row"
    const cell = document.createElement("td")
    cell.colSpan = 4
    cell.className = "table-placeholder"
    cell.textContent = message
    row.appendChild(cell)
    tableBody.appendChild(row)
  }

  function createTextCell(value) {
    const cell = document.createElement("td")
    cell.textContent = String(value ?? "")
    return cell
  }

  function createStatusCell(status, ip) {
    const cell = document.createElement("td")
    cell.className = "status-cell"

    const text = document.createElement("span")
    text.textContent = String(status ?? "")

    const button = document.createElement("button")
    button.type = "button"
    button.className = "facts-btn"
    button.textContent = "Факты"
    button.dataset.ip = String(ip ?? "")

    cell.appendChild(text)
    cell.appendChild(button)
    return cell
  }

  function createHostRow(host) {
    const row = document.createElement("tr")
    row.appendChild(createTextCell(host.id))
    row.appendChild(createTextCell(host.fqdn))
    row.appendChild(createTextCell(host.ip))
    row.appendChild(createStatusCell(host.status, host.ip))
    return row
  }

  function isHostList(payload) {
    if (!Array.isArray(payload)) return false
    return payload.every((item) => item && typeof item === "object")
  }

  async function requestHosts() {
    const response = await fetch(HOSTS_API_URL, { method: "GET" })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = await response.json()
    if (!isHostList(payload)) {
      throw new Error("Invalid hosts payload")
    }

    return payload
  }

  function renderHosts(hosts) {
    tableBody.innerHTML = ""

    if (!hosts.length) {
      renderPlaceholder("Список хостов пуст")
      return
    }

    hosts.forEach((host) => {
      tableBody.appendChild(createHostRow(host))
    })
  }

  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.dataset.label = button.textContent
      button.textContent = "..."
      button.disabled = true
      return
    }

    button.textContent = button.dataset.label || "Факты"
    button.disabled = false
  }

  function showFacts(ip, payload) {
    factsPanel.hidden = false
    factsMeta.textContent = `IP: ${ip} | Лог: ${payload.logFile || "-"}`
    factsContent.textContent = payload.facts || ""
  }

  function showError(ip, errorMessage) {
    factsPanel.hidden = false
    factsMeta.textContent = `IP: ${ip}`
    factsContent.textContent = `Ошибка: ${errorMessage}`
  }

  async function requestFacts(ip) {
    const response = await fetch(FACTS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip })
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async function loadHosts() {
    renderPlaceholder("Загрузка...")
    try {
      const hosts = await requestHosts()
      renderHosts(hosts)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      renderPlaceholder(`Не удалось загрузить список хостов: ${message}`)
    }
  }

  tableBody.addEventListener("click", async (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!target.classList.contains("facts-btn")) return

    const ip = String(target.dataset.ip || "").trim()
    if (!ip) return

    setButtonLoading(target, true)
    try {
      const payload = await requestFacts(ip)
      showFacts(ip, payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showError(ip, message)
    } finally {
      setButtonLoading(target, false)
    }
  })

  loadHosts()
})()
