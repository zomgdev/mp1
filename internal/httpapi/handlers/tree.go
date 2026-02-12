package handlers

import (
	"fmt"
	"net/http"

	"mp01/internal/model"
)

type TreeReader interface {
	Load() (model.TreeData, error)
}

type TreeHandler struct {
	treeReader TreeReader
}

func NewTreeHandler(treeReader TreeReader) *TreeHandler {
	return &TreeHandler{treeReader: treeReader}
}

func (h *TreeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	treeData, err := h.treeReader.Load()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read tree data: %v", err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, treeData)
}
