package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"mp01/internal/model"
)

type SchemeStore interface {
	Load() (model.Scheme, error)
	Save(model.Scheme) error
}

type SchemeHandler struct {
	store        SchemeStore
	maxBodyBytes int64
}

func NewSchemeHandler(store SchemeStore, maxBodyBytes int64) *SchemeHandler {
	if maxBodyBytes <= 0 {
		maxBodyBytes = 1 << 20
	}

	return &SchemeHandler{
		store:        store,
		maxBodyBytes: maxBodyBytes,
	}
}

func (h *SchemeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleGet(w)
	case http.MethodPost:
		h.handlePost(w, r)
	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *SchemeHandler) handleGet(w http.ResponseWriter) {
	scheme, err := h.store.Load()
	if err != nil {
		if os.IsNotExist(err) {
			writeJSON(w, http.StatusOK, model.NewDefaultScheme())
			return
		}

		http.Error(w, fmt.Sprintf("failed to read scheme: %v", err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, scheme)
}

func (h *SchemeHandler) handlePost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	defer r.Body.Close()

	var payload map[string]interface{}
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}

	scheme := model.NormalizeScheme(payload)
	if err := h.store.Save(scheme); err != nil {
		http.Error(w, fmt.Sprintf("failed to persist scheme: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
