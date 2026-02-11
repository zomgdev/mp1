package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// TreeData represents the structure of our tree data
type TreeData map[string]interface{}

const menuDataPath = "./data/front/mainmenu.js"

func loadTreeData(path string) (TreeData, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var treeData TreeData
	if err := json.Unmarshal(raw, &treeData); err != nil {
		return nil, err
	}

	return treeData, nil
}

func main() {
	// Serve static files from the front directory
	fs := http.FileServer(http.Dir("./front/"))
	http.Handle("/", fs)

	// API endpoint for tree data
	http.HandleFunc("/api/tree", func(w http.ResponseWriter, r *http.Request) {
		treeData, err := loadTreeData(menuDataPath)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to read tree data: %v", err), http.StatusInternalServerError)
			return
		}

		// Convert to JSON and send response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(treeData)
	})

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}
