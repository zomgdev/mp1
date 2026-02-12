package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"mp01/internal/discovery"
	"mp01/internal/httpapi"
	"mp01/internal/httpapi/handlers"
	"mp01/internal/storage/filejson"
)

const (
	menuDataPath       = "./data/front/mainmenu.js"
	currentSchemePath  = "./data/front/tools/scheme_editor/current_scheme.json"
	discoveryHostsPath = "./data/discovery/hosts.json"
	discoveryLogDir    = "./data/log/discovery"
	staticDir          = "./front/"
	serverAddr         = ":8080"
)

func main() {
	treeRepo := filejson.NewTreeRepository(menuDataPath)
	schemeRepo := filejson.NewSchemeRepository(currentSchemePath)
	discoveryHostsRepo := filejson.NewDiscoveryHostsRepository(discoveryHostsPath)

	treeHandler := handlers.NewTreeHandler(treeRepo)
	schemeHandler := handlers.NewSchemeHandler(schemeRepo, 1<<20)
	discoveryHostsHandler := handlers.NewDiscoveryHostsHandler(discoveryHostsRepo)
	discoveryCollector := discovery.NewSSHFactsCollector(
		discoverySSHPort(),
		10*time.Second,
		discoveryLogDir,
	)
	discoveryFactsHandler := handlers.NewDiscoveryHandler(discoveryCollector, discoveryHostsRepo, 4096, 20*time.Second)
	router := httpapi.NewRouter(staticDir, treeHandler, schemeHandler, discoveryFactsHandler, discoveryHostsHandler)

	server := &http.Server{
		Addr:              serverAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Server starting on %s", serverAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func discoverySSHPort() int {
	value := os.Getenv("DISCOVERY_SSH_PORT")
	if value == "" {
		return 22
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return 22
	}

	return parsed
}
