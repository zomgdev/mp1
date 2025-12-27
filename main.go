package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Отправляем пустую строку в ответ на запрос к корню сайта
		fmt.Fprintf(w, "")
	})

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}