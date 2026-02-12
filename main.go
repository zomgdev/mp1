package main

import (
	"log"
	"net/http"
	"time"

	"mp01/internal/httpapi"
	"mp01/internal/httpapi/handlers"
	"mp01/internal/storage/filejson"
)

const (
	menuDataPath      = "./data/front/mainmenu.js"
	currentSchemePath = "./data/front/tools/scheme_editor/current_scheme.json"
	staticDir         = "./front/"
	serverAddr        = ":8080"
)

func main() {
	treeRepo := filejson.NewTreeRepository(menuDataPath)
	schemeRepo := filejson.NewSchemeRepository(currentSchemePath)

	treeHandler := handlers.NewTreeHandler(treeRepo)
	schemeHandler := handlers.NewSchemeHandler(schemeRepo, 1<<20)
	router := httpapi.NewRouter(staticDir, treeHandler, schemeHandler)

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
