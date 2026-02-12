package handlers

import (
	"fmt"
	"net/http"

	"mp01/internal/model"
)

type DiscoveryHostsReader interface {
	Load() ([]model.DiscoveryHost, error)
}

type DiscoveryHostsHandler struct {
	reader DiscoveryHostsReader
}

type discoveryHostPublic struct {
	ID     int    `json:"id"`
	FQDN   string `json:"fqdn"`
	IP     string `json:"ip"`
	Status string `json:"status"`
}

func NewDiscoveryHostsHandler(reader DiscoveryHostsReader) *DiscoveryHostsHandler {
	return &DiscoveryHostsHandler{reader: reader}
}

func (h *DiscoveryHostsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	hosts, err := h.reader.Load()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read discovery hosts: %v", err), http.StatusInternalServerError)
		return
	}

	response := make([]discoveryHostPublic, 0, len(hosts))
	for _, host := range hosts {
		response = append(response, discoveryHostPublic{
			ID:     host.ID,
			FQDN:   host.FQDN,
			IP:     host.IP,
			Status: host.Status,
		})
	}

	writeJSON(w, http.StatusOK, response)
}
