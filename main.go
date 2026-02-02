package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// TreeData represents the structure of our tree data
type TreeData map[string]interface{}

func main() {
	// Serve static files from the front directory
	fs := http.FileServer(http.Dir("./front/"))
	http.Handle("/", fs)

	// API endpoint for tree data
	http.HandleFunc("/api/tree", func(w http.ResponseWriter, r *http.Request) {
		// Create the tree data structure
		treeData := TreeData{
			"Architecture": []string{"Infra layer", "Management layer", "Data layer", "Process layer"},
			"Resources/Assets": []string{"Hardware", "Software", "Misc"},
			"Infra": []string{"Servers", "VMs", "Services", "Environments"},
			"Manage": []string{"Projects", "Groups"},
			"Processes": map[string][]string{
				"Workflow": {"install", "update", "uninstall"},
				"Actions":  {"start", "stop", "restart"},
			},
		}

		// Convert to JSON and send response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(treeData)
	})

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}