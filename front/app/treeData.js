export const fallbackTreeData = {
  Architecture: ["Discovery", "Infra layer", "Management layer", "Data layer", "Process layer"],
  "Resources/Assets": ["Hardware", "Software", "Misc"],
  Infra: ["Servers", "VMs", "Services", "Environments"],
  Manage: ["Projects", "Groups"],
  Processes: {
    Workflow: ["install", "update", "uninstall"],
    Actions: ["start", "stop", "restart"]
  }
}

function isTreeObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export async function loadTreeData() {
  try {
    const response = await fetch("/api/tree")
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!isTreeObject(data)) throw new Error("Invalid tree payload")
    return data
  } catch (error) {
    console.error("Error fetching tree data, using fallback:", error)
    return fallbackTreeData
  }
}
