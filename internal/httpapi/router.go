package httpapi

import "net/http"

func NewRouter(staticDir string, treeHandler http.Handler, schemeHandler http.Handler) *http.ServeMux {
	mux := http.NewServeMux()

	mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	mux.Handle("/api/tree", treeHandler)
	mux.Handle("/api/scheme/current", schemeHandler)

	return mux
}
