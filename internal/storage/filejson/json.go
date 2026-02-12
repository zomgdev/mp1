package filejson

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
)

func readJSON(path string, out interface{}) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	// Tolerate UTF-8 BOM for files edited by Windows tools.
	raw = bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})

	return json.Unmarshal(raw, out)
}

func writeJSON(path string, payload interface{}) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, raw, 0644)
}
