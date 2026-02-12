package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"mp01/internal/discovery"
	"mp01/internal/model"
)

type DiscoveryFactsCollector interface {
	CollectFacts(ctx context.Context, ip string, auth discovery.SSHAuth) (facts string, logFile string, err error)
}

type DiscoveryHandler struct {
	collector    DiscoveryFactsCollector
	hostsReader  DiscoveryHostsReader
	maxBodyBytes int64
	timeout      time.Duration
}

type discoveryFactsRequest struct {
	IP string `json:"ip"`
}

type discoveryFactsResponse struct {
	IP      string `json:"ip"`
	Facts   string `json:"facts"`
	LogFile string `json:"logFile"`
}

func NewDiscoveryHandler(
	collector DiscoveryFactsCollector,
	hostsReader DiscoveryHostsReader,
	maxBodyBytes int64,
	timeout time.Duration,
) *DiscoveryHandler {
	if maxBodyBytes <= 0 {
		maxBodyBytes = 4096
	}
	if timeout <= 0 {
		timeout = 15 * time.Second
	}

	return &DiscoveryHandler{
		collector:    collector,
		hostsReader:  hostsReader,
		maxBodyBytes: maxBodyBytes,
		timeout:      timeout,
	}
}

func (h *DiscoveryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	defer r.Body.Close()

	var request discoveryFactsRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}

	if net.ParseIP(request.IP) == nil {
		http.Error(w, "invalid ip", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), h.timeout)
	defer cancel()

	host, err := h.findHostByIP(request.IP)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to resolve host credentials: %v", err), http.StatusBadRequest)
		return
	}

	facts, logFile, err := h.collector.CollectFacts(ctx, request.IP, discovery.SSHAuth{
		Login:    host.Login,
		Password: host.Password,
		Key:      host.Key,
	})
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to collect discovery facts: %v", err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, discoveryFactsResponse{
		IP:      request.IP,
		Facts:   facts,
		LogFile: logFile,
	})
}

func (h *DiscoveryHandler) findHostByIP(ip string) (*model.DiscoveryHost, error) {
	hosts, err := h.hostsReader.Load()
	if err != nil {
		return nil, err
	}

	for i := range hosts {
		if hosts[i].IP == ip {
			return &hosts[i], nil
		}
	}

	return nil, fmt.Errorf("host with ip %s not found", ip)
}
