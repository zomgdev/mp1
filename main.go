package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// TreeData represents the structure of our tree data
type TreeData map[string]interface{}

const menuDataPath = "./data/front/mainmenu.js"
const currentSchemePath = "./data/front/tools/scheme_editor/current_scheme.json"

var defaultSchemeData = map[string]interface{}{
	"nodes":        []interface{}{},
	"links":        []interface{}{},
	"nextEntityId": 1,
	"nextLinkNo":   1,
}

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

func loadJSONMap(path string) (map[string]interface{}, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func writeJSONMap(path string, value map[string]interface{}) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0644)
}

func normalizeSchemeData(v map[string]interface{}) map[string]interface{} {
	if v == nil {
		return defaultSchemeData
	}

	if _, ok := v["nodes"].([]interface{}); !ok {
		v["nodes"] = []interface{}{}
	}
	if _, ok := v["links"].([]interface{}); !ok {
		v["links"] = []interface{}{}
	}
	if _, ok := v["nextEntityId"].(float64); !ok {
		if _, okInt := v["nextEntityId"].(int); !okInt {
			v["nextEntityId"] = 1
		}
	}
	if _, ok := v["nextLinkNo"].(float64); !ok {
		if _, okInt := v["nextLinkNo"].(int); !okInt {
			v["nextLinkNo"] = 1
		}
	}
	return v
}

func handleCurrentScheme(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		payload, err := loadJSONMap(currentSchemePath)
		if err != nil {
			if os.IsNotExist(err) {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(defaultSchemeData)
				return
			}
			http.Error(w, fmt.Sprintf("failed to read scheme: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(normalizeSchemeData(payload))
		return

	case http.MethodPost:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "failed to read request body", http.StatusBadRequest)
			return
		}

		var payload map[string]interface{}
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}

		payload = normalizeSchemeData(payload)
		if err := writeJSONMap(currentSchemePath, payload); err != nil {
			http.Error(w, fmt.Sprintf("failed to persist scheme: %v", err), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Allow", "GET, POST")
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
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

	// API endpoint for current scheme data
	http.HandleFunc("/api/scheme/current", handleCurrentScheme)

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}
